from typing import List, Optional, Dict, Any
from uuid import UUID, uuid4
from datetime import datetime
from pydantic import BaseModel
from dotenv import load_dotenv
from fastapi import FastAPI, Query, Request as FastAPIRequest, Depends, HTTPException
from fastapi.responses import StreamingResponse, JSONResponse
from strands.experimental import config_to_agent
from strands.session.file_session_manager import FileSessionManager
from sqlmodel import select
from .utils.prompt import ClientMessage
from .utils.stream import patch_response_with_headers, stream_strands_agent
from .utils.auth import get_current_user, verify_token
from .database.session import get_session
from .models import Conversation, Message, User
import os
import logging
from oic.oic import Client
from oic.utils.authn.client import CLIENT_AUTHN_METHOD
from oic.oic.message import Message as OICMessage, SINGLE_REQUIRED_STRING, SINGLE_OPTIONAL_STRING
from cachetools import TTLCache
from vercel import oidc
from vercel.headers import set_headers

logger = logging.getLogger(__name__)


load_dotenv(".env.local")

app = FastAPI()


@app.middleware("http")
async def _vercel_set_headers(request: FastAPIRequest, call_next):
    set_headers(dict(request.headers))
    return await call_next(request)


@app.middleware("http")
async def authenticate_requests(request: FastAPIRequest, call_next):
    """
    Global authentication middleware for all API routes.
    Verifies JWT token for all /api/* endpoints and loads user from database.
    """
    # Skip authentication for health check and public endpoints
    public_paths = ["/health", "/docs", "/openapi.json", "/redoc"]
    
    # Check if this is an API endpoint that requires authentication
    if request.url.path.startswith("/api/"):
        # Get authorization header
        auth_header = request.headers.get("authorization")
        
        if not auth_header:
            return JSONResponse(
                status_code=401,
                content={"detail": "Authorization header missing"}
            )
        
        # Extract Bearer token
        parts = auth_header.split()
        if len(parts) != 2 or parts[0].lower() != "bearer":
            return JSONResponse(
                status_code=401,
                content={"detail": "Invalid authorization header format"}
            )
        
        token = parts[1]
        
        # Get OIDC configuration
        issuer = os.getenv("OIDC_ISSUER")
        audience = os.getenv("OIDC_CLIENT_ID")
        
        if not issuer:
            return JSONResponse(
                status_code=500,
                content={"detail": "OIDC_ISSUER not configured"}
            )
        
        # Verify token
        try:
            user_claims = verify_token(token, issuer, audience)
            # Store user claims in request state for use in route handlers
            request.state.user = user_claims
            
            # Get or create user from database and store in request state
            session = get_session()
            try:
                db_user = get_or_create_user(session, user_claims, token)
                request.state.db_user = db_user
            finally:
                session.close()
                
        except HTTPException as e:
            return JSONResponse(
                status_code=e.status_code,
                content={"detail": e.detail}
            )
        except Exception as e:
            return JSONResponse(
                status_code=401,
                content={"detail": f"Token verification failed: {str(e)}"}
            )
    
    return await call_next(request)


class Request(BaseModel):
    id: str
    message: Optional[ClientMessage] = None  # Single message from optimized client
    messages: Optional[List[ClientMessage]] = None  # Full history for backward compatibility
    trigger: Optional[str] = None


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


def get_or_create_user(session, user_claims: Dict[str, Any], access_token: str = None) -> User:
    """Get or create user from OIDC claims."""
    external_user_id = user_claims.get("sub")
    if not external_user_id:
        raise HTTPException(status_code=400, detail="Missing 'sub' claim in token")
    
    # Try to find existing user
    stmt = select(User).where(User.external_user_id == external_user_id)
    user = session.exec(stmt).first()
    
    if not user:
        # Fetch complete user info from OIDC provider using oic library
        if not access_token:
            raise HTTPException(status_code=400, detail="Access token required to create user")
        
        userinfo = fetch_userinfo_from_oidc(access_token)
        
        # Create new user with info from OIDC provider
        user = User(
            uuid=uuid4(),
            external_user_id=external_user_id,
            email=userinfo.get("email"),
            name=userinfo.get("name") or userinfo.get("preferred_username"),
            created_at=datetime.utcnow()
        )
        session.add(user)
        session.commit()
        session.refresh(user)
    
    return user


@app.post("/api/login")
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


@app.get("/api/conversations")
async def get_conversations(request: FastAPIRequest):
    """Get all conversations for the current user."""
    # User is already loaded in middleware
    user = request.state.db_user
    session = get_session()
    try:
        # Filter conversations by user_id
        stmt = select(Conversation).where(
            Conversation.user_id == user.uuid
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
    finally:
        session.close()


@app.get("/api/conversations/{conversation_uuid}/messages")
async def get_conversation_messages(conversation_uuid: str, request: FastAPIRequest):
    """Get all messages for a specific conversation."""
    # User is already loaded in middleware
    user = request.state.db_user
    session = get_session()
    try:
        # Verify conversation ownership
        conv_stmt = select(Conversation).where(
            Conversation.uuid == UUID(conversation_uuid),
            Conversation.user_id == user.uuid
        )
        conversation = session.exec(conv_stmt).first()
        if not conversation:
            raise HTTPException(status_code=404, detail="Conversation not found")
        
        # Get messages for this conversation
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
async def delete_conversation(conversation_uuid: str, request: FastAPIRequest):
    """Delete a conversation and all its messages."""
    # User is already loaded in middleware
    user = request.state.db_user
    session = get_session()
    try:
        # Verify conversation ownership before deleting
        stmt = select(Conversation).where(
            Conversation.uuid == UUID(conversation_uuid),
            Conversation.user_id == user.uuid
        )
        conversation = session.exec(stmt).first()
        
        if not conversation:
            raise HTTPException(status_code=404, detail="Conversation not found")
        
        # Delete all messages associated with this conversation
        msg_stmt = select(Message).where(
            Message.conversation_uuid == UUID(conversation_uuid)
        )
        messages = session.exec(msg_stmt).all()
        for msg in messages:
            session.delete(msg)
        
        # Delete the conversation itself
        session.delete(conversation)
        session.commit()
        return {"success": True, "message": "Conversation deleted successfully"}
    finally:
        session.close()


@app.post("/api/chat")
async def handle_chat_data(
    request: Request,
    fastapi_request: FastAPIRequest,
    protocol: str = Query('data')
):
    """
    Chat endpoint with OIDC authentication.
    User is already loaded in middleware as fastapi_request.state.db_user
    """
    # User is already loaded in middleware
    user = fastapi_request.state.db_user
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
            # Try to find existing conversation by UUID and verify ownership
            stmt = select(Conversation).where(
                Conversation.uuid == UUID(conversation_id),
                Conversation.user_id == user.uuid
            )
            conversation = session.exec(stmt).first()
        
        # If no conversation found, create a new one linked to the user
        if not conversation:
            conversation = Conversation(
                uuid=UUID(conversation_id) if conversation_id else None,
                user_id=user.uuid
            )
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
