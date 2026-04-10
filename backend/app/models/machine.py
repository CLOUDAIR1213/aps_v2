from __future__ import annotations

from datetime import datetime

from sqlalchemy import DateTime, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Machine(Base):
    __tablename__ = "machines"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    code: Mapped[str] = mapped_column(String(50), unique=True, index=True, nullable=False)
    name: Mapped[str] = mapped_column(String(100), index=True, nullable=False)
    type: Mapped[str] = mapped_column(String(50), nullable=False)
    status: Mapped[str] = mapped_column(String(30), nullable=False, default="idle")
    capacity_per_day: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False,
        default=datetime.utcnow,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
    )

    routing_operations: Mapped[list["RoutingOperation"]] = relationship(
        back_populates="machine"
    )
    schedule_tasks: Mapped[list["ScheduleTask"]] = relationship(
        back_populates="machine"
    )
    schedule_items: Mapped[list["ScheduleItem"]] = relationship(
        back_populates="machine"
    )
