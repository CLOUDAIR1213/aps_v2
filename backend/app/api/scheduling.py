from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.crud.schedule import get_gantt_data, get_latest_schedule_result, get_schedule_result_by_id
from app.crud.task import get_schedule_tasks
from app.database import get_db
from app.schemas.schedule import SchedulingResultRead
from app.schemas.task import ScheduleTaskRead
from app.services.scheduling_service import run_rule_based_scheduling
from app.services.task_generation_service import generate_schedule_tasks


router = APIRouter(prefix="/api/scheduling", tags=["scheduling"])


def serialize_schedule_item(item):
    return {
        "id": item.id,
        "schedule_id": item.schedule_id,
        "task_id": item.task_id,
        "order_id": item.order_id,
        "machine_id": item.machine_id,
        "start_time": item.start_time,
        "end_time": item.end_time,
        "sequence_on_machine": item.sequence_on_machine,
        "order_no": item.order.order_no,
        "task_name": item.task.task_name,
        "machine_code": item.machine.code,
        "machine_name": item.machine.name,
        "created_at": item.created_at,
        "updated_at": item.updated_at,
    }


@router.get("/tasks", response_model=list[ScheduleTaskRead])
async def list_schedule_tasks(db: AsyncSession = Depends(get_db)):
    return await get_schedule_tasks(db)


@router.post("/generate-tasks", response_model=list[ScheduleTaskRead])
async def create_pending_schedule_tasks(db: AsyncSession = Depends(get_db)):
    try:
        return await generate_schedule_tasks(db)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.post("/run", response_model=SchedulingResultRead)
async def run_scheduling(db: AsyncSession = Depends(get_db)):
    try:
        return await run_rule_based_scheduling(db)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.get("/results", response_model=SchedulingResultRead)
async def get_latest_scheduling_result(db: AsyncSession = Depends(get_db)):
    schedule, items = await get_latest_schedule_result(db)
    if schedule is None:
        raise HTTPException(status_code=404, detail="No scheduling result found.")
    return {"schedule": schedule, "items": [serialize_schedule_item(item) for item in items]}


@router.get("/results/{schedule_id}", response_model=SchedulingResultRead)
async def get_scheduling_result(schedule_id: int, db: AsyncSession = Depends(get_db)):
    schedule, items = await get_schedule_result_by_id(db, schedule_id)
    if schedule is None:
        raise HTTPException(status_code=404, detail="Schedule not found.")
    return {"schedule": schedule, "items": [serialize_schedule_item(item) for item in items]}


@router.get("/gantt")
async def get_scheduling_gantt(db: AsyncSession = Depends(get_db)):
    return await get_gantt_data(db)
