# @mcs/cdk

AWS CDK Infrastructure for MCS Service

## Overview

This package contains AWS CDK infrastructure code for deploying the MCS service to AWS.

## Structure

```
cdk/
├── bin/
│   └── cdk.ts              # CDK app entry point
├── lib/
│   ├── stacks/             # CDK stack definitions
│   │   ├── network-stack.ts
│   │   ├── database-stack.ts
│   │   ├── compute-stack.ts
│   │   └── index.ts
│   └── constructs/         # Reusable CDK constructs
│       └── index.ts
├── cdk.json                # CDK configuration
├── tsconfig.json           # TypeScript configuration
└── package.json
```

## Prerequisites

- Node.js 18+
- AWS CLI configured with appropriate credentials
- AWS CDK CLI: `npm install -g aws-cdk`

## Getting Started

1. Install dependencies:
```bash
pnpm install
```

2. Build the project:
```bash
pnpm build
```

3. Bootstrap CDK (first time only):
```bash
pnpm cdk bootstrap
```

4. Synthesize CloudFormation template:
```bash
pnpm synth
```

5. Deploy stacks:
```bash
pnpm deploy
```

## Available Scripts

- `pnpm build` - Compile TypeScript to JavaScript
- `pnpm watch` - Watch for changes and compile
- `pnpm cdk` - Run CDK CLI commands
- `pnpm synth` - Synthesize CloudFormation templates
- `pnpm deploy` - Deploy stacks to AWS
- `pnpm diff` - Compare deployed stack with current state
- `pnpm destroy` - Destroy deployed stacks

## Stack Implementation

The stack files are currently scaffolded with example code commented out. To implement your infrastructure:

1. Uncomment and modify the example code in each stack file
2. Add your custom resources and configurations
3. Import and instantiate stacks in `bin/cdk.ts`

## Environment Configuration

Configure your deployment environment using:
- AWS credentials (via AWS CLI or environment variables)
- CDK context in `cdk.json`
- Environment-specific parameters

## Learn More

- [AWS CDK Documentation](https://docs.aws.amazon.com/cdk/)
- [AWS CDK API Reference](https://docs.aws.amazon.com/cdk/api/v2/)
- [CDK Workshop](https://cdkworkshop.com/)
