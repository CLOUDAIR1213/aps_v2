from __future__ import annotations

import json
import re
from collections import defaultdict
from datetime import datetime, time, timedelta

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.production import (
    ImportBatch,
    OperationDependency,
    Part,
    ProductionOperation,
    ProductionSchedule,
    ProductionScheduleItem,
    ResourceMachine,
    WorkCenter,
    WorkOrder,
)
from app.schemas.production import (
    ImportCommitRequest,
    ImportCommitResponse,
    ProductionScheduleItemRead,
    ProductionSchedulingResult,
    ResourceMachineRead,
    WorkCenterCreate,
    WorkCenterRead,
)
from app.services.production_import_service import ASSEMBLY_JOIN_OPERATIONS


WORK_START = time(8, 0)
LUNCH_START = time(12, 0)
LUNCH_END = time(13, 0)
WORK_END = time(17, 0)


def slugify_code(name: str) -> str:
    cleaned = re.sub(r"[^0-9A-Za-z]+", "-", name).strip("-").upper()
    if cleaned:
        return cleaned[:40]
    return "WC-" + str(abs(hash(name)) % 100000)


async def list_work_centers(db: AsyncSession) -> list[WorkCenterRead]:
    result = await db.execute(
        select(WorkCenter)
        .options(selectinload(WorkCenter.machines))
        .order_by(WorkCenter.is_external, WorkCenter.name)
    )
    centers = list(result.scalars().all())
    return [
        WorkCenterRead(
            id=center.id,
            code=center.code,
            name=center.name,
            is_external=center.is_external,
            default_capacity_per_day=center.default_capacity_per_day,
            default_duration_hours=center.default_duration_hours,
            machine_count=len(center.machines),
            created_at=center.created_at,
            updated_at=center.updated_at,
        )
        for center in centers
    ]


async def list_resource_machines(db: AsyncSession) -> list[ResourceMachineRead]:
    result = await db.execute(select(ResourceMachine).order_by(ResourceMachine.work_center_id, ResourceMachine.code))
    return [ResourceMachineRead.model_validate(machine) for machine in result.scalars().all()]


async def get_work_center_names(db: AsyncSession) -> set[str]:
    result = await db.execute(select(WorkCenter.name))
    return set(result.scalars().all())


async def ensure_work_center(
    db: AsyncSession,
    name: str,
    is_external: bool = False,
) -> WorkCenter:
    result = await db.execute(select(WorkCenter).where(WorkCenter.name == name))
    existing = result.scalars().first()
    if existing:
        if is_external and not existing.is_external:
            existing.is_external = True
            await db.commit()
            await db.refresh(existing)
        return existing

    code = slugify_code(name)
    suffix = 1
    while True:
        code_result = await db.execute(select(WorkCenter).where(WorkCenter.code == code))
        if code_result.scalars().first() is None:
            break
        suffix += 1
        code = f"{slugify_code(name)}-{suffix}"

    center = WorkCenter(
        code=code,
        name=name,
        is_external=is_external,
        default_capacity_per_day=480,
        default_duration_hours=8,
    )
    db.add(center)
    await db.commit()
    await db.refresh(center)

    if not center.is_external:
        machine = ResourceMachine(
            work_center_id=center.id,
            code=f"{center.code}-01",
            name=f"{center.name}-01",
            capacity_per_day=center.default_capacity_per_day,
        )
        db.add(machine)
        await db.commit()

    return center


async def create_work_center(db: AsyncSession, payload: WorkCenterCreate) -> WorkCenterRead:
    code = payload.code or slugify_code(payload.name)
    center = WorkCenter(
        code=code,
        name=payload.name,
        is_external=payload.is_external,
        default_capacity_per_day=payload.default_capacity_per_day,
        default_duration_hours=payload.default_duration_hours,
    )
    db.add(center)
    await db.commit()
    await db.refresh(center)

    if not payload.is_external:
        for index in range(max(payload.machine_count, 1)):
            db.add(
                ResourceMachine(
                    work_center_id=center.id,
                    code=f"{center.code}-{index + 1:02d}",
                    name=f"{center.name}-{index + 1:02d}",
                    capacity_per_day=center.default_capacity_per_day,
                )
            )
        await db.commit()
        await db.refresh(center, attribute_names=["machines"])

    return WorkCenterRead(
        id=center.id,
        code=center.code,
        name=center.name,
        is_external=center.is_external,
        default_capacity_per_day=center.default_capacity_per_day,
        default_duration_hours=center.default_duration_hours,
        machine_count=len(center.machines),
        created_at=center.created_at,
        updated_at=center.updated_at,
    )


