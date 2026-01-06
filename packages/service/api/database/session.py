"""Database session management using ContextVar for request-scoped sessions."""

from contextlib import contextmanager
from contextvars import ContextVar, Token
from typing import Generator, Optional

from sqlmodel import Session, create_engine

from .config import get_database_url, get_engine_kwargs, get_session_kwargs


# Create engine (singleton)
_engine = None

# ContextVar for request-scoped session
_session_ctx: ContextVar[Optional[Session]] = ContextVar("db_session", default=None)


def get_engine():
    """Get or create database engine."""
    global _engine
    if _engine is None:
        database_url = get_database_url()
        engine_kwargs = get_engine_kwargs()
        _engine = create_engine(database_url, **engine_kwargs)
    return _engine


def get_session() -> Session:
    """Get the current request-scoped database session.

    This is the primary way to access the database session in services.
    The session is automatically set by the database middleware.

    Usage in services:
        def my_service_function():
            session = get_session()
            # use session...

    Raises:
        RuntimeError: If called outside of a request context
    """
    session = _session_ctx.get()
    if session is None:
        raise RuntimeError(
            "No database session in context. "
            "Ensure the request is processed through the database middleware, "
            "or use get_session_context() for non-request code."
        )
    return session


@contextmanager
def set_session_context() -> Generator[Session, None, None]:
    """Set up a request-scoped database session context.

    Used by middleware to establish the session for a request.
    The session is automatically available via get_session().

    Usage in middleware:
        with set_session_context() as session:
            # handle request - session is available via get_session()
            response = await call_next(request)
    """
    engine = get_engine()
    session_kwargs = get_session_kwargs()
    session = Session(engine, **session_kwargs)
    token: Token = _session_ctx.set(session)
    try:
        yield session
    finally:
        _session_ctx.reset(token)
        session.close()


@contextmanager
def get_session_context() -> Generator[Session, None, None]:
    """Get a standalone database session as context manager.

    Use this for code that runs outside of request context,
    such as background tasks, callbacks, or CLI scripts.

    Usage:
        with get_session_context() as session:
            # do database operations
            session.commit()
    """
    engine = get_engine()
    session_kwargs = get_session_kwargs()
    session = Session(engine, **session_kwargs)
    try:
        yield session
    finally:
        session.close()


def create_db_tables():
    """Create all database tables."""
    # Import models to register them with SQLModel metadata
    from api.models import Conversation, Message  # noqa: F401

    engine = get_engine()
    # This will create all tables defined in SQLModel models
    from sqlmodel import SQLModel
    SQLModel.metadata.create_all(engine)
