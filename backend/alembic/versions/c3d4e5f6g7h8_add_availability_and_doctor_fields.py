"""add doctor_availability table and doctor profile fields

Revision ID: c3d4e5f6g7h8
Revises: b2c3d4e5f6g7
Create Date: 2026-03-07 16:40:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c3d4e5f6g7h8'
down_revision: Union[str, Sequence[str], None] = 'b2c3d4e5f6g7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add doctor_availability table and new doctor profile columns."""
    # New columns on doctors table
    op.add_column('doctors', sa.Column('phone', sa.String(), nullable=True))
    op.add_column('doctors', sa.Column('languages', sa.String(), nullable=True, server_default='English'))

    # New doctor_availability table
    op.create_table(
        'doctor_availability',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('doctor_id', sa.Uuid(), nullable=False),
        sa.Column('day_of_week', sa.Integer(), nullable=False),
        sa.Column('start_time', sa.String(), nullable=False),
        sa.Column('end_time', sa.String(), nullable=False),
        sa.Column('slot_duration_minutes', sa.Integer(), nullable=False, server_default='30'),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='1'),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['doctor_id'], ['doctors.id']),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_doctor_availability_doctor_id'), 'doctor_availability', ['doctor_id'])


def downgrade() -> None:
    """Remove doctor_availability table and new doctor profile columns."""
    op.drop_index(op.f('ix_doctor_availability_doctor_id'), table_name='doctor_availability')
    op.drop_table('doctor_availability')
    op.drop_column('doctors', 'languages')
    op.drop_column('doctors', 'phone')
