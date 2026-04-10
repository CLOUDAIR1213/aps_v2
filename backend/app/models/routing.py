from __future__ import annotations

from datetime import datetime

from sqlalchemy import DateTime, Float, ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Routing(Base):
    __tablename__ = "routings"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    order_id: Mapped[int] = mapped_column(
        ForeignKey("orders.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    name: Mapped[str] = mapped_column(String(100), nullable=False)
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

    order: Mapped["Order"] = relationship(back_populates="routings")
    routing_operations: Mapped[list["RoutingOperation"]] = relationship(
        back_populates="routing",
        cascade="all, delete-orphan",
    )


class RoutingOperation(Base):
    __tablename__ = "routing_operations"
    __table_args__ = (
        UniqueConstraint("routing_id", "seq_no", name="uq_routing_operations_routing_seq"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    routing_id: Mapped[int] = mapped_column(
        ForeignKey("routings.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    seq_no: Mapped[int] = mapped_column(Integer, nullable=False)
    operation_name: Mapped[str] = mapped_column(String(100), nullable=False)
    machine_id: Mapped[int] = mapped_column(
        ForeignKey("machines.id"),
        nullable=False,
        index=True,
    )
    process_time: Mapped[float] = mapped_column(Float, nullable=False)
    setup_time: Mapped[float] = mapped_column(Float, nullable=False, default=0)
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

    routing: Mapped["Routing"] = relationship(back_populates="routing_operations")
    machine: Mapped["Machine"] = relationship(back_populates="routing_operations")
    schedule_tasks: Mapped[list["ScheduleTask"]] = relationship(
        back_populates="routing_operation",
        cascade="all, delete-orphan",
    )
