import * as AWS from 'aws-sdk';
import * as dotenv from 'dotenv';
import { IngestCreationI, IngestI, event_detailsI } from '../interfaces';
import { v4 as uuidv4 } from 'uuid';
import { APIGatewayProxyEvent, APIGatewayProxyEventPathParameters, APIGatewayProxyEventQueryStringParameters, APIGatewayProxyResult } from 'aws-lambda';

// Load environment variables from .env file
dotenv.config();
const dynamodb: AWS.DynamoDB.DocumentClient = new AWS.DynamoDB.DocumentClient({ region: process.env.REGION });

export async function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  const tableName = process.env.MATCHES_DATA_TABLE_NAME || 'MatchEvents';
  let response: APIGatewayProxyResult;

  try {
    const requestBody: IngestI = JSON.parse(event.body!);
    const timeStamp: string = requestBody?.timestamp ? new Date(requestBody?.timestamp).toISOString() : new Date().toISOString();

    const id = uuidv4();
    const item: IngestCreationI = {
      match_id: requestBody?.match_id,
      date: timeStamp,
      team: requestBody?.team,
      opponent: requestBody?.opponent,
      events: requestBody?.event_details ? [{ 
        ...requestBody?.event_details,
        event_id: id,
        event_type: requestBody?.event_type,
        timestamp: timeStamp,
      }] : [],
    };

    const existingMatch: IngestCreationI = await getItem(requestBody.match_id, tableName);

    if (!existingMatch) {

      const stats = calculateStats(item);

      await createItem({ 
        ...item,
        statistics: stats
      }, tableName);

      response = {
        statusCode: 200,
        body: JSON.stringify(
          {
            status: 'success',
            message: 'Data successfully ingested.',
            data: {
              event_id: id,
              timestamp: timeStamp
            }
          }
        ),
      };

    } else {

      const events = existingMatch?.events ?? [];
      const eventDetails = [
        ...item.events,
        ...events
      ];

      const allData = {
        ...existingMatch,
        events: eventDetails
      }

      const stats = calculateStats(allData);
      await updateItemWithAppend(item.match_id, item.events, stats, tableName);

      // await updateItem(item.match_id, eventDetails, stats, tableName);

      response = {
        statusCode: 200,
        body: JSON.stringify(
          {
            status: 'success',
            message: 'Data successfully ingested.',
            data: {
              event_id: id,
              timestamp: timeStamp
            }
          }
        ),

      };
    }


  } catch (error) {
    console.error('Error:', error);
    response = {
      statusCode: 500,
      body: JSON.stringify(
        {
          status: 'error',
          message: 'Failed to ingest data.',
          error
        }),
    };
  }

  return response;
}

export async function getData(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  const tableName = process.env.MATCHES_DATA_TABLE_NAME || 'MatchEvents';
  const teamStatsTableName = process.env.TEAM_STAT_TABLE_NAME || 'TeamStatistics';

  try {

    const { resource, httpMethod } = event;
    const pathParameters: APIGatewayProxyEventPathParameters = event.pathParameters || {};
    const queryParameters: APIGatewayProxyEventQueryStringParameters = event.queryStringParameters || {};

    if (resource === '/matches' && httpMethod === 'GET') {
      // Handle /matches GET logic
      const params = {
        TableName: tableName,
        ProjectionExpression: '#tsAttr, match_id, team, opponent', // Use ExpressionAttributeNames for the alias
        ExpressionAttributeNames: {
          '#tsAttr': 'date', // Map reserved keyword to an alias
        },
      };

      try {
        const result = await dynamodb.scan(params).promise();

        if (!result.Items || !result.Items.length) {
          return {
            statusCode: 200,
            body: JSON.stringify(
              {
                status: 'success',
                matches: []
              }
            ),
          };
        }
        const modifiedResult = result?.Items?.map(x => {
          // const date = x?.timestamp;
          // delete x?.timestamp;
          delete x?.events;
          delete x?.statistics;
          return {
            ...x,
            // date,
          }
        })

        return {
          statusCode: 200,
          body: JSON.stringify(
            {
              status: 'success',
              matches: modifiedResult
            }
          ),
        };
      } catch (error) {
        throw error;
      }

    } else if (resource == '/matches/{match_id}' && httpMethod === 'GET') {
      // Handle /matches/{match_id} GET logic

      try {
        const existingMatch = await getItem(pathParameters?.match_id, tableName);

        if (!existingMatch) {
          throw Error('Invalid match_id');
        }
  
        delete existingMatch?.statistics;
        return {
          statusCode: 200,
          body: JSON.stringify(
            {
              status: 'success',
              match: existingMatch ?? {}
            }
          ),
        };
      } catch (error) {
        throw error;
      }


    } else if (resource == '/matches/{match_id}/statistics' && httpMethod === 'GET') {
      // Handle /matches/{match_id}/statistics GET logic

      const params = {
        TableName: tableName,
        Key: {
          'match_id': pathParameters?.match_id,
        },
        ProjectionExpression: 'match_id, statistics', // Use ExpressionAttributeNames for the alias

      };
    
      try {
        const result = await dynamodb.get(params).promise();
        const existingMatch = result.Item;

        if (!existingMatch) {
          throw Error('Invalid match_id');
        }

        return {
          statusCode: 200,
          body: JSON.stringify(
            {
              status: 'success',
              match: existingMatch ?? {}
            }
          ),
        };
      } catch (error) {
        throw error;
      }

      // return {
      //   statusCode: 200,
      //   body: JSON.stringify(
      //     {
      //       status: 'success',
      //       matches: event.resource
      //     }
      //   ),
      // };
    } else if (resource == '/teams/{team_name}/statistics' && httpMethod === 'GET') {
      // Handle /teams/{team_name}/statistics GET logic

      const teamName = pathParameters?.team_name?.replace(/%20/g, " ");

      const params = {
        TableName: teamStatsTableName,
        Key: {
          'team': teamName,
        },
      };
    
      try {
        const result = await dynamodb.get(params).promise();
        if(!result || !result.Item) {
          throw Error('No team found.')
        };

        return {
          statusCode: 200,
          body: JSON.stringify(
            {
              status: 'success',
              ...result?.Item,
            }
          ),
        };

      } catch (error) {
        throw error
      }

    } else {
      return {
        statusCode: 404,
        body: JSON.stringify({ message: 'Not found' }),
      };
    }


  } catch (error: any) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify(
        {
          status: 'error',
          message: error?.message ?? 'Something went wrong.',
          error: error
        }),
    };
  }

  // return response;
}


