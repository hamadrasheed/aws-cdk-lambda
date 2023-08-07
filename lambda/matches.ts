import { APIGatewayProxyEvent, APIGatewayProxyEventPathParameters, APIGatewayProxyEventQueryStringParameters, APIGatewayProxyResult } from 'aws-lambda';


export async function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  return {
    statusCode: 200,
    body: JSON.stringify('Hello, Hamads World!'),
  };
}
