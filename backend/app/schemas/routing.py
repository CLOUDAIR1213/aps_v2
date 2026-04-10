from datetime import datetime

from pydantic import BaseModel, ConfigDict


class RoutingBase(BaseModel):
    order_id: int
    name: str


class RoutingCreate(RoutingBase):
    pass


class RoutingUpdate(BaseModel):
    order_id: int | None = None
    name: str | None = None


class RoutingRead(RoutingBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime
    updated_at: datetime
