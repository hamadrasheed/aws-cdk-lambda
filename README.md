# Welcome to Sports Analytics project

This is a Sports Analytics project which is developed using AWS CDK with TypeScript.

# Description
The DynamoDB Stream-Triggered Lambda Processor project is a modern cloud-based solution designed to seamlessly process new data insertions and updates in a DynamoDB table. Leveraging the power of AWS CDK and AWS Lambda, this project establishes a real-time event-driven architecture that captures changes in a DynamoDB table and triggers a Lambda function for efficient processing. Also stores information for all the matches.
# Table of contents:

- [Pre-reqs](#pre-reqs)
- [Getting started](#getting-started)
- [DynamoDB Lambda Processor](#lambda-backend)
	- [Project Structure](#project-structure)
- [Dependencies](#dependencies)
	- [`dependencies`](#dependencies-1)
	- [`devDependencies`](#devdependencies)

# Pre-reqs
To run and deploy this app locally you will need a few things:
- Node.js
- Typescript
- aws credentials
- aws-cli
- aws-cdk
- aws-sdk
- VS Code


# Getting started
- Clone the repository
```
git clone https://github.com/hamadrasheed/aws-cdk-lambda
```
- Install dependencies
```
cd aws-cdk-lambda
npm install

cd lambda
npm install
```
- Configure your aws credentials
```bash
# open terminal
aws configure
```

- set env file
```
copy from .sample.env
set your values 
```
- Deploy the project
```
npx tsc
cdk bootstrap
cdk synth
cdk deploy
```
Hurrah your project is deployed!

## API Reference

DynamoDB Stream Integration: Utilizes AWS CDK to enable DynamoDB Streams on a specified table, capturing changes including new data insertions and updates.

Lambda Function Automation: Leverages AWS CDK to create a Lambda function, intelligently wired to the DynamoDB Stream, ensuring automatic execution upon data changes.

Flexible Data Processing: The Lambda function, written in TypeScript, elegantly handles new data insertions and updates by capturing both old and new images of modified items, providing flexibility for tailored data processing logic.

Real-Time Responsiveness: Achieves real-time responsiveness by instantly triggering the Lambda function upon DynamoDB table changes, enabling immediate reactions to critical data events.

#### Ingest Match Info

```http
  POST /ingest
```

| Parameter | Type     | Description                |
| :-------- | :------- | :------------------------- |
| `/` | `string` | AWS Lambda function to handle the ingestion of real-time sports data through the API |


#### Get Matches

```http
  GET /matches
```

| Parameter | Type     | Description                |
| :-------- | :------- | :------------------------- |
| `/` | `string` | Retrieve a list of all matches. |

#### Get item

```http
  GET /matches/{match_id}
```

| Parameter | Type     | Description                       |
| :-------- | :------- | :-------------------------------- |
| `match_id`      | `string` |  Retrieve details of a specific match. |

```http
  GET /matches/{match_id}/statistics
```

| Parameter | Type     | Description                       |
| :-------- | :------- | :-------------------------------- |
| `match_id`      | `string` |  Retrieve statistics for a specific match. |

```http
  GET /teams/{team_name}/statistics
```

| Parameter | Type     | Description                       |
| :-------- | :------- | :-------------------------------- |
| `team_name`      | `string` |  Retrieve statistics for a specific team across all matches. |




The `cdk.json` file tells the CDK Toolkit how to execute your app.

## Useful commands

* `npx tsc`   compile typescript to js
* `cdk bootstrap`   prepares your AWS account and environment for deploying CDK applications.
* `cdk deploy`      deploy this stack to your default AWS account/region
* `cdk synth`       emits the synthesized CloudFormation template
