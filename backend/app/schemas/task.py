from datetime import datetime

from pydantic import BaseModel, ConfigDict


class ScheduleTaskCreate(BaseModel):
    order_id: int
    routing_op_id: int
    task_name: str
    seq_no: int
    machine_id: int
    quantity: int
    process_time: float
    status: str = "pending"


class ScheduleTaskRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    order_id: int
    routing_op_id: int
    task_name: str
    seq_no: int
    machine_id: int
    quantity: int
    process_time: float
    status: str
    created_at: datetime
    updated_at: datetime
