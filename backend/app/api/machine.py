from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.crud.machine import (
    create_machine,
    delete_machine,
    get_machine_by_id,
    get_machines,
    update_machine,
)
from app.database import get_db
from app.schemas.machine import MachineCreate, MachineRead, MachineUpdate


router = APIRouter(prefix="/api/machines", tags=["machines"])


@router.get("", response_model=list[MachineRead])
async def list_machines(db: AsyncSession = Depends(get_db)):
    return await get_machines(db)


@router.post("", response_model=MachineRead, status_code=status.HTTP_201_CREATED)
async def add_machine(payload: MachineCreate, db: AsyncSession = Depends(get_db)):
    try:
        return await create_machine(db, payload)
    except IntegrityError:
        await db.rollback()
        raise HTTPException(status_code=400, detail="Machine code already exists.")


@router.get("/{machine_id}", response_model=MachineRead)
async def get_machine(machine_id: int, db: AsyncSession = Depends(get_db)):
    machine = await get_machine_by_id(db, machine_id)
    if machine is None:
        raise HTTPException(status_code=404, detail="Machine not found.")
    return machine


@router.put("/{machine_id}", response_model=MachineRead)
async def edit_machine(
    machine_id: int,
    payload: MachineUpdate,
    db: AsyncSession = Depends(get_db),
):
    machine = await get_machine_by_id(db, machine_id)
    if machine is None:
        raise HTTPException(status_code=404, detail="Machine not found.")

    try:
        return await update_machine(db, machine, payload)
    except IntegrityError:
        await db.rollback()
        raise HTTPException(status_code=400, detail="Machine code already exists.")


@router.delete("/{machine_id}")
async def remove_machine(machine_id: int, db: AsyncSession = Depends(get_db)):
    machine = await get_machine_by_id(db, machine_id)
    if machine is None:
        raise HTTPException(status_code=404, detail="Machine not found.")

    await delete_machine(db, machine)
    return {"message": "Machine deleted successfully."}
