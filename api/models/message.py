"""Message model definition."""

from uuid import UUID
from typing import Optional, Any, List, TYPE_CHECKING
from sqlmodel import SQLModel, Field, Column, Relationship
from sqlalchemy import JSON

from .base import UUIDMixin, TimestampMixin

if TYPE_CHECKING:
    from .conversation import Conversation


class MessageBase(SQLModel):
    """Base message fields."""
    
    conversation_uuid: UUID = Field(
        foreign_key="conversations.uuid",
        description="Conversation UUID this message belongs to"
    )
    role: str = Field(
        max_length=50,
        description="Message role: user, assistant, system, tool"
    )
    content: Optional[str] = Field(
        default=None,
        description="Message text content (extracted from parts for quick queries)"
    )
    parts: Any = Field(
        sa_column=Column(JSON),
        description="Complete message parts structure (text, tool calls, tool results, etc.)"
    )
    attachments: Optional[Any] = Field(
        default=None,
        sa_column=Column(JSON),
        description="Attachment information (files, images, etc.)"
    )
    meta: Optional[Any] = Field(
        default=None,
        sa_column=Column(JSON),
        description="Additional message metadata"
    )


class Message(MessageBase, UUIDMixin, TimestampMixin, table=True):
    """Message database model."""
    
    __tablename__ = "messages"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    
    # Forward relationship to Conversation
    conversation: Optional["Conversation"] = Relationship(
        back_populates="messages"
    )


class MessageCreate(MessageBase):
    """Schema for creating a message."""
    pass


class MessageRead(MessageBase, UUIDMixin, TimestampMixin):
    """Schema for reading a message."""
    
    id: int


class MessageUpdate(SQLModel):
    """Schema for updating a message."""
    
    content: Optional[str] = None
    parts: Optional[Any] = None
    attachments: Optional[Any] = None
    meta: Optional[Any] = None
