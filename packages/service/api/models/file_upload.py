"""File upload model definition."""

from typing import Optional, TYPE_CHECKING
from uuid import UUID

from sqlalchemy import Text
from sqlmodel import SQLModel, Field, Relationship, Column

from .base import UUIDMixin, TimestampMixin

if TYPE_CHECKING:
    from .user import User


class FileUploadBase(SQLModel):
    """Base file upload fields."""

    filename: str = Field(
        max_length=255,
        description="Original filename"
    )
    mime_type: str = Field(
        max_length=100,
        description="MIME type of the file"
    )
    file_size: int = Field(
        description="File size in bytes"
    )
    markdown_content: Optional[str] = Field(
        default=None,
        sa_column=Column(Text),
        description="Parsed markdown content from the document"
    )


class FileUpload(FileUploadBase, UUIDMixin, TimestampMixin, table=True):
    """File upload database model."""

    __tablename__ = "file_uploads"

    id: Optional[int] = Field(default=None, primary_key=True)
    s3_key: str = Field(
        max_length=500,
        description="S3 storage key/path"
    )
    user_uuid: UUID = Field(
        foreign_key="users.uuid",
        index=True,
        description="UUID of the user who uploaded the file"
    )

    # Relationship with user
    user: Optional["User"] = Relationship(
        sa_relationship_kwargs={"lazy": "selectin"}
    )


class FileUploadCreate(FileUploadBase):
    """Schema for creating a file upload record."""
    pass


class FileUploadRead(FileUploadBase, UUIDMixin, TimestampMixin):
    """Schema for reading a file upload record."""

    id: int
