"""
Agent routes for AI chat interactions.
"""
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, HTTPException, Query, Request as FastAPIRequest
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from ..database.session import get_session
from ..services.agent_service import (
    get_or_create_conversation,
    save_user_message,
    save_ai_message,
    create_agent_with_session
)
from ..services.agent_crud_service import get_agent_by_uuid
from ..utils.prompt import ClientMessage
from ..utils.stream import patch_response_with_headers, stream_strands_agent

router = APIRouter()


class AgentRequest(BaseModel):
    id: str
    agent_id: str
    message: Optional[ClientMessage] = None
    messages: Optional[List[ClientMessage]] = None
    trigger: Optional[str] = None
    file_ids: Optional[List[str]] = None


@router.post("/chat")
async def chat_with_agent(
    request: AgentRequest,
    fastapi_request: FastAPIRequest,
    protocol: str = Query('data')
):
    """
    Chat endpoint with AI agent.
    User is already authenticated via middleware.
    """
    user = fastapi_request.state.db_user
    conversation_id = request.id

    # Handle both optimized format (single message) and backward compatibility
    if request.message:
        messages = [request.message]
    else:
        messages = request.messages or []

    # Get agent_id from request and verify it exists
    agent_id = request.agent_id
    agent = get_agent_by_uuid(UUID(agent_id))
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")

    # Get or create conversation (session from ContextVar)
    conversation = get_or_create_conversation(conversation_id, user.uuid, UUID(agent_id))

    # Save user message (session from ContextVar)
    if messages and messages[-1].role == "user":
        save_user_message(conversation.uuid, messages[-1])

    # Create agent with session
    agent_with_session = create_agent_with_session(conversation_id)

    # Define onFinish callback
    # Note: save_ai_message manages its own session because
    # this callback runs after the request context is closed
    def on_finish_callback(buffered_message: dict, message_id: str = None):
        save_ai_message(UUID(conversation_id), buffered_message, message_id)

    # Generate streaming response
    session = get_session()
    async def generate():
        async for chunk in stream_strands_agent(
            agent_with_session,
            messages,
            protocol,
            on_finish=on_finish_callback,
            file_ids=request.file_ids,
            user_uuid=user.uuid,
            session=session,
        ):
            yield chunk

    response = StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache, no-transform",
            "X-Accel-Buffering": "no",
            "Content-Encoding": "none",
        }
    )
    return patch_response_with_headers(response, protocol)
