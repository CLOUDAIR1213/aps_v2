from __future__ import annotations

import json
import re
from io import BytesIO
from collections import defaultdict
from datetime import date, datetime, time, timedelta

from openpyxl import load_workbook
from sqlalchemy import select, or_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.production import (
    ExportBatch,
    ImportBatch,
    OperationDependency,
    OperationMappingRule,
    Part,
    Personnel,
    ProductionOperation,
    ProductionSchedule,
    ProductionScheduleItem,
    ProductionScheduleOrderLock,
    ResourceGroup,
    ResourceGroupMember,
    ResourceMachine,
    WorkCenter,
    WorkCenterPersonnel,
    WorkOrder,
)
from app.schemas.production import (
    ImportCommitRequest,
    ImportCommitResponse,
    ImportIssue,
    OperationMappingRuleRead,
    PersonnelImportResponse,
    ProductionScheduleItemRead,
    ProductionSchedulingResult,
    ResourceGroupRead,
    ResourceMachineRead,
    ResourceGroupMemberRead,
    ScheduleBoardDateColumn,
    ScheduleBoardDailyCell,
    ScheduleBoardResponse,
    ScheduleBoardRow,
    WorkCenterCreate,
    WorkCenterRead,
)
from app.services.production_import_service import ASSEMBLY_JOIN_OPERATIONS


WORK_START = time(8, 0)
LUNCH_START = time(12, 0)
LUNCH_END = time(13, 0)
WORK_END = time(17, 0)
WEEKDAYS = ["周一", "周二", "周三", "周四", "周五", "周六", "周日"]


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
            status=center.status,
            description=center.description,
            machine_count=len(center.machines),
            created_at=center.created_at,
            updated_at=center.updated_at,
        )
        for center in centers
    ]


async def list_resource_machines(db: AsyncSession) -> list[ResourceMachineRead]:
    result = await db.execute(select(ResourceMachine).order_by(ResourceMachine.work_center_id, ResourceMachine.code))
    return [ResourceMachineRead.model_validate(machine) for machine in result.scalars().all()]


async def import_personnel_workbook(
    db: AsyncSession,
    content: bytes,
    filename: str,
) -> PersonnelImportResponse:
    workbook = load_workbook(BytesIO(content), read_only=False, data_only=True, keep_vba=True)
    if "机台人员" not in workbook.sheetnames:
        raise ValueError("Workbook must contain sheet '机台人员'.")

    sheet = workbook["机台人员"]
    issues: list[ImportIssue] = []
    imported_people: set[str] = set()
    linked_work_centers: set[int] = set()
    links_created = 0

    header_row = 2
    for row in range(1, min(sheet.max_row, 8) + 1):
        row_values = {str(sheet.cell(row, col).value).strip() for col in range(1, min(sheet.max_column, 20) + 1) if sheet.cell(row, col).value is not None}
        next_row_values = {str(sheet.cell(row + 1, col).value).strip() for col in range(1, min(sheet.max_column, 20) + 1) if sheet.cell(row + 1, col).value is not None}
        if "NO." in row_values and ("工号" in next_row_values or "姓名" in next_row_values):
            header_row = row
            break

    subheader_row = header_row + 1
    data_start_row = header_row + 2

    col = 2
    while col <= sheet.max_column:
        work_center_name = sheet.cell(header_row, col).value
        if work_center_name is None:
            col += 1
            continue
        work_center_name = str(work_center_name).strip()
        if not work_center_name or work_center_name == "NO.":
            col += 1
            continue
        left_header = str(sheet.cell(subheader_row, col).value or "").strip()
        right_header = str(sheet.cell(subheader_row, col + 1).value or "").strip()
        if left_header != "工号" or right_header != "姓名":
            col += 2
            continue

        center = await ensure_work_center(db, work_center_name, False)
        linked_work_centers.add(center.id)

        for row in range(data_start_row, sheet.max_row + 1):
            employee_no = sheet.cell(row, col).value
            person_name = sheet.cell(row, col + 1).value if col + 1 <= sheet.max_column else None
            if person_name in (None, "") and employee_no in (None, ""):
                continue
            if person_name in (None, "") or employee_no in (None, ""):
                issues.append(
                    ImportIssue(
                        severity="warning",
                        row=row,
                        column=col,
                        field=work_center_name,
                        message=f"{work_center_name} 第 {row} 行工号或姓名不完整，已跳过。",
                    )
                )
                continue

            employee_no = str(employee_no).strip()
            person_name = str(person_name).strip()
            result = await db.execute(select(Personnel).where(Personnel.employee_no == employee_no))
            person = result.scalars().first()
            if person is None:
                person = Personnel(employee_no=employee_no, name=person_name)
                db.add(person)
                await db.commit()
                await db.refresh(person)
            elif person.name != person_name:
                person.name = person_name
                await db.commit()
                await db.refresh(person)
            imported_people.add(employee_no)

            link_result = await db.execute(
                select(WorkCenterPersonnel).where(
                    WorkCenterPersonnel.work_center_id == center.id,
                    WorkCenterPersonnel.person_id == person.id,
                )
            )
            if link_result.scalars().first() is None:
                db.add(
                    WorkCenterPersonnel(
                        work_center_id=center.id,
                        person_id=person.id,
                        sort_order=row - 2,
                    )
                )
                await db.commit()
                links_created += 1

        col += 2

    return PersonnelImportResponse(
        imported_people=len(imported_people),
        linked_work_centers=len(linked_work_centers),
        links_created=links_created,
        issues=issues,
    )


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
    center = WorkCenter(
        code=payload.code,
        name=payload.name,
        is_external=payload.is_external,
        default_capacity_per_day=payload.default_capacity_per_day,
        default_duration_hours=payload.default_duration_hours,
        status=payload.status,
        description=payload.description,
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
        status=center.status,
        description=center.description,
        machine_count=len(center.machines),
        created_at=center.created_at,
        updated_at=center.updated_at,
    )


