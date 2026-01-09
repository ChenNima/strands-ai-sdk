---
name: db-migrate
description: Create and run database migrations with Alembic
allowedTools:
  - Bash
  - Read
  - Glob
---

# Database Migration

This skill handles database migrations for the Strands AI SDK using Alembic. It supports generating new migrations from model changes and applying them to the database.

## Prerequisites

- PostgreSQL database must be running (`pnpm db:up`)
- Virtual environment activated with dependencies installed
- Working directory: `packages/service`

## Commands Overview

| Command | Description |
|---------|-------------|
| `alembic revision --autogenerate -m "message"` | Generate migration from model changes |
| `alembic upgrade head` | Apply all pending migrations |
| `alembic downgrade -1` | Rollback last migration |
| `alembic current` | Show current migration version |
| `alembic history` | Show migration history |

## Steps

### 1. Check current migration status

First, verify the current state of migrations:

```bash
cd /home/ubuntu/dev/strands-ai-sdk/packages/service && alembic current
```

### 2. Generate a new migration

After modifying SQLModel models in `api/models/`, generate a migration:

```bash
cd /home/ubuntu/dev/strands-ai-sdk/packages/service && alembic revision --autogenerate -m "<descriptive_message>"
```

**Migration message guidelines:**
- Use snake_case: `add_file_uploads_table`
- Be descriptive: `add_markdown_content_to_file_uploads`
- Prefix with action: `add_`, `remove_`, `alter_`, `create_`

### 3. Review the generated migration

The migration file will be created in `api/alembic/versions/`. **Always review it before applying:**

```bash
ls -la /home/ubuntu/dev/strands-ai-sdk/packages/service/api/alembic/versions/*.py | tail -1
```

Then read the latest migration file to verify the changes are correct.

**Check for:**
- Correct table/column names
- Proper column types (especially TEXT for large content)
- Foreign key relationships
- Index definitions
- Both `upgrade()` and `downgrade()` functions

### 4. Apply the migration

Once reviewed, apply the migration:

```bash
cd /home/ubuntu/dev/strands-ai-sdk/packages/service && alembic upgrade head
```

### 5. Verify the migration

Confirm the migration was applied successfully:

```bash
cd /home/ubuntu/dev/strands-ai-sdk/packages/service && alembic current
```

## Common Model Patterns

### Adding a new table

```python
# api/models/example.py
from sqlmodel import Field, SQLModel
from uuid import UUID, uuid4
from datetime import datetime

class Example(SQLModel, table=True):
    __tablename__ = "examples"

    uuid: UUID = Field(default_factory=uuid4, primary_key=True)
    name: str = Field(max_length=255)
    user_uuid: UUID = Field(foreign_key="users.uuid", index=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)
```

### Adding a column to existing table

```python
# In the model file, add the new field:
from sqlalchemy import Column, Text

new_column: Optional[str] = Field(
    default=None,
    sa_column=Column(Text),  # Use Text for large content
    description="Description of the column"
)
```

### Register model for Alembic

Ensure the model is imported in `api/models/__init__.py`:

```python
from .example import Example
```

## Troubleshooting

### "Target database is not up to date"

Run pending migrations first:
```bash
alembic upgrade head
```

### "Can't locate revision"

Check if migrations directory is correct:
```bash
ls /home/ubuntu/dev/strands-ai-sdk/packages/service/api/alembic/versions/
```

### Migration has no changes

Ensure the model is:
1. Imported in `api/models/__init__.py`
2. Has `table=True` in the class definition
3. Saved before running autogenerate

### Rollback a migration

```bash
cd /home/ubuntu/dev/strands-ai-sdk/packages/service && alembic downgrade -1
```

## Example Usage

```
Create a migration for adding a new comments table:
1. I've added the Comment model to api/models/comment.py
2. Please generate and apply the migration
```
