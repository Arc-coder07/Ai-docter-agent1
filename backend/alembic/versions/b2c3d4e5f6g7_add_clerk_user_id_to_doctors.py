"""add clerk_user_id to doctors

Revision ID: b2c3d4e5f6g7
Revises: d15bd00e7eac
Create Date: 2026-03-03 20:40:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b2c3d4e5f6g7'
down_revision: Union[str, Sequence[str], None] = 'a1b2c3d4e5f6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add clerk_user_id column to doctors table."""
    op.add_column('doctors', sa.Column('clerk_user_id', sa.String(), nullable=True))
    op.create_index(op.f('ix_doctors_clerk_user_id'), 'doctors', ['clerk_user_id'], unique=True)


def downgrade() -> None:
    """Remove clerk_user_id column from doctors table."""
    op.drop_index(op.f('ix_doctors_clerk_user_id'), table_name='doctors')
    op.drop_column('doctors', 'clerk_user_id')
