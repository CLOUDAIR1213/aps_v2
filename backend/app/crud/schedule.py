from datetime import datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.schedule import Schedule, ScheduleItem


async def create_schedule(
    db: AsyncSession,
    schedule_no: str,
    name: str,
    status: str = "draft",
) -> Schedule:
    schedule = Schedule(schedule_no=schedule_no, name=name, status=status)
    db.add(schedule)
    await db.commit()
    await db.refresh(schedule)
    return schedule


async def create_schedule_items(
    db: AsyncSession,
    items_data: list[dict],
) -> list[ScheduleItem]:
    items = [ScheduleItem(**item_data) for item_data in items_data]
    db.add_all(items)
    await db.commit()

    for item in items:
        await db.refresh(item)

    return items


async def get_latest_schedule(db: AsyncSession) -> Schedule | None:
    result = await db.execute(
        select(Schedule).order_by(Schedule.created_at.desc(), Schedule.id.desc())
    )
    return result.scalars().first()


async def get_schedule_by_id(db: AsyncSession, schedule_id: int) -> Schedule | None:
    return await db.get(Schedule, schedule_id)


async def get_schedule_items_by_schedule_id(
    db: AsyncSession,
    schedule_id: int,
) -> list[ScheduleItem]:
    result = await db.execute(
        select(ScheduleItem)
        .where(ScheduleItem.schedule_id == schedule_id)
        .options(
            selectinload(ScheduleItem.order),
            selectinload(ScheduleItem.machine),
            selectinload(ScheduleItem.task),
        )
        .order_by(ScheduleItem.machine_id, ScheduleItem.sequence_on_machine, ScheduleItem.id)
    )
    return list(result.scalars().all())


async def get_schedule_result_by_id(
    db: AsyncSession,
    schedule_id: int,
) -> tuple[Schedule | None, list[ScheduleItem]]:
    schedule = await get_schedule_by_id(db, schedule_id)
    if schedule is None:
        return None, []
    items = await get_schedule_items_by_schedule_id(db, schedule_id)
    return schedule, items


async def get_latest_schedule_result(
    db: AsyncSession,
) -> tuple[Schedule | None, list[ScheduleItem]]:
    schedule = await get_latest_schedule(db)
    if schedule is None:
        return None, []
    items = await get_schedule_items_by_schedule_id(db, schedule.id)
    return schedule, items


async def get_gantt_data(
    db: AsyncSession,
    schedule_id: int | None = None,
) -> list[dict]:
    if schedule_id is None:
        schedule = await get_latest_schedule(db)
        if schedule is None:
            return []
        schedule_id = schedule.id

    result = await db.execute(
        select(ScheduleItem)
        .where(ScheduleItem.schedule_id == schedule_id)
        .options(
            selectinload(ScheduleItem.order),
            selectinload(ScheduleItem.machine),
            selectinload(ScheduleItem.task),
        )
        .order_by(ScheduleItem.machine_id, ScheduleItem.sequence_on_machine, ScheduleItem.id)
    )
    items = list(result.scalars().all())

    grouped: dict[int, dict] = {}
    for item in items:
        machine_group = grouped.setdefault(
            item.machine_id,
            {
                "machine_id": item.machine_id,
                "machine_code": item.machine.code,
                "machine_name": item.machine.name,
                "tasks": [],
            },
        )
        machine_group["tasks"].append(
            {
                "schedule_item_id": item.id,
                "task_id": item.task_id,
                "order_id": item.order_id,
                "order_no": item.order.order_no,
                "task_name": item.task.task_name,
                "start_time": item.start_time,
                "end_time": item.end_time,
                "sequence_on_machine": item.sequence_on_machine,
            }
        )

    return list(grouped.values())
