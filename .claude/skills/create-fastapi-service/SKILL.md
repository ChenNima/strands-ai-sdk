---
name: create-fastapi-service
description: Scaffold a new FastAPI service with model, service, and routes
allowedTools:
  - Bash
  - Read
  - Write
  - Edit
  - Glob
---

# Create FastAPI Service

This skill scaffolds a complete FastAPI service module including SQLModel model, service class, and API routes following the Strands AI SDK patterns.

## What Gets Created

| File | Description |
|------|-------------|
| `api/models/{name}.py` | SQLModel with Base, Create, Read schemas |
| `api/services/{name}_service.py` | Service class with CRUD operations |
| `api/routes/{name}.py` | FastAPI router with endpoints |

## Steps

### 1. Gather requirements

Before creating the service, clarify:
- **Resource name** (singular, snake_case): e.g., `comment`, `notification`, `file_upload`
- **Fields**: What data does this resource store?
- **Relationships**: Foreign keys to other tables (usually `user_uuid`)
- **Operations**: Which CRUD operations are needed?

### 2. Create the model

Create `api/models/{name}.py`:

```python
"""
{Name} model for {description}.
"""

from datetime import datetime
from typing import Optional
from uuid import UUID, uuid4

from sqlmodel import Field, SQLModel


class {Name}Base(SQLModel):
    """{Name} base fields (shared by create/read)."""

    # Add your fields here
    title: str = Field(max_length=255, description="Title")
    content: Optional[str] = Field(default=None, description="Content")


class {Name}(${Name}Base, table=True):
    """{Name} database model."""

    __tablename__ = "{table_name}"

    uuid: UUID = Field(default_factory=uuid4, primary_key=True)
    user_uuid: UUID = Field(foreign_key="users.uuid", index=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: Optional[datetime] = Field(default=None)


class {Name}Create({Name}Base):
    """Schema for creating a {name}."""

    pass


class {Name}Read({Name}Base):
    """Schema for reading a {name}."""

    uuid: UUID
    user_uuid: UUID
    created_at: datetime
    updated_at: Optional[datetime]
```

### 3. Register the model

Add import to `api/models/__init__.py`:

```python
from .{name} import {Name}, {Name}Create, {Name}Read
```

### 4. Create the service

Create `api/services/{name}_service.py`:

```python
"""
{Name} service for business logic.
"""

from typing import List, Optional
from uuid import UUID

from sqlmodel import Session, select

from ..models.{name} import {Name}, {Name}Create


class {Name}Service:
    """{Name} service with CRUD operations."""

    def __init__(self, session: Session):
        self.session = session

    def create(self, data: {Name}Create, user_uuid: UUID) -> {Name}:
        """Create a new {name}."""
        record = {Name}(
            **data.model_dump(),
            user_uuid=user_uuid,
        )
        self.session.add(record)
        self.session.commit()
        self.session.refresh(record)
        return record

    def get_by_uuid(self, uuid: UUID, user_uuid: UUID) -> Optional[{Name}]:
        """Get {name} by UUID (user-scoped)."""
        statement = select({Name}).where(
            {Name}.uuid == uuid,
            {Name}.user_uuid == user_uuid,
        )
        return self.session.exec(statement).first()

    def get_all(self, user_uuid: UUID, limit: int = 100, offset: int = 0) -> List[{Name}]:
        """Get all {name}s for a user."""
        statement = (
            select({Name})
            .where({Name}.user_uuid == user_uuid)
            .order_by({Name}.created_at.desc())
            .offset(offset)
            .limit(limit)
        )
        return list(self.session.exec(statement).all())

    def update(self, uuid: UUID, data: {Name}Create, user_uuid: UUID) -> Optional[{Name}]:
        """Update a {name}."""
        record = self.get_by_uuid(uuid, user_uuid)
        if not record:
            return None

        for key, value in data.model_dump(exclude_unset=True).items():
            setattr(record, key, value)

        from datetime import datetime
        record.updated_at = datetime.utcnow()

        self.session.add(record)
        self.session.commit()
        self.session.refresh(record)
        return record

    def delete(self, uuid: UUID, user_uuid: UUID) -> bool:
        """Delete a {name}."""
        record = self.get_by_uuid(uuid, user_uuid)
        if not record:
            return False

        self.session.delete(record)
        self.session.commit()
        return True
```

### 5. Create the routes

Create `api/routes/{name}.py`:

```python
"""
{Name} API routes.
"""

from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session

from ..database import get_session
from ..dependencies import get_current_user
from ..models.{name} import {Name}Create, {Name}Read
from ..models.user import User
from ..services.{name}_service import {Name}Service

router = APIRouter(prefix="/{name}s", tags=["{name}s"])


@router.post("", response_model={Name}Read, status_code=status.HTTP_201_CREATED)
async def create_{name}(
    data: {Name}Create,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> {Name}Read:
    """Create a new {name}."""
    service = {Name}Service(session)
    record = service.create(data, current_user.uuid)
    return {Name}Read.model_validate(record)


@router.get("", response_model=List[{Name}Read])
async def list_{name}s(
    limit: int = 100,
    offset: int = 0,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> List[{Name}Read]:
    """List all {name}s for current user."""
    service = {Name}Service(session)
    records = service.get_all(current_user.uuid, limit=limit, offset=offset)
    return [${Name}Read.model_validate(r) for r in records]


@router.get("/{uuid}", response_model={Name}Read)
async def get_{name}(
    uuid: UUID,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> {Name}Read:
    """Get a {name} by UUID."""
    service = {Name}Service(session)
    record = service.get_by_uuid(uuid, current_user.uuid)

    if not record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="{Name} not found",
        )

    return {Name}Read.model_validate(record)


@router.put("/{uuid}", response_model={Name}Read)
async def update_{name}(
    uuid: UUID,
    data: {Name}Create,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> {Name}Read:
    """Update a {name}."""
    service = {Name}Service(session)
    record = service.update(uuid, data, current_user.uuid)

    if not record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="{Name} not found",
        )

    return {Name}Read.model_validate(record)


@router.delete("/{uuid}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_{name}(
    uuid: UUID,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Delete a {name}."""
    service = {Name}Service(session)
    success = service.delete(uuid, current_user.uuid)

    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="{Name} not found",
        )
```

### 6. Register the router

Add the router to `api/index.py` (or `api/main.py`):

```python
from .routes.{name} import router as {name}_router

app.include_router({name}_router, prefix="/api")
```

### 7. Generate database migration

Use the `db-migrate` skill to create and apply the migration:

```bash
cd /home/ubuntu/dev/strands-ai-sdk/packages/service && alembic revision --autogenerate -m "add_{table_name}_table"
alembic upgrade head
```

## Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| Resource name | singular, snake_case | `file_upload` |
| Model class | PascalCase | `FileUpload` |
| Table name | plural, snake_case | `file_uploads` |
| Service class | PascalCase + Service | `FileUploadService` |
| Router prefix | plural, kebab-case | `/file-uploads` |
| File names | snake_case | `file_upload.py` |

## Example Usage

```
Create a new FastAPI service for user comments:
- Resource: comment
- Fields: content (text), post_uuid (FK to posts)
- Operations: Create, Read, List, Delete (no Update)
```

## Reference Files

Existing implementations to reference:
- Model: `api/models/file_upload.py`
- Service: `api/services/file_service.py`
- Routes: `api/routes/files.py`