async def commit_import(db: AsyncSession, request: ImportCommitRequest) -> ImportCommitResponse:
    if any(issue.severity == "error" for issue in request.preview.issues):
        raise ValueError("Import preview contains errors. Fix the workbook before committing.")

    existing_order = await db.execute(select(WorkOrder).where(WorkOrder.order_no == request.order.order_no))
    if existing_order.scalars().first():
        raise ValueError(f"Work order {request.order.order_no} already exists.")

    center_map: dict[str, WorkCenter] = {}
    for operation in request.preview.operations:
        center = await ensure_work_center(db, operation.work_center_name, operation.is_external)
        center_map[operation.work_center_name] = center

    work_order = WorkOrder(**request.order.model_dump(), status="pending")
    db.add(work_order)
    await db.commit()
    await db.refresh(work_order)

    batch = ImportBatch(
        work_order_id=work_order.id,
        source_filename=request.preview.source_filename,
        sheet_name=request.preview.sheet_name,
        parsed_summary_json=json.dumps(request.preview.summary, ensure_ascii=False),
    )
    db.add(batch)
    await db.commit()
    await db.refresh(batch)

    part_map: dict[str, Part] = {}
    for item in request.preview.parts:
        part = Part(
            work_order_id=work_order.id,
            import_batch_id=batch.id,
            no=item.no,
            drawing_no=item.drawing_no,
            name=item.name,
            material=item.material,
            quantity=item.quantity,
            source_row=item.source_row,
            is_assembly=item.is_assembly,
        )
        db.add(part)
        part_map[item.no] = part
    await db.commit()

    for item in request.preview.parts:
        part = part_map[item.no]
        await db.refresh(part)
        if item.parent_no and item.parent_no in part_map:
            part.parent_part_id = part_map[item.parent_no].id
    await db.commit()

    operations_by_part_no: dict[str, list[ProductionOperation]] = defaultdict(list)
    for item in request.preview.operations:
        part = part_map.get(item.part_no)
        center = center_map[item.work_center_name]
        if not part:
            continue
        operation = ProductionOperation(
            work_order_id=work_order.id,
            part_id=part.id,
            work_center_id=center.id,
            name=item.work_center_name,
            seq_no=item.seq_no,
            duration_hours=item.duration_hours,
            source_row=item.source_row,
            source_col=item.source_col,
        )
        db.add(operation)
        operations_by_part_no[item.part_no].append(operation)
    await db.commit()

    all_dependencies: list[OperationDependency] = []
    for part_no, operations in operations_by_part_no.items():
        operations.sort(key=lambda op: op.seq_no)
        for previous, current in zip(operations, operations[1:], strict=False):
            all_dependencies.append(
                OperationDependency(
                    operation_id=current.id,
                    depends_on_operation_id=previous.id,
                )
            )

    child_last_operations_by_parent: dict[str, list[ProductionOperation]] = defaultdict(list)
    for item in request.preview.parts:
        if not item.parent_no:
            continue
        child_operations = sorted(operations_by_part_no.get(item.no, []), key=lambda op: op.seq_no)
        if child_operations:
            child_last_operations_by_parent[item.parent_no].append(child_operations[-1])

    for parent_no, child_last_operations in child_last_operations_by_parent.items():
        for parent_operation in operations_by_part_no.get(parent_no, []):
            if parent_operation.name not in ASSEMBLY_JOIN_OPERATIONS:
                continue
            for child_operation in child_last_operations:
                all_dependencies.append(
                    OperationDependency(
                        operation_id=parent_operation.id,
                        depends_on_operation_id=child_operation.id,
                    )
                )

    if all_dependencies:
        db.add_all(all_dependencies)
        await db.commit()

    return ImportCommitResponse(
        work_order=work_order,
        import_batch_id=batch.id,
        part_count=len(part_map),
        operation_count=sum(len(items) for items in operations_by_part_no.values()),
        dependency_count=len(all_dependencies),
    )


