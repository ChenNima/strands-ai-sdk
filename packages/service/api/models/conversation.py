"""Conversation model definition."""

from typing import Optional, Any, List, TYPE_CHECKING
from uuid import UUID
from sqlmodel import SQLModel, Field, Column, Relationship
from sqlalchemy import JSON, ForeignKey

from .base import UUIDMixin, TimestampMixin

if TYPE_CHECKING:
    from .message import Message
    from .user import User


class ConversationBase(SQLModel):
    """Base conversation fields."""
    
    title: Optional[str] = Field(
        default=None,
        max_length=500,
        description="Conversation title"
    )
    meta: Optional[Any] = Field(
        default=None,
        sa_column=Column(JSON),
        description="Additional metadata (tags, settings, etc.)"
    )


class Conversation(ConversationBase, UUIDMixin, TimestampMixin, table=True):
    """Conversation database model."""
    
    __tablename__ = "conversations"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    
    # Foreign key to User.uuid (nullable for migration compatibility)
    user_id: Optional[UUID] = Field(
        default=None,
        foreign_key="users.uuid",
        index=True,
        description="User UUID that owns this conversation"
    )
    
    # Relationship with User
    user: Optional["User"] = Relationship(
        back_populates="conversations",
        sa_relationship_kwargs={"foreign_keys": "[Conversation.user_id]"}
    )
    
    # Reverse relationship with cascade delete
    messages: List["Message"] = Relationship(
        back_populates="conversation",
        sa_relationship_kwargs={
            "cascade": "all, delete-orphan",
            "lazy": "selectin"
        }
    )


class ConversationCreate(ConversationBase):
    """Schema for creating a conversation."""
    pass


class ConversationRead(ConversationBase, UUIDMixin, TimestampMixin):
    """Schema for reading a conversation."""
    
    id: int


class ConversationUpdate(SQLModel):
    """Schema for updating a conversation."""
    
    title: Optional[str] = None
    meta: Optional[Any] = None
