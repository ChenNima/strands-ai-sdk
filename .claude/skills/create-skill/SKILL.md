---
name: create-skill
description: Create a new Claude Code skill for automating repetitive tasks
allowedTools:
  - Bash
  - Write
  - Read
---

# Create a New Skill

This skill guides you through creating a new Claude Code skill for the Strands AI SDK project.

## What is a Skill?

A skill is a reusable instruction set that Claude Code can execute. Skills automate repetitive tasks like:
- Database migrations
- Scaffolding code
- Deployment procedures
- Testing workflows
- Login/authentication flows

## Skill Structure

```
.claude/skills/
└── {skill-name}/
    └── SKILL.md
```

Each skill is a directory containing a `SKILL.md` file with frontmatter and instructions.

## SKILL.md Format

```markdown
---
name: skill-name
description: Short description of what the skill does
allowedTools:
  - Tool1
  - Tool2
---

# Skill Title

Description of the skill and when to use it.

## Prerequisites

- What needs to be set up before running
- Required services, files, or configurations

## Steps

### 1. First Step

Explanation and commands...

### 2. Second Step

Explanation and commands...

## Troubleshooting

Common issues and solutions.

## Example Usage

How to invoke the skill with examples.
```

## Frontmatter Fields

| Field | Required | Description |
|-------|----------|-------------|
| `name` | Yes | Skill identifier (kebab-case, matches directory name) |
| `description` | Yes | Short description shown in skill list |
| `allowedTools` | Yes | Tools the skill can use |

## Common Allowed Tools

| Tool | Use Case |
|------|----------|
| `Bash` | Run shell commands |
| `Read` | Read files |
| `Write` | Create new files |
| `Edit` | Modify existing files |
| `Glob` | Find files by pattern |
| `Grep` | Search file contents |
| `mcp__playwright__*` | Browser automation |

## Steps to Create a New Skill

### 1. Choose a skill name

Use kebab-case, descriptive name:
- `db-migrate`
- `run-tests`
- `deploy-staging`
- `create-component`

### 2. Create the skill directory

```bash
mkdir -p /home/ubuntu/dev/strands-ai-sdk/.claude/skills/{skill-name}
```

### 3. Create SKILL.md

Create the file at `.claude/skills/{skill-name}/SKILL.md` with:

1. **Frontmatter**: name, description, allowedTools
2. **Title**: Clear, action-oriented title
3. **Description**: When and why to use this skill
4. **Prerequisites**: What must be ready before running
5. **Steps**: Numbered, detailed instructions
6. **Troubleshooting**: Common issues and fixes
7. **Example Usage**: Sample invocations

### 4. Test the skill

Invoke the skill to verify it works:
```
/{skill-name}
```

## Best Practices

### Do's

- **Be specific**: Include exact file paths and commands
- **Be sequential**: Number steps clearly
- **Include verification**: Add steps to confirm success
- **Handle errors**: Include troubleshooting section
- **Use code blocks**: Format commands properly
- **Reference existing files**: Point to examples in codebase

### Don'ts

- Don't assume context from previous conversations
- Don't skip validation steps
- Don't hardcode user-specific values (use placeholders)
- Don't include sensitive data (passwords, keys)

## Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| Skill name | kebab-case | `create-api-route` |
| Directory | matches skill name | `create-api-route/` |
| File | always `SKILL.md` | `SKILL.md` |

## Example: Simple Skill

```markdown
---
name: run-tests
description: Run the test suite with coverage report
allowedTools:
  - Bash
---

# Run Tests

Run the project test suite with coverage reporting.

## Prerequisites

- Dependencies installed (`uv sync --active`)
- Database running (`pnpm db:up`)

## Steps

### 1. Run tests with coverage

\`\`\`bash
cd /home/ubuntu/dev/strands-ai-sdk/packages/service && pytest --cov=api --cov-report=term-missing
\`\`\`

### 2. Check coverage threshold

Ensure coverage is above 80%.

## Troubleshooting

### Tests fail with database error

Ensure database is running:
\`\`\`bash
pnpm db:up
\`\`\`

## Example Usage

\`\`\`
Run the test suite and show coverage report
\`\`\`
```

## Existing Skills Reference

| Skill | Location | Description |
|-------|----------|-------------|
| `start-dev-server` | `.claude/skills/start-dev-server/` | Start dev environment |
| `login-strands-ai-sdk` | `.claude/skills/login-strands-ai-sdk/` | Playwright login automation |
| `db-migrate` | `.claude/skills/db-migrate/` | Database migrations |
| `create-fastapi-service` | `.claude/skills/create-fastapi-service/` | Scaffold FastAPI service |
| `add-api-endpoint` | `.claude/skills/add-api-endpoint/` | Add API endpoint to frontend api-client.ts |

## Example Usage

```
Create a new skill for running database backups:
- Name: db-backup
- Tools: Bash
- Steps: Export database, compress, upload to S3
```
