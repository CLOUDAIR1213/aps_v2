from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.crud.order import get_order_by_id
from app.crud.routing import create_routing, delete_routing, get_routing_by_id, get_routings_by_order_id
from app.database import get_db
from app.schemas.routing import RoutingCreate, RoutingRead


router = APIRouter(prefix="/api/routings", tags=["routings"])


@router.post("", response_model=RoutingRead, status_code=status.HTTP_201_CREATED)
async def add_routing(payload: RoutingCreate, db: AsyncSession = Depends(get_db)):
    order = await get_order_by_id(db, payload.order_id)
    if order is None:
        raise HTTPException(status_code=400, detail="Order does not exist.")

    try:
        return await create_routing(db, payload)
    except IntegrityError:
        await db.rollback()
        raise HTTPException(status_code=400, detail="Failed to create routing.")


@router.get("/order/{order_id}", response_model=list[RoutingRead])
async def list_routings_by_order(order_id: int, db: AsyncSession = Depends(get_db)):
    order = await get_order_by_id(db, order_id)
    if order is None:
        raise HTTPException(status_code=404, detail="Order not found.")
    return await get_routings_by_order_id(db, order_id)


@router.get("/{routing_id}", response_model=RoutingRead)
async def get_routing(routing_id: int, db: AsyncSession = Depends(get_db)):
    routing = await get_routing_by_id(db, routing_id)
    if routing is None:
        raise HTTPException(status_code=404, detail="Routing not found.")
    return routing


@router.delete("/{routing_id}")
async def remove_routing(routing_id: int, db: AsyncSession = Depends(get_db)):
    routing = await get_routing_by_id(db, routing_id)
    if routing is None:
        raise HTTPException(status_code=404, detail="Routing not found.")

    await delete_routing(db, routing)
    return {"message": "Routing deleted successfully."}
