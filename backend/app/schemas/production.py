from datetime import datetime

from pydantic import BaseModel, ConfigDict


class WorkCenterCreate(BaseModel):
    name: str
    code: str | None = None
    is_external: bool = False
    default_capacity_per_day: int = 480
    default_duration_hours: float = 8
    machine_count: int = 1


class WorkCenterRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    code: str
    name: str
    is_external: bool
    default_capacity_per_day: int
    default_duration_hours: float
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
    created_at: datetime
    updated_at: datetime


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


class GanttResourceLane(BaseModel):
    work_center_id: int
    work_center_name: str
    machine_id: int | None = None
    machine_name: str | None = None
    machine_code: str | None = None
    is_external: bool = False
    tasks: list[dict]
