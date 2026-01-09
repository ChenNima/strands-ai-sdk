"""
Agent CRUD service for agent management.
"""
from typing import List, Dict, Any, Optional
from uuid import UUID

from fastapi import HTTPException
from sqlmodel import select

from ..database.session import get_session
from ..models import Agent


def get_all_agents() -> List[Dict[str, Any]]:
    """Get all agents (visible to all users)."""
    session = get_session()
    stmt = select(Agent).order_by(Agent.created_at.desc())
    agents = session.exec(stmt).all()
    return [
        {
            "uuid": str(agent.uuid),
            "name": agent.name or "Untitled Agent",
            "created_at": agent.created_at.isoformat() if agent.created_at else None,
            "updated_at": agent.updated_at.isoformat() if agent.updated_at else None,
        }
        for agent in agents
    ]


def get_agent_by_uuid(agent_uuid: UUID) -> Optional[Dict[str, Any]]:
    """Get a specific agent by UUID.

    Args:
        agent_uuid: Agent's UUID
    """
    session = get_session()
    stmt = select(Agent).where(Agent.uuid == agent_uuid)
    agent = session.exec(stmt).first()
    if not agent:
        return None
    return {
        "uuid": str(agent.uuid),
        "name": agent.name or "Untitled Agent",
        "created_at": agent.created_at.isoformat() if agent.created_at else None,
        "updated_at": agent.updated_at.isoformat() if agent.updated_at else None,
    }


def create_agent(user_uuid: UUID, name: Optional[str] = None) -> Dict[str, Any]:
    """Create a new agent.

    Args:
        user_uuid: User's UUID
        name: Optional agent name
    """
    session = get_session()
    agent = Agent(
        user_id=user_uuid,
        name=name
    )
    session.add(agent)
    session.commit()
    session.refresh(agent)
    return {
        "uuid": str(agent.uuid),
        "name": agent.name or "Untitled Agent",
        "created_at": agent.created_at.isoformat() if agent.created_at else None,
        "updated_at": agent.updated_at.isoformat() if agent.updated_at else None,
    }


def update_agent(agent_uuid: UUID, name: Optional[str] = None) -> Dict[str, Any]:
    """Update an agent.

    Args:
        agent_uuid: Agent's UUID
        name: New agent name
    """
    session = get_session()
    stmt = select(Agent).where(Agent.uuid == agent_uuid)
    agent = session.exec(stmt).first()
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")

    if name is not None:
        agent.name = name
    agent.update_timestamp()
    session.add(agent)
    session.commit()
    session.refresh(agent)
    return {
        "uuid": str(agent.uuid),
        "name": agent.name or "Untitled Agent",
        "created_at": agent.created_at.isoformat() if agent.created_at else None,
        "updated_at": agent.updated_at.isoformat() if agent.updated_at else None,
    }


def delete_agent(agent_uuid: UUID) -> Dict[str, Any]:
    """Delete an agent.

    Args:
        agent_uuid: Agent's UUID
    """
    session = get_session()
    stmt = select(Agent).where(Agent.uuid == agent_uuid)
    agent = session.exec(stmt).first()

    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")

    session.delete(agent)
    session.commit()
    return {"success": True, "message": "Agent deleted successfully"}
