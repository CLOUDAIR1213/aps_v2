from __future__ import annotations

from collections import defaultdict
from datetime import date, timedelta

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.production import (
    OperationDependency,
    ProductionOperation,
    ProductionSchedule,
    ProductionScheduleItem,
    ProductionScheduleItemPersonnelAllocation,
    ProductionScheduleOrderLock,
    WorkCenter,
)
from app.schemas.production import (
    OrderScheduleDependency,
    OrderScheduleDependencyReason,
    OrderScheduleDetail,
    OrderScheduleOperation,
    OrderSchedulePart,
    PersonnelAllocationRead,
    ProductionOrderOverviewRow,
    ProductionScheduleListResponse,
    ProductionSchedulingOverview,
    ResourceLoadResponse,
    ResourceLoadRow,
    ScheduleRiskResponse,
    ScheduleRiskRow,
)
from app.services.production_service import is_workday, scheduled_work_minutes


async def list_production_schedules(db: AsyncSession) -> ProductionScheduleListResponse:
    result = await db.execute(select(ProductionSchedule).order_by(ProductionSchedule.created_at.desc()))
    return ProductionScheduleListResponse(schedules=list(result.scalars().all()))


async def _resolve_schedule(db: AsyncSession, schedule_id: int | None) -> ProductionSchedule:
    if schedule_id is not None:
        schedule = await db.get(ProductionSchedule, schedule_id)
    else:
        result = await db.execute(select(ProductionSchedule).order_by(ProductionSchedule.created_at.desc()))
        schedule = result.scalars().first()
    if schedule is None:
        raise ValueError("暂无排产方案，请先执行生产排产。")
    return schedule


async def _load_schedule_items(db: AsyncSession, schedule_id: int) -> list[ProductionScheduleItem]:
    result = await db.execute(
        select(ProductionScheduleItem)
        .where(ProductionScheduleItem.schedule_id == schedule_id)
        .options(
            selectinload(ProductionScheduleItem.operation).selectinload(ProductionOperation.work_order),
            selectinload(ProductionScheduleItem.operation).selectinload(ProductionOperation.part),
            selectinload(ProductionScheduleItem.operation).selectinload(ProductionOperation.work_center),
            selectinload(ProductionScheduleItem.machine),
            selectinload(ProductionScheduleItem.personnel_allocations).selectinload(
                ProductionScheduleItemPersonnelAllocation.person
            ),
        )
        .order_by(ProductionScheduleItem.start_time, ProductionScheduleItem.id)
    )
    return list(result.scalars().all())


def _delay_days(planned_end, due_date) -> int:
    if planned_end <= due_date:
        return 0
    return max((planned_end.date() - due_date.date()).days, 0)


def _resource_status(utilization: float) -> str:
    if utilization >= 0.9:
        return "bottleneck"
    if utilization >= 0.6:
        return "normal"
    return "idle"


def _workday_count(start_day: date, end_day: date) -> int:
    current = start_day
    count = 0
    while current <= end_day:
        if is_workday(current):
            count += 1
        current += timedelta(days=1)
    return max(count, 1)


def _resource_load_rows(schedule: ProductionSchedule, items: list[ProductionScheduleItem]) -> ResourceLoadResponse:
    if not items:
        return ResourceLoadResponse(schedule=schedule, resources=[])

    first_day = min(item.start_time.date() for item in items)
    last_day = max(item.end_time.date() for item in items)
    workdays = _workday_count(first_day, last_day)
    groups: dict[tuple[int, int | None], dict] = {}

    for item in items:
        operation = item.operation
        center = operation.work_center
        key = (item.work_center_id, item.machine_id)
        row = groups.setdefault(
            key,
            {
                "work_center_id": item.work_center_id,
                "work_center_name": center.name,
                "machine_id": item.machine_id,
                "machine_name": item.machine.name if item.machine else "外协",
                "busy_minutes": 0,
                "is_external": item.is_external,
                "capacity_per_day": (
                    center.default_capacity_per_day
                    if item.is_external or item.machine is None
                    else item.machine.capacity_per_day
                ),
            },
        )
        row["busy_minutes"] += scheduled_work_minutes(item.start_time, item.end_time)

    resources: list[ResourceLoadRow] = []
    for row in groups.values():
        available_minutes = max(workdays * int(row.pop("capacity_per_day")), 1)
        utilization = round(row["busy_minutes"] / available_minutes, 3)
        resources.append(
            ResourceLoadRow(
                **row,
                available_minutes=available_minutes,
                utilization=utilization,
                status=_resource_status(utilization),
            )
        )

    resources.sort(key=lambda resource: resource.utilization, reverse=True)
    return ResourceLoadResponse(schedule=schedule, resources=resources)


async def get_production_resource_load(
    db: AsyncSession,
    schedule_id: int | None = None,
) -> ResourceLoadResponse:
    schedule = await _resolve_schedule(db, schedule_id)
    items = await _load_schedule_items(db, schedule.id)
    return _resource_load_rows(schedule, items)


