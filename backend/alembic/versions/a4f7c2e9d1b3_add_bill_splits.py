"""add_bill_splits

Revision ID: a4f7c2e9d1b3
Revises: 034cdde7f636
Create Date: 2026-03-30 10:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a4f7c2e9d1b3'
down_revision: Union[str, None] = '034cdde7f636'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'bill_splits',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('owner_id', sa.UUID(), nullable=False),
        sa.Column('title', sa.String(), nullable=True),
        sa.Column('state_json', sa.Text(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['owner_id'], ['users.id']),
        sa.PrimaryKeyConstraint('id'),
    )


def downgrade() -> None:
    op.drop_table('bill_splits')
