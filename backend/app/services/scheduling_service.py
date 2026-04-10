from datetime import datetime, timedelta

from sqlalchemy.ext.asyncio import AsyncSession

from app.crud.schedule import create_schedule, create_schedule_items
from app.crud.task import (
    get_pending_schedule_tasks,
    mark_orders_scheduled,
    mark_schedule_tasks_scheduled,
)


async def run_rule_based_scheduling(db: AsyncSession) -> dict:
    pending_tasks = await get_pending_schedule_tasks(db)
    if not pending_tasks:
        raise ValueError("No pending schedule tasks found. Please generate tasks first.")

    now = datetime.utcnow()
    schedule = await create_schedule(
        db=db,
        schedule_no=now.strftime("SCH-%Y%m%d-%H%M%S-%f"),
        name=now.strftime("Rule Schedule %Y-%m-%d %H:%M:%S"),
        status="draft",
    )

    sorted_tasks = sorted(
        pending_tasks,
        key=lambda task: (
            -task.order.priority,
            task.order.due_date,
            task.order.created_at,
            task.seq_no,
            task.id,
        ),
    )

    machine_available_time: dict[int, datetime] = {}
    machine_sequence_counter: dict[int, int] = {}
    order_last_end_time: dict[int, datetime] = {}
    results: list[dict] = []
    schedule_items_data: list[dict] = []

    for task in sorted_tasks:
        machine_ready_time = machine_available_time.get(task.machine_id, now)
        order_ready_time = order_last_end_time.get(task.order_id, now)
        start_time = max(now, machine_ready_time, order_ready_time)
        end_time = start_time + timedelta(hours=task.process_time)
        sequence_on_machine = machine_sequence_counter.get(task.machine_id, 0) + 1

        machine_available_time[task.machine_id] = end_time
        machine_sequence_counter[task.machine_id] = sequence_on_machine
        order_last_end_time[task.order_id] = end_time

        schedule_items_data.append(
            {
                "schedule_id": schedule.id,
                "task_id": task.id,
                "order_id": task.order_id,
                "machine_id": task.machine_id,
                "start_time": start_time,
                "end_time": end_time,
                "sequence_on_machine": sequence_on_machine,
            }
        )

    created_items = await create_schedule_items(db, schedule_items_data)
    await mark_schedule_tasks_scheduled(db, sorted_tasks)
    await mark_orders_scheduled(db, list({task.order_id for task in sorted_tasks}))

    for item, task in zip(created_items, sorted_tasks, strict=False):
        results.append(
            {
                "id": item.id,
                "schedule_id": item.schedule_id,
                "task_id": item.task_id,
                "order_id": item.order_id,
                "machine_id": item.machine_id,
                "start_time": item.start_time,
                "end_time": item.end_time,
                "sequence_on_machine": item.sequence_on_machine,
                "order_no": task.order.order_no,
                "task_name": task.task_name,
                "machine_code": task.machine.code,
                "machine_name": task.machine.name,
                "created_at": item.created_at,
                "updated_at": item.updated_at,
            }
        )

    return {"schedule": schedule, "items": results}
