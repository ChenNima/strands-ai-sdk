"""
Agent service for AI agent operations.
"""
import logging
import os
from typing import Dict, Any
from uuid import UUID

from mcp.client.sse import sse_client
from sqlmodel import select
from strands import Agent
from strands.experimental import config_to_agent
from strands.session.s3_session_manager import S3SessionManager
from strands.tools.mcp import MCPClient

from ..database.session import get_session, get_session_context
from ..models import Conversation, Message
from ..utils.prompt import ClientMessage

logger = logging.getLogger(__name__)


def get_or_create_conversation(conversation_id: str, user_uuid: UUID, agent_uuid: UUID) -> Conversation:
    """Get or create a conversation for the user.

    Args:
        conversation_id: UUID string for the conversation
        user_uuid: User's UUID
        agent_uuid: Agent's UUID
    """
    session = get_session()
    conversation = None
    if conversation_id:
        stmt = select(Conversation).where(
            Conversation.uuid == UUID(conversation_id),
            Conversation.user_id == user_uuid,
            Conversation.agent_id == agent_uuid
        )
        conversation = session.exec(stmt).first()

    if not conversation:
        conversation = Conversation(
            uuid=UUID(conversation_id) if conversation_id else None,
            user_id=user_uuid,
            agent_id=agent_uuid
        )
        session.add(conversation)
        session.commit()
        session.refresh(conversation)

    return conversation


def save_user_message(conversation_uuid: UUID, message: ClientMessage) -> None:
    """Save user message to database.

    Args:
        conversation_uuid: Conversation's UUID
        message: The client message to save
    """
    session = get_session()
    parts_data = None
    conversation_title = None

    if message.parts:
        parts_data = [part.model_dump(exclude_none=True)
                      for part in message.parts]

        for part in message.parts:
            if part.type == 'text' and part.text:
                conversation_title = part.text
                break

    # Update conversation title if not already set
    if conversation_title:
        conv_stmt = select(Conversation).where(
            Conversation.uuid == conversation_uuid)
        conversation = session.exec(conv_stmt).first()
        if conversation and not conversation.title:
            conversation.title = conversation_title
            session.add(conversation)
            session.commit()

    # Save message
    db_message = Message(
        conversation_uuid=conversation_uuid,
        role=message.role,
        content=message.content,
        parts=parts_data
    )
    session.add(db_message)
    session.commit()


def save_ai_message(
    conversation_uuid: UUID, buffered_message: Dict[str, Any], message_id: str = None
) -> None:
    """Save AI response to database.

    This function manages its own session because it's called from streaming callbacks
    where the request context (and its session) may already be closed.

    Args:
        conversation_uuid: Conversation's UUID
        buffered_message: The AI message data with role and parts
        message_id: Optional message ID
    """
    with get_session_context() as session:
        try:
            ai_message = Message(
                conversation_uuid=conversation_uuid,
                message_id=message_id,
                role=buffered_message["role"],
                content=None,
                parts=buffered_message["parts"]
            )
            session.add(ai_message)
            session.commit()
        except Exception as e:
            logger.error(f"Error saving AI message: {e}", exc_info=True)
            raise


def create_agent_with_session(conversation_id: str, config_path: str = "api/config/default_agent.json"):
    """Create Strands agent with S3 session manager.

    Session data is stored in S3 under: s3://{MSC_S3_BUCKET}/sessions/{session_id}/
    """
    bucket = os.environ["MSC_S3_BUCKET"]
    session_manager = S3SessionManager(
        session_id=conversation_id,
        bucket=bucket,
        prefix="sessions/",
    )
    tools = [
        "strands_tools.current_time",
        "strands_tools.calculator",
        "api/utils/tools.py"
    ]
    agent: Agent = config_to_agent(
        config=config_path, session_manager=session_manager, tools=tools)
    return agent
