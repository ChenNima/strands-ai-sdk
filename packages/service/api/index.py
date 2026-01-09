"""
Main FastAPI application entry point.
"""
from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi import Request as FastAPIRequest
from vercel.headers import set_headers

from .middleware.auth import authenticate_requests
from .middleware.database import database_session_middleware
from .routes import auth, conversations, agent, files

load_dotenv(".env.local")

app = FastAPI()


# Vercel headers middleware
@app.middleware("http")
async def _vercel_set_headers(request: FastAPIRequest, call_next):
    set_headers(dict(request.headers))
    return await call_next(request)


# Middleware execution order: last registered = first executed
# So we register auth first (inner), then database (outer)

# Authentication middleware (runs second - needs session context)
app.middleware("http")(authenticate_requests)

# Database session middleware (runs first - sets up session context)
app.middleware("http")(database_session_middleware)


# Register routers
app.include_router(auth.router, prefix="/api", tags=["auth"])
app.include_router(conversations.router, prefix="/api/conversations", tags=["conversations"])
app.include_router(agent.router, prefix="/api/agent", tags=["agent"])
app.include_router(files.router, prefix="/api/files", tags=["files"])
