from datetime import datetime

from pydantic import BaseModel, ConfigDict


class MachineBase(BaseModel):
    code: str
    name: str
    type: str
    status: str = "idle"
    capacity_per_day: int = 0


class MachineCreate(MachineBase):
    pass


class MachineUpdate(BaseModel):
    code: str | None = None
    name: str | None = None
    type: str | None = None
    status: str | None = None
    capacity_per_day: int | None = None


class MachineRead(MachineBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime
    updated_at: datetime
