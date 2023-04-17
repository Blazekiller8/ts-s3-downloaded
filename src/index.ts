/*
 * To download files from a folder in S3 bucket to local folder with the object key as name
 * @author: Sivaraam T K
 * @created on: 2023/04/17
 * @reference: https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/clients/client-s3/modules.html
 */
import {
  S3Client,
  S3ClientConfig,
  S3ServiceException,
  ListObjectsV2Command,
  ListObjectsV2CommandInput,
  ListObjectsV2CommandOutput,
  GetObjectCommand,
  GetObjectCommandInput,
  GetObjectCommandOutput,
} from '@aws-sdk/client-s3';
import {createWriteStream, existsSync, mkdirSync} from 'fs';
import {Readable} from 'stream';

// AWS credentials and S3 bucket information
const AWS_ACCESS_KEY = 'test'; // Use environment variables instead of hardcoding
const AWS_SECRET_KEY = 'test'; // Use environment variables instead of hardcoding
const AWS_REGION = 'us-east-1'; // Change to the appropriate region
const AWS_BUCKET_NAME = 'test-bucket'; // Change to the appropriate bucket name
const AWS_S3_ENDPOINT = 'http://localhost:4566'; // Change to the appropriate endpoint if not using the default AWS S3 endpoint
const S3_FOLDER_NAME = 'parent'; // Change to the appropriate S3 folder name
const LOCAL_FOLDER_NAME = './downloads'; // Change to the appropriate local folder name

// S3 client configuration
const config: S3ClientConfig = {
  region: AWS_REGION,
  endpoint: AWS_S3_ENDPOINT,
  credentials: {
    accessKeyId: AWS_ACCESS_KEY,
    secretAccessKey: AWS_SECRET_KEY,
  },
  forcePathStyle: true, // Required for local testing with AWS S3
};

// Create an instance of the S3 client
const client: S3Client = new S3Client(config);

// Check if the local folder exists, if not create it
if (!existsSync(LOCAL_FOLDER_NAME)) {
  mkdirSync(LOCAL_FOLDER_NAME);
  console.log(`Created local folder: ${LOCAL_FOLDER_NAME}`);
}

// List objects in the specified S3 bucket and folder
const listInput: ListObjectsV2CommandInput = {
  Bucket: AWS_BUCKET_NAME,
  EncodingType: 'url',
  Prefix: S3_FOLDER_NAME,
};

// Create a new list objects command with the specified input
const listCommand: ListObjectsV2Command = new ListObjectsV2Command(listInput);

// Asynchronous IIFE(Immediately Invoked Function Execution) to download objects from S3
(async () => {
  try {
    // Send the list objects command and wait for the response
    var listResponse: ListObjectsV2CommandOutput = await client.send(
      listCommand
    );
    console.log(listResponse);
  } catch (error: any) {
    // Handle any errors that occur when listing objects
    if (error instanceof S3ServiceException) {
      const {requestId, cfId, extendedRequestId} = error.$metadata;
      const errorResponse = error.$response;
      console.log({requestId, cfId, extendedRequestId, errorResponse});
    } else {
      const {code, message} = error;
      console.log({code, message});
    }
    throw new Error('Failed to list objects');
  }

  // Download each object in the response
  if (listResponse.Contents) {
    for (const object of listResponse.Contents) {
      // Create a local file name by replacing slashes in the S3 object key with underscores
      const localFileName = object.Key ? object.Key.replace(/\//g, '_') : '';
      // Create a writable stream to the local file
      const fileStream = createWriteStream(
        `${LOCAL_FOLDER_NAME}/${localFileName}`
      );
      // Get the specified object from S3
      const getInput: GetObjectCommandInput = {
        Bucket: AWS_BUCKET_NAME,
        Key: object.Key,
      };
      // Create a new get object command with the specified input
      const getCommand: GetObjectCommand = new GetObjectCommand(getInput);
      try {
        // Send the get object command and wait for the response
        const getResponse: GetObjectCommandOutput = await client.send(
          getCommand
        );
        getResponse.Body && (getResponse.Body as Readable)?.pipe(fileStream);
        console.log(`Downloaded ${object.Key}`);
      } catch (error: any) {
        // Handle any errors that occur when downloading objects
        if (error instanceof S3ServiceException) {
          const {requestId, cfId, extendedRequestId} = error.$metadata;
          const errorResponse = error.$response;
          console.log({requestId, cfId, extendedRequestId, errorResponse});
        } else {
          const {code, message} = error;
          console.log({code, message});
        }
        throw new Error('Failed to get object' + object.Key);
      }
    }
  }
})();
