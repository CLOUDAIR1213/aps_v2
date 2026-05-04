"""plan1 foundation data

Revision ID: 202605040001
Revises: 202604300001
Create Date: 2026-05-04
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision = "202605040001"
down_revision = "202604300001"
branch_labels = None
depends_on = None

TABLE_KW = {"mysql_engine": "InnoDB", "mysql_charset": "utf8mb4"}


def upgrade() -> None:
    # work_centers: add status and description columns
    op.add_column(
        "work_centers",
        sa.Column("status", sa.String(length=30), nullable=False, server_default="active"),
    )
    op.add_column(
        "work_centers",
        sa.Column("description", sa.Text(), nullable=True),
    )

    # resource_machines: change default from 'idle' to 'active'
    op.alter_column(
        "resource_machines",
        "status",
        existing_type=sa.String(length=30),
        server_default="active",
    )

    # operation_mapping_rules
    op.create_table(
        "operation_mapping_rules",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("source_name", sa.String(length=100), nullable=False),
        sa.Column("normalized_name", sa.String(length=100), nullable=False),
        sa.Column("work_center_id", sa.Integer(), nullable=False),
        sa.Column("is_external", sa.Boolean(), nullable=False, server_default=sa.text("0")),
        sa.Column("status", sa.String(length=30), nullable=False, server_default="active"),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.ForeignKeyConstraint(
            ["work_center_id"],
            ["work_centers.id"],
            ondelete="CASCADE",
        ),
        **TABLE_KW,
    )
    op.create_index(
        "ix_operation_mapping_rules_source_name",
        "operation_mapping_rules",
        ["source_name"],
        unique=True,
    )
    op.create_index(
        "ix_operation_mapping_rules_work_center_id",
        "operation_mapping_rules",
        ["work_center_id"],
        unique=False,
    )

    # resource_groups
    op.create_table(
        "resource_groups",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("code", sa.String(length=50), nullable=False),
        sa.Column("name", sa.String(length=100), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("status", sa.String(length=30), nullable=False, server_default="active"),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        **TABLE_KW,
    )
    op.create_index(
        "ix_resource_groups_code",
        "resource_groups",
        ["code"],
        unique=True,
    )

    # resource_group_members
    op.create_table(
        "resource_group_members",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("group_id", sa.Integer(), nullable=False),
        sa.Column("member_type", sa.String(length=30), nullable=False),
        sa.Column("member_id", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("group_id", "member_type", "member_id", name="uq_group_member"),
        sa.ForeignKeyConstraint(
            ["group_id"],
            ["resource_groups.id"],
            ondelete="CASCADE",
        ),
        **TABLE_KW,
    )
    op.create_index(
        "ix_resource_group_members_group_id",
        "resource_group_members",
        ["group_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index("ix_resource_group_members_group_id", table_name="resource_group_members")
    op.drop_table("resource_group_members")

    op.drop_index("ix_resource_groups_code", table_name="resource_groups")
    op.drop_table("resource_groups")

    op.drop_index("ix_operation_mapping_rules_work_center_id", table_name="operation_mapping_rules")
    op.drop_index("ix_operation_mapping_rules_source_name", table_name="operation_mapping_rules")
    op.drop_table("operation_mapping_rules")

    op.alter_column(
        "resource_machines",
        "status",
        existing_type=sa.String(length=30),
        server_default="idle",
    )

    op.drop_column("work_centers", "description")
    op.drop_column("work_centers", "status")
