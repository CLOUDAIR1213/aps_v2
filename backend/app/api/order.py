from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.crud.order import (
    create_order,
    delete_order,
    get_order_by_id,
    get_orders,
    update_order,
)
from app.database import get_db
from app.schemas.order import OrderCreate, OrderRead, OrderUpdate


router = APIRouter(prefix="/api/orders", tags=["orders"])


@router.get("", response_model=list[OrderRead])
async def list_orders(db: AsyncSession = Depends(get_db)):
    return await get_orders(db)


@router.post("", response_model=OrderRead, status_code=status.HTTP_201_CREATED)
async def add_order(payload: OrderCreate, db: AsyncSession = Depends(get_db)):
    try:
        return await create_order(db, payload)
    except IntegrityError:
        await db.rollback()
        raise HTTPException(status_code=400, detail="Order number already exists.")


@router.get("/{order_id}", response_model=OrderRead)
async def get_order(order_id: int, db: AsyncSession = Depends(get_db)):
    order = await get_order_by_id(db, order_id)
    if order is None:
        raise HTTPException(status_code=404, detail="Order not found.")
    return order


@router.put("/{order_id}", response_model=OrderRead)
async def edit_order(
    order_id: int,
    payload: OrderUpdate,
    db: AsyncSession = Depends(get_db),
):
    order = await get_order_by_id(db, order_id)
    if order is None:
        raise HTTPException(status_code=404, detail="Order not found.")

    try:
        return await update_order(db, order, payload)
    except IntegrityError:
        await db.rollback()
        raise HTTPException(status_code=400, detail="Order number already exists.")


@router.delete("/{order_id}")
async def remove_order(order_id: int, db: AsyncSession = Depends(get_db)):
    order = await get_order_by_id(db, order_id)
    if order is None:
        raise HTTPException(status_code=404, detail="Order not found.")

    await delete_order(db, order)
    return {"message": "Order deleted successfully."}
