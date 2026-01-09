"""
Agent routes.
"""
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, HTTPException, Request as FastAPIRequest
from pydantic import BaseModel

from ..services.agent_crud_service import (
    get_all_agents,
    get_agent_by_uuid,
    create_agent,
    update_agent,
    delete_agent
)

router = APIRouter()


class AgentCreateRequest(BaseModel):
    name: Optional[str] = None


class AgentUpdateRequest(BaseModel):
    name: Optional[str] = None


@router.get("")
async def list_agents(request: FastAPIRequest):
    """Get all agents (visible to all users)."""
    return get_all_agents()


@router.get("/{agent_uuid}")
async def get_agent(agent_uuid: str, request: FastAPIRequest):
    """Get a specific agent by UUID."""
    agent = get_agent_by_uuid(UUID(agent_uuid))
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    return agent


@router.post("")
async def create_new_agent(request: FastAPIRequest, body: AgentCreateRequest):
    """Create a new agent."""
    user = request.state.db_user
    return create_agent(user.uuid, body.name)


@router.put("/{agent_uuid}")
async def update_existing_agent(agent_uuid: str, request: FastAPIRequest, body: AgentUpdateRequest):
    """Update an existing agent."""
    return update_agent(UUID(agent_uuid), body.name)


@router.delete("/{agent_uuid}")
async def delete_existing_agent(agent_uuid: str, request: FastAPIRequest):
    """Delete an agent and all its conversations."""
    return delete_agent(UUID(agent_uuid))