async def update_work_center(db: AsyncSession, work_center_id: int, payload) -> WorkCenterRead:
    center = await db.get(WorkCenter, work_center_id)
    if not center:
        raise ValueError("工段不存在。")
    update_data = payload.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        if field == "code" and value:
            existing = await db.execute(
                select(WorkCenter).where(WorkCenter.code == value, WorkCenter.id != work_center_id)
            )
            if existing.scalars().first():
                raise ValueError(f"工段编码 {value} 已存在。")
        if field == "name" and value:
            existing = await db.execute(
                select(WorkCenter).where(WorkCenter.name == value, WorkCenter.id != work_center_id)
            )
            if existing.scalars().first():
                raise ValueError(f"工段名称 {value} 已存在。")
        setattr(center, field, value)
    await db.commit()
    await db.refresh(center)
    return WorkCenterRead(
        id=center.id,
        code=center.code,
        name=center.name,
        is_external=center.is_external,
        default_capacity_per_day=center.default_capacity_per_day,
        default_duration_hours=center.default_duration_hours,
        status=center.status,
        description=center.description,
        machine_count=len(center.machines) if center.machines else 0,
        created_at=center.created_at,
        updated_at=center.updated_at,
    )


async def disable_work_center(db: AsyncSession, work_center_id: int) -> WorkCenterRead:
    center = await db.get(WorkCenter, work_center_id, options=[selectinload(WorkCenter.machines)])
    if not center:
        raise ValueError("工段不存在。")
    center.status = "disabled"
    await db.commit()
    await db.refresh(center)
    return WorkCenterRead(
        id=center.id,
        code=center.code,
        name=center.name,
        is_external=center.is_external,
        default_capacity_per_day=center.default_capacity_per_day,
        default_duration_hours=center.default_duration_hours,
        status=center.status,
        description=center.description,
        machine_count=len(center.machines),
        created_at=center.created_at,
        updated_at=center.updated_at,
    )


async def create_machine(db: AsyncSession, payload) -> ResourceMachineRead:
    center = await db.get(WorkCenter, payload.work_center_id)
    if not center:
        raise ValueError("工段不存在。")
    existing = await db.execute(select(ResourceMachine).where(ResourceMachine.code == payload.code))
    if existing.scalars().first():
        raise ValueError(f"设备编码 {payload.code} 已存在。")
    machine = ResourceMachine(
        work_center_id=payload.work_center_id,
        code=payload.code,
        name=payload.name,
        status=payload.status,
        capacity_per_day=payload.capacity_per_day,
    )
    db.add(machine)
    await db.commit()
    await db.refresh(machine)
    return ResourceMachineRead.model_validate(machine)


async def update_machine(db: AsyncSession, machine_id: int, payload) -> ResourceMachineRead:
    machine = await db.get(ResourceMachine, machine_id)
    if not machine:
        raise ValueError("设备不存在。")
    update_data = payload.model_dump(exclude_unset=True)
    if "code" in update_data and update_data["code"]:
        existing = await db.execute(
            select(ResourceMachine).where(
                ResourceMachine.code == update_data["code"],
                ResourceMachine.id != machine_id,
            )
        )
        if existing.scalars().first():
            raise ValueError(f"设备编码 {update_data['code']} 已存在。")
    for field, value in update_data.items():
        setattr(machine, field, value)
    await db.commit()
    await db.refresh(machine)
    return ResourceMachineRead.model_validate(machine)


async def list_operation_mapping_rules(db: AsyncSession) -> list[OperationMappingRuleRead]:
    result = await db.execute(
        select(OperationMappingRule)
        .options(selectinload(OperationMappingRule.work_center))
        .order_by(OperationMappingRule.source_name)
    )
    rules = list(result.scalars().all())
    return [
        OperationMappingRuleRead(
            id=rule.id,
            source_name=rule.source_name,
            normalized_name=rule.normalized_name,
            work_center_id=rule.work_center_id,
            is_external=rule.is_external,
            status=rule.status,
            created_at=rule.created_at,
            updated_at=rule.updated_at,
            work_center_name=rule.work_center.name if rule.work_center else None,
        )
        for rule in rules
    ]


async def create_operation_mapping_rule(db: AsyncSession, payload) -> OperationMappingRuleRead:
    existing = await db.execute(
        select(OperationMappingRule).where(OperationMappingRule.source_name == payload.source_name)
    )
    if existing.scalars().first():
        raise ValueError(f"映射规则 {payload.source_name} 已存在，请使用更新接口。")
    center = await db.get(WorkCenter, payload.work_center_id)
    if not center:
        raise ValueError("关联工段不存在。")
    rule = OperationMappingRule(
        source_name=payload.source_name,
        normalized_name=payload.normalized_name,
        work_center_id=payload.work_center_id,
        is_external=payload.is_external,
        status=payload.status,
    )
    db.add(rule)
    await db.commit()
    await db.refresh(rule)
    return OperationMappingRuleRead(
        id=rule.id,
        source_name=rule.source_name,
        normalized_name=rule.normalized_name,
        work_center_id=rule.work_center_id,
        is_external=rule.is_external,
        status=rule.status,
        created_at=rule.created_at,
        updated_at=rule.updated_at,
        work_center_name=center.name,
    )


async def update_operation_mapping_rule(db: AsyncSession, rule_id: int, payload) -> OperationMappingRuleRead:
    rule = await db.get(OperationMappingRule, rule_id, options=[selectinload(OperationMappingRule.work_center)])
    if not rule:
        raise ValueError("映射规则不存在。")
    update_data = payload.model_dump(exclude_unset=True)
    if "work_center_id" in update_data:
        center = await db.get(WorkCenter, update_data["work_center_id"])
        if not center:
            raise ValueError("关联工段不存在。")
    for field, value in update_data.items():
        setattr(rule, field, value)
    await db.commit()
    await db.refresh(rule)
    return OperationMappingRuleRead(
        id=rule.id,
        source_name=rule.source_name,
        normalized_name=rule.normalized_name,
        work_center_id=rule.work_center_id,
        is_external=rule.is_external,
        status=rule.status,
        created_at=rule.created_at,
        updated_at=rule.updated_at,
        work_center_name=rule.work_center.name if rule.work_center else None,
    )


