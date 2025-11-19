"""
Main FastAPI application entry point.
"""
from dotenv import load_dotenv
from fastapi import FastAPI
from vercel import oidc
from vercel.headers import set_headers
from fastapi import Request as FastAPIRequest
from .middleware.auth import authenticate_requests
from .routes import auth, conversations, agent

load_dotenv(".env.local")

app = FastAPI()


# Vercel headers middleware
@app.middleware("http")
async def _vercel_set_headers(request: FastAPIRequest, call_next):
    set_headers(dict(request.headers))
    return await call_next(request)


# Authentication middleware
app.middleware("http")(authenticate_requests)


# Register routers
app.include_router(auth.router, prefix="/api", tags=["auth"])
app.include_router(conversations.router, prefix="/api/conversations", tags=["conversations"])
app.include_router(agent.router, prefix="/api/agent", tags=["agent"])
