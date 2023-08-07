import * as AWS from 'aws-sdk';
import { DynamoDBStreamEvent, DynamoDBStreamHandler } from 'aws-lambda';
import * as dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();
const dynamodb: AWS.DynamoDB.DocumentClient = new AWS.DynamoDB.DocumentClient({ region: process.env.REGION });

export const handler: DynamoDBStreamHandler = async (event: DynamoDBStreamEvent | any) => {

  const teamStatsTableName = process.env.TEAM_STAT_TABLE_NAME || 'TeamStatistics';

  console.log('Received event:', JSON.stringify(event, null, 2));

  for (const record of event.Records) {
    if (record.eventName === 'INSERT' || record.eventName === 'MODIFY') {
      const newItem = AWS.DynamoDB.Converter.unmarshall(record.dynamodb.NewImage || {});
      console.log('New or modified item:', newItem);


      const requiredEvent = newItem?.events?.pop();
      const team = newItem?.team;

      const isGoal = requiredEvent?.event_type == 'goal' ? 1 : 0;

      const paramsToFetch = {
        TableName: teamStatsTableName,
        Key: {
          'team': team,
        },
      };

      try {

        const result = await dynamodb.get(paramsToFetch).promise();

        if (result?.Item) {

          const toBeUpdate = {
            ...result?.Item?.statistics,
            total_goals_scored: result?.Item?.statistics?.total_goals_scored ? result?.Item?.statistics?.total_goals_scored + isGoal : result?.Item?.statistics?.total_goals_scored
          }

          const paramsToUpdate = {
            TableName: teamStatsTableName,
            Key: {
              'team': team,
            },
            UpdateExpression: 'set statistics = :stats',
            ExpressionAttributeValues: {
              ':stats': toBeUpdate
            },
            ReturnValues: 'UPDATED_NEW',
          };

          await dynamodb.update(paramsToUpdate).promise();
        }


      } catch (error) {
        console.error('Error ', error);
      }


    }
  }

};