async def list_resource_groups(db: AsyncSession) -> list[ResourceGroupRead]:
    result = await db.execute(
        select(ResourceGroup)
        .options(selectinload(ResourceGroup.members))
        .order_by(ResourceGroup.code)
    )
    return [ResourceGroupRead.model_validate(group) for group in result.scalars().all()]


async def create_resource_group(db: AsyncSession, payload) -> ResourceGroupRead:
    existing = await db.execute(select(ResourceGroup).where(ResourceGroup.code == payload.code))
    if existing.scalars().first():
        raise ValueError(f"资源组编码 {payload.code} 已存在。")
    group = ResourceGroup(
        code=payload.code,
        name=payload.name,
        description=payload.description,
        status=payload.status,
    )
    db.add(group)
    await db.commit()
    await db.refresh(group)
    return ResourceGroupRead.model_validate(group)


async def update_resource_group(db: AsyncSession, group_id: int, payload) -> ResourceGroupRead:
    group = await db.get(ResourceGroup, group_id, options=[selectinload(ResourceGroup.members)])
    if not group:
        raise ValueError("资源组不存在。")
    update_data = payload.model_dump(exclude_unset=True)
    if "code" in update_data and update_data["code"]:
        existing = await db.execute(
            select(ResourceGroup).where(
                ResourceGroup.code == update_data["code"],
                ResourceGroup.id != group_id,
            )
        )
        if existing.scalars().first():
            raise ValueError(f"资源组编码 {update_data['code']} 已存在。")
    for field, value in update_data.items():
        setattr(group, field, value)
    await db.commit()
    await db.refresh(group)
    return ResourceGroupRead.model_validate(group)


async def add_resource_group_member(db: AsyncSession, group_id: int, payload) -> ResourceGroupMemberRead:
    group = await db.get(ResourceGroup, group_id)
    if not group:
        raise ValueError("资源组不存在。")

    # Validate member_type and member_id reference
    model_map = {"work_center": WorkCenter, "machine": ResourceMachine, "personnel": Personnel}
    model = model_map.get(payload.member_type)
    if model is None:
        raise ValueError("member_type 必须是 work_center、machine 或 personnel。")
    member_record = await db.get(model, payload.member_id)
    if not member_record:
        type_labels = {"work_center": "工段", "machine": "设备", "personnel": "人员"}
        raise ValueError(f"{type_labels[payload.member_type]} ID {payload.member_id} 不存在。")

    existing = await db.execute(
        select(ResourceGroupMember).where(
            ResourceGroupMember.group_id == group_id,
            ResourceGroupMember.member_type == payload.member_type,
            ResourceGroupMember.member_id == payload.member_id,
        )
    )
    if existing.scalars().first():
        raise ValueError("该资源已在资源组中。")
    member = ResourceGroupMember(
        group_id=group_id,
        member_type=payload.member_type,
        member_id=payload.member_id,
    )
    db.add(member)
    await db.commit()
    await db.refresh(member)
    return ResourceGroupMemberRead.model_validate(member)


async def remove_resource_group_member(db: AsyncSession, group_id: int, member_id: int) -> None:
    member = await db.get(ResourceGroupMember, member_id)
    if not member or member.group_id != group_id:
        raise ValueError("资源组成员不存在。")
    await db.delete(member)
    await db.commit()


async def commit_import(db: AsyncSession, request: ImportCommitRequest) -> ImportCommitResponse:
    if any(issue.severity == "error" for issue in request.preview.issues):
        raise ValueError("Import preview contains errors. Fix the workbook before committing.")

    existing_order = await db.execute(select(WorkOrder).where(WorkOrder.order_no == request.order.order_no))
    if existing_order.scalars().first():
        raise ValueError(f"Work order {request.order.order_no} already exists.")

    # Load active mapping rules
    rules_result = await db.execute(
        select(OperationMappingRule)
        .where(OperationMappingRule.status == "active")
        .options(selectinload(OperationMappingRule.work_center))
    )
    rule_map = {rule.source_name: rule for rule in rules_result.scalars().all()}

    # Validate all operations have mapping rules
    unmapped = {op.work_center_name for op in request.preview.operations if op.work_center_name not in rule_map}
    if unmapped:
        raise ValueError(f"以下工序列尚未配置映射规则：{'、'.join(sorted(unmapped))}。请先在工序映射中配置。")

    center_map: dict[str, WorkCenter] = {}
    for operation in request.preview.operations:
        rule = rule_map[operation.work_center_name]
        center_map[operation.work_center_name] = rule.work_center

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


async def list_personnel(db: AsyncSession) -> list[dict]:
    result = await db.execute(
        select(Personnel)
        .options(selectinload(Personnel.work_centers).selectinload(WorkCenterPersonnel.work_center))
        .order_by(Personnel.name)
    )
    people = list(result.scalars().all())
    return [
        {
            "id": p.id,
            "employee_no": p.employee_no,
            "name": p.name,
            "status": p.status,
            "work_centers": [
                {"id": link.work_center.id, "name": link.work_center.name, "code": link.work_center.code}
                for link in p.work_centers
            ],
            "created_at": p.created_at,
            "updated_at": p.updated_at,
        }
        for p in people
    ]


