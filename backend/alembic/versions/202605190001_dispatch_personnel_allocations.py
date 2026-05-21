"""dispatch personnel allocations

Revision ID: 202605190001
Revises: 202605060001
Create Date: 2026-05-19
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision = "202605190001"
down_revision = "202605060001"
branch_labels = None
depends_on = None

TABLE_KW = {"mysql_engine": "InnoDB", "mysql_charset": "utf8mb4"}


def upgrade() -> None:
    op.create_table(
        "production_schedule_item_personnel_allocations",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("schedule_item_id", sa.Integer(), nullable=False),
        sa.Column("person_id", sa.Integer(), nullable=False),
        sa.Column("ratio_percent", sa.Float(), nullable=False),
        sa.Column("planned_minutes", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("schedule_item_id", "person_id", name="uq_schedule_item_person"),
        sa.CheckConstraint("ratio_percent > 0 AND ratio_percent <= 100", name="ck_schedule_item_person_ratio"),
        sa.CheckConstraint("planned_minutes >= 0", name="ck_schedule_item_person_minutes"),
        sa.ForeignKeyConstraint(
            ["schedule_item_id"],
            ["production_schedule_items.id"],
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(["person_id"], ["personnel.id"]),
        **TABLE_KW,
    )
    op.create_index(
        "ix_schedule_item_person_allocations_schedule_item_id",
        "production_schedule_item_personnel_allocations",
        ["schedule_item_id"],
        unique=False,
    )
    op.create_index(
        "ix_schedule_item_person_allocations_person_id",
        "production_schedule_item_personnel_allocations",
        ["person_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(
        "ix_schedule_item_person_allocations_person_id",
        table_name="production_schedule_item_personnel_allocations",
    )
    op.drop_index(
        "ix_schedule_item_person_allocations_schedule_item_id",
        table_name="production_schedule_item_personnel_allocations",
    )
    op.drop_table("production_schedule_item_personnel_allocations")
