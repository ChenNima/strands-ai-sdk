# @mcs/service

Full-stack application demonstrating the integration of [Strands Agent](https://github.com/strands-agents/sdk-python) with the [Vercel AI SDK](https://sdk.vercel.ai/).

## Overview

This package contains a Next.js frontend with FastAPI backend, showcasing how to stream agent responses using the Data Stream Protocol and display them using the useChat hook.

## Features

- **Strands Agent Integration**: Use the model-driven Strands Agents SDK for flexible AI agent development
- **Tool Support**: Built-in support for tool/function calling with streaming responses
- **Tool Approval**: Human-in-the-loop workflow with interactive approval for sensitive tool operations
- **MCP Integration**: Model Context Protocol support with Zhipu web search example
- **Amazon Bedrock**: Powered by Amazon Bedrock models (Claude Haiku by default)
- **Real-time Streaming**: Full streaming support with Vercel AI SDK protocol
- **OIDC Authentication**: Full OIDC integration with JWT token verification and user management
- **Multi-User Support**: Complete user isolation with per-user conversation management
- **Conversation Management**: UUID-based conversation tracking with persistent storage
- **PostgreSQL Integration**: Full message history persistence and retrieval

## Quick Start

From the monorepo root:

```bash
# Create Python virtual environment (at root directory)
uv venv --python 3.12

# Install Node.js dependencies
pnpm install

# Configure environment (the .env file is at the root directory)
cp .env.example .env
# Edit .env with your configuration

# Start database
pnpm db:up

# Run migrations
cd packages/service
alembic upgrade head
cd ../..

# Start development server
pnpm dev
```

Or from this package directory:

```bash
# Create Python virtual environment at root (if not already created)
cd ../..
uv venv --python 3.12
cd packages/service

# Install Node.js dependencies
pnpm install

# Configure environment (note: .env is a symlink to ../../.env)
cd ../..
cp .env.example .env
cd packages/service
# Edit ../../.env with your configuration

# Start database
pnpm db:up

# Run migrations
alembic upgrade head

# Start development
pnpm dev
```

**Note**: The `.env` and `.env.example` files in this directory are symlinks to the root directory versions. All environment configuration should be maintained at the monorepo root level.

## Architecture

### Frontend
- `/app` - Next.js application pages
- `/components` - React components including chat interface
- `/contexts` - React contexts (authentication)
- `/lib` - Utility libraries (API client, auth)

### Backend (MVC Architecture)
- `/api/index.py` - Main application entry point
- `/api/middleware/` - Authentication middleware (JWT verification)
- `/api/services/` - Business logic layer
- `/api/routes/` - API routes (controllers)
- `/api/models/` - SQLModel database models
- `/api/database/` - Database configuration
- `/api/utils/` - Utility functions

## Available Scripts

```bash
pnpm dev          # Start development server (frontend + backend)
pnpm next-dev     # Start only Next.js frontend
pnpm fastapi-dev  # Start only FastAPI backend
pnpm build        # Build for production
pnpm start        # Start production server
pnpm lint         # Lint code
pnpm db:up        # Start PostgreSQL container
pnpm db:down      # Stop PostgreSQL container
pnpm db:logs      # View database logs
pnpm db:reset     # Reset database
```

## API Endpoints

### Authentication
- `POST /api/login` - Login with JWT token

### Conversations
- `GET /api/conversations` - Get all conversations
- `GET /api/conversations/{uuid}/messages` - Get conversation messages
- `DELETE /api/conversations/{uuid}` - Delete conversation

### Agent Chat
- `POST /api/agent/chat` - Send message and get streaming response

All endpoints require JWT authentication.

## Configuration

### Environment Variables

Create a `.env` file based on `.env.example` (at the monorepo root):

```env
DATABASE_URL=postgresql://user:password@localhost:5432/dbname
ZHIPU_API_KEY=your_zhipu_api_key  # Optional for web search
OIDC_ISSUER=your_oidc_issuer_url
OIDC_CLIENT_ID=your_client_id
```

**OIDC Provider Setup**: When configuring your OIDC provider (e.g., Keycloak, Auth0, Cognito), make sure to set the redirect URL:
- **Local development**: `http://localhost:3000/callback`
- **Production**: `https://your-domain.com/callback`

The application uses the `/callback` endpoint to handle OIDC authentication callbacks.

### AWS Credentials

Configure AWS credentials for Amazon Bedrock:
- Via `~/.aws/credentials`
- Or environment variables (`AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`)

## Customization

### Add New Tools

Define tools in `/api/utils/tools.py`:

```python
from strands import tool

@tool
def your_tool(param: str) -> str:
    """Tool description"""
    return "result"
```

Then add to `/api/config/default_agent.json`.

### Modify Agent Configuration

Update `/api/config/default_agent.json` to:
- Change model ID
- Add system prompts
- Adjust parameters
- Configure tools

### Add Custom Routes

Create route files in `/api/routes/` and register in `/api/index.py`.

### Add Business Logic

Create service files in `/api/services/` for business logic.

## Database Migrations

```bash
# Create a new migration
alembic revision --autogenerate -m "Description"

# Apply migrations
alembic upgrade head

# Rollback
alembic downgrade -1
```

## Production Deployment

See the [@mcs/cdk](../cdk/README.md) package for AWS CDK deployment instructions.

## Learn More

- [Root README](../../README.md) - Monorepo documentation
- [CDK Package](../cdk/README.md) - Infrastructure deployment
- [Strands Agents](https://github.com/strands-agents/sdk-python)
- [Vercel AI SDK](https://sdk.vercel.ai/docs)
- [Next.js](https://nextjs.org/docs)
- [FastAPI](https://fastapi.tiangolo.com/)

## Original Documentation

For the complete original documentation, see [README.service.md](./README.service.md).