async def list_pending_operations(db: AsyncSession) -> list[dict]:
    result = await db.execute(
        select(ProductionOperation)
        .join(WorkCenter, ProductionOperation.work_center_id == WorkCenter.id)
        .where(
            ProductionOperation.status == "pending",
            WorkCenter.status == "active",
        )
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


async def run_production_scheduling(
    db: AsyncSession,
    start_time: datetime | None = None,
    work_order_ids: list[int] | None = None,
    base_schedule_id: int | None = None,
    keep_locked: bool = True,
) -> ProductionSchedulingResult:
    # Determine scheduling start time
    if start_time:
        now = next_work_time(start_time)
    else:
        now = next_work_time(datetime.utcnow())

    # Load pending/scheduled operations with optional order filter
    operation_query = (
        select(ProductionOperation)
        .join(WorkCenter, ProductionOperation.work_center_id == WorkCenter.id)
        .where(
            ProductionOperation.status.in_(["pending", "scheduled"]),
            WorkCenter.status == "active",
        )
        .options(
            selectinload(ProductionOperation.work_order),
            selectinload(ProductionOperation.part),
            selectinload(ProductionOperation.work_center).selectinload(WorkCenter.machines),
            selectinload(ProductionOperation.dependencies),
        )
    )
    if work_order_ids:
        operation_query = operation_query.where(
            ProductionOperation.work_order_id.in_(work_order_ids)
        )

    operation_result = await db.execute(operation_query)
    all_operations = list(operation_result.scalars().all())
    if not all_operations:
        raise ValueError("没有找到待排工序。请先导入工单或检查订单范围。")

    # If work_order_ids specified, validate orders exist and are pending
    if work_order_ids:
        order_result = await db.execute(
            select(WorkOrder).where(WorkOrder.id.in_(work_order_ids))
        )
        found_orders = {o.id: o for o in order_result.scalars().all()}
        missing = set(work_order_ids) - set(found_orders.keys())
        if missing:
            raise ValueError(f"以下订单不存在：{', '.join(str(i) for i in sorted(missing))}。")
        non_schedulable = [o for o in found_orders.values() if o.status not in ("pending", "scheduled")]
        if non_schedulable:
            raise ValueError(
                f"以下订单当前状态不可排产：{'、'.join(o.order_no for o in non_schedulable)}。"
                "只有待排或已排状态的订单可以参与排产。"
            )

    # Build dependency graph and validate before creating schedule
    dependency_result = await db.execute(select(OperationDependency))
    dependencies = list(dependency_result.scalars().all())
    pending_by_id = {op.id: op for op in all_operations}
    dep_map: dict[int, set[int]] = defaultdict(set)
    for dependency in dependencies:
        if dependency.operation_id in pending_by_id and dependency.depends_on_operation_id in pending_by_id:
            dep_map[dependency.operation_id].add(dependency.depends_on_operation_id)

    # Check for dependencies pointing to operations on disabled work centers
    blocked_op_ids = {
        d.depends_on_operation_id for d in dependencies
        if d.operation_id in pending_by_id and d.depends_on_operation_id not in pending_by_id
    }
    if blocked_op_ids:
        blocked_ops = await db.execute(
            select(ProductionOperation)
            .where(ProductionOperation.id.in_(blocked_op_ids))
            .options(selectinload(ProductionOperation.work_center))
        )
        blocked_names = {op.work_center.name for op in blocked_ops.scalars().all()}
        affected_orders = {
            op.work_order.order_no for op in pending_by_id.values()
            if any(d.operation_id == op.id and d.depends_on_operation_id in blocked_op_ids for d in dependencies)
        }
        raise ValueError(
            f"工段 {'、'.join(sorted(blocked_names))} 已禁用，但存在依赖其工序的待排任务。"
            f"涉及订单：{'、'.join(sorted(affected_orders))}。请先启用相关工段或调整排产范围。"
        )

    # Load locked items from base schedule if re-scheduling
    locked_machine_intervals: dict[int, list[tuple[datetime, datetime]]] = {}
    locked_external_intervals: dict[int, list[tuple[datetime, datetime]]] = {}
    locked_order_ids: set[int] = set()

    if keep_locked and base_schedule_id:
        locked_result = await db.execute(
            select(ProductionScheduleOrderLock)
            .where(
                ProductionScheduleOrderLock.schedule_id == base_schedule_id,
                ProductionScheduleOrderLock.locked == True,
            )
        )
        locked_order_ids = {lock.work_order_id for lock in locked_result.scalars().all()}

        if locked_order_ids:
            # Load locked schedule items
            locked_items_result = await db.execute(
                select(ProductionScheduleItem)
                .where(
                    ProductionScheduleItem.schedule_id == base_schedule_id,
                    ProductionScheduleItem.work_order_id.in_(locked_order_ids),
                )
            )
            locked_items = locked_items_result.scalars().all()

            # Collect locked time intervals per resource
            for item in locked_items:
                if item.machine_id:
                    locked_machine_intervals.setdefault(item.machine_id, []).append(
                        (item.start_time, item.end_time)
                    )
                else:
                    locked_external_intervals.setdefault(item.work_center_id, []).append(
                        (item.start_time, item.end_time)
                    )

            # Remove locked order operations from pending (they are locked, won't re-schedule)
            for op_id in list(pending_by_id.keys()):
                if pending_by_id[op_id].work_order_id in locked_order_ids:
                    pending_by_id.pop(op_id)

    # If all operations are locked, nothing to schedule
    if not pending_by_id:
        raise ValueError("所有选中订单的工序已被锁定，无需重新排产。请选择其他订单或取消锁定。")

    # Create new schedule
    schedule = ProductionSchedule(
        schedule_no=now.strftime("PS-%Y%m%d-%H%M%S-%f"),
        name=now.strftime("Production Schedule %Y-%m-%d %H:%M:%S"),
        status="draft",
        start_time=now,
        base_schedule_id=base_schedule_id,
        run_params_json=json.dumps({
            "start_time": now.isoformat(),
            "work_order_ids": work_order_ids,
            "base_schedule_id": base_schedule_id,
            "keep_locked": keep_locked,
        }, ensure_ascii=False),
    )
    db.add(schedule)
    await db.commit()
    await db.refresh(schedule)

    completed_end: dict[int, datetime] = {}
    machine_ready: dict[int, datetime] = {}
    external_ready: dict[int, datetime] = {}
    sequence_counter: dict[str, int] = {}
    schedule_items: list[ProductionScheduleItem] = []

    def _find_earliest_start(
        proposed_start: datetime,
        duration_hours: float,
        intervals: list[tuple[datetime, datetime]],
    ) -> datetime:
        """Advance proposed_start past any locked interval overlaps."""
        result = proposed_start
        sorted_intervals = sorted(intervals, key=lambda x: x[0])
        changed = True
        while changed:
            changed = False
            result_end = add_work_hours(result, duration_hours)
            for int_start, int_end in sorted_intervals:
                if result < int_end and result_end > int_start:
                    result = int_end
                    changed = True
                    break
        return result

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
            duration_h = operation.duration_hours or center.default_duration_hours
            proposed = max(start_floor, external_ready.get(center.id, now))
            intervals = locked_external_intervals.get(center.id, [])
            start_time_val = _find_earliest_start(proposed, duration_h, intervals)
            end_time = add_work_hours(start_time_val, duration_h)
            external_ready[center.id] = end_time
            machine = None
            resource_key = f"external-{center.id}"
        else:
            machines = [m for m in center.machines if m.status == "active"]
            if not machines:
                raise ValueError(f"工段 {center.name} 没有启用的设备，请先在资源配置中启用设备。")

            candidates = []
            for candidate in machines:
                proposed = max(start_floor, machine_ready.get(candidate.id, now))
                intervals = locked_machine_intervals.get(candidate.id, [])
                actual_start = _find_earliest_start(proposed, operation.duration_hours, intervals)
                actual_end = add_work_hours(actual_start, operation.duration_hours)
                candidates.append((actual_end, actual_start, candidate))
            end_time, start_time_val, machine = min(candidates, key=lambda item: (item[0], item[1], item[2].id))
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
            start_time=start_time_val,
            end_time=end_time,
            sequence_on_resource=sequence_counter[resource_key],
            is_external=center.is_external,
        )
        db.add(item)
        schedule_items.append(item)
        operation.status = "scheduled"
        completed_end[operation.id] = end_time
        pending_by_id.pop(operation.id)

    # Update work order statuses
    all_work_order_ids = {op.work_order_id for op in all_operations}
    for op in all_operations:
        op.work_order.status = "scheduled"

    # Copy locked order items from base schedule into new schedule
    if keep_locked and locked_order_ids:
        base_items_result = await db.execute(
            select(ProductionScheduleItem)
            .where(
                ProductionScheduleItem.schedule_id == base_schedule_id,
                ProductionScheduleItem.work_order_id.in_(locked_order_ids),
            )
        )
        for old_item in base_items_result.scalars().all():
            new_item = ProductionScheduleItem(
                schedule_id=schedule.id,
                operation_id=old_item.operation_id,
                work_order_id=old_item.work_order_id,
                part_id=old_item.part_id,
                work_center_id=old_item.work_center_id,
                machine_id=old_item.machine_id,
                start_time=old_item.start_time,
                end_time=old_item.end_time,
                sequence_on_resource=old_item.sequence_on_resource,
                is_external=old_item.is_external,
                locked=True,
                locked_at=old_item.locked_at,
                locked_by=old_item.locked_by,
                lock_reason=old_item.lock_reason,
            )
            db.add(new_item)

        # Copy order lock records to new schedule
        base_locks_result = await db.execute(
            select(ProductionScheduleOrderLock).where(
                ProductionScheduleOrderLock.schedule_id == base_schedule_id,
                ProductionScheduleOrderLock.work_order_id.in_(locked_order_ids),
                ProductionScheduleOrderLock.locked == True,
            )
        )
        for old_lock in base_locks_result.scalars().all():
            new_lock = ProductionScheduleOrderLock(
                schedule_id=schedule.id,
                work_order_id=old_lock.work_order_id,
                locked=True,
                locked_at=old_lock.locked_at,
                locked_by=old_lock.locked_by,
                note=old_lock.note,
            )
            db.add(new_lock)

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
        locked=item.locked,
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


