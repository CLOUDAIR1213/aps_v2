from __future__ import annotations

from datetime import date, datetime

from pydantic import BaseModel, ConfigDict


class WorkCenterCreate(BaseModel):
    name: str
    code: str
    is_external: bool = False
    default_capacity_per_day: int = 480
    default_duration_hours: float = 8
    status: str = "active"
    description: str | None = None
    machine_count: int = 1


class WorkCenterUpdate(BaseModel):
    name: str | None = None
    code: str | None = None
    is_external: bool | None = None
    default_capacity_per_day: int | None = None
    default_duration_hours: float | None = None
    status: str | None = None
    description: str | None = None


class WorkCenterRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    code: str
    name: str
    is_external: bool
    default_capacity_per_day: int
    default_duration_hours: float
    status: str
    description: str | None = None
    machine_count: int = 0
    created_at: datetime
    updated_at: datetime


class ResourceMachineRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    work_center_id: int
    code: str
    name: str
    status: str
    capacity_per_day: int
    created_at: datetime
    updated_at: datetime


class PersonnelRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    employee_no: str
    name: str
    status: str
    created_at: datetime
    updated_at: datetime


class PersonnelImportResponse(BaseModel):
    imported_people: int
    linked_work_centers: int
    links_created: int
    issues: list[ImportIssue]


class WorkOrderCreate(BaseModel):
    order_no: str
    customer: str
    product_name: str
    quantity: int = 1
    priority: int = 0
    due_date: datetime


class WorkOrderRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    order_no: str
    customer: str
    product_name: str
    quantity: int
    priority: int
    due_date: datetime
    status: str
    created_at: datetime
    updated_at: datetime


class ImportIssue(BaseModel):
    severity: str
    row: int | None = None
    column: int | None = None
    field: str | None = None
    message: str


class ImportPartPreview(BaseModel):
    no: str
    drawing_no: str
    name: str
    parent_no: str | None = None
    material: str | None = None
    quantity: int
    source_row: int
    is_assembly: bool
    operation_count: int
    total_hours: float


class ImportOperationPreview(BaseModel):
    part_no: str
    drawing_no: str
    part_name: str
    work_center_name: str
    seq_no: int
    duration_hours: float
    source_row: int
    source_col: int
    is_external: bool = False
    mapped: bool = False


class ImportPreviewPayload(BaseModel):
    source_filename: str
    sheet_name: str = "焊接件明细"
    parts: list[ImportPartPreview]
    operations: list[ImportOperationPreview]
    issues: list[ImportIssue]
    summary: dict


class ImportCommitRequest(BaseModel):
    order: WorkOrderCreate
    preview: ImportPreviewPayload
    create_missing_work_centers: bool = True


class ImportCommitResponse(BaseModel):
    work_order: WorkOrderRead
    import_batch_id: int
    part_count: int
    operation_count: int
    dependency_count: int


class ProductionOperationRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    work_order_id: int
    part_id: int
    work_center_id: int
    name: str
    seq_no: int
    duration_hours: float
    status: str
    order_no: str | None = None
    part_no: str | None = None
    drawing_no: str | None = None
    part_name: str | None = None
    work_center_name: str | None = None
    due_date: datetime | None = None


class ProductionScheduleRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    schedule_no: str
    name: str
    status: str
    start_time: datetime | None = None
    base_schedule_id: int | None = None
    created_at: datetime
    updated_at: datetime


class ScheduleRunRequest(BaseModel):
    start_time: datetime | None = None
    start_date: date | None = None
    work_order_ids: list[int] | None = None
    base_schedule_id: int | None = None
    keep_locked: bool = True


class OrderLockRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    schedule_id: int
    work_order_id: int
    locked: bool
    locked_at: datetime
    locked_by: str | None = None
    note: str | None = None
    created_at: datetime


class OrderLockRequest(BaseModel):
    locked_by: str | None = None
    note: str | None = None


class ProductionScheduleItemRead(BaseModel):
    id: int
    schedule_id: int
    operation_id: int
    work_order_id: int
    part_id: int
    work_center_id: int
    machine_id: int | None = None
    start_time: datetime
    end_time: datetime
    sequence_on_resource: int
    is_external: bool
    locked: bool = False
    order_no: str
    customer: str
    due_date: datetime
    part_no: str
    drawing_no: str
    part_name: str
    operation_name: str
    work_center_name: str
    machine_name: str | None = None
    machine_code: str | None = None


class ProductionSchedulingResult(BaseModel):
    schedule: ProductionScheduleRead
    items: list[ProductionScheduleItemRead]
    resource_load: list[dict]
    late_orders: list[dict]


class ProductionScheduleListResponse(BaseModel):
    schedules: list[ProductionScheduleRead]


class ResourceLoadRow(BaseModel):
    work_center_id: int
    work_center_name: str
    machine_id: int | None = None
    machine_name: str
    busy_minutes: int
    available_minutes: int
    utilization: float
    status: str
    is_external: bool = False


class ResourceLoadResponse(BaseModel):
    schedule: ProductionScheduleRead
    resources: list[ResourceLoadRow]


