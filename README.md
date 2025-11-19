# Strands Agent AI SDK Scaffold

This is a scaffold application that demonstrates the integration of [Strands Agent](https://github.com/strands-agents/sdk-python) with the [Vercel AI SDK](https://sdk.vercel.ai/). It showcases how to stream agent responses from a Python endpoint ([FastAPI](https://fastapi.tiangolo.com)) using the [Data Stream Protocol](https://sdk.vercel.ai/docs/ai-sdk-ui/stream-protocol#data-stream-protocol) and display them using the [useChat](https://sdk.vercel.ai/docs/ai-sdk-ui/chatbot#chatbot) hook in your Next.js application.

The application uses [Strands Agents](https://github.com/strands-agents/sdk-python) for building intelligent AI agents with tool support, powered by Amazon Bedrock models.

## Features

- **Strands Agent Integration**: Use the model-driven Strands Agents SDK for flexible AI agent development
- **Tool Support**: Built-in support for tool/function calling with streaming responses
- **Tool Approval**: Human-in-the-loop workflow with interactive approval for sensitive tool operations
- **Amazon Bedrock**: Powered by Amazon Bedrock models (Claude Haiku by default)
- **Real-time Streaming**: Full streaming support with Vercel AI SDK protocol
- **Next.js + FastAPI**: Modern full-stack application with frontend and backend
- **OIDC Authentication**: Full OIDC integration with JWT token verification and user management
- **Multi-User Support**: Complete user isolation with per-user conversation management
- **MVC Architecture**: Clean separation of concerns with middleware, services, and routes layers
- **Conversation Management**: UUID-based conversation tracking with persistent storage
- **PostgreSQL Integration**: Full message history persistence and retrieval with user data
- **Message Buffering**: Complete message buffering and database persistence via onFinish callbacks
- **Strands FileSessionManager**: Automatic session state management and recovery
- **Network Optimization**: Optimized message sending - only sends latest message to reduce bandwidth
- **Conversation History**: Left sidebar with conversation list and quick navigation
To run this scaffold locally:

1. Configure AWS credentials for Amazon Bedrock access:
   - Set up AWS credentials (e.g., via `~/.aws/credentials` or environment variables)
   - Ensure you have access to Amazon Bedrock models

2. Set up PostgreSQL database:
   - Install PostgreSQL
   - Create a database for the application
   - Configure `DATABASE_URL` environment variable

3. Set up the environment:
   - `pnpm install` to install Node dependencies
   - Install [uv](https://docs.astral.sh/uv/) for Python package management: `curl -LsSf https://astral.sh/uv/install.sh | sh`
   - `uv sync` to create virtual environment and install Python dependencies from `pyproject.toml`

4. Configure environment variables in `.env.local`:
   - Set `DATABASE_URL` for PostgreSQL connection
   - Add any required Bedrock-specific configurations

5. Run the application:
   - `pnpm dev` to launch the development server (frontend on port 3000, backend on port 8000)

## Project Structure

### Frontend
- `/app` - Next.js application pages
  - `/app/page.tsx` - Home page (redirects to /chat)
  - `/app/chat/[uuid]/page.tsx` - Chat page with conversation UUID
  - `/app/login/page.tsx` - OIDC login page
  - `/app/callback/page.tsx` - OIDC callback handler
- `/components` - React components
  - `/components/custom/chat-interface.tsx` - Main chat interface with sidebar
  - `/components/ui/` - shadcn/ui components
- `/contexts` - React contexts
  - `/contexts/auth-context.tsx` - Authentication context with OIDC
- `/lib` - Utility libraries
  - `/lib/auth.ts` - OIDC authentication utilities
  - `/lib/api-client.ts` - API client with automatic token injection

### Backend (MVC Architecture)
- `/api` - FastAPI backend
  - `/api/index.py` - Main application entry point (30 lines)
  - `/api/middleware/` - Middleware layer
    - `auth.py` - Authentication middleware (JWT verification)
  - `/api/services/` - Business logic layer
    - `oidc_service.py` - OIDC user info with caching
    - `user_service.py` - User management
    - `conversation_service.py` - Conversation CRUD operations
    - `agent_service.py` - Agent creation and message handling
  - `/api/routes/` - API routes (controllers)
    - `auth.py` - Authentication endpoints
    - `conversations.py` - Conversation management endpoints
    - `agent.py` - AI agent chat endpoint
  - `/api/models/` - SQLModel database models
    - `user.py` - User model with OIDC integration
    - `conversation.py` - Conversation model
    - `message.py` - Message model
  - `/api/database/` - Database configuration
  - `/api/utils/` - Utility functions
    - `auth.py` - JWT token verification
    - `tools.py` - Agent tool definitions
    - `stream.py` - Streaming protocol implementation
- `pyproject.toml` - Python dependencies (strands-agents, oic, cachetools, etc.)

## Architecture

### Frontend Routing

```
Home (/)
  ↓ (auto redirect)
Chat (/chat)
  ↓ (generate UUID)
Chat with UUID (/chat/[uuid])
  ↓
ChatInterface Component
  ├── Conversation Sidebar (conversation list)
  ├── Message Display Area (allMessages from history + current)
  └── Input Area (latest message only sent to backend)
```

### Backend Architecture (MVC Pattern)

```
HTTP Request → /api/*
  ↓
Authentication Middleware
  ├── Verify JWT Token
  ├── Fetch User Info from OIDC (with cache)
  ├── Get/Create User in Database
  └── Attach user to request.state.db_user
  ↓
Route Layer (Controller)
  ├── /api/login → auth.router
  ├── /api/conversations → conversations.router
  └── /api/agent/chat → agent.router
  ↓
Service Layer (Business Logic)
  ├── oidc_service: OIDC operations (cached)
  ├── user_service: User management
  ├── conversation_service: Conversation CRUD
  └── agent_service: Agent operations
    ├── Get/Create Conversation
    ├── Save User Message
    ├── Create Agent with FileSessionManager
    └── Save AI Response
  ↓
Database Layer (PostgreSQL)
  ├── users (OIDC integration)
  ├── conversations (per-user)
  └── messages (conversation history)
```

### Data Flow

1. **User sends message**
   - Frontend: `sendMessage({ text: input })`
   - `DefaultChatTransport.prepareSendMessagesRequest` intercepts
   - Only latest message is sent: `{ message: {...}, id: "uuid" }`

2. **Backend processes**
   - Save user message to PostgreSQL
   - Strands Agent with FileSessionManager processes
   - Agent automatically recovers full conversation history from FileSessionManager
   - Streams response back to frontend

3. **Message persistence**
   - Frontend displays all messages (historical + current)
   - `onFinish` callback saves complete AI response to PostgreSQL
   - FileSessionManager maintains internal agent state

## API Endpoints

### Authentication
- `POST /api/login` - Login endpoint (requires JWT token from OIDC)
  - Headers: `Authorization: Bearer <jwt_token>`
  - Returns: User info with UUID, email, name

### Conversations
- `GET /api/conversations` - Get all conversations for current user
  - Headers: `Authorization: Bearer <jwt_token>`
  - Returns: Array of `{ uuid, title, created_at, updated_at }`

- `GET /api/conversations/{uuid}/messages` - Get all messages in a conversation
  - Headers: `Authorization: Bearer <jwt_token>`
  - Returns: Array of `{ id, role, content, parts }`

- `DELETE /api/conversations/{uuid}` - Delete a conversation
  - Headers: `Authorization: Bearer <jwt_token>`
  - Returns: `{ success: true }`

### Agent Chat
- `POST /api/agent/chat` - Send message and get streaming response
  - Headers: `Authorization: Bearer <jwt_token>`
  - Request body: `{ message: ClientMessage, id: string }`
  - Returns: Server-Sent Events stream with message chunks

All endpoints require JWT authentication token in Authorization header.

## How to Customize

### 1. Add New Tools
Define new tools in `/api/utils/tools.py` using the Strands SDK:
```python
from strands import tool

@tool
def your_tool(param: str) -> str:
    """Tool description"""
    return "result"
```

Then add the tool to the agent configuration in `/api/config/default_agent.json`.

### 2. Modify Agent Configuration
Update `/api/config/default_agent.json` or create a new config:
- Change model ID
- Add system prompts
- Adjust temperature and other parameters
- Modify tools list
- Configure the Strands Agent with your preferences

### 3. Add Custom Routes
Create new route files in `/api/routes/`:
```python
# /api/routes/custom.py
from fastapi import APIRouter, Request

router = APIRouter()

@router.get("/custom")
async def custom_endpoint(request: Request):
    user = request.state.db_user
    # Your logic here
    return {"result": "..."}
```

Then register in `/api/index.py`:
```python
from .routes import custom
app.include_router(custom.router, prefix="/api/custom", tags=["custom"])
```

### 4. Add Business Logic Services
Create new service files in `/api/services/`:
```python
# /api/services/custom_service.py
from ..database.session import get_session

def custom_operation(user_uuid: UUID):
    session = get_session()
    try:
        # Your business logic
        pass
    finally:
        session.close()
```

Import and use in routes:
```python
from ..services.custom_service import custom_operation

@router.post("/custom")
async def handler(request: Request):
    user = request.state.db_user
    result = custom_operation(user.uuid)
    return result
```

### 5. Customize Frontend Chat Interface
Update `/components/custom/chat-interface.tsx`:
- Modify sidebar styling and layout
- Change conversation list behavior and filtering
- Update message rendering and styling
- Add custom message types or components
- Customize theme and colors

### 6. Add Database Models
Extend or create new models in `/api/models/`:
```python
from sqlmodel import SQLModel, Field
from uuid import UUID

class CustomModel(SQLModel, table=True):
    id: UUID = Field(default_factory=UUID, primary_key=True)
    user_id: UUID = Field(foreign_key="user.uuid")
    # Your fields
```

Then use in services and routes with proper authentication checks.

### 7. Add Authentication Guards
Leverage the existing middleware protection:
- All `/api/*` endpoints automatically protected by JWT authentication
- User info available in `request.state.db_user`
- Implement row-level security in services for multi-user isolation

Example:
```python
@router.get("/user-data")
async def get_user_data(request: Request):
    user = request.state.db_user  # Already authenticated
    # Query data scoped to this user only
    return user_specific_data
```

### 8. Extend OIDC Integration
Customize OIDC configuration in environment variables:
- `OIDC_ISSUER` - Your OIDC provider issuer URL
- `OIDC_CLIENT_ID` - Application client ID
- Modify `/api/services/oidc_service.py` for custom user info fetching

## Learn More

- [Strands Agents Documentation](https://github.com/strands-agents/sdk-python)
- [Vercel AI SDK Documentation](https://sdk.vercel.ai/docs)
- [Vercel AI SDK - useChat Hook](https://sdk.vercel.ai/docs/ai-sdk-ui/chatbot)
- [Vercel AI SDK - Custom Transport](https://sdk.vercel.ai/docs/ai-sdk-ui/transport)
- [Next.js Documentation](https://nextjs.org/docs)
- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [Amazon Bedrock Documentation](https://aws.amazon.com/bedrock/)
- [SQLModel Documentation](https://sqlmodel.tiangolo.com/)
