/*
 * To download files from a folder in S3 bucket to local folder with the object key as name
 * @author: Sivaraam T K
 * @created on: 2023/04/17
 * @reference: https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/clients/client-s3/modules.html
 */
import {Readable} from 'stream';
import {createWriteStream, existsSync, mkdirSync} from 'fs';
import {S3Client,  S3ClientConfig, ListObjectsV2Command,  GetObjectCommand} from '@aws-sdk/client-s3';
import {config} from'./config.js';

// AWS credentials and S3 bucket  from .env
const AWS_ACCESS_KEY = config.accessKey;
const AWS_SECRET_KEY = config.secretKey;
const AWS_REGION = config.region;
const S3_BUCKET_NAME = config.bucketName;
const AWS_ENDPOINT = config.endpoint;

if (!AWS_ACCESS_KEY || !AWS_SECRET_KEY || !AWS_REGION || !S3_BUCKET_NAME) {
  throw new Error('AWS credentials and S3 bucket information not found in .env file.');
}

//Loaded from Command Line
const [, , S3_FOLDER_NAME, LOCAL_FOLDER_NAME] = process.argv;

if (!S3_FOLDER_NAME || !LOCAL_FOLDER_NAME) {
  throw new Error('S3 folder name and local folder name must be provided as command line arguments.');
}

// S3 client configuration
const clientConfig:S3ClientConfig = {
  region: AWS_REGION,
  credentials: {
    accessKeyId: AWS_ACCESS_KEY,
    secretAccessKey: AWS_SECRET_KEY,
  },
};

// Required for local testing with AWS S3
if(AWS_ENDPOINT){
  clientConfig.endpoint = AWS_ENDPOINT;
  clientConfig.forcePathStyle = true;
}

// Create an instance of the S3 client
const s3Client = new S3Client(clientConfig);

// Check if the local folder exists, if not create it
if (!existsSync(LOCAL_FOLDER_NAME)) {
  mkdirSync(LOCAL_FOLDER_NAME);
  console.log(`Created local folder: ${LOCAL_FOLDER_NAME}`);
}

// List objects in the specified S3 bucket and folder
const listCommandInput = {
  Bucket: S3_BUCKET_NAME,
  EncodingType: 'url',
  Prefix: S3_FOLDER_NAME,
};

// Create a new list objects command with the specified input
const listCommand = new ListObjectsV2Command(listCommandInput);

// Asynchronous IIFE(Immediately Invoked Function Execution) to download objects from S3
(async () => {
  try {
    // Send the list objects command and wait for the response
    var listCommandOutput = await s3Client.send(
      listCommand
    );
    console.log(listCommandOutput);
  } catch (listCommandError: any) {
    // Handle any listCommandErrors that occur when listing objects
    if (listCommandError.$metadata.httpStatusCode !== 200) {
      const {requestId, cfId, extendedRequestId, httpStatusCode} = listCommandError.$metadata;
      const errorResponse = listCommandError.$response;
      console.log({requestId, cfId, extendedRequestId, httpStatusCode, errorResponse});
    } else {
      const {errorCode, errorMessage} = listCommandError;
      console.log({errorCode, errorMessage});
    }
    throw new Error('Failed to list objects');
  }

  // Download each object in the response
  if (listCommandOutput.Contents) {
    for (const object of listCommandOutput.Contents) {
      // Create a local file name by replacing slashes in the S3 object key with underscores
      const localFileName = object.Key ? object.Key.replace(/\//g, '_') : '';
      // Create a writable stream to the local file
      const fileStream = createWriteStream(
        `${LOCAL_FOLDER_NAME}/${localFileName}`
      );
      // Get the specified object from S3
      const getCommandInput = {
        Bucket: S3_BUCKET_NAME,
        Key: object.Key,
      };
      // Create a new get object command with the specified input
      const getCommand = new GetObjectCommand(getCommandInput);
      try {
        // Send the get object command and wait for the response
        const getCommandOutput = await s3Client.send(
          getCommand
        );
        getCommandOutput.Body && (getCommandOutput.Body as Readable)?.pipe(fileStream);
        console.log(`Downloaded ${object.Key}`);
      } catch (getCommandError: any) {
        // Handle any errors that occur when downloading objects
        if (getCommandError.$metadata.httpStatusCode !== 200) {
          const {requestId, cfId, extendedRequestId, httpStatusCode} = getCommandError.$metadata;
          const errorResponse = getCommandError.$response;
          console.log({requestId, cfId, extendedRequestId, httpStatusCode, errorResponse});
        } else {
          const {errorCode, errorMessage} = getCommandError;
          console.log({errorCode, errorMessage});
        }
        throw new Error('Failed to get object' + object.Key);
      }
    }
  }
})();