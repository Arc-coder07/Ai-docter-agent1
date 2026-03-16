"""Add patient profile fields to users table

Revision ID: d4e5f6g7h8i9
Revises: c3d4e5f6g7h8
Create Date: 2026-03-09
"""

from alembic import op
import sqlalchemy as sa

revision = 'd4e5f6g7h8i9'
down_revision = 'c3d4e5f6g7h8'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('users', sa.Column('role', sa.String(), nullable=True))
    op.add_column('users', sa.Column('date_of_birth', sa.String(), nullable=True))
    op.add_column('users', sa.Column('gender', sa.String(), nullable=True))
    op.add_column('users', sa.Column('blood_group', sa.String(), nullable=True))
    op.add_column('users', sa.Column('height_cm', sa.Float(), nullable=True))
    op.add_column('users', sa.Column('weight_kg', sa.Float(), nullable=True))
    op.add_column('users', sa.Column('allergies', sa.String(), nullable=True))
    op.add_column('users', sa.Column('chronic_conditions', sa.String(), nullable=True))
    op.add_column('users', sa.Column('current_medications', sa.String(), nullable=True))
    op.add_column('users', sa.Column('emergency_contact_name', sa.String(), nullable=True))
    op.add_column('users', sa.Column('emergency_contact_phone', sa.String(), nullable=True))


def downgrade() -> None:
    op.drop_column('users', 'emergency_contact_phone')
    op.drop_column('users', 'emergency_contact_name')
    op.drop_column('users', 'current_medications')
    op.drop_column('users', 'chronic_conditions')
    op.drop_column('users', 'allergies')
    op.drop_column('users', 'weight_kg')
    op.drop_column('users', 'height_cm')
    op.drop_column('users', 'blood_group')
    op.drop_column('users', 'gender')
    op.drop_column('users', 'date_of_birth')
    op.drop_column('users', 'role')