async def get_production_scheduling_overview(
    db: AsyncSession,
    schedule_id: int | None = None,
) -> ProductionSchedulingOverview:
    schedule = await _resolve_schedule(db, schedule_id)
    items = await _load_schedule_items(db, schedule.id)
    load = _resource_load_rows(schedule, items)
    load_by_resource = {
        (row.work_center_id, row.machine_id): row
        for row in load.resources
    }
    items_by_order: dict[int, list[ProductionScheduleItem]] = defaultdict(list)
    for item in items:
        items_by_order[item.work_order_id].append(item)

    # Load locked orders
    locked_result = await db.execute(
        select(ProductionScheduleOrderLock).where(
            ProductionScheduleOrderLock.schedule_id == schedule.id,
            ProductionScheduleOrderLock.locked == True,
        )
    )
    locked_order_ids = {lock.work_order_id for lock in locked_result.scalars().all()}

    rows: list[ProductionOrderOverviewRow] = []
    for order_id, order_items in items_by_order.items():
        first_item = order_items[0]
        work_order = first_item.operation.work_order
        planned_start = min(item.start_time for item in order_items)
        planned_end = max(item.end_time for item in order_items)
        delayed = planned_end > work_order.due_date
        latest_item = max(order_items, key=lambda item: item.end_time)
        latest_load = load_by_resource.get((latest_item.work_center_id, latest_item.machine_id))
        main_bottleneck = None
        if delayed and latest_load and latest_load.utilization >= 0.9:
            main_bottleneck = latest_item.operation.work_center.name

        rows.append(
            ProductionOrderOverviewRow(
                work_order_id=work_order.id,
                order_no=work_order.order_no,
                customer_name=work_order.customer,
                product_name=work_order.product_name,
                quantity=work_order.quantity,
                priority=work_order.priority,
                due_date=work_order.due_date,
                planned_start_time=planned_start,
                planned_end_time=planned_end,
                delay_days=_delay_days(planned_end, work_order.due_date),
                status="delayed" if delayed else "normal",
                main_bottleneck=main_bottleneck,
                is_locked=order_id in locked_order_ids,
            )
        )

    rows.sort(key=lambda row: (row.status != "delayed", row.due_date, -row.priority, row.order_no))
    average_utilization = (
        round(sum(row.utilization for row in load.resources) / len(load.resources), 3)
        if load.resources
        else 0
    )

    return ProductionSchedulingOverview(
        schedule_id=schedule.id,
        schedule_no=schedule.schedule_no,
        schedule_name=schedule.name,
        total_orders=len(rows),
        scheduled_orders=len(rows),
        delayed_orders=len([row for row in rows if row.status == "delayed"]),
        average_resource_utilization=average_utilization,
        latest_finish_time=max((row.planned_end_time for row in rows), default=None),
        orders=rows,
    )


