from typing import List, Optional
from uuid import UUID
from pydantic import BaseModel
from dotenv import load_dotenv
from fastapi import FastAPI, Query, Request as FastAPIRequest
from fastapi.responses import StreamingResponse
from strands import Agent
from strands.models import BedrockModel
from strands.session.file_session_manager import FileSessionManager
from sqlmodel import select
from .utils.prompt import ClientMessage, convert_to_openai_messages
from .utils.stream import patch_response_with_headers, stream_strands_agent
from .utils.tools import STRANDS_TOOLS
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
        return [
            {
                "id": str(msg.uuid),
                "role": msg.role,
                "content": msg.content,
                "parts": msg.parts or [],
            }
            for msg in messages
        ]
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
    
    # Create Strands Agent with Bedrock model
    model = BedrockModel(
        model_id="global.anthropic.claude-haiku-4-5-20251001-v1:0",
        temperature=0.7,
        streaming=True
    )
    
    agent = Agent(
        model=model,
        tools=STRANDS_TOOLS
    )
    
    # Convert messages to format suitable for agent
    openai_messages = convert_to_openai_messages(messages)
    
    # Use FileSessionManager for Strands Agent to persist session state
    session_manager = FileSessionManager(session_id=conversation_id)
    
    # Create agent with session manager
    agent_with_session = Agent(
        model=model,
        tools=STRANDS_TOOLS,
        session_manager=session_manager
    )
    
    # Define onFinish callback to save AI response to database
    def on_finish_callback(buffered_message: dict):
        """Save the complete AI response to database."""
        try:
            db_session = get_session()
            ai_message = Message(
                conversation_uuid=UUID(conversation_id),
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
            openai_messages, 
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
