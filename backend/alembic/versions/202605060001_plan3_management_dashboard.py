"""plan3 management dashboard

Revision ID: 202605060001
Revises: 202605050001
Create Date: 2026-05-06
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision = "202605060001"
down_revision = "202605050001"
branch_labels = None
depends_on = None

TABLE_KW = {"mysql_engine": "InnoDB", "mysql_charset": "utf8mb4"}


def upgrade() -> None:
    op.create_table(
        "business_risk_issue_states",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("schedule_id", sa.Integer(), nullable=False),
        sa.Column("issue_key", sa.String(length=160), nullable=False),
        sa.Column("status", sa.String(length=30), nullable=False, server_default="open"),
        sa.Column("note", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("schedule_id", "issue_key", name="uq_schedule_issue_key"),
        sa.ForeignKeyConstraint(
            ["schedule_id"],
            ["production_schedules.id"],
            ondelete="CASCADE",
        ),
        **TABLE_KW,
    )
    op.create_index(
        "ix_business_risk_issue_states_schedule_id",
        "business_risk_issue_states",
        ["schedule_id"],
        unique=False,
    )
    op.create_index(
        "ix_business_risk_issue_states_issue_key",
        "business_risk_issue_states",
        ["issue_key"],
        unique=False,
    )
    op.create_index(
        "ix_business_risk_issue_states_status",
        "business_risk_issue_states",
        ["status"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index("ix_business_risk_issue_states_status", table_name="business_risk_issue_states")
    op.drop_index("ix_business_risk_issue_states_issue_key", table_name="business_risk_issue_states")
    op.drop_index("ix_business_risk_issue_states_schedule_id", table_name="business_risk_issue_states")
    op.drop_table("business_risk_issue_states")
