"""
User service for user management operations.
"""
from typing import Dict, Any
from uuid import uuid4
from datetime import datetime
from fastapi import HTTPException
from sqlmodel import select
from ..models import User
from .oidc_service import fetch_userinfo_from_oidc


def get_or_create_user(session, user_claims: Dict[str, Any], access_token: str = None) -> User:
    """Get or create user from OIDC claims."""
    external_user_id = user_claims.get("sub")
    if not external_user_id:
        raise HTTPException(status_code=400, detail="Missing 'sub' claim in token")
    
    # Try to find existing user
    stmt = select(User).where(User.external_user_id == external_user_id)
    user = session.exec(stmt).first()
    
    if not user:
        # Fetch complete user info from OIDC provider using oic library
        if not access_token:
            raise HTTPException(status_code=400, detail="Access token required to create user")
        
        userinfo = fetch_userinfo_from_oidc(access_token)
        
        # Create new user with info from OIDC provider
        user = User(
            uuid=uuid4(),
            external_user_id=external_user_id,
            email=userinfo.get("email"),
            name=userinfo.get("name") or userinfo.get("preferred_username"),
            created_at=datetime.utcnow()
        )
        session.add(user)
        session.commit()
        session.refresh(user)
    
    return user
