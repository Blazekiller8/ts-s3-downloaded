# ts-s3-downloader

Typescript program to download all the files in a folder of an AWS S3 bucket using aws-sdk v3

## Overview

This program uses the AWS SDK v3 for Javascript to connect to an S3 bucket and download all files in a specified folder to a local folder on your machine. Here we use `paginateListObjectsV2()` to get the list of all objects in the specified folder in pages and thus able to get even more than 1000 objects, and then use `Promise.all()` and `stream.pipeline()` with `getObject()` to parallelly download each object to the specified local folder.

---

## Prerequisites

Before running the program, make sure you have the following installed:

- Node.js (v14 or later)
- npm (v6 or later)
- AWS CLI (v2 or later)

---

## Localstack Setup

Localstack is a tool that mocks AWS services locally. It is used to test the program without having to pay for AWS services.

### Option 1 (With Docker)

You can use the provided docker-compose.yml file to start Localstack:

```bash
docker-compose up
```

This will start Localstack in a Docker container and expose its ports to your machine.

### Option 2 (Without Docker)

You can install Localstack via pip and start it using the following commands:

```bash
pip install localstack

localstack start

localstack status services
```

---

## Configuration

Before running the program, you will need to set up your AWS credentials. You can do this by creating a `.env` file in the root directory of the project with the following variables:

```dotenv
AWS_ACCESS_KEY=your_aws_access_key_id
AWS_SECRET_KEY=your_aws_secret_access_key
AWS_REGION=your_aws_region
S3_BUCKET_NAME=your_s3_bucket_name
AWS_ENDPOINT=your_aws_endpoint(optional)
LOG_DIR=your_log_directory(optional)
```

### \*\*Note: that you should never commit the .env file to version control. Instead, you should create a .env.sample file with the same variables as the .env file, but without any sensitive information. You can commit the .env.sample file to version control to give other developers an example of what environment variables are needed, but they will need to create their own .env file with their own sensitive information

---

## NPM Scripts

The following NPM scripts are available in this project (check package.json for more):

- `npm run format`: formats the project
- `npm run types`: checks the types in the project
- `npm run clean`: cleans the existing build
- `npm run prepare` or `npm run compile`: compiles the project
- `npm run pretest`: uploads 1500 test files to S3 bucket
- `npm run test`: downloads the test files from S3 bucket to local storage and then deletes them
- `npm run posttest`: deletes the test files from S3 bucket
- `npm run build`: builds the project
- `npm run start`: runs the program
- `npm run docs`: generates the documentation for the project

---

## Usage

To run the program, use the following command:

```bash
npm install
npm run build
npm run start <S3_Folder_Name> <Local_Folder_Name>
```

This will install the necessary dependencies and run the program, which will download all files in the specified S3 folder to the specified local folder.

---

> Warning: Since this program uses `Promise.all()` to parallelly download all the files, it will download all the files at once. This can cause problems if you have a lot of files in the specified S3 folder as the API calls for the AWS Client are rate-limited. Both PaginateListObjectsV2 and GetObject are used multiple times in this program, so you can easily hit the rate limit. If you do hit the rate limit, you may have to wait indefinitely for the program to finish

---

### I hope that helps! Let me know if you have any other questions
