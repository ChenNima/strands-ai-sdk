# Strands Agent AI SDK Scaffold

This is a scaffold application that demonstrates the integration of [Strands Agent](https://github.com/strands-agents/sdk-python) with the [Vercel AI SDK](https://sdk.vercel.ai/). It showcases how to stream agent responses from a Python endpoint ([FastAPI](https://fastapi.tiangolo.com)) using the [Data Stream Protocol](https://sdk.vercel.ai/docs/ai-sdk-ui/stream-protocol#data-stream-protocol) and display them using the [useChat](https://sdk.vercel.ai/docs/ai-sdk-ui/chatbot#chatbot) hook in your Next.js application.

The application uses [Strands Agents](https://github.com/strands-agents/sdk-python) for building intelligent AI agents with tool support, powered by Amazon Bedrock models.

## Deploy your own

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/vercel-labs/ai-sdk-preview-python-streaming)

## Features

- **Strands Agent Integration**: Use the model-driven Strands Agents SDK for flexible AI agent development
- **Tool Support**: Built-in support for tool/function calling with streaming responses
- **Amazon Bedrock**: Powered by Amazon Bedrock models (Nova Pro by default)
- **Real-time Streaming**: Full streaming support with Vercel AI SDK protocol
- **Next.js + FastAPI**: Modern full-stack application with frontend and backend

## How to use

To run this scaffold locally:

1. Configure AWS credentials for Amazon Bedrock access:
   - Set up AWS credentials (e.g., via `~/.aws/credentials` or environment variables)
   - Ensure you have access to Amazon Bedrock models

2. Set up the environment:
   - `pnpm install` to install Node dependencies
   - `python -m venv venv` to create a Python virtual environment
   - `source venv/bin/activate` to activate the virtual environment (or `.venv\Scripts\activate` on Windows)
   - `pip install -e .` to install Python dependencies from `pyproject.toml`

3. Configure environment variables in `.env.local`:
   - Add any required Bedrock-specific configurations

4. Run the application:
   - `pnpm dev` to launch the development server (frontend on port 3000, backend on port 8000)

## Project Structure

- `/app` - Next.js frontend application
- `/components` - React components including the Weather tool UI
- `/api` - FastAPI backend with Strands Agent integration
- `/api/utils/tools.py` - Tool definitions for the agent (e.g., weather tool)
- `/api/utils/stream.py` - Streaming protocol implementation
- `pyproject.toml` - Python dependencies including strands-agents

## How to Customize

1. **Add New Tools**: Define new tools in `/api/utils/tools.py` using the `@tool` decorator from Strands SDK
2. **Modify Agent Configuration**: Update the agent initialization in `/api/index.py` to add system prompts, change models, or adjust parameters
3. **Update Frontend**: Customize tool rendering in `/components/message.tsx`

## Learn More

- [Strands Agents Documentation](https://github.com/strands-agents/sdk-python)
- [Vercel AI SDK Documentation](https://sdk.vercel.ai/docs)
- [Next.js Documentation](https://nextjs.org/docs)
- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [Amazon Bedrock Documentation](https://aws.amazon.com/bedrock/)
