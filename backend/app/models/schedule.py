from __future__ import annotations

from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Schedule(Base):
    __tablename__ = "schedules"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    schedule_no: Mapped[str] = mapped_column(String(50), unique=True, index=True, nullable=False)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    status: Mapped[str] = mapped_column(String(30), nullable=False, default="draft")
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

    items: Mapped[list["ScheduleItem"]] = relationship(
        back_populates="schedule",
        cascade="all, delete-orphan",
    )


class ScheduleItem(Base):
    __tablename__ = "schedule_items"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    schedule_id: Mapped[int] = mapped_column(
        ForeignKey("schedules.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    task_id: Mapped[int] = mapped_column(
        ForeignKey("schedule_tasks.id"),
        nullable=False,
        index=True,
    )
    order_id: Mapped[int] = mapped_column(
        ForeignKey("orders.id"),
        nullable=False,
        index=True,
    )
    machine_id: Mapped[int] = mapped_column(
        ForeignKey("machines.id"),
        nullable=False,
        index=True,
    )
    start_time: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    end_time: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    sequence_on_machine: Mapped[int] = mapped_column(Integer, nullable=False)
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

    schedule: Mapped["Schedule"] = relationship(back_populates="items")
    task: Mapped["ScheduleTask"] = relationship(back_populates="schedule_items")
    order: Mapped["Order"] = relationship(back_populates="schedule_items")
    machine: Mapped["Machine"] = relationship(back_populates="schedule_items")
