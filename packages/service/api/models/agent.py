"""Agent model definition."""

from typing import Optional, List, TYPE_CHECKING
from uuid import UUID
from sqlmodel import SQLModel, Field, Relationship

from .base import UUIDMixin, TimestampMixin

if TYPE_CHECKING:
    from .conversation import Conversation
    from .user import User


class AgentBase(SQLModel):
    """Base agent fields."""

    name: Optional[str] = Field(
        default=None,
        max_length=255,
        description="Agent display name"
    )


class Agent(AgentBase, UUIDMixin, TimestampMixin, table=True):
    """Agent database model."""

    __tablename__ = "agents"

    id: Optional[int] = Field(default=None, primary_key=True)

    # Foreign key to User.uuid (owner of this agent)
    user_id: Optional[UUID] = Field(
        default=None,
        foreign_key="users.uuid",
        index=True,
        description="User UUID that owns this agent"
    )

    # Relationship with User
    user: Optional["User"] = Relationship(
        back_populates="agents",
        sa_relationship_kwargs={"foreign_keys": "[Agent.user_id]"}
    )

    # Reverse relationship with conversations
    conversations: List["Conversation"] = Relationship(
        back_populates="agent",
        sa_relationship_kwargs={
            "cascade": "all, delete-orphan",
            "lazy": "selectin"
        }
    )


class AgentCreate(AgentBase):
    """Schema for creating an agent."""
    pass


class AgentRead(AgentBase, UUIDMixin, TimestampMixin):
    """Schema for reading an agent."""

    id: int


class AgentUpdate(SQLModel):
    """Schema for updating an agent."""

    name: Optional[str] = None
