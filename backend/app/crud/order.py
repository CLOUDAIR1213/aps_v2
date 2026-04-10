from app.models.order import Order
from app.schemas.order import OrderCreate, OrderUpdate
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession


async def create_order(db: AsyncSession, payload: OrderCreate) -> Order:
    order = Order(**payload.model_dump())
    db.add(order)
    await db.commit()
    await db.refresh(order)
    return order


async def get_orders(db: AsyncSession) -> list[Order]:
    result = await db.execute(select(Order).order_by(Order.id))
    return list(result.scalars().all())


async def get_order_by_id(db: AsyncSession, order_id: int) -> Order | None:
    return await db.get(Order, order_id)


async def update_order(
    db: AsyncSession,
    order: Order,
    payload: OrderUpdate,
) -> Order:
    update_data = payload.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(order, field, value)

    await db.commit()
    await db.refresh(order)
    return order


async def delete_order(db: AsyncSession, order: Order) -> None:
    await db.delete(order)
    await db.commit()
