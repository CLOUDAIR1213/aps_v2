"""plan2 scheduling enhancements

Revision ID: 202605050001
Revises: 202605040001
Create Date: 2026-05-05
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision = "202605050001"
down_revision = "202605040001"
branch_labels = None
depends_on = None

TABLE_KW = {"mysql_engine": "InnoDB", "mysql_charset": "utf8mb4"}


def upgrade() -> None:
    # production_schedules: add PLAN2 fields
    op.add_column(
        "production_schedules",
        sa.Column("start_time", sa.DateTime(), nullable=True),
    )
    op.add_column(
        "production_schedules",
        sa.Column("base_schedule_id", sa.Integer(), nullable=True),
    )
    op.add_column(
        "production_schedules",
        sa.Column("run_params_json", sa.Text(), nullable=True),
    )
    op.create_index(
        "ix_production_schedules_base_schedule_id",
        "production_schedules",
        ["base_schedule_id"],
        unique=False,
    )
    op.create_foreign_key(
        "fk_production_schedules_base_schedule_id",
        "production_schedules",
        "production_schedules",
        ["base_schedule_id"],
        ["id"],
    )

    # production_schedule_items: add lock fields
    op.add_column(
        "production_schedule_items",
        sa.Column("locked", sa.Boolean(), nullable=False, server_default=sa.text("0")),
    )
    op.add_column(
        "production_schedule_items",
        sa.Column("locked_at", sa.DateTime(), nullable=True),
    )
    op.add_column(
        "production_schedule_items",
        sa.Column("locked_by", sa.String(length=80), nullable=True),
    )
    op.add_column(
        "production_schedule_items",
        sa.Column("lock_reason", sa.Text(), nullable=True),
    )

    # production_schedule_order_locks
    op.create_table(
        "production_schedule_order_locks",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("schedule_id", sa.Integer(), nullable=False),
        sa.Column("work_order_id", sa.Integer(), nullable=False),
        sa.Column("locked", sa.Boolean(), nullable=False, server_default=sa.text("1")),
        sa.Column("locked_at", sa.DateTime(), nullable=False),
        sa.Column("locked_by", sa.String(length=80), nullable=True),
        sa.Column("note", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("schedule_id", "work_order_id", name="uq_schedule_order_lock"),
        sa.ForeignKeyConstraint(
            ["schedule_id"],
            ["production_schedules.id"],
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["work_order_id"],
            ["work_orders.id"],
            ondelete="CASCADE",
        ),
        **TABLE_KW,
    )
    op.create_index(
        "ix_order_locks_schedule_id",
        "production_schedule_order_locks",
        ["schedule_id"],
        unique=False,
    )
    op.create_index(
        "ix_order_locks_work_order_id",
        "production_schedule_order_locks",
        ["work_order_id"],
        unique=False,
    )

    # export_batches
    op.create_table(
        "export_batches",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("export_type", sa.String(length=50), nullable=False, server_default="schedule_result"),
        sa.Column("schedule_id", sa.Integer(), nullable=False),
        sa.Column("filename", sa.String(length=255), nullable=False),
        sa.Column("params_json", sa.Text(), nullable=True),
        sa.Column("created_by", sa.String(length=80), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.ForeignKeyConstraint(
            ["schedule_id"],
            ["production_schedules.id"],
            ondelete="CASCADE",
        ),
        **TABLE_KW,
    )
    op.create_index(
        "ix_export_batches_schedule_id",
        "export_batches",
        ["schedule_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index("ix_export_batches_schedule_id", table_name="export_batches")
    op.drop_table("export_batches")

    op.drop_index("ix_order_locks_work_order_id", table_name="production_schedule_order_locks")
    op.drop_index("ix_order_locks_schedule_id", table_name="production_schedule_order_locks")
    op.drop_table("production_schedule_order_locks")

    op.drop_column("production_schedule_items", "lock_reason")
    op.drop_column("production_schedule_items", "locked_by")
    op.drop_column("production_schedule_items", "locked_at")
    op.drop_column("production_schedule_items", "locked")

    op.drop_constraint("fk_production_schedules_base_schedule_id", "production_schedules", type_="foreignkey")
    op.drop_index("ix_production_schedules_base_schedule_id", table_name="production_schedules")
    op.drop_column("production_schedules", "run_params_json")
    op.drop_column("production_schedules", "base_schedule_id")
    op.drop_column("production_schedules", "start_time")
