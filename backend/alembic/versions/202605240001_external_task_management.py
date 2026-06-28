"""external task management

Revision ID: 202605240001
Revises: 202605190001
Create Date: 2026-05-24
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision = "202605240001"
down_revision = "202605190001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "work_centers",
        sa.Column("external_capacity_slots", sa.Integer(), nullable=False, server_default=sa.text("1")),
    )
    op.add_column(
        "work_centers",
        sa.Column("external_lead_time_hours", sa.Float(), nullable=True),
    )
    op.add_column(
        "work_centers",
        sa.Column("external_vendor_name", sa.String(length=120), nullable=True),
    )

    op.add_column(
        "production_schedule_items",
        sa.Column("external_status", sa.String(length=30), nullable=False, server_default="pending"),
    )
    op.add_column(
        "production_schedule_items",
        sa.Column("external_sent_at", sa.DateTime(), nullable=True),
    )
    op.add_column(
        "production_schedule_items",
        sa.Column("external_returned_at", sa.DateTime(), nullable=True),
    )
    op.add_column(
        "production_schedule_items",
        sa.Column("external_expected_return_at", sa.DateTime(), nullable=True),
    )
    op.add_column(
        "production_schedule_items",
        sa.Column("external_note", sa.Text(), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("production_schedule_items", "external_note")
    op.drop_column("production_schedule_items", "external_expected_return_at")
    op.drop_column("production_schedule_items", "external_returned_at")
    op.drop_column("production_schedule_items", "external_sent_at")
    op.drop_column("production_schedule_items", "external_status")
    op.drop_column("work_centers", "external_vendor_name")
    op.drop_column("work_centers", "external_lead_time_hours")
    op.drop_column("work_centers", "external_capacity_slots")
