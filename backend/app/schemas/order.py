from datetime import datetime

from pydantic import BaseModel, ConfigDict


class OrderBase(BaseModel):
    order_no: str
    product_name: str
    quantity: int
    priority: int = 0
    due_date: datetime
    status: str = "pending"


class OrderCreate(OrderBase):
    pass


class OrderUpdate(BaseModel):
    order_no: str | None = None
    product_name: str | None = None
    quantity: int | None = None
    priority: int | None = None
    due_date: datetime | None = None
    status: str | None = None


class OrderRead(OrderBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime
    updated_at: datetime
