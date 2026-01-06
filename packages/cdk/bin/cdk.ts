#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
// Import your stacks here
// import { NetworkStack } from '../lib/stacks/network-stack';
// import { DatabaseStack } from '../lib/stacks/database-stack';
// import { ComputeStack } from '../lib/stacks/compute-stack';

const app = new cdk.App();

// Define your stacks here
// Example:
// const networkStack = new NetworkStack(app, 'McsNetworkStack', {
//   env: {
//     account: process.env.CDK_DEFAULT_ACCOUNT,
//     region: process.env.CDK_DEFAULT_REGION,
//   },
// });

// const databaseStack = new DatabaseStack(app, 'McsDatabaseStack', {
//   vpc: networkStack.vpc,
//   env: {
//     account: process.env.CDK_DEFAULT_ACCOUNT,
//     region: process.env.CDK_DEFAULT_REGION,
//   },
// });

// const computeStack = new ComputeStack(app, 'McsComputeStack', {
//   vpc: networkStack.vpc,
//   database: databaseStack.database,
//   env: {
//     account: process.env.CDK_DEFAULT_ACCOUNT,
//     region: process.env.CDK_DEFAULT_REGION,
//   },
// });
