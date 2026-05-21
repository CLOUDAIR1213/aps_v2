from __future__ import annotations

from datetime import datetime

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class WorkCenter(Base):
    __tablename__ = "work_centers"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    code: Mapped[str] = mapped_column(String(50), unique=True, index=True, nullable=False)
    name: Mapped[str] = mapped_column(String(100), unique=True, index=True, nullable=False)
    is_external: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    default_capacity_per_day: Mapped[int] = mapped_column(Integer, nullable=False, default=480)
    default_duration_hours: Mapped[float] = mapped_column(Float, nullable=False, default=8)
    status: Mapped[str] = mapped_column(String(30), nullable=False, default="active")
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
    )

    machines: Mapped[list["ResourceMachine"]] = relationship(
        back_populates="work_center",
        cascade="all, delete-orphan",
    )
    operations: Mapped[list["ProductionOperation"]] = relationship(back_populates="work_center")


class ResourceMachine(Base):
    __tablename__ = "resource_machines"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    work_center_id: Mapped[int] = mapped_column(
        ForeignKey("work_centers.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    code: Mapped[str] = mapped_column(String(50), unique=True, index=True, nullable=False)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    status: Mapped[str] = mapped_column(String(30), nullable=False, default="active")
    capacity_per_day: Mapped[int] = mapped_column(Integer, nullable=False, default=480)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
    )

    work_center: Mapped["WorkCenter"] = relationship(back_populates="machines")
    schedule_items: Mapped[list["ProductionScheduleItem"]] = relationship(back_populates="machine")


class Personnel(Base):
    __tablename__ = "personnel"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    employee_no: Mapped[str] = mapped_column(String(50), unique=True, index=True, nullable=False)
    name: Mapped[str] = mapped_column(String(100), index=True, nullable=False)
    status: Mapped[str] = mapped_column(String(30), nullable=False, default="active")
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
    )

    work_centers: Mapped[list["WorkCenterPersonnel"]] = relationship(
        back_populates="person",
        cascade="all, delete-orphan",
    )