async def get_production_gantt_data(db: AsyncSession, schedule_id: int | None = None) -> list[dict]:
    if schedule_id:
        result = await get_production_schedule_result(db, schedule_id)
    else:
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


def is_workday(day: date) -> bool:
    return day.weekday() != 6


def work_hours_on_day(start: datetime, end: datetime, day: date) -> float:
    if not is_workday(day) or end <= start:
        return 0.0

    total_minutes = 0
    for segment_start_time, segment_end_time in ((WORK_START, LUNCH_START), (LUNCH_END, WORK_END)):
        segment_start = datetime.combine(day, segment_start_time)
        segment_end = datetime.combine(day, segment_end_time)
        overlap_start = max(start, segment_start)
        overlap_end = min(end, segment_end)
        if overlap_end > overlap_start:
            total_minutes += int((overlap_end - overlap_start).total_seconds() // 60)
    return round(total_minutes / 60, 2)


def build_date_columns(start: date, days: int) -> list[ScheduleBoardDateColumn]:
    return [
        ScheduleBoardDateColumn(
            date=(start + timedelta(days=index)).isoformat(),
            weekday=WEEKDAYS[(start + timedelta(days=index)).weekday()],
            is_workday=is_workday(start + timedelta(days=index)),
        )
        for index in range(max(days, 1))
    ]


async def get_default_person_by_work_center(db: AsyncSession) -> dict[int, Personnel]:
    result = await db.execute(
        select(WorkCenterPersonnel)
        .options(selectinload(WorkCenterPersonnel.person))
        .order_by(WorkCenterPersonnel.work_center_id, WorkCenterPersonnel.sort_order, WorkCenterPersonnel.id)
    )
    people: dict[int, Personnel] = {}
    for link in result.scalars().all():
        people.setdefault(link.work_center_id, link.person)
    return people


async def get_schedule_board(
    db: AsyncSession,
    schedule_id: int,
    work_center: str | None = None,
    start_date: date | None = None,
    days: int = 14,
    order_id: int | None = None,
    view_mode: str = "by_work_center",
) -> ScheduleBoardResponse:
    if view_mode not in {"by_work_center", "by_machine", "by_person"}:
        raise ValueError("view_mode must be one of by_work_center, by_machine, by_person.")

    schedule = await db.get(ProductionSchedule, schedule_id)
    if schedule is None:
        raise ValueError("Schedule not found.")

    result = await db.execute(
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
            ProductionScheduleItem.start_time,
            ProductionScheduleItem.sequence_on_resource,
        )
    )
    items = list(result.scalars().all())

    if work_center:
        if work_center.isdigit():
            work_center_id = int(work_center)
            items = [item for item in items if item.work_center_id == work_center_id]
        else:
            items = [
                item
                for item in items
                if item.operation.work_center.name == work_center
            ]

    if order_id is not None:
        items = [item for item in items if item.work_order_id == order_id]

    if start_date is None:
        start_date = min((item.start_time.date() for item in items), default=datetime.utcnow().date())

    date_columns = build_date_columns(start_date, days)
    person_map = await get_default_person_by_work_center(db)
    rows: list[ScheduleBoardRow] = []

    for item in items:
        operation = item.operation
        work_order = operation.work_order
        part = operation.part
        center = operation.work_center
        person = person_map.get(center.id)
        person_name = person.name if person else "未分配"
        machine_name = item.machine.name if item.machine else None

        if view_mode == "by_machine":
            if item.machine_id:
                group_key = f"machine:{item.machine_id}"
                group_label = machine_name or "未分配设备"
            else:
                group_key = f"external:{center.id}"
                group_label = f"{center.name} / 外协"
        elif view_mode == "by_person":
            group_key = f"person:{person.id}" if person else "person:unassigned"
            group_label = person_name
        else:
            group_key = f"work_center:{center.id}"
            group_label = center.name

        daily_cells = [
            ScheduleBoardDailyCell(
                date=column.date,
                hours=work_hours_on_day(item.start_time, item.end_time, date.fromisoformat(column.date)),
            )
            for column in date_columns
        ]

        rows.append(
            ScheduleBoardRow(
                group_key=group_key,
                group_label=group_label,
                schedule_item_id=item.id,
                operation_id=item.operation_id,
                work_order_id=item.work_order_id,
                work_center_id=item.work_center_id,
                order_no=work_order.order_no,
                drawing_no=part.drawing_no,
                part_no=part.no,
                part_name=part.name,
                customer_name=work_order.customer,
                quantity=part.quantity,
                duration_hours=operation.duration_hours,
                due_date=work_order.due_date,
                planned_start=item.start_time,
                planned_end=item.end_time,
                machine_name=machine_name,
                person_name=person_name,
                is_external=item.is_external,
                is_late=item.end_time > work_order.due_date,
                daily_cells=daily_cells,
            )
        )

    rows.sort(key=lambda row: (row.group_label, row.planned_start, row.order_no, row.part_no))
    return ScheduleBoardResponse(
        schedule=schedule,
        view_mode=view_mode,
        date_columns=date_columns,
        rows=rows,
    )


