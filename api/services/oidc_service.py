"""
OIDC service for user information retrieval.
"""
import logging
import os
from typing import Dict, Any
from fastapi import HTTPException
from oic.oic import Client
from oic.utils.authn.client import CLIENT_AUTHN_METHOD
from oic.oic.message import Message as OICMessage, SINGLE_REQUIRED_STRING, SINGLE_OPTIONAL_STRING
from cachetools import TTLCache

logger = logging.getLogger(__name__)


# Define UserInfo schema for OIDC
class UserInfoSchema(OICMessage):
    c_param = {
        "sub": SINGLE_REQUIRED_STRING,
        "name": SINGLE_OPTIONAL_STRING,
        "email": SINGLE_OPTIONAL_STRING,
        "preferred_username": SINGLE_OPTIONAL_STRING,
    }


# Global OIDC client and cache
_oidc_client = None
_provider_configured = False
_user_info_cache = TTLCache(maxsize=2000, ttl=3600)  # 1 hour TTL


def get_oidc_client() -> Client:
    """Get or create OIDC client (singleton pattern)."""
    global _oidc_client
    if _oidc_client is None:
        try:
            _oidc_client = Client(client_authn_method=CLIENT_AUTHN_METHOD)
            logger.info("OIDC client initialized successfully")
        except Exception as e:
            logger.error(f"Failed to initialize OIDC client: {str(e)}")
            raise HTTPException(
                status_code=500,
                detail=f"OIDC client initialization failed: {str(e)}"
            )
    return _oidc_client


def ensure_provider_configured():
    """Ensure provider configuration is loaded (lazy loading)."""
    global _provider_configured
    if not _provider_configured:
        issuer = os.getenv("OIDC_ISSUER")
        if not issuer:
            raise HTTPException(status_code=500, detail="OIDC_ISSUER not configured")
        
        try:
            client = get_oidc_client()
            logger.info(f"Loading provider configuration from: {issuer}")
            # Get Provider's configuration, including userinfo_endpoint
            client.provider_config(issuer)
            _provider_configured = True
            logger.info("Provider configuration loaded successfully")
        except Exception as e:
            logger.error(f"Failed to load provider configuration: {str(e)}")
            raise HTTPException(
                status_code=500,
                detail=f"Provider configuration failed: {str(e)}"
            )


def fetch_userinfo_from_oidc(access_token: str) -> Dict[str, Any]:
    """Fetch user info from OIDC provider's userinfo endpoint using oic library."""
    try:
        # Check cache first
        if access_token in _user_info_cache:
            logger.debug("User info retrieved from cache")
            return _user_info_cache[access_token]
        
        # Ensure provider is configured
        ensure_provider_configured()
        
        client = get_oidc_client()
        
        # Use oic library to fetch user info
        userinfo_response = client.do_user_info_request(
            method="GET",
            token=access_token,
            user_info_schema=UserInfoSchema
        )
        
        if userinfo_response.get("error"):
            raise HTTPException(
                status_code=401,
                detail=f"OIDC error: {userinfo_response.get('error')} - {userinfo_response.get('error_description')}"
            )
        
        # Store the result in cache
        user_info = userinfo_response.to_dict()
        _user_info_cache[access_token] = user_info
        logger.debug("User info stored in cache")
        
        return user_info
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"OIDC authentication failed: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch user info from OIDC provider: {str(e)}"
        )
