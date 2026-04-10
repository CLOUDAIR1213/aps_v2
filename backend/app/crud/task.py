from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.order import Order
from app.models.task import ScheduleTask
from app.schemas.task import ScheduleTaskCreate


async def get_schedule_tasks(db: AsyncSession) -> list[ScheduleTask]:
    result = await db.execute(select(ScheduleTask).order_by(ScheduleTask.id))
    return list(result.scalars().all())


async def get_schedule_task_by_id(
    db: AsyncSession,
    task_id: int,
) -> ScheduleTask | None:
    return await db.get(ScheduleTask, task_id)


async def delete_pending_schedule_tasks(db: AsyncSession) -> None:
    await db.execute(delete(ScheduleTask).where(ScheduleTask.status == "pending"))
    await db.commit()


async def create_schedule_tasks(
    db: AsyncSession,
    payloads: list[ScheduleTaskCreate],
) -> list[ScheduleTask]:
    tasks = [ScheduleTask(**payload.model_dump()) for payload in payloads]
    db.add_all(tasks)
    await db.commit()

    for task in tasks:
        await db.refresh(task)

    return tasks


async def get_pending_schedule_tasks(db: AsyncSession) -> list[ScheduleTask]:
    result = await db.execute(
        select(ScheduleTask)
        .where(ScheduleTask.status == "pending")
        .options(
            selectinload(ScheduleTask.order),
            selectinload(ScheduleTask.machine),
        )
    )
    return list(result.scalars().all())


async def mark_schedule_tasks_scheduled(
    db: AsyncSession,
    tasks: list[ScheduleTask],
) -> None:
    for task in tasks:
        task.status = "scheduled"

    await db.commit()


async def mark_orders_scheduled(
    db: AsyncSession,
    order_ids: list[int],
) -> None:
    if not order_ids:
        return

    result = await db.execute(select(Order).where(Order.id.in_(order_ids)))
    orders = list(result.scalars().all())

    for order in orders:
        order.status = "scheduled"

    await db.commit()