class ProductionOrderOverviewRow(BaseModel):
    work_order_id: int
    order_no: str
    customer_name: str
    product_name: str
    quantity: int
    priority: int
    due_date: datetime
    planned_start_time: datetime
    planned_end_time: datetime
    delay_days: int
    status: str
    main_bottleneck: str | None = None
    is_locked: bool = False


class ProductionSchedulingOverview(BaseModel):
    schedule_id: int
    schedule_no: str
    schedule_name: str
    total_orders: int
    scheduled_orders: int
    delayed_orders: int
    average_resource_utilization: float
    latest_finish_time: datetime | None = None
    orders: list[ProductionOrderOverviewRow]


class OrderScheduleOperation(BaseModel):
    operation_id: int
    operation_name: str
    work_center_id: int
    work_center_name: str
    machine_id: int | None = None
    machine_name: str | None = None
    planned_start_time: datetime
    planned_end_time: datetime
    duration_minutes: int
    predecessor_operation_ids: list[int]


class OrderSchedulePart(BaseModel):
    part_id: int
    part_no: str
    drawing_no: str
    part_name: str
    quantity: int
    planned_start_time: datetime
    planned_end_time: datetime
    operations: list[OrderScheduleOperation]


class OrderScheduleDependency(BaseModel):
    predecessor_operation_id: int
    successor_operation_id: int
    dependency_type: str = "FS"


class OrderScheduleDetail(BaseModel):
    work_order_id: int
    order_no: str
    customer_name: str
    product_name: str
    quantity: int
    priority: int
    due_date: datetime
    planned_start_time: datetime
    planned_end_time: datetime
    delay_days: int
    status: str
    parts: list[OrderSchedulePart]
    dependencies: list[OrderScheduleDependency]


class ScheduleRiskRow(BaseModel):
    work_order_id: int
    order_no: str
    customer_name: str
    due_date: datetime
    planned_end_time: datetime
    delay_days: int
    bottleneck_resource: str | None = None
    reason: str
    suggestion: str


class ScheduleRiskResponse(BaseModel):
    schedule: ProductionScheduleRead
    risks: list[ScheduleRiskRow]


class ScheduleBoardDateColumn(BaseModel):
    date: str
    weekday: str
    is_workday: bool


class ScheduleBoardDailyCell(BaseModel):
    date: str
    hours: float


class ScheduleBoardRow(BaseModel):
    group_key: str
    group_label: str
    schedule_item_id: int
    operation_id: int
    work_order_id: int
    work_center_id: int
    order_no: str
    drawing_no: str
    part_no: str
    part_name: str
    customer_name: str
    quantity: int
    duration_hours: float
    due_date: datetime
    planned_start: datetime
    planned_end: datetime
    machine_name: str | None = None
    person_name: str | None = None
    is_external: bool
    is_late: bool
    daily_cells: list[ScheduleBoardDailyCell]


class ScheduleBoardResponse(BaseModel):
    schedule: ProductionScheduleRead
    view_mode: str
    date_columns: list[ScheduleBoardDateColumn]
    rows: list[ScheduleBoardRow]


class GanttResourceLane(BaseModel):
    work_center_id: int
    work_center_name: str
    machine_id: int | None = None
    machine_name: str | None = None
    machine_code: str | None = None
    is_external: bool = False
    tasks: list[dict]


class ResourceMachineCreate(BaseModel):
    work_center_id: int
    code: str
    name: str
    status: str = "active"
    capacity_per_day: int = 480


class ResourceMachineUpdate(BaseModel):
    code: str | None = None
    name: str | None = None
    status: str | None = None
    capacity_per_day: int | None = None


class OperationMappingRuleCreate(BaseModel):
    source_name: str
    normalized_name: str
    work_center_id: int
    is_external: bool = False
    status: str = "active"


class OperationMappingRuleUpdate(BaseModel):
    normalized_name: str | None = None
    work_center_id: int | None = None
    is_external: bool | None = None
    status: str | None = None


class OperationMappingRuleRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    source_name: str
    normalized_name: str
    work_center_id: int
    is_external: bool
    status: str
    created_at: datetime
    updated_at: datetime
    work_center_name: str | None = None


class ResourceGroupCreate(BaseModel):
    code: str
    name: str
    description: str | None = None
    status: str = "active"


class ResourceGroupUpdate(BaseModel):
    code: str | None = None
    name: str | None = None
    description: str | None = None
    status: str | None = None


class ResourceGroupMemberRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    group_id: int
    member_type: str
    member_id: int
    created_at: datetime


class ResourceGroupMemberCreate(BaseModel):
    member_type: str  # work_center / machine / personnel
    member_id: int

    def model_post_init(self, __context):
        if self.member_type not in {"work_center", "machine", "personnel"}:
            raise ValueError("member_type 必须是 work_center、machine 或 personnel。")


class ResourceGroupRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    code: str
    name: str
    description: str | None = None
    status: str
    created_at: datetime
    updated_at: datetime
    members: list[ResourceGroupMemberRead] = []
