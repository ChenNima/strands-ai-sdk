import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as ec2 from 'aws-cdk-lib/aws-ec2';

export interface DatabaseStackProps extends cdk.StackProps {
  vpc: ec2.Vpc;
  // Add your custom props here
}

export class DatabaseStack extends cdk.Stack {
  public readonly database: rds.DatabaseInstance;

  constructor(scope: Construct, id: string, props: DatabaseStackProps) {
    super(scope, id, props);

    // Create RDS PostgreSQL database
    // this.database = new rds.DatabaseInstance(this, 'Database', {
    //   engine: rds.DatabaseInstanceEngine.postgres({
    //     version: rds.PostgresEngineVersion.VER_15_3,
    //   }),
    //   vpc: props.vpc,
    //   instanceType: ec2.InstanceType.of(
    //     ec2.InstanceClass.T3,
    //     ec2.InstanceSize.SMALL
    //   ),
    //   databaseName: 'mcs',
    // });
  }
}
