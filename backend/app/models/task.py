from __future__ import annotations

from datetime import datetime

from sqlalchemy import DateTime, Float, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class ScheduleTask(Base):
    __tablename__ = "schedule_tasks"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    order_id: Mapped[int] = mapped_column(
        ForeignKey("orders.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    routing_op_id: Mapped[int] = mapped_column(
        ForeignKey("routing_operations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    task_name: Mapped[str] = mapped_column(String(100), nullable=False)
    seq_no: Mapped[int] = mapped_column(Integer, nullable=False)
    machine_id: Mapped[int] = mapped_column(
        ForeignKey("machines.id"),
        nullable=False,
        index=True,
    )
    quantity: Mapped[int] = mapped_column(Integer, nullable=False)
    process_time: Mapped[float] = mapped_column(Float, nullable=False)
    status: Mapped[str] = mapped_column(String(30), nullable=False, default="pending")
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

    order: Mapped["Order"] = relationship(back_populates="schedule_tasks")
    routing_operation: Mapped["RoutingOperation"] = relationship(
        back_populates="schedule_tasks"
    )
    machine: Mapped["Machine"] = relationship(back_populates="schedule_tasks")
    schedule_items: Mapped[list["ScheduleItem"]] = relationship(
        back_populates="task"
    )
