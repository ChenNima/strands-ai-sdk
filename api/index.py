from typing import List, Optional
from uuid import UUID
from pydantic import BaseModel
from dotenv import load_dotenv
from fastapi import FastAPI, Query, Request as FastAPIRequest
from fastapi.responses import StreamingResponse
from strands.experimental import config_to_agent
from strands.session.file_session_manager import FileSessionManager
from sqlmodel import select
from .utils.prompt import ClientMessage
from .utils.stream import patch_response_with_headers, stream_strands_agent
from .database.session import get_session
from .models import Conversation, Message
from vercel import oidc
from vercel.headers import set_headers


load_dotenv(".env.local")

app = FastAPI()


@app.middleware("http")
async def _vercel_set_headers(request: FastAPIRequest, call_next):
    set_headers(dict(request.headers))
    return await call_next(request)


class Request(BaseModel):
    id: str
    message: Optional[ClientMessage] = None  # Single message from optimized client
    messages: Optional[List[ClientMessage]] = None  # Full history for backward compatibility
    trigger: Optional[str] = None


@app.get("/api/conversations")
async def get_conversations():
    """Get all conversations for the current user."""
    session = get_session()
    try:
        stmt = select(Conversation).order_by(Conversation.updated_at.desc())
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
    finally:
        session.close()


@app.get("/api/conversations/{conversation_uuid}/messages")
async def get_conversation_messages(conversation_uuid: str):
    """Get all messages for a specific conversation."""
    session = get_session()
    try:
        stmt = select(Message).where(
            Message.conversation_uuid == UUID(conversation_uuid)
        ).order_by(Message.created_at.asc())
        messages = session.exec(stmt).all()
        
        # Group messages by message_id and merge parts
        merged_messages = {}
        message_order = []  # Track order of first appearance
        
        for msg in messages:
            msg_id = msg.message_id or str(msg.uuid)
            
            if msg_id not in merged_messages:
                # First occurrence of this message_id
                merged_messages[msg_id] = {
                    "id": msg_id,
                    "role": msg.role,
                    "content": msg.content,
                    "parts": msg.parts or [],
                    "tool_call_map": {}  # Track tool calls by toolCallId
                }
                
                # Build initial tool call map
                for i, part in enumerate(merged_messages[msg_id]["parts"]):
                    if isinstance(part, dict) and "toolCallId" in part:
                        merged_messages[msg_id]["tool_call_map"][part["toolCallId"]] = i
                
                message_order.append(msg_id)
            else:
                # Merge parts from messages with same message_id
                existing = merged_messages[msg_id]
                new_parts = msg.parts or []
                
                for part in new_parts:
                    if isinstance(part, dict) and "toolCallId" in part:
                        tool_call_id = part["toolCallId"]
                        if tool_call_id in existing["tool_call_map"]:
                            # Replace existing tool call with same toolCallId
                            idx = existing["tool_call_map"][tool_call_id]
                            existing["parts"][idx] = part
                        else:
                            # New tool call, append and track
                            existing["parts"].append(part)
                            existing["tool_call_map"][tool_call_id] = len(existing["parts"]) - 1
                    else:
                        # Not a tool call part, just append
                        existing["parts"].append(part)
                
                # Update other fields from the latest message
                existing["role"] = msg.role
                existing["content"] = msg.content
        
        # Return merged messages in original order
        return [
            {
                "id": merged_messages[msg_id]["id"],
                "role": merged_messages[msg_id]["role"],
                "content": merged_messages[msg_id]["content"],
                "parts": merged_messages[msg_id]["parts"],
            }
            for msg_id in message_order
        ]
    finally:
        session.close()


@app.delete("/api/conversations/{conversation_uuid}")
async def delete_conversation(conversation_uuid: str):
    """Delete a conversation and all its messages."""
    session = get_session()
    try:
        # First delete all messages associated with this conversation
        stmt = select(Message).where(
            Message.conversation_uuid == UUID(conversation_uuid)
        )
        messages = session.exec(stmt).all()
        for msg in messages:
            session.delete(msg)
        
        # Then delete the conversation itself
        stmt = select(Conversation).where(Conversation.uuid == UUID(conversation_uuid))
        conversation = session.exec(stmt).first()
        if conversation:
            session.delete(conversation)
            session.commit()
            return {"success": True, "message": "Conversation deleted successfully"}
        else:
            return {"success": False, "message": "Conversation not found"}
    finally:
        session.close()


@app.post("/api/chat")
async def handle_chat_data(request: Request, protocol: str = Query('data')):
    conversation_id = request.id
    
    # Handle both optimized format (single message) and backward compatibility (full history)
    if request.message:
        # Optimized format: only the latest user message is sent
        messages = [request.message]
    else:
        # Backward compatibility: full message history
        messages = request.messages or []
    
    # Get or create conversation
    session = get_session()
    try:
        conversation = None
        if conversation_id:
            # Try to find existing conversation by UUID
            stmt = select(Conversation).where(Conversation.uuid == UUID(conversation_id))
            conversation = session.exec(stmt).first()
        
        # If no conversation found, create a new one
        if not conversation:
            conversation = Conversation(uuid=UUID(conversation_id) if conversation_id else None)
            session.add(conversation)
            session.commit()
            session.refresh(conversation)
        
        # Save user message (last message in the list)
        if messages:
            last_message = messages[-1]
            if last_message.role == "user":
                # Convert Pydantic models to dictionaries for JSON serialization
                parts_data = None
                conversation_title = None
                
                if last_message.parts:
                    parts_data = [part.model_dump(exclude_none=True) for part in last_message.parts]
                    
                    # Extract text from the first text part as conversation title
                    for part in last_message.parts:
                        if part.type == 'text' and part.text:
                            conversation_title = part.text
                            break
                
                # Update conversation title if not already set
                if conversation_title and not conversation.title:
                    conversation.title = conversation_title
                    session.add(conversation)
                    session.commit()
                
                db_message = Message(
                    conversation_uuid=conversation.uuid,
                    role=last_message.role,
                    content=last_message.content,
                    parts=parts_data
                )
                session.add(db_message)
                session.commit()
    finally:
        session.close()
    
    # Use FileSessionManager for Strands Agent to persist session state
    session_manager = FileSessionManager(session_id=conversation_id, storage_dir="./sessions")
    
    # Create agent from configuration file with session manager
    agent_with_session = config_to_agent(
        config="api/config/default_agent.json",
        session_manager=session_manager
    )
    
    # Define onFinish callback to save AI response to database
    def on_finish_callback(buffered_message: dict, message_id: str = None):
        """Save the complete AI response to database."""
        try:
            db_session = get_session()
            ai_message = Message(
                conversation_uuid=UUID(conversation_id),
                message_id=message_id,  # Store AI SDK message ID
                role=buffered_message["role"],
                content=None,  # Content can be None, parts contain the actual data
                parts=buffered_message["parts"]
            )
            db_session.add(ai_message)
            db_session.commit()
        except Exception as e:
            print(f"Error saving AI message: {e}")
        finally:
            db_session.close()
    
    async def generate():
        """Wrapper to ensure proper streaming without buffering"""
        async for chunk in stream_strands_agent(
            agent_with_session, 
            messages,  # Pass AI SDK format messages directly
            protocol,
            on_finish=on_finish_callback
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
