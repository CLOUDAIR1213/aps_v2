"""import operation notes

Revision ID: 202606040001
Revises: 202605240001
Create Date: 2026-06-04
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision = "202606040001"
down_revision = "202605240001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("parts", sa.Column("note", sa.Text(), nullable=True))
    op.add_column("production_operations", sa.Column("requirement_note", sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column("production_operations", "requirement_note")
    op.drop_column("parts", "note")