async def list_work_orders(db: AsyncSession) -> list[WorkOrder]:
    result = await db.execute(select(WorkOrder).order_by(WorkOrder.status, WorkOrder.due_date, WorkOrder.id))
    return list(result.scalars().all())


async def list_pending_operations(db: AsyncSession) -> list[dict]:
    result = await db.execute(
        select(ProductionOperation)
        .where(ProductionOperation.status == "pending")
        .options(
            selectinload(ProductionOperation.work_order),
            selectinload(ProductionOperation.part),
            selectinload(ProductionOperation.work_center),
        )
        .order_by(ProductionOperation.id)
    )
    rows = []
    for operation in result.scalars().all():
        rows.append(
            {
                "id": operation.id,
                "work_order_id": operation.work_order_id,
                "part_id": operation.part_id,
                "work_center_id": operation.work_center_id,
                "name": operation.name,
                "seq_no": operation.seq_no,
                "duration_hours": operation.duration_hours,
                "status": operation.status,
                "order_no": operation.work_order.order_no,
                "part_no": operation.part.no,
                "drawing_no": operation.part.drawing_no,
                "part_name": operation.part.name,
                "work_center_name": operation.work_center.name,
                "due_date": operation.work_order.due_date,
            }
        )
    return rows


def next_work_time(moment: datetime) -> datetime:
    current = moment.replace(second=0, microsecond=0)
    while current.weekday() == 6:
        current = datetime.combine(current.date() + timedelta(days=1), WORK_START)
    if current.time() < WORK_START:
        return datetime.combine(current.date(), WORK_START)
    if LUNCH_START <= current.time() < LUNCH_END:
        return datetime.combine(current.date(), LUNCH_END)
    if current.time() >= WORK_END:
        return next_work_time(datetime.combine(current.date() + timedelta(days=1), WORK_START))
    return current


