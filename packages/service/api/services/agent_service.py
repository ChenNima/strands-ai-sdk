"""
Agent service for AI agent operations.
"""
from typing import List, Dict, Any
from uuid import UUID
import os
from mcp.client.sse import sse_client
from strands import Agent
from strands.experimental import config_to_agent
from strands.session.file_session_manager import FileSessionManager
from ..utils.prompt import ClientMessage
from ..database.session import get_session
from ..models import Conversation, Message
from sqlmodel import select
from strands.tools.mcp import MCPClient


def get_or_create_conversation(conversation_id: str, user_uuid: UUID) -> Conversation:
    """Get or create a conversation for the user."""
    session = get_session()
    try:
        conversation = None
        if conversation_id:
            stmt = select(Conversation).where(
                Conversation.uuid == UUID(conversation_id),
                Conversation.user_id == user_uuid
            )
            conversation = session.exec(stmt).first()

        if not conversation:
            conversation = Conversation(
                uuid=UUID(conversation_id) if conversation_id else None,
                user_id=user_uuid
            )
            session.add(conversation)
            session.commit()
            session.refresh(conversation)

        return conversation
    finally:
        session.close()


def save_user_message(conversation_uuid: UUID, message: ClientMessage) -> None:
    """Save user message to database."""
    session = get_session()
    try:
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
    finally:
        session.close()


def save_ai_message(conversation_uuid: UUID, buffered_message: Dict[str, Any], message_id: str = None) -> None:
    """Save AI response to database."""
    session = get_session()
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
        print(f"Error saving AI message: {e}")
    finally:
        session.close()


def create_agent_with_session(conversation_id: str, config_path: str = "api/config/default_agent.json"):
    """Create Strands agent with session manager."""
    session_manager = FileSessionManager(
        session_id=conversation_id, storage_dir="./sessions")
    tools = [
        "strands_tools.current_time",
        "strands_tools.calculator",
        "api/utils/tools.py"
    ]
    zhipu_api_key = os.getenv("ZHIPU_API_KEY")
    if zhipu_api_key:
        zhipu_mcp = MCPClient(lambda: sse_client(
        f"https://open.bigmodel.cn/api/mcp/web_search/sse?Authorization={os.getenv("ZHIPU_API_KEY")}"))
        tools += [zhipu_mcp]
    agent: Agent = config_to_agent(
        config=config_path, session_manager=session_manager, tools=tools)
    return agent
