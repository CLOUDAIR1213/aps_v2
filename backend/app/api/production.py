from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.schemas.production import (
    ImportCommitRequest,
    ImportCommitResponse,
    ImportPreviewPayload,
    ProductionSchedulingResult,
    WorkCenterCreate,
    WorkCenterRead,
    WorkOrderRead,
)
from app.services.production_import_service import parse_work_order_workbook
from app.services.production_service import (
    commit_import,
    create_work_center,
    get_latest_production_schedule_result,
    get_production_gantt_data,
    get_work_center_names,
    list_pending_operations,
    list_resource_machines,
    list_work_centers,
    list_work_orders,
    run_production_scheduling,
)

router = APIRouter(prefix="/api", tags=["production"])


@router.get("/work-centers", response_model=list[WorkCenterRead])
async def get_work_centers(db: AsyncSession = Depends(get_db)):
    return await list_work_centers(db)


@router.post("/work-centers", response_model=WorkCenterRead)
async def post_work_center(payload: WorkCenterCreate, db: AsyncSession = Depends(get_db)):
    try:
        return await create_work_center(db, payload)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.get("/resource-machines")
async def get_resource_machines(db: AsyncSession = Depends(get_db)):
    return await list_resource_machines(db)


@router.post("/imports/work-orders/preview", response_model=ImportPreviewPayload)
async def preview_work_order_import(file: UploadFile = File(...), db: AsyncSession = Depends(get_db)):
    if not file.filename.lower().endswith((".xlsx", ".xlsm")):
        raise HTTPException(status_code=400, detail="Only .xlsx and .xlsm workbooks are supported.")
    try:
        content = await file.read()
        existing_names = await get_work_center_names(db)
        return await parse_work_order_workbook(content, file.filename, existing_names)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.post("/imports/work-orders/commit", response_model=ImportCommitResponse)
async def commit_work_order_import(payload: ImportCommitRequest, db: AsyncSession = Depends(get_db)):
    try:
        return await commit_import(db, payload)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.get("/work-orders", response_model=list[WorkOrderRead])
async def get_work_orders(db: AsyncSession = Depends(get_db)):
    return await list_work_orders(db)


@router.get("/production/operations")
async def get_pending_production_operations(db: AsyncSession = Depends(get_db)):
    return await list_pending_operations(db)


@router.post("/production/scheduling/run", response_model=ProductionSchedulingResult)
async def run_production_schedule(db: AsyncSession = Depends(get_db)):
    try:
        return await run_production_scheduling(db)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.get("/production/scheduling/results", response_model=ProductionSchedulingResult)
async def get_latest_production_result(db: AsyncSession = Depends(get_db)):
    result = await get_latest_production_schedule_result(db)
    if result is None:
        raise HTTPException(status_code=404, detail="No production scheduling result found.")
    return result


@router.get("/production/scheduling/gantt")
async def get_latest_production_gantt(db: AsyncSession = Depends(get_db)):
    return await get_production_gantt_data(db)