const updateItem = async (primaryKeyValue: string | undefined, updateEventsValue: any, updateStatisticsValue: any, tableName: string): Promise<any> => {

  const params = {
    TableName: tableName,
    Key: {
      'match_id': primaryKeyValue,
    },
    UpdateExpression: 'set events = :events, statistics = :stats',
    ExpressionAttributeValues: {
      ':events': updateEventsValue,
      ':stats': updateStatisticsValue
    },
    ReturnValues: 'UPDATED_NEW',
  };

  try {

    const result = await dynamodb.update(params).promise();
    return result;

  } catch (error) {
    throw error;
  }
};

const updateItemWithAppend = async (primaryKeyValue: string | undefined, updateEventsValue: any, updateStatisticsValue: any, tableName: string): Promise<any> => {

  const updateParams = {
    TableName: tableName,
    Key: {
      'match_id': primaryKeyValue,
    },
    UpdateExpression: 'SET #eventAttr = list_append(#eventAttr, :attrValue), statistics = :stats',
    ExpressionAttributeNames: { '#eventAttr': 'events' }, // Replace 'players' with your array attribute name
    ExpressionAttributeValues: {
      ':attrValue': updateEventsValue,
      ':stats': updateStatisticsValue

    },
  };
  try {

    const result = await dynamodb.update(updateParams).promise();
    return result;

  } catch (error) {
    throw error;
  }
};

const findAllItems = async (tableName: string): Promise<any> => {
  const params = {
    TableName: tableName,
  };

  try {
    const result = await dynamodb.scan(params).promise();
    console.log('All Items:', result.Items);
    return result.Items;
  } catch (error) {
    throw error;
  }
};

const createItem = async (item: any, tableName: string): Promise<void> => {
  const params = {
    TableName: tableName,
    Item: item,
  };

  try {
    await dynamodb.put(params).promise();
    return;
  } catch (error) {
    throw error;
  }
};

const getItem = async (primaryKeyValue: string | undefined, tableName: string): Promise<any> => {
  const params = {
    TableName: tableName,
    Key: {
      'match_id': primaryKeyValue,
    },
  };

  try {
    const result = await dynamodb.get(params).promise();
    return result.Item;
  } catch (error) {
    throw error;
  }
};

const calculateStats = (data: any) => {

  const fouls: number = data?.events?.filter((x: event_detailsI): boolean => x.event_type == 'foul').length ?? 0;
  const goals: number = data?.events?.filter((x: event_detailsI): boolean => x.event_type == 'goal').length ?? 0;
  const totalPossessionTimeInMinutes = 90; // Total time of possession in minutes

  // Calculate ball possession percentage
  const ballPossessionPercentage = (((totalPossessionTimeInMinutes - (fouls * 1.5)) / (totalPossessionTimeInMinutes * 2)) * 100).toFixed(2);

  return {
    team: data.team,
    opponent: data.opponent,
    total_goals: goals,
    total_fouls: fouls,
    ball_possession_percentage: ballPossessionPercentage
  };

};