class WorkCenterPersonnel(Base):
    __tablename__ = "work_center_personnel"
    __table_args__ = (
        UniqueConstraint("work_center_id", "person_id", name="uq_work_center_person"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    work_center_id: Mapped[int] = mapped_column(
        ForeignKey("work_centers.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    person_id: Mapped[int] = mapped_column(
        ForeignKey("personnel.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=datetime.utcnow)

    work_center: Mapped["WorkCenter"] = relationship()
    person: Mapped["Personnel"] = relationship(back_populates="work_centers")


class WorkOrder(Base):
    __tablename__ = "work_orders"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    order_no: Mapped[str] = mapped_column(String(80), unique=True, index=True, nullable=False)
    customer: Mapped[str] = mapped_column(String(120), nullable=False)
    product_name: Mapped[str] = mapped_column(String(160), nullable=False)
    quantity: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    priority: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    due_date: Mapped[datetime] = mapped_column(DateTime, nullable=False, index=True)
    status: Mapped[str] = mapped_column(String(30), nullable=False, default="pending")
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
    )

    import_batches: Mapped[list["ImportBatch"]] = relationship(
        back_populates="work_order",
        cascade="all, delete-orphan",
    )
    parts: Mapped[list["Part"]] = relationship(back_populates="work_order", cascade="all, delete-orphan")
    operations: Mapped[list["ProductionOperation"]] = relationship(
        back_populates="work_order",
        cascade="all, delete-orphan",
    )


class ImportBatch(Base):
    __tablename__ = "import_batches"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    work_order_id: Mapped[int] = mapped_column(
        ForeignKey("work_orders.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    source_filename: Mapped[str] = mapped_column(String(255), nullable=False)
    sheet_name: Mapped[str] = mapped_column(String(100), nullable=False, default="焊接件明细")
    status: Mapped[str] = mapped_column(String(30), nullable=False, default="committed")
    parsed_summary_json: Mapped[str] = mapped_column(Text, nullable=False, default="{}")
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=datetime.utcnow)

    work_order: Mapped["WorkOrder"] = relationship(back_populates="import_batches")
    parts: Mapped[list["Part"]] = relationship(back_populates="import_batch")


class Part(Base):
    __tablename__ = "parts"
    __table_args__ = (
        UniqueConstraint("work_order_id", "no", "drawing_no", name="uq_parts_work_order_no_drawing"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    work_order_id: Mapped[int] = mapped_column(
        ForeignKey("work_orders.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    import_batch_id: Mapped[int] = mapped_column(
        ForeignKey("import_batches.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    parent_part_id: Mapped[int | None] = mapped_column(ForeignKey("parts.id"), nullable=True, index=True)
    no: Mapped[str] = mapped_column(String(50), nullable=False)
    drawing_no: Mapped[str] = mapped_column(String(100), nullable=False)
    name: Mapped[str] = mapped_column(String(160), nullable=False)
    material: Mapped[str | None] = mapped_column(String(120), nullable=True)
    quantity: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    material_weight: Mapped[float] = mapped_column(Float, nullable=False, default=0)
    source_row: Mapped[int] = mapped_column(Integer, nullable=False)
    is_assembly: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=datetime.utcnow)

    work_order: Mapped["WorkOrder"] = relationship(back_populates="parts")
    import_batch: Mapped["ImportBatch"] = relationship(back_populates="parts")
    parent: Mapped["Part | None"] = relationship(remote_side=[id], back_populates="children")
    children: Mapped[list["Part"]] = relationship(back_populates="parent")
    operations: Mapped[list["ProductionOperation"]] = relationship(
        back_populates="part",
        cascade="all, delete-orphan",
    )


class ProductionOperation(Base):
    __tablename__ = "production_operations"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    work_order_id: Mapped[int] = mapped_column(
        ForeignKey("work_orders.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    part_id: Mapped[int] = mapped_column(
        ForeignKey("parts.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    work_center_id: Mapped[int] = mapped_column(ForeignKey("work_centers.id"), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    seq_no: Mapped[int] = mapped_column(Integer, nullable=False)
    duration_hours: Mapped[float] = mapped_column(Float, nullable=False)
    source_row: Mapped[int] = mapped_column(Integer, nullable=False)
    source_col: Mapped[int] = mapped_column(Integer, nullable=False)
    status: Mapped[str] = mapped_column(String(30), nullable=False, default="pending")
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
    )

    work_order: Mapped["WorkOrder"] = relationship(back_populates="operations")
    part: Mapped["Part"] = relationship(back_populates="operations")
    work_center: Mapped["WorkCenter"] = relationship(back_populates="operations")
    dependencies: Mapped[list["OperationDependency"]] = relationship(
        foreign_keys="OperationDependency.operation_id",
        back_populates="operation",
        cascade="all, delete-orphan",
    )
    schedule_items: Mapped[list["ProductionScheduleItem"]] = relationship(back_populates="operation")


class OperationDependency(Base):
    __tablename__ = "operation_dependencies"
    __table_args__ = (
        UniqueConstraint("operation_id", "depends_on_operation_id", name="uq_operation_dependency"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    operation_id: Mapped[int] = mapped_column(
        ForeignKey("production_operations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    depends_on_operation_id: Mapped[int] = mapped_column(
        ForeignKey("production_operations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    operation: Mapped["ProductionOperation"] = relationship(
        foreign_keys=[operation_id],
        back_populates="dependencies",
    )
    depends_on_operation: Mapped["ProductionOperation"] = relationship(
        foreign_keys=[depends_on_operation_id],
    )


class ProductionSchedule(Base):
    __tablename__ = "production_schedules"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    schedule_no: Mapped[str] = mapped_column(String(80), unique=True, index=True, nullable=False)
    name: Mapped[str] = mapped_column(String(160), nullable=False)
    status: Mapped[str] = mapped_column(String(30), nullable=False, default="draft")
    start_time: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    base_schedule_id: Mapped[int | None] = mapped_column(
        ForeignKey("production_schedules.id"), nullable=True, index=True,
    )
    run_params_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
    )

    items: Mapped[list["ProductionScheduleItem"]] = relationship(
        back_populates="schedule",
        cascade="all, delete-orphan",
    )
    order_locks: Mapped[list["ProductionScheduleOrderLock"]] = relationship(
        back_populates="schedule",
        cascade="all, delete-orphan",
    )
    business_risk_issue_states: Mapped[list["BusinessRiskIssueState"]] = relationship(
        back_populates="schedule",
        cascade="all, delete-orphan",
    )


class ProductionScheduleItem(Base):
    __tablename__ = "production_schedule_items"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    schedule_id: Mapped[int] = mapped_column(
        ForeignKey("production_schedules.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    operation_id: Mapped[int] = mapped_column(ForeignKey("production_operations.id"), nullable=False, index=True)
    work_order_id: Mapped[int] = mapped_column(ForeignKey("work_orders.id"), nullable=False, index=True)
    part_id: Mapped[int] = mapped_column(ForeignKey("parts.id"), nullable=False, index=True)
    work_center_id: Mapped[int] = mapped_column(ForeignKey("work_centers.id"), nullable=False, index=True)
    machine_id: Mapped[int | None] = mapped_column(ForeignKey("resource_machines.id"), nullable=True, index=True)
    start_time: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    end_time: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    sequence_on_resource: Mapped[int] = mapped_column(Integer, nullable=False)
    is_external: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    locked: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    locked_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    locked_by: Mapped[str | None] = mapped_column(String(80), nullable=True)
    lock_reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=datetime.utcnow)

    schedule: Mapped["ProductionSchedule"] = relationship(back_populates="items")
    operation: Mapped["ProductionOperation"] = relationship(back_populates="schedule_items")
    machine: Mapped["ResourceMachine | None"] = relationship(back_populates="schedule_items")
    personnel_allocations: Mapped[list["ProductionScheduleItemPersonnelAllocation"]] = relationship(
        back_populates="schedule_item",
        cascade="all, delete-orphan",
    )


class ProductionScheduleItemPersonnelAllocation(Base):
    __tablename__ = "production_schedule_item_personnel_allocations"
    __table_args__ = (
        UniqueConstraint("schedule_item_id", "person_id", name="uq_schedule_item_person"),
        CheckConstraint("ratio_percent > 0 AND ratio_percent <= 100", name="ck_schedule_item_person_ratio"),
        CheckConstraint("planned_minutes >= 0", name="ck_schedule_item_person_minutes"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    schedule_item_id: Mapped[int] = mapped_column(
        ForeignKey("production_schedule_items.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    person_id: Mapped[int] = mapped_column(ForeignKey("personnel.id"), nullable=False, index=True)
    ratio_percent: Mapped[float] = mapped_column(Float, nullable=False)
    planned_minutes: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
    )

    schedule_item: Mapped["ProductionScheduleItem"] = relationship(back_populates="personnel_allocations")
    person: Mapped["Personnel"] = relationship()


class OperationMappingRule(Base):
    __tablename__ = "operation_mapping_rules"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    source_name: Mapped[str] = mapped_column(String(100), unique=True, index=True, nullable=False)
    normalized_name: Mapped[str] = mapped_column(String(100), nullable=False)
    work_center_id: Mapped[int] = mapped_column(
        ForeignKey("work_centers.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    is_external: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    status: Mapped[str] = mapped_column(String(30), nullable=False, default="active")
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
    )

    work_center: Mapped["WorkCenter"] = relationship()


class ResourceGroup(Base):
    __tablename__ = "resource_groups"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    code: Mapped[str] = mapped_column(String(50), unique=True, index=True, nullable=False)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(30), nullable=False, default="active")
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
    )

    members: Mapped[list["ResourceGroupMember"]] = relationship(
        back_populates="group",
        cascade="all, delete-orphan",
    )


class ResourceGroupMember(Base):
    __tablename__ = "resource_group_members"
    __table_args__ = (
        UniqueConstraint("group_id", "member_type", "member_id", name="uq_group_member"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    group_id: Mapped[int] = mapped_column(
        ForeignKey("resource_groups.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    member_type: Mapped[str] = mapped_column(String(30), nullable=False)
    member_id: Mapped[int] = mapped_column(Integer, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=datetime.utcnow)

    group: Mapped["ResourceGroup"] = relationship(back_populates="members")


class ProductionScheduleOrderLock(Base):
    __tablename__ = "production_schedule_order_locks"
    __table_args__ = (
        UniqueConstraint("schedule_id", "work_order_id", name="uq_schedule_order_lock"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    schedule_id: Mapped[int] = mapped_column(
        ForeignKey("production_schedules.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    work_order_id: Mapped[int] = mapped_column(
        ForeignKey("work_orders.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    locked: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    locked_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=datetime.utcnow)
    locked_by: Mapped[str | None] = mapped_column(String(80), nullable=True)
    note: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
    )

    schedule: Mapped["ProductionSchedule"] = relationship(back_populates="order_locks")


class ExportBatch(Base):
    __tablename__ = "export_batches"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    export_type: Mapped[str] = mapped_column(String(50), nullable=False, default="schedule_result")
    schedule_id: Mapped[int] = mapped_column(
        ForeignKey("production_schedules.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    filename: Mapped[str] = mapped_column(String(255), nullable=False)
    params_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_by: Mapped[str | None] = mapped_column(String(80), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=datetime.utcnow)


class BusinessRiskIssueState(Base):
    __tablename__ = "business_risk_issue_states"
    __table_args__ = (
        UniqueConstraint("schedule_id", "issue_key", name="uq_schedule_issue_key"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    schedule_id: Mapped[int] = mapped_column(
        ForeignKey("production_schedules.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    issue_key: Mapped[str] = mapped_column(String(160), nullable=False, index=True)
    status: Mapped[str] = mapped_column(String(30), nullable=False, default="open")
    note: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
    )

    schedule: Mapped["ProductionSchedule"] = relationship(back_populates="business_risk_issue_states")
