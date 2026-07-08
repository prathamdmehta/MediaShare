# app/migrations/script.py.mako

"""add google_id to users

Revision ID: c3745ccab7af
Revises: 677cf3f3b346
Create Date: 2026-07-07 22:43:31.640606

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


revision: str = 'c3745ccab7af'
down_revision: Union[str, None] = '677cf3f3b346'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('users', sa.Column('google_id', sa.String(255), nullable=True))
    op.create_unique_constraint('uq_users_google_id', 'users', ['google_id'])
    op.add_column('users', sa.Column('avatar_url', sa.String(1000), nullable=True))
    op.add_column('users', sa.Column('auth_provider', sa.String(20), nullable=False, server_default='local'))
    op.alter_column(
        'users',
        'hashed_password',
        existing_type=sa.String(255),
        nullable=True,
    )

def downgrade() -> None:
    op.alter_column(
        'users',
        'hashed_password',
        existing_type=sa.String(255),
        nullable=False,
    )
    op.drop_column('users', 'auth_provider')
    op.drop_column('users', 'avatar_url')
    op.drop_constraint('uq_users_google_id', 'users', type_='unique')
    op.drop_column('users', 'google_id')