async def lock_order_in_schedule(
    db: AsyncSession,
    schedule_id: int,
    work_order_id: int,
    locked_by: str | None = None,
    note: str | None = None,
) -> dict:
    schedule = await db.get(ProductionSchedule, schedule_id)
    if not schedule:
        raise ValueError("排产方案不存在。")

    work_order = await db.get(WorkOrder, work_order_id)
    if not work_order:
        raise ValueError("工单不存在。")

    # Check if order exists in this schedule
    items_result = await db.execute(
        select(ProductionScheduleItem).where(
            ProductionScheduleItem.schedule_id == schedule_id,
            ProductionScheduleItem.work_order_id == work_order_id,
        )
    )
    items = list(items_result.scalars().all())
    if not items:
        raise ValueError(f"订单 {work_order.order_no} 不在当前排产方案中。")

    # Upsert order lock
    lock_result = await db.execute(
        select(ProductionScheduleOrderLock).where(
            ProductionScheduleOrderLock.schedule_id == schedule_id,
            ProductionScheduleOrderLock.work_order_id == work_order_id,
        )
    )
    lock = lock_result.scalars().first()
    now = datetime.utcnow()
    if lock:
        lock.locked = True
        lock.locked_at = now
        lock.locked_by = locked_by
        lock.note = note
    else:
        lock = ProductionScheduleOrderLock(
            schedule_id=schedule_id,
            work_order_id=work_order_id,
            locked=True,
            locked_at=now,
            locked_by=locked_by,
            note=note,
        )
        db.add(lock)

    # Mark all schedule items for this order as locked
    for item in items:
        item.locked = True
        item.locked_at = now
        item.locked_by = locked_by

    await db.commit()
    await db.refresh(lock)
    return {"schedule_id": schedule_id, "work_order_id": work_order_id, "locked": True, "locked_at": now}


async def unlock_order_in_schedule(
    db: AsyncSession,
    schedule_id: int,
    work_order_id: int,
) -> dict:
    schedule = await db.get(ProductionSchedule, schedule_id)
    if not schedule:
        raise ValueError("排产方案不存在。")

    lock_result = await db.execute(
        select(ProductionScheduleOrderLock).where(
            ProductionScheduleOrderLock.schedule_id == schedule_id,
            ProductionScheduleOrderLock.work_order_id == work_order_id,
        )
    )
    lock = lock_result.scalars().first()
    if lock:
        lock.locked = False

    # Unmark schedule items
    items_result = await db.execute(
        select(ProductionScheduleItem).where(
            ProductionScheduleItem.schedule_id == schedule_id,
            ProductionScheduleItem.work_order_id == work_order_id,
        )
    )
    for item in items_result.scalars().all():
        item.locked = False
        item.locked_at = None
        item.locked_by = None
        item.lock_reason = None

    await db.commit()
    return {"schedule_id": schedule_id, "work_order_id": work_order_id, "locked": False}


