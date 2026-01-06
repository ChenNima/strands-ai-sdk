"""
Conversation service for conversation and message management.
"""
from typing import List, Dict, Any
from uuid import UUID

from fastapi import HTTPException
from sqlmodel import select

from ..database.session import get_session
from ..models import Conversation, Message


def get_user_conversations(user_uuid: UUID) -> List[Dict[str, Any]]:
    """Get all conversations for a user.

    Args:
        user_uuid: User's UUID
    """
    session = get_session()
    stmt = select(Conversation).where(
        Conversation.user_id == user_uuid
    ).order_by(Conversation.updated_at.desc())
    conversations = session.exec(stmt).all()
    return [
        {
            "uuid": str(conv.uuid),
            "title": conv.title or "Untitled",
            "created_at": conv.created_at.isoformat() if conv.created_at else None,
            "updated_at": conv.updated_at.isoformat() if conv.updated_at else None,
        }
        for conv in conversations
    ]


def get_conversation_messages(
    conversation_uuid: UUID, user_uuid: UUID
) -> List[Dict[str, Any]]:
    """Get all messages for a conversation, with ownership verification.

    Args:
        conversation_uuid: Conversation's UUID
        user_uuid: User's UUID for ownership verification
    """
    session = get_session()

    # Verify conversation ownership
    conv_stmt = select(Conversation).where(
        Conversation.uuid == conversation_uuid,
        Conversation.user_id == user_uuid
    )
    conversation = session.exec(conv_stmt).first()
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")

    # Get messages
    stmt = select(Message).where(
        Message.conversation_uuid == conversation_uuid
    ).order_by(Message.created_at.asc())
    messages = session.exec(stmt).all()

    # Group messages by message_id and merge parts
    merged_messages = {}
    message_order = []

    for msg in messages:
        msg_id = msg.message_id or str(msg.uuid)

        if msg_id not in merged_messages:
            merged_messages[msg_id] = {
                "id": msg_id,
                "role": msg.role,
                "content": msg.content,
                "parts": msg.parts or [],
                "tool_call_map": {}
            }

            for i, part in enumerate(merged_messages[msg_id]["parts"]):
                if isinstance(part, dict) and "toolCallId" in part:
                    merged_messages[msg_id]["tool_call_map"][part["toolCallId"]] = i

            message_order.append(msg_id)
        else:
            existing = merged_messages[msg_id]
            new_parts = msg.parts or []

            for part in new_parts:
                if isinstance(part, dict) and "toolCallId" in part:
                    tool_call_id = part["toolCallId"]
                    if tool_call_id in existing["tool_call_map"]:
                        idx = existing["tool_call_map"][tool_call_id]
                        # Merge the new part's attributes into the existing part
                        existing["parts"][idx].update(part)
                    else:
                        existing["parts"].append(part)
                        existing["tool_call_map"][tool_call_id] = len(existing["parts"]) - 1
                else:
                    existing["parts"].append(part)

            existing["role"] = msg.role
            existing["content"] = msg.content

    return [
        {
            "id": merged_messages[msg_id]["id"],
            "role": merged_messages[msg_id]["role"],
            "content": merged_messages[msg_id]["content"],
            "parts": merged_messages[msg_id]["parts"],
        }
        for msg_id in message_order
    ]


def delete_user_conversation(conversation_uuid: UUID, user_uuid: UUID) -> Dict[str, Any]:
    """Delete a conversation with ownership verification.

    Args:
        conversation_uuid: Conversation's UUID
        user_uuid: User's UUID for ownership verification
    """
    session = get_session()

    stmt = select(Conversation).where(
        Conversation.uuid == conversation_uuid,
        Conversation.user_id == user_uuid
    )
    conversation = session.exec(stmt).first()

    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")

    # Delete messages
    msg_stmt = select(Message).where(Message.conversation_uuid == conversation_uuid)
    messages = session.exec(msg_stmt).all()
    for msg in messages:
        session.delete(msg)

    # Delete conversation
    session.delete(conversation)
    session.commit()
    return {"success": True, "message": "Conversation deleted successfully"}
