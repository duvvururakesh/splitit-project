"""add is_guest to users

Revision ID: b1c2d3e4f5a6
Revises: a4f7c2e9d1b3
Create Date: 2026-04-08

"""
from alembic import op
import sqlalchemy as sa

revision = 'b1c2d3e4f5a6'
down_revision = 'a4f7c2e9d1b3'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('users', sa.Column('is_guest', sa.Boolean(), nullable=False, server_default='false'))


def downgrade() -> None:
    op.drop_column('users', 'is_guest')
