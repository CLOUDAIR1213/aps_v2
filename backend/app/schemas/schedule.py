from datetime import datetime

from pydantic import BaseModel, ConfigDict


class ScheduleRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    schedule_no: str
    name: str
    status: str
    created_at: datetime
    updated_at: datetime


class ScheduleItemRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    schedule_id: int
    task_id: int
    order_id: int
    machine_id: int
    start_time: datetime
    end_time: datetime
    sequence_on_machine: int
    order_no: str | None = None
    task_name: str | None = None
    machine_code: str | None = None
    machine_name: str | None = None
    created_at: datetime
    updated_at: datetime


class SchedulingResultRead(BaseModel):
    schedule: ScheduleRead
    items: list[ScheduleItemRead]