async def get_locked_order_ids(db: AsyncSession, schedule_id: int) -> set[int]:
    result = await db.execute(
        select(ProductionScheduleOrderLock).where(
            ProductionScheduleOrderLock.schedule_id == schedule_id,
            ProductionScheduleOrderLock.locked == True,
        )
    )
    return {lock.work_order_id for lock in result.scalars().all()}


async def export_schedule_to_excel(db: AsyncSession, schedule_id: int) -> bytes:
    """Generate an Excel file with 4 sheets for the given schedule."""
    from openpyxl import Workbook
    from openpyxl.styles import Font, PatternFill, Alignment, Border, Side

    schedule = await db.get(ProductionSchedule, schedule_id)
    if not schedule:
        raise ValueError("排产方案不存在。")

    # Get schedule items with full relations
    item_result = await db.execute(
        select(ProductionScheduleItem)
        .where(ProductionScheduleItem.schedule_id == schedule_id)
        .options(
            selectinload(ProductionScheduleItem.operation).selectinload(ProductionOperation.work_order),
            selectinload(ProductionScheduleItem.operation).selectinload(ProductionOperation.part),
            selectinload(ProductionScheduleItem.operation).selectinload(ProductionOperation.work_center),
            selectinload(ProductionScheduleItem.machine),
        )
        .order_by(ProductionScheduleItem.start_time)
    )
    items = list(item_result.scalars().all())
    if not items:
        raise ValueError("该排产方案没有明细数据。")

    # Build data structures
    items_by_order: dict[int, list[ProductionScheduleItem]] = defaultdict(list)
    load_map: dict[tuple[int, int | None], dict] = {}
    for item in items:
        items_by_order[item.work_order_id].append(item)
        key = (item.work_center_id, item.machine_id)
        center = item.operation.work_center
        load = load_map.setdefault(key, {
            "work_center_name": center.name,
            "machine_name": item.machine.name if item.machine else "外协",
            "busy_minutes": 0,
            "is_external": item.is_external,
            "capacity_per_day": (
                center.default_capacity_per_day
                if item.is_external or item.machine is None
                else item.machine.capacity_per_day
            ),
        })
        load["busy_minutes"] += max(int(round(item.operation.duration_hours * 60)), 1)

    locked_order_ids = await get_locked_order_ids(db, schedule_id)

    # Styles
    header_font = Font(bold=True, color="FFFFFF", size=11)
    header_fill = PatternFill(start_color="2D5D8C", end_color="2D5D8C", fill_type="solid")
    thin_border = Border(
        left=Side(style="thin"), right=Side(style="thin"),
        top=Side(style="thin"), bottom=Side(style="thin"),
    )

    def style_header(ws, col_count):
        for col in range(1, col_count + 1):
            cell = ws.cell(1, col)
            cell.font = header_font
            cell.fill = header_fill
            cell.alignment = Alignment(horizontal="center", vertical="center")
            cell.border = thin_border

    wb = Workbook()

    # Sheet 1: 订单完工表
    ws1 = wb.active
    ws1.title = "订单完工表"
    ws1_headers = [
        "排产方案号", "订单号", "客户", "产品名称", "数量", "优先级",
        "交期", "预计开始", "预计完成", "延期天数", "状态", "锁定", "主要瓶颈"
    ]
    for col, h in enumerate(ws1_headers, 1):
        ws1.cell(1, col, h)
    style_header(ws1, len(ws1_headers))

    row_idx = 2
    for order_id, order_items in items_by_order.items():
        wo = order_items[0].operation.work_order
        planned_start = min(it.start_time for it in order_items)
        planned_end = max(it.end_time for it in order_items)
        delay_days = max((planned_end.date() - wo.due_date.date()).days, 0) if planned_end > wo.due_date else 0
        status = "延期" if planned_end > wo.due_date else "正常"
        is_locked = order_id in locked_order_ids

        # Find bottleneck
        latest_item = max(order_items, key=lambda it: it.end_time)
        bottleneck = latest_item.operation.work_center.name if planned_end > wo.due_date else ""

        ws1.cell(row_idx, 1, schedule.schedule_no)
        ws1.cell(row_idx, 2, wo.order_no)
        ws1.cell(row_idx, 3, wo.customer)
        ws1.cell(row_idx, 4, wo.product_name)
        ws1.cell(row_idx, 5, wo.quantity)
        ws1.cell(row_idx, 6, wo.priority)
        ws1.cell(row_idx, 7, wo.due_date.strftime("%Y-%m-%d"))
        ws1.cell(row_idx, 8, planned_start.strftime("%Y-%m-%d %H:%M"))
        ws1.cell(row_idx, 9, planned_end.strftime("%Y-%m-%d %H:%M"))
        ws1.cell(row_idx, 10, delay_days)
        ws1.cell(row_idx, 11, status)
        ws1.cell(row_idx, 12, "已锁定" if is_locked else "")
        ws1.cell(row_idx, 13, bottleneck)
        for col in range(1, len(ws1_headers) + 1):
            ws1.cell(row_idx, col).border = thin_border
        row_idx += 1

    for col in range(1, len(ws1_headers) + 1):
        ws1.column_dimensions[ws1.cell(1, col).column_letter].width = 16

    # Sheet 2: 设备排班表
    ws2 = wb.create_sheet("设备排班表")
    ws2_headers = [
        "日期", "工段", "设备", "订单号", "客户", "零件图号", "零件名称",
        "工序", "计划开始", "计划结束", "工时(小时)", "外协"
    ]
    for col, h in enumerate(ws2_headers, 1):
        ws2.cell(1, col, h)
    style_header(ws2, len(ws2_headers))

    row_idx = 2
    for item in items:
        op = item.operation
        wo = op.work_order
        part = op.part
        center = op.work_center
        ws2.cell(row_idx, 1, item.start_time.strftime("%Y-%m-%d"))
        ws2.cell(row_idx, 2, center.name)
        ws2.cell(row_idx, 3, item.machine.name if item.machine else "外协")
        ws2.cell(row_idx, 4, wo.order_no)
        ws2.cell(row_idx, 5, wo.customer)
        ws2.cell(row_idx, 6, part.drawing_no)
        ws2.cell(row_idx, 7, part.name)
        ws2.cell(row_idx, 8, op.name)
        ws2.cell(row_idx, 9, item.start_time.strftime("%Y-%m-%d %H:%M"))
        ws2.cell(row_idx, 10, item.end_time.strftime("%Y-%m-%d %H:%M"))
        ws2.cell(row_idx, 11, round(op.duration_hours, 2))
        ws2.cell(row_idx, 12, "是" if item.is_external else "否")
        for col in range(1, len(ws2_headers) + 1):
            ws2.cell(row_idx, col).border = thin_border
        row_idx += 1

    for col in range(1, len(ws2_headers) + 1):
        ws2.column_dimensions[ws2.cell(1, col).column_letter].width = 16

    # Sheet 3: 资源负荷表
    ws3 = wb.create_sheet("资源负荷表")
    ws3_headers = ["工段", "设备", "占用分钟", "可用分钟", "负荷率", "状态"]
    for col, h in enumerate(ws3_headers, 1):
        ws3.cell(1, col, h)
    style_header(ws3, len(ws3_headers))

    # Calculate available minutes
    first_day = min(it.start_time.date() for it in items)
    last_day = max(it.end_time.date() for it in items)
    workdays = _workday_count_for_export(first_day, last_day)

    row_idx = 2
    for key, load in sorted(load_map.items(), key=lambda x: x[1]["busy_minutes"], reverse=True):
        cap_per_day = load["capacity_per_day"]
        available = max(workdays * cap_per_day, 1)
        utilization = round(load["busy_minutes"] / available, 3)
        if utilization >= 0.9:
            status = "瓶颈"
        elif utilization >= 0.6:
            status = "正常"
        else:
            status = "空闲较多"

        ws3.cell(row_idx, 1, load["work_center_name"])
        ws3.cell(row_idx, 2, load["machine_name"])
        ws3.cell(row_idx, 3, load["busy_minutes"])
        ws3.cell(row_idx, 4, available)
        ws3.cell(row_idx, 5, f"{utilization * 100:.1f}%")
        ws3.cell(row_idx, 6, status)
        for col in range(1, len(ws3_headers) + 1):
            ws3.cell(row_idx, col).border = thin_border
        row_idx += 1

    for col in range(1, len(ws3_headers) + 1):
        ws3.column_dimensions[ws3.cell(1, col).column_letter].width = 18

    # Sheet 4: 逾期风险表
    ws4 = wb.create_sheet("逾期风险表")
    ws4_headers = ["订单号", "客户", "交期", "预计完成", "延期天数", "瓶颈资源", "原因", "建议动作"]
    for col, h in enumerate(ws4_headers, 1):
        ws4.cell(1, col, h)
    style_header(ws4, len(ws4_headers))

    row_idx = 2
    risk_load_by_resource = {
        (load["work_center_name"], load["machine_name"]): load
        for load in load_map.values()
    }
    for order_items in items_by_order.values():
        wo = order_items[0].operation.work_order
        planned_end = max(it.end_time for it in order_items)
        if planned_end <= wo.due_date:
            continue
        delay_days = max((planned_end.date() - wo.due_date.date()).days, 0)
        latest_item = max(order_items, key=lambda it: it.end_time)
        center_name = latest_item.operation.work_center.name
        machine_name = latest_item.machine.name if latest_item.machine else "外协"
        load_entry = risk_load_by_resource.get((center_name, machine_name))
        cap_per_day = load_entry["capacity_per_day"] if load_entry else 480
        is_bottleneck = load_entry and (load_entry["busy_minutes"] / max(workdays * cap_per_day, 1)) >= 0.9

        if is_bottleneck:
            reason = f"{center_name}资源负荷较高，导致关键工序等待或排队。"
        else:
            reason = f"{center_name}为最后完成工序，订单整体完工晚于交期。"

        ws4.cell(row_idx, 1, wo.order_no)
        ws4.cell(row_idx, 2, wo.customer)
        ws4.cell(row_idx, 3, wo.due_date.strftime("%Y-%m-%d"))
        ws4.cell(row_idx, 4, planned_end.strftime("%Y-%m-%d %H:%M"))
        ws4.cell(row_idx, 5, delay_days)
        ws4.cell(row_idx, 6, center_name)
        ws4.cell(row_idx, 7, reason)
        ws4.cell(row_idx, 8, "建议调整订单优先级、增加该工段班次、临时外协或检查是否存在设备空闲未利用。")
        for col in range(1, len(ws4_headers) + 1):
            ws4.cell(row_idx, col).border = thin_border
        row_idx += 1

    if row_idx == 2:
        ws4.cell(2, 1, "暂无延期风险")
        for col in range(1, len(ws4_headers) + 1):
            ws4.cell(2, col).border = thin_border

    for col in range(1, len(ws4_headers) + 1):
        ws4.column_dimensions[ws4.cell(1, col).column_letter].width = 20

    # Save export record
    filename = f"排产结果_{schedule.schedule_no}.xlsx"
    export_record = ExportBatch(
        export_type="schedule_result",
        schedule_id=schedule_id,
        filename=filename,
    )
    db.add(export_record)
    await db.commit()

    # Return bytes
    buffer = BytesIO()
    wb.save(buffer)
    buffer.seek(0)
    return buffer.getvalue()


def _workday_count_for_export(start_day: date, end_day: date) -> int:
    current = start_day
    count = 0
    while current <= end_day:
        if is_workday(current):
            count += 1
        current += timedelta(days=1)
    return max(count, 1)
