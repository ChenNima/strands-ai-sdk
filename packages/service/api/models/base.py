"""Base model mixins and utilities."""

from uuid import UUID, uuid4
from datetime import datetime
from typing import Optional

from sqlmodel import SQLModel, Field


class UUIDMixin(SQLModel):
    """Mixin to add UUID field to models."""
    
    uuid: UUID = Field(
        default_factory=uuid4,
        unique=True,
        index=True,
        description="External UUID identifier"
    )


class TimestampMixin(SQLModel):
    """Mixin to add timestamp fields to models."""
    
    created_at: datetime = Field(
        default_factory=datetime.utcnow,
        description="Creation timestamp"
    )
    updated_at: Optional[datetime] = Field(
        default=None,
        description="Last update timestamp"
    )
    
    def update_timestamp(self):
        """Update the updated_at timestamp."""
        self.updated_at = datetime.utcnow()
