from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.machine import Machine
from app.models.order import Order


async def get_dashboard_summary(db: AsyncSession) -> dict:
    machine_count_result = await db.execute(select(func.count(Machine.id)))
    order_count_result = await db.execute(select(func.count(Order.id)))
    pending_count_result = await db.execute(
        select(func.count(Order.id)).where(Order.status == "pending")
    )
    scheduled_count_result = await db.execute(
        select(func.count(Order.id)).where(Order.status == "scheduled")
    )

    return {
        "machine_count": machine_count_result.scalar_one(),
        "order_count": order_count_result.scalar_one(),
        "pending_order_count": pending_count_result.scalar_one(),
        "scheduled_order_count": scheduled_count_result.scalar_one(),
    }
