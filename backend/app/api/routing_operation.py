from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.crud.machine import get_machine_by_id
from app.crud.routing import get_routing_by_id
from app.crud.routing_operation import (
    create_routing_operation,
    delete_routing_operation,
    get_routing_operation_by_id,
    get_routing_operations_by_routing_id,
    update_routing_operation,
)
from app.database import get_db
from app.schemas.routing_operation import (
    RoutingOperationCreate,
    RoutingOperationRead,
    RoutingOperationUpdate,
)


router = APIRouter(prefix="/api/routing-operations", tags=["routing-operations"])


@router.post("", response_model=RoutingOperationRead, status_code=status.HTTP_201_CREATED)
async def add_routing_operation(
    payload: RoutingOperationCreate,
    db: AsyncSession = Depends(get_db),
):
    routing = await get_routing_by_id(db, payload.routing_id)
    if routing is None:
        raise HTTPException(status_code=400, detail="Routing does not exist.")

    machine = await get_machine_by_id(db, payload.machine_id)
    if machine is None:
        raise HTTPException(status_code=400, detail="Machine does not exist.")

    try:
        return await create_routing_operation(db, payload)
    except IntegrityError:
        await db.rollback()
        raise HTTPException(
            status_code=400,
            detail="Failed to create routing operation.",
        )


@router.get("/routing/{routing_id}", response_model=list[RoutingOperationRead])
async def list_routing_operations(
    routing_id: int,
    db: AsyncSession = Depends(get_db),
):
    routing = await get_routing_by_id(db, routing_id)
    if routing is None:
        raise HTTPException(status_code=404, detail="Routing not found.")
    return await get_routing_operations_by_routing_id(db, routing_id)


@router.put("/{operation_id}", response_model=RoutingOperationRead)
async def edit_routing_operation(
    operation_id: int,
    payload: RoutingOperationUpdate,
    db: AsyncSession = Depends(get_db),
):
    routing_operation = await get_routing_operation_by_id(db, operation_id)
    if routing_operation is None:
        raise HTTPException(status_code=404, detail="Routing operation not found.")

    if payload.routing_id is not None:
        routing = await get_routing_by_id(db, payload.routing_id)
        if routing is None:
            raise HTTPException(status_code=400, detail="Routing does not exist.")

    if payload.machine_id is not None:
        machine = await get_machine_by_id(db, payload.machine_id)
        if machine is None:
            raise HTTPException(status_code=400, detail="Machine does not exist.")

    try:
        return await update_routing_operation(db, routing_operation, payload)
    except IntegrityError:
        await db.rollback()
        raise HTTPException(
            status_code=400,
            detail="Failed to update routing operation.",
        )


@router.delete("/{operation_id}")
async def remove_routing_operation(
    operation_id: int,
    db: AsyncSession = Depends(get_db),
):
    routing_operation = await get_routing_operation_by_id(db, operation_id)
    if routing_operation is None:
        raise HTTPException(status_code=404, detail="Routing operation not found.")

    await delete_routing_operation(db, routing_operation)
    return {"message": "Routing operation deleted successfully."}
