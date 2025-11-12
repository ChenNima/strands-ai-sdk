"""Database session management."""

from sqlmodel import Session, create_engine
from sqlmodel.pool import StaticPool

from .config import get_database_url, get_engine_kwargs, get_session_kwargs


# Create engine
_engine = None


def get_engine():
    """Get or create database engine."""
    global _engine
    if _engine is None:
        database_url = get_database_url()
        engine_kwargs = get_engine_kwargs()
        _engine = create_engine(database_url, **engine_kwargs)
    return _engine


def get_db():
    """Get database session for dependency injection."""
    engine = get_engine()
    session_kwargs = get_session_kwargs()
    with Session(engine, **session_kwargs) as session:
        yield session


def create_db_tables():
    """Create all database tables."""
    from api.models import Conversation, Message
    
    engine = get_engine()
    # This will create all tables defined in SQLModel models
    from sqlmodel import SQLModel
    SQLModel.metadata.create_all(engine)


def get_session():
    """Get a new database session."""
    engine = get_engine()
    session_kwargs = get_session_kwargs()
    return Session(engine, **session_kwargs)
