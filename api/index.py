from typing import List
from pydantic import BaseModel
from dotenv import load_dotenv
from fastapi import FastAPI, Query, Request as FastAPIRequest
from fastapi.responses import StreamingResponse
from strands import Agent
from strands.models import BedrockModel
from .utils.prompt import ClientMessage, convert_to_openai_messages
from .utils.stream import patch_response_with_headers, stream_strands_agent
from .utils.tools import STRANDS_TOOLS
from vercel import oidc
from vercel.headers import set_headers


load_dotenv(".env.local")

app = FastAPI()


@app.middleware("http")
async def _vercel_set_headers(request: FastAPIRequest, call_next):
    set_headers(dict(request.headers))
    return await call_next(request)


class Request(BaseModel):
    messages: List[ClientMessage]


@app.post("/api/chat")
async def handle_chat_data(request: Request, protocol: str = Query('data')):
    messages = request.messages
    
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
    
    async def generate():
        """Wrapper to ensure proper streaming without buffering"""
        async for chunk in stream_strands_agent(agent, openai_messages, protocol):
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
