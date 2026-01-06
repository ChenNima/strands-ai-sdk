"""
Authentication middleware for API routes.
"""
import logging
import os
from fastapi import Request as FastAPIRequest
from fastapi.responses import JSONResponse
from ..utils.auth import verify_token
from ..database.session import get_session
from ..services.user_service import get_or_create_user

logger = logging.getLogger(__name__)


async def authenticate_requests(request: FastAPIRequest, call_next):
    """
    Global authentication middleware for all API routes.
    Verifies JWT token for all /api/* endpoints and loads user from database.
    """
    # Skip authentication for health check and public endpoints
    public_paths = ["/health", "/docs", "/openapi.json", "/redoc"]
    
    # Check if this is an API endpoint that requires authentication
    if request.url.path.startswith("/api/"):
        # Get authorization header
        auth_header = request.headers.get("authorization")
        
        if not auth_header:
            return JSONResponse(
                status_code=401,
                content={"detail": "Authorization header missing"}
            )
        
        # Extract Bearer token
        parts = auth_header.split()
        if len(parts) != 2 or parts[0].lower() != "bearer":
            return JSONResponse(
                status_code=401,
                content={"detail": "Invalid authorization header format"}
            )
        
        token = parts[1]
        
        # Get OIDC configuration
        issuer = os.getenv("OIDC_ISSUER")
        audience = os.getenv("OIDC_CLIENT_ID")
        
        if not issuer:
            return JSONResponse(
                status_code=500,
                content={"detail": "OIDC_ISSUER not configured"}
            )
        
        # Verify token
        try:
            user_claims = verify_token(token, issuer, audience)
            # Store user claims in request state for use in route handlers
            request.state.user = user_claims
            
            # Get or create user from database and store in request state
            session = get_session()
            try:
                db_user = get_or_create_user(session, user_claims, token)
                request.state.db_user = db_user
            finally:
                session.close()
                
        except Exception as e:
            logger.error(f"Authentication failed: {str(e)}")
            return JSONResponse(
                status_code=401,
                content={"detail": f"Token verification failed: {str(e)}"}
            )
    
    return await call_next(request)
