"""
Conversation routes.
"""
from uuid import UUID

from fastapi import APIRouter, Request as FastAPIRequest

from ..services.conversation_service import (
    get_user_conversations,
    get_agent_conversations,
    get_conversation_messages,
    delete_user_conversation
)

router = APIRouter()


@router.get("")
async def list_conversations(request: FastAPIRequest):
    """Get all conversations for the current user."""
    user = request.state.db_user
    return get_user_conversations(user.uuid)


@router.get("/agent/{agent_uuid}")
async def list_agent_conversations(agent_uuid: str, request: FastAPIRequest):
    """Get all conversations for a specific agent."""
    user = request.state.db_user
    return get_agent_conversations(UUID(agent_uuid), user.uuid)


@router.get("/{conversation_uuid}/messages")
async def get_messages(conversation_uuid: str, request: FastAPIRequest):
    """Get all messages for a specific conversation."""
    user = request.state.db_user
    return get_conversation_messages(UUID(conversation_uuid), user.uuid)


@router.delete("/{conversation_uuid}")
async def delete_conversation(conversation_uuid: str, request: FastAPIRequest):
    """Delete a conversation and all its messages."""
    user = request.state.db_user
    return delete_user_conversation(UUID(conversation_uuid), user.uuid)
