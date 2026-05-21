from datetime import date
from urllib.parse import quote

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from fastapi.responses import Response
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.schemas.production import (
    DispatchResponse,
    ImportCommitRequest,
    ImportCommitResponse,
    ImportPreviewPayload,
    ManagementDashboardResponse,
    ManagementIssueStateRead,
    ManagementIssueStateUpdate,
    OperationMappingRuleCreate,
    OperationMappingRuleRead,
    OperationMappingRuleUpdate,
    OrderLockRead,
    OrderLockRequest,
    PersonnelAllocationRead,
    PersonnelAllocationWrite,
    OrderScheduleDetail,
    PersonnelWorkloadResponse,
    PersonnelImportResponse,
    ProductionScheduleListResponse,
    ProductionSchedulingOverview,
    ProductionSchedulingResult,
    ResourceGroupCreate,
    ResourceGroupMemberCreate,
    ResourceGroupMemberRead,
    ResourceGroupRead,
    ResourceGroupUpdate,
    ResourceLoadResponse,
    ResourceMachineCreate,
    ResourceMachineRead,
    ResourceMachineUpdate,
    ScheduleBoardResponse,
    ScheduleRiskResponse,
    ScheduleRunRequest,
    WorkCenterCreate,
    WorkCenterRead,
    WorkCenterUpdate,
    WorkOrderRead,
)
from app.services.management_dashboard_service import (
    export_management_dashboard_to_excel,
    get_management_dashboard,
    update_management_issue_state,
)
from app.services.production_analysis_service import (
    get_order_schedule_detail,
    get_production_resource_load,
    get_production_scheduling_overview,
    get_production_scheduling_risks,
    list_production_schedules,
)
from app.services.production_import_service import parse_work_order_workbook
from app.services.production_service import (
    add_resource_group_member,
    commit_import,
    create_machine,
    create_operation_mapping_rule,
    create_resource_group,
    create_work_center,
    delete_machine,
    delete_operation_mapping_rule,
    delete_personnel,
    delete_work_center,
    delete_work_order,
    disable_work_center,
    export_schedule_to_excel,
    get_dispatch_data,
    get_latest_production_schedule_result,
    get_personnel_workload,
    get_production_gantt_data,
    get_production_schedule_result,
    get_schedule_board,
    import_personnel_workbook,
    list_personnel,
    list_operation_mapping_rules,
    list_pending_operations,
    list_resource_groups,
    list_resource_machines,
    list_work_centers,
    list_work_orders,
    lock_order_in_schedule,
    remove_resource_group_member,
    run_production_scheduling,
    save_personnel_allocations,
    normalize_schedule_datetime,
    unlock_order_in_schedule,
    update_machine,
    update_operation_mapping_rule,
    update_resource_group,
    update_work_center,
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


@router.get("/personnel")
async def get_personnel(db: AsyncSession = Depends(get_db)):
    return await list_personnel(db)


@router.post("/personnel/import", response_model=PersonnelImportResponse)
async def import_personnel(file: UploadFile = File(...), db: AsyncSession = Depends(get_db)):
    if not file.filename.lower().endswith((".xlsx", ".xlsm")):
        raise HTTPException(status_code=400, detail="Only .xlsx and .xlsm workbooks are supported.")
    try:
        content = await file.read()
        return await import_personnel_workbook(db, content, file.filename)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.post("/imports/work-orders/preview", response_model=ImportPreviewPayload)
async def preview_work_order_import(file: UploadFile = File(...), db: AsyncSession = Depends(get_db)):
    if not file.filename.lower().endswith((".xlsx", ".xlsm")):
        raise HTTPException(status_code=400, detail="Only .xlsx and .xlsm workbooks are supported.")
    try:
        content = await file.read()
        from sqlalchemy import select
        from sqlalchemy.orm import selectinload
        from app.models.production import OperationMappingRule
        rules_result = await db.execute(
            select(OperationMappingRule)
            .where(OperationMappingRule.status == "active")
            .options(selectinload(OperationMappingRule.work_center))
        )
        mapping_rules = {
            r.source_name: {
                "is_external": r.is_external,
                "work_center_id": r.work_center_id,
                "default_duration_hours": r.work_center.default_duration_hours if r.work_center else None,
            }
            for r in rules_result.scalars().all()
        }
        return await parse_work_order_workbook(content, file.filename, mapping_rules)
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


@router.delete("/work-orders/{work_order_id}")
async def delete_work_order_view(work_order_id: int, db: AsyncSession = Depends(get_db)):
    try:
        await delete_work_order(db, work_order_id)
        return {"ok": True}
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.get("/production/operations")
async def get_pending_production_operations(db: AsyncSession = Depends(get_db)):
    return await list_pending_operations(db)


@router.post("/production/scheduling/run", response_model=ProductionSchedulingResult)
async def run_production_schedule(payload: ScheduleRunRequest | None = None, db: AsyncSession = Depends(get_db)):
    try:
        params = payload or ScheduleRunRequest()
        # Resolve start_time: start_date takes precedence if provided
        start_time = params.start_time
        if params.start_date:
            from datetime import datetime as dt
            start_time = dt.combine(params.start_date, dt.min.time().replace(hour=8))
        elif start_time:
            start_time = normalize_schedule_datetime(start_time)
        return await run_production_scheduling(
            db,
            start_time=start_time,
            work_order_ids=params.work_order_ids,
            base_schedule_id=params.base_schedule_id,
            keep_locked=params.keep_locked,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.get("/production/scheduling/schedules", response_model=ProductionScheduleListResponse)
async def get_production_schedules(db: AsyncSession = Depends(get_db)):
    return await list_production_schedules(db)


@router.get("/production/scheduling/overview", response_model=ProductionSchedulingOverview)
async def get_production_overview(
    schedule_id: int | None = None,
    db: AsyncSession = Depends(get_db),
):
    try:
        return await get_production_scheduling_overview(db, schedule_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.get("/production/scheduling/orders/{work_order_id}", response_model=OrderScheduleDetail)
async def get_production_order_detail(
    work_order_id: int,
    schedule_id: int | None = None,
    db: AsyncSession = Depends(get_db),
):
    try:
        return await get_order_schedule_detail(db, work_order_id, schedule_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.get("/production/scheduling/resource-load", response_model=ResourceLoadResponse)
async def get_production_resource_load_view(
    schedule_id: int | None = None,
    db: AsyncSession = Depends(get_db),
):
    try:
        return await get_production_resource_load(db, schedule_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.get("/production/scheduling/risks", response_model=ScheduleRiskResponse)
async def get_production_risks(
    schedule_id: int | None = None,
    db: AsyncSession = Depends(get_db),
):
    try:
        return await get_production_scheduling_risks(db, schedule_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.get("/production/management-dashboard", response_model=ManagementDashboardResponse)
async def get_management_dashboard_view(
    schedule_id: int | None = None,
    horizon_days: int = 30,
    risk_level: str | None = None,
    risk_type: str | None = None,
    customer: str | None = None,
    status: str | None = None,
    db: AsyncSession = Depends(get_db),
):
    try:
        return await get_management_dashboard(
            db,
            schedule_id=schedule_id,
            horizon_days=horizon_days,
            risk_level=risk_level,
            risk_type=risk_type,
            customer=customer,
            status=status,
        )
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.patch("/production/management-dashboard/issue-state", response_model=ManagementIssueStateRead)
async def patch_management_issue_state(
    payload: ManagementIssueStateUpdate,
    db: AsyncSession = Depends(get_db),
):
    try:
        return await update_management_issue_state(db, payload)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.get("/production/management-dashboard/export")
async def export_management_dashboard(
    schedule_id: int | None = None,
    horizon_days: int = 30,
    risk_level: str | None = None,
    risk_type: str | None = None,
    customer: str | None = None,
    status: str | None = None,
    db: AsyncSession = Depends(get_db),
):
    try:
        content, filename = await export_management_dashboard_to_excel(
            db,
            schedule_id=schedule_id,
            horizon_days=horizon_days,
            risk_level=risk_level,
            risk_type=risk_type,
            customer=customer,
            status=status,
        )
        encoded = quote(filename)
        return Response(
            content=content,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": f"attachment; filename*=UTF-8''{encoded}"},
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.get("/production/scheduling/results", response_model=ProductionSchedulingResult)
async def get_latest_production_result(db: AsyncSession = Depends(get_db)):
    result = await get_latest_production_schedule_result(db)
    if result is None:
        raise HTTPException(status_code=404, detail="No production scheduling result found.")
    return result


@router.get("/production/scheduling/results/{schedule_id}", response_model=ProductionSchedulingResult)
async def get_production_result(schedule_id: int, db: AsyncSession = Depends(get_db)):
    try:
        return await get_production_schedule_result(db, schedule_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.get("/production/scheduling/gantt")
async def get_latest_production_gantt(schedule_id: int | None = None, db: AsyncSession = Depends(get_db)):
    try:
        return await get_production_gantt_data(db, schedule_id=schedule_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.get("/production/scheduling/schedules/{schedule_id}/board", response_model=ScheduleBoardResponse)
async def get_production_schedule_board(
    schedule_id: int,
    work_center: str | None = None,
    start_date: date | None = None,
    days: int = 14,
    order_id: int | None = None,
    view_mode: str = "by_work_center",
    db: AsyncSession = Depends(get_db),
):
    try:
        return await get_schedule_board(
            db=db,
            schedule_id=schedule_id,
            work_center=work_center,
            start_date=start_date,
            days=days,
            order_id=order_id,
            view_mode=view_mode,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.get("/production/scheduling/schedules/{schedule_id}/dispatch", response_model=DispatchResponse)
async def get_schedule_dispatch(
    schedule_id: int,
    work_order_id: int | None = None,
    work_center_id: int | None = None,
    person_id: int | None = None,
    allocation_status: str | None = None,
    db: AsyncSession = Depends(get_db),
):
    try:
        return await get_dispatch_data(
            db,
            schedule_id=schedule_id,
            work_order_id=work_order_id,
            work_center_id=work_center_id,
            person_id=person_id,
            allocation_status=allocation_status,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.put(
    "/production/scheduling/schedule-items/{schedule_item_id}/personnel-allocations",
    response_model=list[PersonnelAllocationRead],
)
async def put_schedule_item_personnel_allocations(
    schedule_item_id: int,
    payload: list[PersonnelAllocationWrite],
    db: AsyncSession = Depends(get_db),
):
    try:
        return await save_personnel_allocations(db, schedule_item_id, payload)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.get("/personnel/workload", response_model=PersonnelWorkloadResponse)
async def get_personnel_workload_view(schedule_id: int, db: AsyncSession = Depends(get_db)):
    try:
        return await get_personnel_workload(db, schedule_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.put("/work-centers/{work_center_id}", response_model=WorkCenterRead)
async def put_work_center(
    work_center_id: int,
    payload: WorkCenterUpdate,
    db: AsyncSession = Depends(get_db),
):
    try:
        return await update_work_center(db, work_center_id, payload)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.patch("/work-centers/{work_center_id}/disable", response_model=WorkCenterRead)
async def patch_disable_work_center(work_center_id: int, db: AsyncSession = Depends(get_db)):
    try:
        return await disable_work_center(db, work_center_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.delete("/work-centers/{work_center_id}")
async def delete_work_center_view(work_center_id: int, db: AsyncSession = Depends(get_db)):
    try:
        await delete_work_center(db, work_center_id)
        return {"ok": True}
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.post("/resource-machines", response_model=ResourceMachineRead)
async def post_resource_machine(payload: ResourceMachineCreate, db: AsyncSession = Depends(get_db)):
    try:
        return await create_machine(db, payload)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.put("/resource-machines/{machine_id}", response_model=ResourceMachineRead)
async def put_resource_machine(
    machine_id: int,
    payload: ResourceMachineUpdate,
    db: AsyncSession = Depends(get_db),
):
    try:
        return await update_machine(db, machine_id, payload)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.delete("/resource-machines/{machine_id}")
async def delete_resource_machine_view(machine_id: int, db: AsyncSession = Depends(get_db)):
    try:
        await delete_machine(db, machine_id)
        return {"ok": True}
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.get("/operation-mapping-rules", response_model=list[OperationMappingRuleRead])
async def get_operation_mapping_rules(db: AsyncSession = Depends(get_db)):
    return await list_operation_mapping_rules(db)


@router.post("/operation-mapping-rules", response_model=OperationMappingRuleRead)
async def post_operation_mapping_rule(
    payload: OperationMappingRuleCreate,
    db: AsyncSession = Depends(get_db),
):
    try:
        return await create_operation_mapping_rule(db, payload)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.put("/operation-mapping-rules/{rule_id}", response_model=OperationMappingRuleRead)
async def put_operation_mapping_rule(
    rule_id: int,
    payload: OperationMappingRuleUpdate,
    db: AsyncSession = Depends(get_db),
):
    try:
        return await update_operation_mapping_rule(db, rule_id, payload)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.delete("/operation-mapping-rules/{rule_id}")
async def delete_operation_mapping_rule_view(rule_id: int, db: AsyncSession = Depends(get_db)):
    try:
        await delete_operation_mapping_rule(db, rule_id)
        return {"ok": True}
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.delete("/personnel/{person_id}")
async def delete_personnel_view(person_id: int, db: AsyncSession = Depends(get_db)):
    try:
        await delete_personnel(db, person_id)
        return {"ok": True}
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.get("/resource-groups", response_model=list[ResourceGroupRead])
async def get_resource_groups(db: AsyncSession = Depends(get_db)):
    return await list_resource_groups(db)


@router.post("/resource-groups", response_model=ResourceGroupRead)
async def post_resource_group(payload: ResourceGroupCreate, db: AsyncSession = Depends(get_db)):
    try:
        return await create_resource_group(db, payload)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.put("/resource-groups/{group_id}", response_model=ResourceGroupRead)
async def put_resource_group(
    group_id: int,
    payload: ResourceGroupUpdate,
    db: AsyncSession = Depends(get_db),
):
    try:
        return await update_resource_group(db, group_id, payload)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.post(
    "/resource-groups/{group_id}/members",
    response_model=ResourceGroupMemberRead,
)
async def post_resource_group_member(
    group_id: int,
    payload: ResourceGroupMemberCreate,
    db: AsyncSession = Depends(get_db),
):
    try:
        return await add_resource_group_member(db, group_id, payload)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.delete("/resource-groups/{group_id}/members/{member_id}")
async def delete_resource_group_member(
    group_id: int,
    member_id: int,
    db: AsyncSession = Depends(get_db),
):
    try:
        await remove_resource_group_member(db, group_id, member_id)
        return {"ok": True}
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.post("/production/scheduling/schedules/{schedule_id}/orders/{work_order_id}/lock")
async def lock_order(
    schedule_id: int,
    work_order_id: int,
    payload: OrderLockRequest | None = None,
    db: AsyncSession = Depends(get_db),
):
    try:
        params = payload or OrderLockRequest()
        return await lock_order_in_schedule(
            db,
            schedule_id,
            work_order_id,
            locked_by=params.locked_by,
            note=params.note,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.post("/production/scheduling/schedules/{schedule_id}/orders/{work_order_id}/unlock")
async def unlock_order(
    schedule_id: int,
    work_order_id: int,
    db: AsyncSession = Depends(get_db),
):
    try:
        return await unlock_order_in_schedule(db, schedule_id, work_order_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.patch("/production/scheduling/schedules/{schedule_id}/orders/{work_order_id}/lock")
async def patch_lock_order(
    schedule_id: int,
    work_order_id: int,
    payload: OrderLockRequest | None = None,
    db: AsyncSession = Depends(get_db),
):
    try:
        params = payload or OrderLockRequest()
        return await lock_order_in_schedule(
            db,
            schedule_id,
            work_order_id,
            locked_by=params.locked_by,
            note=params.note,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.patch("/production/scheduling/schedules/{schedule_id}/orders/{work_order_id}/unlock")
async def patch_unlock_order(
    schedule_id: int,
    work_order_id: int,
    db: AsyncSession = Depends(get_db),
):
    try:
        return await unlock_order_in_schedule(db, schedule_id, work_order_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.get("/production/scheduling/schedules/{schedule_id}/export")
async def export_schedule(
    schedule_id: int,
    db: AsyncSession = Depends(get_db),
):
    try:
        content = await export_schedule_to_excel(db, schedule_id)
        encoded = quote(f"排产结果_{schedule_id}.xlsx")
        return Response(
            content=content,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": f"attachment; filename*=UTF-8''{encoded}"},
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
