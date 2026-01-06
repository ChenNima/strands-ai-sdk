# MCS Strands Agent AI SDK

This is a monorepo containing the MCS Strands Agent AI SDK and its AWS CDK infrastructure.

## Project Structure

```
strands-ai-sdk/
├── packages/
│   ├── service/          # @mcs/service - Full-stack application
│   │   ├── api/          # FastAPI backend
│   │   ├── app/          # Next.js frontend
│   │   ├── components/   # React components
│   │   ├── migrations/   # Database migrations
│   │   └── ...
│   └── cdk/              # @mcs/cdk - AWS CDK infrastructure
│       ├── bin/          # CDK app entry point
│       ├── lib/          # Stacks and constructs
│       └── ...
├── pnpm-workspace.yaml   # pnpm workspace configuration
└── package.json          # Root package.json with workspace scripts
```

## Packages

### @mcs/service

Full-stack application demonstrating the integration of [Strands Agent](https://github.com/strands-agents/sdk-python) with the [Vercel AI SDK](https://sdk.vercel.ai/).

**Features:**
- Strands Agent Integration with Amazon Bedrock
- Tool Support with streaming responses
- Tool Approval (human-in-the-loop workflow)
- MCP Integration
- OIDC Authentication
- Multi-User Support
- Conversation Management
- PostgreSQL Integration

For detailed documentation, see [packages/service/README.md](packages/service/README.md)

### @mcs/cdk

AWS CDK infrastructure for deploying the MCS service to AWS.

**Includes:**
- Network Stack (VPC, Subnets, Security Groups)
- Database Stack (RDS PostgreSQL)
- Compute Stack (ECS/Fargate or other compute resources)

For detailed documentation, see [packages/cdk/README.md](packages/cdk/README.md)

## Prerequisites

- **Node.js** 18+
- **pnpm** 8+ (recommended package manager)
- **Python** 3.10+
- **uv** (Python package manager): `curl -LsSf https://astral.sh/uv/install.sh | sh`
- **Docker** (for local database)
- **AWS CLI** (for CDK deployment)

## Getting Started

### 1. Install Dependencies

```bash
# Create Python virtual environment (at root directory)
uv venv --python 3.12
source .venv/bin/activate 
uv pip install -e packages/service

# Install Node.js dependencies
pnpm install
```

### 2. Configure Environment

```bash
# Copy environment template from root directory
cp .env.example .env

# Edit .env with your configuration
```

**Note**: The `.env` file is located at the root directory and is shared across all packages. A symlink exists in `packages/service/.env` pointing to the root `.env` file.

**OIDC Configuration**: When setting up your OIDC provider, configure the redirect URL:
- **Local development**: `http://localhost:3000/callback`
- **Production**: `https://your-domain.com/callback`

### 3. Set Up Database

```bash
# Start PostgreSQL with Docker
pnpm db:up

# Run migrations
pnpm db:migrate:upgrade
```

### 4. Run Development Server

```bash
# Start the full-stack application
pnpm dev
```

The application will be available at:
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- API Docs: http://localhost:8000/docs

## Available Scripts

### Root Level Scripts

```bash
# Development
pnpm dev              # Start service development server
pnpm build            # Build service for production
pnpm start            # Start service production server

# Database
pnpm db:up            # Start PostgreSQL container
pnpm db:down          # Stop PostgreSQL container
pnpm db:logs          # View PostgreSQL logs
pnpm db:reset         # Reset PostgreSQL container

# CDK
pnpm build:cdk        # Build CDK project
pnpm cdk:synth        # Synthesize CDK stacks
pnpm cdk:deploy       # Deploy CDK stacks
pnpm cdk:diff         # Show CDK stack differences
pnpm cdk:destroy      # Destroy CDK stacks

# Code Quality
pnpm lint             # Lint service code
```

### Working with Individual Packages

```bash
# Run commands in specific packages
pnpm --filter @mcs/service <command>
pnpm --filter @mcs/cdk <command>

# Examples
pnpm --filter @mcs/service dev
pnpm --filter @mcs/cdk build
```

## Monorepo Management

This project uses pnpm workspaces for monorepo management:

- **Workspace Configuration**: `pnpm-workspace.yaml`
- **Package Isolation**: Each package has its own `node_modules`
- **Shared Dependencies**: Common dependencies are hoisted to the root
- **Cross-Package References**: Packages can reference each other using workspace protocol

### Adding New Packages

1. Create a new directory under `packages/`
2. Initialize with `package.json` (set `"name": "@mcs/package-name"`)
3. Run `pnpm install` from the root

## Deployment

### AWS CDK Deployment

1. Configure AWS credentials:
```bash
aws configure
```

2. Bootstrap CDK (first time only):
```bash
cd packages/cdk
pnpm cdk bootstrap
```

3. Deploy stacks:
```bash
pnpm cdk:deploy
```

For detailed deployment instructions, see [packages/cdk/README.md](packages/cdk/README.md)

## Project Architecture

### Service Architecture

```
Frontend (Next.js) → Backend (FastAPI) → Strands Agent → Amazon Bedrock
                          ↓
                    PostgreSQL Database
```

### Deployment Architecture (CDK)

```
CloudFront/ALB → ECS/Fargate → RDS PostgreSQL
      ↓              ↓
   Frontend      Backend + Agent
```

## Learn More

- [Service Documentation](packages/service/README.md)
- [CDK Documentation](packages/cdk/README.md)
- [Strands Agents](https://github.com/strands-agents/sdk-python)
- [Vercel AI SDK](https://sdk.vercel.ai/docs)
- [AWS CDK](https://docs.aws.amazon.com/cdk/)

## License

[Add your license here]

## Contributing

[Add contribution guidelines here]
