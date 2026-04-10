from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.crud.task import create_schedule_tasks, delete_pending_schedule_tasks
from app.models.order import Order
from app.models.routing import Routing
from app.schemas.task import ScheduleTaskCreate


async def generate_schedule_tasks(db: AsyncSession):
    result = await db.execute(
        select(Order)
        .where(Order.status == "pending")
        .options(selectinload(Order.routings).selectinload(Routing.routing_operations))
        .order_by(Order.id)
    )
    orders = list(result.scalars().unique().all())

    if not orders:
        raise ValueError("No pending orders found. Please create pending orders first.")

    has_routing = any(order.routings for order in orders)
    if not has_routing:
        raise ValueError("No routings found for pending orders. Please create routings first.")

    has_operation = any(
        routing.routing_operations
        for order in orders
        for routing in order.routings
    )
    if not has_operation:
        raise ValueError("No routing operations found. Please create operations first.")

    await delete_pending_schedule_tasks(db)

    task_payloads: list[ScheduleTaskCreate] = []

    for order in orders:
        routings = sorted(order.routings, key=lambda item: item.id)
        for routing in routings:
            operations = sorted(routing.routing_operations, key=lambda item: item.seq_no)
            for operation in operations:
                total_process_time = order.quantity * operation.process_time + operation.setup_time
                task_payloads.append(
                    ScheduleTaskCreate(
                        order_id=order.id,
                        routing_op_id=operation.id,
                        task_name=f"{order.order_no}-{operation.operation_name}",
                        seq_no=operation.seq_no,
                        machine_id=operation.machine_id,
                        quantity=order.quantity,
                        process_time=total_process_time,
                        status="pending",
                    )
                )

    if not task_payloads:
        raise ValueError("No schedule tasks were generated. Please verify source data.")

    return await create_schedule_tasks(db, task_payloads)
