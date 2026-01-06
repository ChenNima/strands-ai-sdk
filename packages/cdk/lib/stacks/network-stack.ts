import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';

export interface NetworkStackProps extends cdk.StackProps {
  // Add your custom props here
}

export class NetworkStack extends cdk.Stack {
  public readonly vpc: ec2.Vpc;

  constructor(scope: Construct, id: string, props?: NetworkStackProps) {
    super(scope, id, props);

    // Create VPC
    // this.vpc = new ec2.Vpc(this, 'Vpc', {
    //   maxAzs: 2,
    //   natGateways: 1,
    // });
  }
}
