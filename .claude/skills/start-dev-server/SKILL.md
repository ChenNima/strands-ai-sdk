---
name: start-dev-server
description: Start the Strands AI SDK development server (frontend + backend)
allowedTools:
  - Bash
---

# Start Development Server

This skill starts the Strands AI SDK development environment including frontend (Next.js) and backend (FastAPI).

## Services

| Service | Port | Description |
|---------|------|-------------|
| Frontend (Next.js) | 3000 | Web UI with Turbopack |
| Backend (FastAPI) | 8000 | Python API server |
| Database (PostgreSQL) | 5432 | Data persistence |

## Steps

### 1. Check database status

First, verify the PostgreSQL database is running:

```bash
docker ps --filter "name=postgres" --format "table {{.Names}}\t{{.Status}}"
```

If the database is not running, start it:

```bash
pnpm db:up
```

### 2. Start development server

Run the dev command to start both frontend and backend concurrently:

```bash
pnpm dev
```

This command runs in the background and starts:
- `next dev --turbo` - Next.js frontend on port 3000
- `uvicorn api.index:app --reload` - FastAPI backend on port 8000

### 3. Verify services are running

After startup, you should see:
- Next.js: `✓ Ready in XXXms` on http://localhost:3000
- FastAPI: `Application startup complete` on http://127.0.0.1:8000

## Other Useful Commands

| Command | Description |
|---------|-------------|
| `pnpm db:up` | Start database |
| `pnpm db:down` | Stop database |
| `pnpm db:logs` | View database logs |
| `pnpm db:reset` | Reset database |
| `pnpm db:migrate:upgrade` | Run database migrations |
| `pnpm build` | Build for production |
| `pnpm start` | Start production server |

## Troubleshooting

- If port 3000 is in use: `lsof -i :3000` to find and kill the process
- If port 8000 is in use: `lsof -i :8000` to find and kill the process
- If database connection fails: Check `.env` file for correct `DATABASE_URL`
