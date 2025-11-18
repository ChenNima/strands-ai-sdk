"""
OIDC JWT Token Verification Utilities
"""
import os
from typing import Optional, Dict, Any
from functools import lru_cache
from jose import jwt, JWTError
from fastapi import HTTPException, Header
import httpx


@lru_cache(maxsize=1)
def get_jwks(issuer: str) -> Dict[str, Any]:
    """
    Fetch JWKS from OIDC provider's well-known endpoint
    Cached to avoid repeated requests
    """
    well_known_url = f"{issuer.rstrip('/')}/.well-known/openid-configuration"
    
    try:
        response = httpx.get(well_known_url, timeout=10.0)
        response.raise_for_status()
        config = response.json()
        
        jwks_uri = config.get('jwks_uri')
        if not jwks_uri:
            raise ValueError("JWKS URI not found in OIDC configuration")
        
        jwks_response = httpx.get(jwks_uri, timeout=10.0)
        jwks_response.raise_for_status()
        return jwks_response.json()
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch JWKS: {str(e)}"
        )


def verify_token(token: str, issuer: str, audience: Optional[str] = None) -> Dict[str, Any]:
    """
    Verify JWT token using JWKS from OIDC provider
    
    Args:
        token: JWT token to verify
        issuer: OIDC issuer URL
        audience: Expected audience (client_id), optional
    
    Returns:
        Decoded token claims
    
    Raises:
        HTTPException: If token is invalid
    """
    try:
        # Get JWKS
        jwks = get_jwks(issuer)
        
        # Decode and verify token
        # python-jose will automatically select the right key from JWKS
        claims = jwt.decode(
            token,
            jwks,
            algorithms=["RS256"],
            issuer=issuer,
            audience=audience,
            options={
                "verify_signature": True,
                "verify_exp": True,
                "verify_iat": True,
                "verify_aud": audience is not None,
            }
        )
        
        return claims
        
    except JWTError as e:
        raise HTTPException(
            status_code=401,
            detail=f"Invalid token: {str(e)}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=401,
            detail=f"Token verification failed: {str(e)}"
        )


async def get_current_user(authorization: Optional[str] = Header(None)) -> Dict[str, Any]:
    """
    FastAPI dependency to verify authorization header and return user claims
    
    Usage:
        @app.post("/api/chat")
        async def chat(user: Dict = Depends(get_current_user)):
            # user contains the decoded JWT claims
            pass
    """
    if not authorization:
        raise HTTPException(
            status_code=401,
            detail="Authorization header missing"
        )
    
    # Extract Bearer token
    parts = authorization.split()
    if len(parts) != 2 or parts[0].lower() != "bearer":
        raise HTTPException(
            status_code=401,
            detail="Invalid authorization header format. Expected: Bearer <token>"
        )
    
    token = parts[1]
    
    # Get OIDC configuration from environment
    issuer = os.getenv("OIDC_ISSUER")
    audience = os.getenv("OIDC_CLIENT_ID")  # Optional
    
    if not issuer:
        raise HTTPException(
            status_code=500,
            detail="OIDC_ISSUER not configured"
        )
    
    # Verify token and return claims
    return verify_token(token, issuer, audience)
