"""
Authentication routes.
"""
from fastapi import APIRouter, Request as FastAPIRequest

router = APIRouter()


@router.post("/login")
async def login(request: FastAPIRequest):
    """
    Login endpoint - creates or updates user record.
    Called after successful OIDC authentication.
    """
    # User is already loaded in middleware
    user = request.state.db_user
    return {
        "success": True,
        "user": {
            "uuid": str(user.uuid),
            "external_user_id": user.external_user_id,
            "email": user.email,
            "name": user.name
        }
    }
