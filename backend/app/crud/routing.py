from app.models.routing import Routing
from app.schemas.routing import RoutingCreate, RoutingUpdate
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession


async def create_routing(db: AsyncSession, payload: RoutingCreate) -> Routing:
    routing = Routing(**payload.model_dump())
    db.add(routing)
    await db.commit()
    await db.refresh(routing)
    return routing


async def get_routings_by_order_id(db: AsyncSession, order_id: int) -> list[Routing]:
    result = await db.execute(
        select(Routing).where(Routing.order_id == order_id).order_by(Routing.id)
    )
    return list(result.scalars().all())


async def get_routing_by_id(db: AsyncSession, routing_id: int) -> Routing | None:
    return await db.get(Routing, routing_id)


async def update_routing(
    db: AsyncSession,
    routing: Routing,
    payload: RoutingUpdate,
) -> Routing:
    update_data = payload.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(routing, field, value)

    await db.commit()
    await db.refresh(routing)
    return routing


async def delete_routing(db: AsyncSession, routing: Routing) -> None:
    await db.delete(routing)
    await db.commit()
