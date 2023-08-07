import { Construct } from 'constructs';
import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as path from 'path';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import { RemovalPolicy } from "aws-cdk-lib";
import * as dotenv from 'dotenv';
import * as eventSources from 'aws-cdk-lib/aws-lambda-event-sources';

// Load environment variables from .env file
dotenv.config();

export class AwsCdkStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const matchEventsTable = new dynamodb.Table(this, 'MatchEventsTable', {
      tableName: process.env.MATCHES_DATA_TABLE_NAME || 'MatchEvents',
      partitionKey: { name: 'match_id', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: RemovalPolicy.DESTROY,
      stream: dynamodb.StreamViewType.NEW_AND_OLD_IMAGES,
    });

    const teamStatTable = new dynamodb.Table(this, 'TeamStatisticsTable', {
      tableName: process.env.TEAM_STAT_TABLE_NAME || 'TeamStatistics',
      partitionKey: { name: 'team', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: RemovalPolicy.DESTROY,
    });

    const syncStatsLambdaFunction = new lambda.Function(this, 'SyncStatsFunction', {
      runtime: lambda.Runtime.NODEJS_14_X,
      handler: 'stats.handler',
      code: lambda.Code.fromAsset('lambda'),
    });

    syncStatsLambdaFunction.addEventSource(new eventSources.DynamoEventSource(matchEventsTable, {
      startingPosition: lambda.StartingPosition.LATEST,
    }));

    teamStatTable.grantReadWriteData(syncStatsLambdaFunction);

    const genericLambdaConfig: any = {
      runtime: lambda.Runtime.NODEJS_14_X,
      code: lambda.Code.fromAsset(path.join(__dirname, '../lambda')),
      memorySize: 512,
      bundling: {
        externalModules: [
          'aws-sdk',
          'dotenv',
        ],
      },
      environment: {
        ENV: process.env.ENV,
        MATCHES_DATA_TABLE_NAME: process.env.MATCHES_DATA_TABLE_NAME,
        TEAM_STAT_TABLE_NAME: process.env.TEAM_STAT_TABLE_NAME,
        REGION: process.env.REGION
      }
    }

    const helloLambda = new lambda.Function(this, 'FirstFunction', {
      ...genericLambdaConfig,
      handler: 'matches.handler',
    });

    const ingestMatchData = new lambda.Function(this, 'IngestMatchFunction', {
      ...genericLambdaConfig,
      handler: 'ingest.handler',
    });

    const getMatchData = new lambda.Function(this, 'GetMatchFunction', {
      ...genericLambdaConfig,
      handler: 'ingest.getData',
    });

    // Create an API Gateway
    const api = new apigateway.RestApi(this, 'SportsAnalyticsPlatform', {
      deployOptions: {
        stageName: process.env.ENV || 'dev',
      },
    });

    // Add a resource and method for the Lambda function
    const helloResource = api.root.addResource('hello');
    helloResource.addMethod('GET', new apigateway.LambdaIntegration(helloLambda));

    const ingestMatchResource = api.root.addResource('ingest');
    ingestMatchResource.addMethod('POST', new apigateway.LambdaIntegration(ingestMatchData));

    // Define API resources and methods
    const matchesResource = api.root.addResource('matches');
    const matchIdResource = matchesResource.addResource('{match_id}');
    const teamsResource = api.root.addResource('teams');
    const teamNameResource = teamsResource.addResource('{team_name}');

    matchesResource.addMethod('GET', new apigateway.LambdaIntegration(getMatchData));
    matchIdResource.addMethod('GET', new apigateway.LambdaIntegration(getMatchData));
    matchIdResource.addResource('statistics').addMethod('GET', new apigateway.LambdaIntegration(getMatchData));
    teamNameResource.addResource('statistics').addMethod('GET', new apigateway.LambdaIntegration(getMatchData));

    matchEventsTable.grantReadWriteData(ingestMatchData);
    matchEventsTable.grantReadWriteData(getMatchData);
    teamStatTable.grantReadWriteData(getMatchData);
    teamStatTable.grantReadWriteData(ingestMatchData);

  }
}
