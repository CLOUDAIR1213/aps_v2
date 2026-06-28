"""drop legacy demo tables

Revision ID: 202606050001
Revises: 202606040001
Create Date: 2026-06-05
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision = "202606050001"
down_revision = "202606040001"
branch_labels = None
depends_on = None

TABLE_KW = {"mysql_engine": "InnoDB", "mysql_charset": "utf8mb4"}


def upgrade() -> None:
    # These tables belong to the early demo model. Current business code uses
    # work_orders/resource_machines/production_* instead.
    for table_name in (
        "schedule_items",
        "schedule_tasks",
        "routing_operations",
        "routings",
        "schedules",
        "orders",
        "machines",
    ):
        op.execute(sa.text(f"DROP TABLE IF EXISTS {table_name}"))


def downgrade() -> None:
    op.create_table(
        "machines",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("code", sa.String(length=50), nullable=False),
        sa.Column("name", sa.String(length=100), nullable=False),
        sa.Column("type", sa.String(length=50), nullable=False),
        sa.Column("status", sa.String(length=30), nullable=False),
        sa.Column("capacity_per_day", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        **TABLE_KW,
    )
    op.create_index("ix_machines_code", "machines", ["code"], unique=True)
    op.create_index("ix_machines_name", "machines", ["name"], unique=False)

    op.create_table(
        "orders",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("order_no", sa.String(length=50), nullable=False),
        sa.Column("product_name", sa.String(length=100), nullable=False),
        sa.Column("quantity", sa.Integer(), nullable=False),
        sa.Column("priority", sa.Integer(), nullable=False),
        sa.Column("due_date", sa.DateTime(), nullable=False),
        sa.Column("status", sa.String(length=30), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        **TABLE_KW,
    )
    op.create_index("ix_orders_due_date", "orders", ["due_date"], unique=False)
    op.create_index("ix_orders_order_no", "orders", ["order_no"], unique=True)

    op.create_table(
        "schedules",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("schedule_no", sa.String(length=50), nullable=False),
        sa.Column("name", sa.String(length=100), nullable=False),
        sa.Column("status", sa.String(length=30), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        **TABLE_KW,
    )
    op.create_index("ix_schedules_schedule_no", "schedules", ["schedule_no"], unique=True)

    op.create_table(
        "routings",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("order_id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=100), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["order_id"], ["orders.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        **TABLE_KW,
    )
    op.create_index("ix_routings_order_id", "routings", ["order_id"], unique=False)

    op.create_table(
        "routing_operations",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("routing_id", sa.Integer(), nullable=False),
        sa.Column("seq_no", sa.Integer(), nullable=False),
        sa.Column("operation_name", sa.String(length=100), nullable=False),
        sa.Column("machine_id", sa.Integer(), nullable=False),
        sa.Column("process_time", sa.Float(), nullable=False),
        sa.Column("setup_time", sa.Float(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["machine_id"], ["machines.id"]),
        sa.ForeignKeyConstraint(["routing_id"], ["routings.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("routing_id", "seq_no", name="uq_routing_operations_routing_seq"),
        **TABLE_KW,
    )
    op.create_index("ix_routing_operations_machine_id", "routing_operations", ["machine_id"], unique=False)
    op.create_index("ix_routing_operations_routing_id", "routing_operations", ["routing_id"], unique=False)

    op.create_table(
        "schedule_tasks",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("order_id", sa.Integer(), nullable=False),
        sa.Column("routing_op_id", sa.Integer(), nullable=False),
        sa.Column("task_name", sa.String(length=100), nullable=False),
        sa.Column("seq_no", sa.Integer(), nullable=False),
        sa.Column("machine_id", sa.Integer(), nullable=False),
        sa.Column("quantity", sa.Integer(), nullable=False),
        sa.Column("process_time", sa.Float(), nullable=False),
        sa.Column("status", sa.String(length=30), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["machine_id"], ["machines.id"]),
        sa.ForeignKeyConstraint(["order_id"], ["orders.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["routing_op_id"], ["routing_operations.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        **TABLE_KW,
    )
    op.create_index("ix_schedule_tasks_machine_id", "schedule_tasks", ["machine_id"], unique=False)
    op.create_index("ix_schedule_tasks_order_id", "schedule_tasks", ["order_id"], unique=False)
    op.create_index("ix_schedule_tasks_routing_op_id", "schedule_tasks", ["routing_op_id"], unique=False)

    op.create_table(
        "schedule_items",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("schedule_id", sa.Integer(), nullable=False),
        sa.Column("task_id", sa.Integer(), nullable=False),
        sa.Column("order_id", sa.Integer(), nullable=False),
        sa.Column("machine_id", sa.Integer(), nullable=False),
        sa.Column("start_time", sa.DateTime(), nullable=False),
        sa.Column("end_time", sa.DateTime(), nullable=False),
        sa.Column("sequence_on_machine", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["machine_id"], ["machines.id"]),
        sa.ForeignKeyConstraint(["order_id"], ["orders.id"]),
        sa.ForeignKeyConstraint(["schedule_id"], ["schedules.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["task_id"], ["schedule_tasks.id"]),
        sa.PrimaryKeyConstraint("id"),
        **TABLE_KW,
    )
    op.create_index("ix_schedule_items_machine_id", "schedule_items", ["machine_id"], unique=False)
    op.create_index("ix_schedule_items_order_id", "schedule_items", ["order_id"], unique=False)
    op.create_index("ix_schedule_items_schedule_id", "schedule_items", ["schedule_id"], unique=False)
    op.create_index("ix_schedule_items_task_id", "schedule_items", ["task_id"], unique=False)
