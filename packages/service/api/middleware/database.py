"""
Database middleware for request-scoped session management.
"""
from fastapi import Request as FastAPIRequest

from ..database.session import set_session_context


async def database_session_middleware(request: FastAPIRequest, call_next):
    """
    Middleware that sets up a database session for each request.

    The session is available via get_session() in any service code
    without needing to pass it explicitly.
    """
    # Only set up session for API routes that might need database access
    if request.url.path.startswith("/api/"):
        with set_session_context():
            response = await call_next(request)
            return response

    return await call_next(request)
