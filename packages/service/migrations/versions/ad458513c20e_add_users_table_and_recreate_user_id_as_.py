"""add_users_table_and_recreate_user_id_as_uuid

Revision ID: ad458513c20e
Revises: f54784d2e7a6
Create Date: 2025-11-19 02:48:28.587631

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
import sqlmodel


# revision identifiers, used by Alembic.
revision: str = 'ad458513c20e'
down_revision: Union[str, Sequence[str], None] = 'f54784d2e7a6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Create users table
    op.create_table('users',
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.Column('uuid', sa.Uuid(), nullable=False),
        sa.Column('external_user_id', sqlmodel.sql.sqltypes.AutoString(length=255), nullable=False),
        sa.Column('email', sqlmodel.sql.sqltypes.AutoString(length=255), nullable=True),
        sa.Column('name', sqlmodel.sql.sqltypes.AutoString(length=255), nullable=True),
        sa.Column('id', sa.Integer(), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_users_external_user_id'), 'users', ['external_user_id'], unique=True)
    op.create_index(op.f('ix_users_uuid'), 'users', ['uuid'], unique=True)
    
    # Drop the old user_id column (VARCHAR)
    op.drop_column('conversations', 'user_id')
    
    # Add user_id column as UUID (nullable)
    op.add_column('conversations', sa.Column('user_id', sa.Uuid(), nullable=True))
    
    # Create index on user_id
    op.create_index(op.f('ix_conversations_user_id'), 'conversations', ['user_id'], unique=False)
    
    # Create foreign key constraint
    op.create_foreign_key('fk_conversations_user_id', 'conversations', 'users', ['user_id'], ['uuid'])


def downgrade() -> None:
    """Downgrade schema."""
    # Drop foreign key constraint
    op.drop_constraint('fk_conversations_user_id', 'conversations', type_='foreignkey')
    
    # Drop index
    op.drop_index(op.f('ix_conversations_user_id'), table_name='conversations')
    
    # Drop user_id column (UUID)
    op.drop_column('conversations', 'user_id')
    
    # Add back user_id as VARCHAR
    op.add_column('conversations', sa.Column('user_id', sa.VARCHAR(length=255), nullable=True))
    
    # Drop users table and indexes
    op.drop_index(op.f('ix_users_uuid'), table_name='users')
    op.drop_index(op.f('ix_users_external_user_id'), table_name='users')
    op.drop_table('users')
