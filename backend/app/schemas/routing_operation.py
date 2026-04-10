from datetime import datetime

from pydantic import BaseModel, ConfigDict


class RoutingOperationBase(BaseModel):
    routing_id: int
    seq_no: int
    operation_name: str
    machine_id: int
    process_time: float
    setup_time: float = 0


class RoutingOperationCreate(RoutingOperationBase):
    pass


class RoutingOperationUpdate(BaseModel):
    routing_id: int | None = None
    seq_no: int | None = None
    operation_name: str | None = None
    machine_id: int | None = None
    process_time: float | None = None
    setup_time: float | None = None


class RoutingOperationRead(RoutingOperationBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime
    updated_at: datetime
