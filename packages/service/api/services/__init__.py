"""
Services package.
"""
from .oidc_service import fetch_userinfo_from_oidc
from .user_service import get_or_create_user
from .conversation_service import (
    get_user_conversations,
    get_conversation_messages,
    delete_user_conversation
)
from .agent_service import (
    get_or_create_conversation,
    save_user_message,
    save_ai_message,
    create_agent_with_session
)

__all__ = [
    "fetch_userinfo_from_oidc",
    "get_or_create_user",
    "get_user_conversations",
    "get_conversation_messages",
    "delete_user_conversation",
    "get_or_create_conversation",
    "save_user_message",
    "save_ai_message",
    "create_agent_with_session"
]