def add_work_hours(start: datetime, hours: float) -> datetime:
    remaining_minutes = max(int(round(hours * 60)), 1)
    current = next_work_time(start)
    while remaining_minutes > 0:
        segment_end_time = LUNCH_START if current.time() < LUNCH_START else WORK_END
        segment_end = datetime.combine(current.date(), segment_end_time)
        available = max(int((segment_end - current).total_seconds() // 60), 0)
        if available <= 0:
            current = next_work_time(current + timedelta(minutes=1))
            continue
        used = min(available, remaining_minutes)
        current += timedelta(minutes=used)
        remaining_minutes -= used
        if remaining_minutes > 0:
            current = next_work_time(current + timedelta(minutes=1))
    return current


async def run_production_scheduling(db: AsyncSession) -> ProductionSchedulingResult:
    operation_result = await db.execute(
        select(ProductionOperation)
        .where(ProductionOperation.status == "pending")
        .options(
            selectinload(ProductionOperation.work_order),
            selectinload(ProductionOperation.part),
            selectinload(ProductionOperation.work_center).selectinload(WorkCenter.machines),
            selectinload(ProductionOperation.dependencies),
        )
    )
    operations = list(operation_result.scalars().all())
    if not operations:
        raise ValueError("No pending production operations found. Import a work order first.")

    now = next_work_time(datetime.utcnow())
    schedule = ProductionSchedule(
        schedule_no=now.strftime("PS-%Y%m%d-%H%M%S-%f"),
        name=now.strftime("Production Schedule %Y-%m-%d %H:%M:%S"),
        status="draft",
    )
    db.add(schedule)
    await db.commit()
    await db.refresh(schedule)

    dependency_result = await db.execute(select(OperationDependency))
    dependencies = list(dependency_result.scalars().all())
    pending_by_id = {operation.id: operation for operation in operations}
    dep_map: dict[int, set[int]] = defaultdict(set)
    for dependency in dependencies:
        if dependency.operation_id in pending_by_id and dependency.depends_on_operation_id in pending_by_id:
            dep_map[dependency.operation_id].add(dependency.depends_on_operation_id)

    completed_end: dict[int, datetime] = {}
    machine_ready: dict[int, datetime] = {}
    external_ready: dict[int, datetime] = {}
    sequence_counter: dict[str, int] = {}
    schedule_items: list[ProductionScheduleItem] = []

    def priority_key(operation: ProductionOperation) -> tuple:
        return (
            -operation.work_order.priority,
            operation.work_order.due_date,
            operation.work_order.created_at,
            operation.part.no,
            operation.seq_no,
            operation.id,
        )

    while pending_by_id:
        ready = [
            operation
            for operation in pending_by_id.values()
            if dep_map.get(operation.id, set()).issubset(completed_end.keys())
        ]
        if not ready:
            raise ValueError("Operation dependency graph contains a cycle or missing dependency.")

        operation = sorted(ready, key=priority_key)[0]
        dependency_end = max(
            [completed_end[dep_id] for dep_id in dep_map.get(operation.id, set())],
            default=now,
        )
        start_floor = max(now, dependency_end)
        center = operation.work_center

        if center.is_external:
            start_time = max(start_floor, external_ready.get(center.id, now))
            end_time = add_work_hours(start_time, operation.duration_hours or center.default_duration_hours)
            external_ready[center.id] = end_time
            machine = None
            resource_key = f"external-{center.id}"
        else:
            machines = center.machines
            if not machines:
                machine = ResourceMachine(
                    work_center_id=center.id,
                    code=f"{center.code}-AUTO",
                    name=f"{center.name}-AUTO",
                    capacity_per_day=center.default_capacity_per_day,
                )
                db.add(machine)
                await db.commit()
                await db.refresh(machine)
                machines = [machine]
            machine = min(machines, key=lambda item: machine_ready.get(item.id, now))
            start_time = max(start_floor, machine_ready.get(machine.id, now))
            end_time = add_work_hours(start_time, operation.duration_hours)
            machine_ready[machine.id] = end_time
            resource_key = f"machine-{machine.id}"

        sequence_counter[resource_key] = sequence_counter.get(resource_key, 0) + 1
        item = ProductionScheduleItem(
            schedule_id=schedule.id,
            operation_id=operation.id,
            work_order_id=operation.work_order_id,
            part_id=operation.part_id,
            work_center_id=operation.work_center_id,
            machine_id=machine.id if machine else None,
            start_time=start_time,
            end_time=end_time,
            sequence_on_resource=sequence_counter[resource_key],
            is_external=center.is_external,
        )
        db.add(item)
        schedule_items.append(item)
        operation.status = "scheduled"
        completed_end[operation.id] = end_time
        pending_by_id.pop(operation.id)

    for operation in operations:
        operation.work_order.status = "scheduled"
    await db.commit()

    return await get_production_schedule_result(db, schedule.id)


def _serialize_schedule_item(item: ProductionScheduleItem) -> ProductionScheduleItemRead:
    operation = item.operation
    work_order = operation.work_order
    part = operation.part
    center = operation.work_center
    return ProductionScheduleItemRead(
        id=item.id,
        schedule_id=item.schedule_id,
        operation_id=item.operation_id,
        work_order_id=item.work_order_id,
        part_id=item.part_id,
        work_center_id=item.work_center_id,
        machine_id=item.machine_id,
        start_time=item.start_time,
        end_time=item.end_time,
        sequence_on_resource=item.sequence_on_resource,
        is_external=item.is_external,
        order_no=work_order.order_no,
        customer=work_order.customer,
        due_date=work_order.due_date,
        part_no=part.no,
        drawing_no=part.drawing_no,
        part_name=part.name,
        operation_name=operation.name,
        work_center_name=center.name,
        machine_name=item.machine.name if item.machine else None,
        machine_code=item.machine.code if item.machine else None,
    )


def _build_result(schedule: ProductionSchedule, items: list[ProductionScheduleItem]) -> ProductionSchedulingResult:
    serialized = [_serialize_schedule_item(item) for item in items]
    load_map: dict[str, dict] = {}
    order_end_map: dict[int, dict] = {}

    for item in serialized:
        key = f"{item.work_center_id}:{item.machine_id or 'external'}"
        load = load_map.setdefault(
            key,
            {
                "work_center_id": item.work_center_id,
                "work_center_name": item.work_center_name,
                "machine_id": item.machine_id,
                "machine_name": item.machine_name or "外协",
                "task_count": 0,
                "hours": 0.0,
                "is_external": item.is_external,
            },
        )
        load["task_count"] += 1
        load["hours"] += round((item.end_time - item.start_time).total_seconds() / 3600, 3)

        current = order_end_map.get(item.work_order_id)
        if current is None or item.end_time > current["end_time"]:
            order_end_map[item.work_order_id] = {
                "work_order_id": item.work_order_id,
                "order_no": item.order_no,
                "customer": item.customer,
                "due_date": item.due_date,
                "end_time": item.end_time,
            }

    late_orders = [
        {
            **value,
            "delay_hours": round((value["end_time"] - value["due_date"]).total_seconds() / 3600, 1),
        }
        for value in order_end_map.values()
        if value["end_time"] > value["due_date"]
    ]

    return ProductionSchedulingResult(
        schedule=schedule,
        items=serialized,
        resource_load=sorted(load_map.values(), key=lambda row: row["hours"], reverse=True),
        late_orders=sorted(late_orders, key=lambda row: row["delay_hours"], reverse=True),
    )


async def get_latest_production_schedule_result(db: AsyncSession) -> ProductionSchedulingResult | None:
    result = await db.execute(select(ProductionSchedule).order_by(ProductionSchedule.created_at.desc()))
    schedule = result.scalars().first()
    if not schedule:
        return None
    return await get_production_schedule_result(db, schedule.id)


async def get_production_schedule_result(db: AsyncSession, schedule_id: int) -> ProductionSchedulingResult:
    schedule = await db.get(ProductionSchedule, schedule_id)
    if not schedule:
        raise ValueError("Schedule not found.")
    item_result = await db.execute(
        select(ProductionScheduleItem)
        .where(ProductionScheduleItem.schedule_id == schedule_id)
        .options(
            selectinload(ProductionScheduleItem.operation).selectinload(ProductionOperation.work_order),
            selectinload(ProductionScheduleItem.operation).selectinload(ProductionOperation.part),
            selectinload(ProductionScheduleItem.operation).selectinload(ProductionOperation.work_center),
            selectinload(ProductionScheduleItem.machine),
        )
        .order_by(
            ProductionScheduleItem.work_center_id,
            ProductionScheduleItem.machine_id,
            ProductionScheduleItem.sequence_on_resource,
        )
    )
    return _build_result(schedule, list(item_result.scalars().all()))


async def get_production_gantt_data(db: AsyncSession) -> list[dict]:
    result = await get_latest_production_schedule_result(db)
    if not result:
        return []

    lanes: dict[str, dict] = {}
    for item in result.items:
        key = f"{item.work_center_id}:{item.machine_id or 'external'}"
        lane = lanes.setdefault(
            key,
            {
                "work_center_id": item.work_center_id,
                "work_center_name": item.work_center_name,
                "machine_id": item.machine_id,
                "machine_name": item.machine_name,
                "machine_code": item.machine_code,
                "is_external": item.is_external,
                "tasks": [],
            },
        )
        lane["tasks"].append(
            {
                "schedule_item_id": item.id,
                "operation_id": item.operation_id,
                "work_order_id": item.work_order_id,
                "order_no": item.order_no,
                "part_no": item.part_no,
                "drawing_no": item.drawing_no,
                "part_name": item.part_name,
                "task_name": item.operation_name,
                "work_center_name": item.work_center_name,
                "start_time": item.start_time,
                "end_time": item.end_time,
                "sequence_on_machine": item.sequence_on_resource,
                "is_external": item.is_external,
            }
        )
    return list(lanes.values())