async def get_order_schedule_detail(
    db: AsyncSession,
    work_order_id: int,
    schedule_id: int | None = None,
) -> OrderScheduleDetail:
    schedule = await _resolve_schedule(db, schedule_id)
    items = [
        item
        for item in await _load_schedule_items(db, schedule.id)
        if item.work_order_id == work_order_id
    ]
    if not items:
        raise ValueError("当前方案中未找到该工单的排产结果。")

    work_order = items[0].operation.work_order
    operation_ids = {item.operation_id for item in items}
    dependency_result = await db.execute(
        select(OperationDependency).where(
            OperationDependency.operation_id.in_(operation_ids),
            OperationDependency.depends_on_operation_id.in_(operation_ids),
        )
    )
    dependencies = list(dependency_result.scalars().all())
    predecessor_map: dict[int, list[int]] = defaultdict(list)
    for dependency in dependencies:
        predecessor_map[dependency.operation_id].append(dependency.depends_on_operation_id)
    item_by_operation_id = {item.operation_id: item for item in items}

    def dependency_reasons_for(item: ProductionScheduleItem) -> list[OrderScheduleDependencyReason]:
        reasons: list[OrderScheduleDependencyReason] = []
        successor_part = item.operation.part
        for predecessor_operation_id in sorted(predecessor_map.get(item.operation_id, [])):
            predecessor_item = item_by_operation_id.get(predecessor_operation_id)
            if predecessor_item is None:
                continue
            predecessor_part = predecessor_item.operation.part
            if predecessor_item.part_id == item.part_id:
                reasons.append(
                    OrderScheduleDependencyReason(
                        predecessor_operation_id=predecessor_operation_id,
                        type="sequence",
                        reason="同一零件内上一道工序完成后才能开始。",
                    )
                )
            else:
                reasons.append(
                    OrderScheduleDependencyReason(
                        predecessor_operation_id=predecessor_operation_id,
                        type="hierarchy",
                        reason=f"父级 {successor_part.no} 必须等待子级 {predecessor_part.no} 完成。",
                    )
                )
        return reasons

    items_by_part: dict[int, list[ProductionScheduleItem]] = defaultdict(list)
    for item in items:
        items_by_part[item.part_id].append(item)

    parts: list[OrderSchedulePart] = []
    for part_items in items_by_part.values():
        part = part_items[0].operation.part
        part_start = min(item.start_time for item in part_items)
        part_end = max(item.end_time for item in part_items)
        operations = [
            OrderScheduleOperation(
                operation_id=item.operation_id,
                operation_name=item.operation.name,
                work_center_id=item.work_center_id,
                work_center_name=item.operation.work_center.name,
                machine_id=item.machine_id,
                machine_name=item.machine.name if item.machine else None,
                planned_start_time=item.start_time,
                planned_end_time=item.end_time,
                duration_minutes=scheduled_work_minutes(item.start_time, item.end_time),
                predecessor_operation_ids=sorted(predecessor_map.get(item.operation_id, [])),
                dependency_reasons=dependency_reasons_for(item),
                allocations=[
                    PersonnelAllocationRead(
                        id=allocation.id,
                        schedule_item_id=allocation.schedule_item_id,
                        person_id=allocation.person_id,
                        employee_no=allocation.person.employee_no,
                        person_name=allocation.person.name,
                        ratio_percent=allocation.ratio_percent,
                        planned_minutes=allocation.planned_minutes,
                    )
                    for allocation in sorted(
                        item.personnel_allocations,
                        key=lambda row: (row.person.name, row.person_id),
                    )
                ],
            )
            for item in sorted(part_items, key=lambda value: (value.start_time, value.operation.seq_no))
        ]
        parts.append(
            OrderSchedulePart(
                part_id=part.id,
                part_no=part.no,
                drawing_no=part.drawing_no,
                part_name=part.name,
                quantity=part.quantity,
                planned_start_time=part_start,
                planned_end_time=part_end,
                operations=operations,
            )
        )

    planned_start = min(item.start_time for item in items)
    planned_end = max(item.end_time for item in items)
    parts.sort(key=lambda part: (part.planned_start_time, part.part_no))

    return OrderScheduleDetail(
        work_order_id=work_order.id,
        order_no=work_order.order_no,
        customer_name=work_order.customer,
        product_name=work_order.product_name,
        quantity=work_order.quantity,
        priority=work_order.priority,
        due_date=work_order.due_date,
        planned_start_time=planned_start,
        planned_end_time=planned_end,
        delay_days=_delay_days(planned_end, work_order.due_date),
        status="delayed" if planned_end > work_order.due_date else "normal",
        parts=parts,
        dependencies=[
            OrderScheduleDependency(
                predecessor_operation_id=dependency.depends_on_operation_id,
                successor_operation_id=dependency.operation_id,
            )
            for dependency in dependencies
        ],
    )


async def get_production_scheduling_risks(
    db: AsyncSession,
    schedule_id: int | None = None,
) -> ScheduleRiskResponse:
    schedule = await _resolve_schedule(db, schedule_id)
    items = await _load_schedule_items(db, schedule.id)
    load = _resource_load_rows(schedule, items)
    load_by_resource = {
        (row.work_center_id, row.machine_id): row
        for row in load.resources
    }
    items_by_order: dict[int, list[ProductionScheduleItem]] = defaultdict(list)
    for item in items:
        items_by_order[item.work_order_id].append(item)

    risks: list[ScheduleRiskRow] = []
    for order_items in items_by_order.values():
        work_order = order_items[0].operation.work_order
        planned_end = max(item.end_time for item in order_items)
        if planned_end <= work_order.due_date:
            continue
        latest_item = max(order_items, key=lambda item: item.end_time)
        latest_load = load_by_resource.get((latest_item.work_center_id, latest_item.machine_id))
        bottleneck = latest_item.operation.work_center.name
        if latest_load and latest_load.utilization < 0.9:
            bottleneck = None
        resource_name = bottleneck or latest_item.operation.work_center.name
        reason = (
            f"{resource_name}资源负荷较高，导致关键工序等待或排队。"
            if bottleneck
            else f"{resource_name}为最后完成工序，订单整体完工晚于交期。"
        )
        risks.append(
            ScheduleRiskRow(
                work_order_id=work_order.id,
                order_no=work_order.order_no,
                customer_name=work_order.customer,
                due_date=work_order.due_date,
                planned_end_time=planned_end,
                delay_days=_delay_days(planned_end, work_order.due_date),
                bottleneck_resource=bottleneck,
                reason=reason,
                suggestion="建议调整订单优先级、增加该工段班次、临时外协或检查是否存在设备空闲未利用。",
            )
        )

    risks.sort(key=lambda risk: (risk.delay_days, risk.planned_end_time), reverse=True)
    return ScheduleRiskResponse(schedule=schedule, risks=risks)
