"""Database configuration."""

import os
from sqlalchemy.pool import QueuePool


def get_database_url() -> str:
    """Get database connection URL from environment."""
    database_url = os.getenv(
        "DATABASE_URL",
        "postgresql://postgres:postgres@localhost:5432/strands_ai"
    )
    return database_url


def get_engine_kwargs() -> dict:
    """Get SQLAlchemy engine kwargs."""
    return {
        "echo": os.getenv("DB_ECHO", "false").lower() == "true",
        "poolclass": QueuePool,
        "pool_size": int(os.getenv("DB_POOL_SIZE", "5")),
        "max_overflow": int(os.getenv("DB_MAX_OVERFLOW", "10")),
        "pool_pre_ping": True,  # Test connections before using
    }


def get_session_kwargs() -> dict:
    """Get Session kwargs."""
    return {
        "autocommit": False,
        "autoflush": False,
        "expire_on_commit": False,
    }
