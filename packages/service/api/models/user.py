"""User model definition."""

from typing import Optional, List, TYPE_CHECKING
from sqlmodel import SQLModel, Field, Relationship

from .base import UUIDMixin, TimestampMixin

if TYPE_CHECKING:
    from .conversation import Conversation
    from .agent import Agent


class UserBase(SQLModel):
    """Base user fields."""
    
    external_user_id: str = Field(
        unique=True,
        index=True,
        max_length=255,
        description="External user ID from OIDC provider (sub claim)"
    )
    email: Optional[str] = Field(
        default=None,
        max_length=255,
        description="User email"
    )
    name: Optional[str] = Field(
        default=None,
        max_length=255,
        description="User display name"
    )


class User(UserBase, UUIDMixin, TimestampMixin, table=True):
    """User database model."""
    
    __tablename__ = "users"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    
    # Reverse relationship with conversations
    conversations: List["Conversation"] = Relationship(
        back_populates="user",
        sa_relationship_kwargs={
            "cascade": "all, delete-orphan",
            "lazy": "selectin"
        }
    )

    # Reverse relationship with agents
    agents: List["Agent"] = Relationship(
        back_populates="user",
        sa_relationship_kwargs={
            "cascade": "all, delete-orphan",
            "lazy": "selectin"
        }
    )


class UserCreate(UserBase):
    """Schema for creating a user."""
    pass


class UserRead(UserBase, UUIDMixin, TimestampMixin):
    """Schema for reading a user."""
    
    id: int


class UserUpdate(SQLModel):
    """Schema for updating a user."""
    
    email: Optional[str] = None
