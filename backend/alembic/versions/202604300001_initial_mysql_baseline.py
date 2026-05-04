"""initial mysql baseline

Revision ID: 202604300001
Revises:
Create Date: 2026-04-30
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision = "202604300001"
down_revision = None
branch_labels = None
depends_on = None

TABLE_KW = {"mysql_engine": "InnoDB", "mysql_charset": "utf8mb4"}


def upgrade() -> None:
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
        "personnel",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("employee_no", sa.String(length=50), nullable=False),
        sa.Column("name", sa.String(length=100), nullable=False),
        sa.Column("status", sa.String(length=30), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        **TABLE_KW,
    )
    op.create_index("ix_personnel_employee_no", "personnel", ["employee_no"], unique=True)
    op.create_index("ix_personnel_name", "personnel", ["name"], unique=False)

    op.create_table(
        "production_schedules",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("schedule_no", sa.String(length=80), nullable=False),
        sa.Column("name", sa.String(length=160), nullable=False),
        sa.Column("status", sa.String(length=30), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        **TABLE_KW,
    )
    op.create_index(
        "ix_production_schedules_schedule_no",
        "production_schedules",
        ["schedule_no"],
        unique=True,
    )

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
        "work_centers",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("code", sa.String(length=50), nullable=False),
        sa.Column("name", sa.String(length=100), nullable=False),
        sa.Column("is_external", sa.Boolean(), nullable=False),
        sa.Column("default_capacity_per_day", sa.Integer(), nullable=False),
        sa.Column("default_duration_hours", sa.Float(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        **TABLE_KW,
    )
    op.create_index("ix_work_centers_code", "work_centers", ["code"], unique=True)
    op.create_index("ix_work_centers_name", "work_centers", ["name"], unique=True)

    op.create_table(
        "work_orders",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("order_no", sa.String(length=80), nullable=False),
        sa.Column("customer", sa.String(length=120), nullable=False),
        sa.Column("product_name", sa.String(length=160), nullable=False),
        sa.Column("quantity", sa.Integer(), nullable=False),
        sa.Column("priority", sa.Integer(), nullable=False),
        sa.Column("due_date", sa.DateTime(), nullable=False),
        sa.Column("status", sa.String(length=30), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        **TABLE_KW,
    )
    op.create_index("ix_work_orders_due_date", "work_orders", ["due_date"], unique=False)
    op.create_index("ix_work_orders_order_no", "work_orders", ["order_no"], unique=True)

    op.create_table(
        "resource_machines",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("work_center_id", sa.Integer(), nullable=False),
        sa.Column("code", sa.String(length=50), nullable=False),
        sa.Column("name", sa.String(length=100), nullable=False),
        sa.Column("status", sa.String(length=30), nullable=False),
        sa.Column("capacity_per_day", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["work_center_id"], ["work_centers.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        **TABLE_KW,
    )
    op.create_index("ix_resource_machines_code", "resource_machines", ["code"], unique=True)
    op.create_index(
        "ix_resource_machines_work_center_id",
        "resource_machines",
        ["work_center_id"],
        unique=False,
    )

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
        "work_center_personnel",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("work_center_id", sa.Integer(), nullable=False),
        sa.Column("person_id", sa.Integer(), nullable=False),
        sa.Column("sort_order", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["person_id"], ["personnel.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["work_center_id"], ["work_centers.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("work_center_id", "person_id", name="uq_work_center_person"),
        **TABLE_KW,
    )
    op.create_index(
        "ix_work_center_personnel_person_id",
        "work_center_personnel",
        ["person_id"],
        unique=False,
    )
    op.create_index(
        "ix_work_center_personnel_work_center_id",
        "work_center_personnel",
        ["work_center_id"],
        unique=False,
    )

    op.create_table(
        "import_batches",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("work_order_id", sa.Integer(), nullable=False),
        sa.Column("source_filename", sa.String(length=255), nullable=False),
        sa.Column("sheet_name", sa.String(length=100), nullable=False),
        sa.Column("status", sa.String(length=30), nullable=False),
        sa.Column("parsed_summary_json", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["work_order_id"], ["work_orders.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        **TABLE_KW,
    )
    op.create_index("ix_import_batches_work_order_id", "import_batches", ["work_order_id"], unique=False)

    op.create_table(
        "parts",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("work_order_id", sa.Integer(), nullable=False),
        sa.Column("import_batch_id", sa.Integer(), nullable=True),
        sa.Column("parent_part_id", sa.Integer(), nullable=True),
        sa.Column("no", sa.String(length=50), nullable=False),
        sa.Column("drawing_no", sa.String(length=100), nullable=False),
        sa.Column("name", sa.String(length=160), nullable=False),
        sa.Column("material", sa.String(length=120), nullable=True),
        sa.Column("quantity", sa.Integer(), nullable=False),
        sa.Column("material_weight", sa.Float(), nullable=False),
        sa.Column("source_row", sa.Integer(), nullable=False),
        sa.Column("is_assembly", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["import_batch_id"], ["import_batches.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["parent_part_id"], ["parts.id"]),
        sa.ForeignKeyConstraint(["work_order_id"], ["work_orders.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("work_order_id", "no", "drawing_no", name="uq_parts_work_order_no_drawing"),
        **TABLE_KW,
    )
    op.create_index("ix_parts_import_batch_id", "parts", ["import_batch_id"], unique=False)
    op.create_index("ix_parts_parent_part_id", "parts", ["parent_part_id"], unique=False)
    op.create_index("ix_parts_work_order_id", "parts", ["work_order_id"], unique=False)

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
    op.create_index(
        "ix_routing_operations_machine_id",
        "routing_operations",
        ["machine_id"],
        unique=False,
    )
    op.create_index(
        "ix_routing_operations_routing_id",
        "routing_operations",
        ["routing_id"],
        unique=False,
    )

    op.create_table(
        "production_operations",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("work_order_id", sa.Integer(), nullable=False),
        sa.Column("part_id", sa.Integer(), nullable=False),
        sa.Column("work_center_id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=100), nullable=False),
        sa.Column("seq_no", sa.Integer(), nullable=False),
        sa.Column("duration_hours", sa.Float(), nullable=False),
        sa.Column("source_row", sa.Integer(), nullable=False),
        sa.Column("source_col", sa.Integer(), nullable=False),
        sa.Column("status", sa.String(length=30), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["part_id"], ["parts.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["work_center_id"], ["work_centers.id"]),
        sa.ForeignKeyConstraint(["work_order_id"], ["work_orders.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        **TABLE_KW,
    )
    op.create_index("ix_production_operations_part_id", "production_operations", ["part_id"], unique=False)
    op.create_index(
        "ix_production_operations_work_center_id",
        "production_operations",
        ["work_center_id"],
        unique=False,
    )
    op.create_index(
        "ix_production_operations_work_order_id",
        "production_operations",
        ["work_order_id"],
        unique=False,
    )

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
        "operation_dependencies",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("operation_id", sa.Integer(), nullable=False),
        sa.Column("depends_on_operation_id", sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(["depends_on_operation_id"], ["production_operations.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["operation_id"], ["production_operations.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("operation_id", "depends_on_operation_id", name="uq_operation_dependency"),
        **TABLE_KW,
    )
    op.create_index(
        "ix_operation_dependencies_depends_on_operation_id",
        "operation_dependencies",
        ["depends_on_operation_id"],
        unique=False,
    )
    op.create_index(
        "ix_operation_dependencies_operation_id",
        "operation_dependencies",
        ["operation_id"],
        unique=False,
    )

    op.create_table(
        "production_schedule_items",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("schedule_id", sa.Integer(), nullable=False),
        sa.Column("operation_id", sa.Integer(), nullable=False),
        sa.Column("work_order_id", sa.Integer(), nullable=False),
        sa.Column("part_id", sa.Integer(), nullable=False),
        sa.Column("work_center_id", sa.Integer(), nullable=False),
        sa.Column("machine_id", sa.Integer(), nullable=True),
        sa.Column("start_time", sa.DateTime(), nullable=False),
        sa.Column("end_time", sa.DateTime(), nullable=False),
        sa.Column("sequence_on_resource", sa.Integer(), nullable=False),
        sa.Column("is_external", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["machine_id"], ["resource_machines.id"]),
        sa.ForeignKeyConstraint(["operation_id"], ["production_operations.id"]),
        sa.ForeignKeyConstraint(["part_id"], ["parts.id"]),
        sa.ForeignKeyConstraint(["schedule_id"], ["production_schedules.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["work_center_id"], ["work_centers.id"]),
        sa.ForeignKeyConstraint(["work_order_id"], ["work_orders.id"]),
        sa.PrimaryKeyConstraint("id"),
        **TABLE_KW,
    )
    op.create_index(
        "ix_production_schedule_items_machine_id",
        "production_schedule_items",
        ["machine_id"],
        unique=False,
    )
    op.create_index(
        "ix_production_schedule_items_operation_id",
        "production_schedule_items",
        ["operation_id"],
        unique=False,
    )
    op.create_index(
        "ix_production_schedule_items_part_id",
        "production_schedule_items",
        ["part_id"],
        unique=False,
    )
    op.create_index(
        "ix_production_schedule_items_schedule_id",
        "production_schedule_items",
        ["schedule_id"],
        unique=False,
    )
    op.create_index(
        "ix_production_schedule_items_work_center_id",
        "production_schedule_items",
        ["work_center_id"],
        unique=False,
    )
    op.create_index(
        "ix_production_schedule_items_work_order_id",
        "production_schedule_items",
        ["work_order_id"],
        unique=False,
    )

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


def downgrade() -> None:
    op.drop_index("ix_schedule_items_task_id", table_name="schedule_items")
    op.drop_index("ix_schedule_items_schedule_id", table_name="schedule_items")
    op.drop_index("ix_schedule_items_order_id", table_name="schedule_items")
    op.drop_index("ix_schedule_items_machine_id", table_name="schedule_items")
    op.drop_table("schedule_items")

    op.drop_index("ix_production_schedule_items_work_order_id", table_name="production_schedule_items")
    op.drop_index("ix_production_schedule_items_work_center_id", table_name="production_schedule_items")
    op.drop_index("ix_production_schedule_items_schedule_id", table_name="production_schedule_items")
    op.drop_index("ix_production_schedule_items_part_id", table_name="production_schedule_items")
    op.drop_index("ix_production_schedule_items_operation_id", table_name="production_schedule_items")
    op.drop_index("ix_production_schedule_items_machine_id", table_name="production_schedule_items")
    op.drop_table("production_schedule_items")

    op.drop_index("ix_operation_dependencies_operation_id", table_name="operation_dependencies")
    op.drop_index("ix_operation_dependencies_depends_on_operation_id", table_name="operation_dependencies")
    op.drop_table("operation_dependencies")

    op.drop_index("ix_schedule_tasks_routing_op_id", table_name="schedule_tasks")
    op.drop_index("ix_schedule_tasks_order_id", table_name="schedule_tasks")
    op.drop_index("ix_schedule_tasks_machine_id", table_name="schedule_tasks")
    op.drop_table("schedule_tasks")

    op.drop_index("ix_production_operations_work_order_id", table_name="production_operations")
    op.drop_index("ix_production_operations_work_center_id", table_name="production_operations")
    op.drop_index("ix_production_operations_part_id", table_name="production_operations")
    op.drop_table("production_operations")

    op.drop_index("ix_routing_operations_routing_id", table_name="routing_operations")
    op.drop_index("ix_routing_operations_machine_id", table_name="routing_operations")
    op.drop_table("routing_operations")

    op.drop_index("ix_parts_work_order_id", table_name="parts")
    op.drop_index("ix_parts_parent_part_id", table_name="parts")
    op.drop_index("ix_parts_import_batch_id", table_name="parts")
    op.drop_table("parts")

    op.drop_index("ix_import_batches_work_order_id", table_name="import_batches")
    op.drop_table("import_batches")

    op.drop_index("ix_work_center_personnel_work_center_id", table_name="work_center_personnel")
    op.drop_index("ix_work_center_personnel_person_id", table_name="work_center_personnel")
    op.drop_table("work_center_personnel")

    op.drop_index("ix_routings_order_id", table_name="routings")
    op.drop_table("routings")

    op.drop_index("ix_resource_machines_work_center_id", table_name="resource_machines")
    op.drop_index("ix_resource_machines_code", table_name="resource_machines")
    op.drop_table("resource_machines")

    op.drop_index("ix_work_orders_order_no", table_name="work_orders")
    op.drop_index("ix_work_orders_due_date", table_name="work_orders")
    op.drop_table("work_orders")

    op.drop_index("ix_work_centers_name", table_name="work_centers")
    op.drop_index("ix_work_centers_code", table_name="work_centers")
    op.drop_table("work_centers")

    op.drop_index("ix_schedules_schedule_no", table_name="schedules")
    op.drop_table("schedules")

    op.drop_index("ix_production_schedules_schedule_no", table_name="production_schedules")
    op.drop_table("production_schedules")

    op.drop_index("ix_personnel_name", table_name="personnel")
    op.drop_index("ix_personnel_employee_no", table_name="personnel")
    op.drop_table("personnel")

    op.drop_index("ix_orders_order_no", table_name="orders")
    op.drop_index("ix_orders_due_date", table_name="orders")
    op.drop_table("orders")

    op.drop_index("ix_machines_name", table_name="machines")
    op.drop_index("ix_machines_code", table_name="machines")
    op.drop_table("machines")
