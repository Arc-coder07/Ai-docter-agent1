"""add_agent_field_to_chat_messages

Revision ID: ca16a21a093b
Revises: d4e5f6g7h8i9
Create Date: 2026-03-15 13:52:11.211744

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'ca16a21a093b'
down_revision: Union[str, Sequence[str], None] = 'd4e5f6g7h8i9'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('chat_messages', sa.Column('agent', sa.String(), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('chat_messages', 'agent')
