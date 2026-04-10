from app.models.routing import RoutingOperation
from app.schemas.routing_operation import RoutingOperationCreate, RoutingOperationUpdate
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession


async def create_routing_operation(
    db: AsyncSession,
    payload: RoutingOperationCreate,
) -> RoutingOperation:
    routing_operation = RoutingOperation(**payload.model_dump())
    db.add(routing_operation)
    await db.commit()
    await db.refresh(routing_operation)
    return routing_operation


async def get_routing_operations_by_routing_id(
    db: AsyncSession,
    routing_id: int,
) -> list[RoutingOperation]:
    result = await db.execute(
        select(RoutingOperation)
        .where(RoutingOperation.routing_id == routing_id)
        .order_by(RoutingOperation.seq_no, RoutingOperation.id)
    )
    return list(result.scalars().all())


async def get_routing_operation_by_id(
    db: AsyncSession,
    operation_id: int,
) -> RoutingOperation | None:
    return await db.get(RoutingOperation, operation_id)


async def update_routing_operation(
    db: AsyncSession,
    routing_operation: RoutingOperation,
    payload: RoutingOperationUpdate,
) -> RoutingOperation:
    update_data = payload.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(routing_operation, field, value)

    await db.commit()
    await db.refresh(routing_operation)
    return routing_operation


async def delete_routing_operation(
    db: AsyncSession,
    routing_operation: RoutingOperation,
) -> None:
    await db.delete(routing_operation)
    await db.commit()
