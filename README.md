# Strands Agent AI SDK Scaffold

This is a scaffold application that demonstrates the integration of [Strands Agent](https://github.com/strands-agents/sdk-python) with the [Vercel AI SDK](https://sdk.vercel.ai/). It showcases how to stream agent responses from a Python endpoint ([FastAPI](https://fastapi.tiangolo.com)) using the [Data Stream Protocol](https://sdk.vercel.ai/docs/ai-sdk-ui/stream-protocol#data-stream-protocol) and display them using the [useChat](https://sdk.vercel.ai/docs/ai-sdk-ui/chatbot#chatbot) hook in your Next.js application.

The application uses [Strands Agents](https://github.com/strands-agents/sdk-python) for building intelligent AI agents with tool support, powered by Amazon Bedrock models.

## Deploy your own

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/vercel-labs/ai-sdk-preview-python-streaming)

## Features

- **Strands Agent Integration**: Use the model-driven Strands Agents SDK for flexible AI agent development
- **Tool Support**: Built-in support for tool/function calling with streaming responses
- **Amazon Bedrock**: Powered by Amazon Bedrock models (Claude Haiku by default)
- **Real-time Streaming**: Full streaming support with Vercel AI SDK protocol
- **Next.js + FastAPI**: Modern full-stack application with frontend and backend
- **Conversation Management**: UUID-based conversation tracking with persistent storage
- **PostgreSQL Integration**: Full message history persistence and retrieval
- **Message Buffering**: Complete message buffering and database persistence via onFinish callbacks
- **Strands FileSessionManager**: Automatic session state management and recovery
- **Network Optimization**: Optimized message sending with `DefaultChatTransport` and `prepareSendMessagesRequest` - only sends latest message to reduce bandwidth
- **Conversation History**: Left sidebar with conversation list and quick navigation
- **Message Persistence**: Both streaming display and database persistence for complete audit trail

## How to use

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
   - `python -m venv venv` to create a Python virtual environment
   - `source venv/bin/activate` to activate the virtual environment (or `.venv\Scripts\activate` on Windows)
   - `pip install -e .` to install Python dependencies from `pyproject.toml`

4. Configure environment variables in `.env.local`:
   - Set `DATABASE_URL` for PostgreSQL connection
   - Add any required Bedrock-specific configurations

5. Run the application:
   - `pnpm dev` to launch the development server (frontend on port 3000, backend on port 8000)

## Project Structure

- `/app` - Next.js frontend application
  - `/app/page.tsx` - Home page (redirects to /chat for new conversation)
  - `/app/chat/page.tsx` - Chat page (generates new UUID and redirects to /chat/[uuid])
  - `/app/chat/[uuid]/page.tsx` - Specific conversation page
- `/components` - React components
  - `/components/custom/chat-interface.tsx` - Main chat interface with conversation list sidebar
  - `/components/ui/` - shadcn/ui components
- `/api` - FastAPI backend with Strands Agent integration
  - `/api/index.py` - Main API endpoints and agent handling
  - `/api/utils/tools.py` - Tool definitions for the agent (e.g., weather tool)
  - `/api/utils/stream.py` - Streaming protocol implementation with message buffering
  - `/api/models/` - SQLModel database models
  - `/api/database/` - Database session and configuration
- `pyproject.toml` - Python dependencies including strands-agents

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

### Backend Architecture

```
HTTP Request
  ↓ (body: { message: {...}, id: "uuid" })
handle_chat_data
  ├── Get or Create Conversation
  ├── Save User Message to DB
  ├── Create Strands Agent with FileSessionManager
  └── Stream Response
    ├── Buffer Message Parts
    ├── Stream to Client
    └── onFinish → Save AI Response to DB
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

- `POST /api/chat` - Send message and get streaming response
  - Request body: `{ message: ClientMessage, id: string }`
  - Returns: Server-Sent Events stream
  
- `GET /api/conversations` - Get all conversations
  - Returns: Array of conversations with UUID, title, timestamps
  
- `GET /api/conversations/{uuid}/messages` - Get messages for a conversation
  - Returns: Array of messages with role, content, parts

## How to Customize

1. **Add New Tools**: Define new tools in `/api/utils/tools.py` using the Strands SDK
   ```python
   from strands import tool
   
   @tool
   def your_tool(param: str) -> str:
       """Tool description"""
       return "result"
   ```

2. **Modify Agent Configuration**: Update `/api/index.py`
   - Change model ID
   - Add system prompts
   - Adjust temperature and other parameters
   - Modify tools list

3. **Update Frontend**: Customize chat interface in `/components/custom/chat-interface.tsx`
   - Modify sidebar styling
   - Change conversation list behavior
   - Update message rendering

4. **Add Database Features**: Extend models in `/api/models/`
   - Add new fields to Conversation or Message
   - Create new models for additional features

## Performance Optimizations

- **Network Optimization**: Uses `DefaultChatTransport.prepareSendMessagesRequest` to send only the latest message, reducing bandwidth by up to 95% for longer conversations
- **Message Buffering**: Complete messages are buffered server-side before database persistence
- **Session Management**: FileSessionManager maintains agent state efficiently
- **Streaming**: Real-time streaming prevents unnecessary buffering on client

## Learn More

- [Strands Agents Documentation](https://github.com/strands-agents/sdk-python)
- [Vercel AI SDK Documentation](https://sdk.vercel.ai/docs)
- [Vercel AI SDK - useChat Hook](https://sdk.vercel.ai/docs/ai-sdk-ui/chatbot)
- [Vercel AI SDK - Custom Transport](https://sdk.vercel.ai/docs/ai-sdk-ui/transport)
- [Next.js Documentation](https://nextjs.org/docs)
- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [Amazon Bedrock Documentation](https://aws.amazon.com/bedrock/)
- [SQLModel Documentation](https://sqlmodel.tiangolo.com/)
