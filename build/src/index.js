/*
 * To download files from a folder in S3 bucket to local folder with the object key as name
 * update: Added custom logging using Winston
 * author: @Blazekiller8
 * modified-on: 2023/05/03
 * reference: https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/clients/client-s3/modules.html
 *                        : https://www.elastic.co/guide/en/ecs-logging/nodejs/current/winston.html#winston
 */
import { S3Client, GetObjectCommand, paginateListObjectsV2, } from '@aws-sdk/client-s3';
import winston from 'winston';
import ecsFormat from '@elastic/ecs-winston-format';
import { createWriteStream, existsSync, mkdirSync } from 'fs';
import { pipeline } from 'stream';
import { promisify } from 'util';
import { config } from './config.js';
import path from 'path';
// Set up Winston logger
const logger = winston.createLogger({
    format: ecsFormat(),
    transports: [
        new winston.transports.Console(),
        new winston.transports.File({ filename: 'error.log', level: 'error' }),
        new winston.transports.File({ filename: 'combined.log' }),
    ],
});
// AWS credentials and S3 bucket  from .env
const AWS_ACCESS_KEY = config.accessKey;
const AWS_SECRET_KEY = config.secretKey;
const AWS_REGION = config.region;
const S3_BUCKET_NAME = config.bucketName;
const AWS_ENDPOINT = config.endpoint;
if (!AWS_ACCESS_KEY || !AWS_SECRET_KEY || !AWS_REGION || !S3_BUCKET_NAME) {
    logger.error('AWS credentials and S3 bucket information not found in .env file.');
    throw new Error('AWS credentials and S3 bucket information not found in .env file.');
}
//Loaded from Command Line
const [, , S3_FOLDER_NAME, LOCAL_FOLDER_NAME] = process.argv;
if (!S3_FOLDER_NAME || !LOCAL_FOLDER_NAME) {
    logger.error('S3 folder name and local folder name not provided as command line arguments.');
    throw new Error('S3 folder name and local folder name must be provided as command line arguments.');
}
// S3 client configuration
const clientConfig = {
    region: AWS_REGION,
    credentials: {
        accessKeyId: AWS_ACCESS_KEY,
        secretAccessKey: AWS_SECRET_KEY,
    },
};
// Required for local testing of AWS S3
if (AWS_ENDPOINT) {
    clientConfig.endpoint = AWS_ENDPOINT;
    clientConfig.forcePathStyle = true;
    clientConfig.logger = logger;
}
// Create an instance of the S3 client
const s3Client = new S3Client(clientConfig);
// Check if the local folder exists, if not create it
if (!existsSync(LOCAL_FOLDER_NAME)) {
    mkdirSync(LOCAL_FOLDER_NAME);
    logger.info(`Created local folder: ${LOCAL_FOLDER_NAME}`);
}
// Function to download objects in the specified S3 bucket and folder
async function downloadFilesParallel() {
    // List objects in the specified S3 bucket and folder
    const listCommandInput = {
        Bucket: S3_BUCKET_NAME,
        EncodingType: 'url',
        Prefix: S3_FOLDER_NAME,
        MaxKeys: 1000,
        ContinuationToken: '', // Optional: ContinuationToken from the previous request
    };
    //Configuration for ListObjectsV2 Command Paginator
    const paginatorConfig = {
        client: s3Client,
        pageSize: 1000,
    };
    try {
        var pageCount = 0;
        const downloadFilePromises = [];
        logger.info('Started with Listing of Objects in S3 Bucket');
        for await (const page of paginateListObjectsV2(paginatorConfig, listCommandInput)) {
            logger.info(`Retrieved page no. ${++pageCount}`);
            if (page.Contents) {
                for (const object of page.Contents) {
                    if (object.Key) {
                        // Create a local file name by replacing slashes in the S3 object key with underscores
                        const localFileName = object.Key.replace(/\//g, '_');
                        const fullFilePath = path.join(LOCAL_FOLDER_NAME, localFileName);
                        const promise = downloadFile(object.Key, fullFilePath);
                        downloadFilePromises.push(promise);
                    }
                }
            }
        }
        await Promise.all(downloadFilePromises);
    }
    catch (error) {
        logger.error('Error downloading files in parallel:', error);
    }
}
async function downloadFile(key, fullFilePath) {
    logger.info(`Starting Download of file: ${key}`);
    // Create a writable stream to the local file
    const fileStream = createWriteStream(fullFilePath);
    // Get the specified object from S3
    const getCommandInput = {
        Bucket: S3_BUCKET_NAME,
        Key: key,
    };
    // Create a new get object command with the specified input
    const getCommand = new GetObjectCommand(getCommandInput);
    try {
        // Send the get object command and wait for the response
        const objectBuffer = await s3Client.send(getCommand);
        if (objectBuffer.Body) {
            await promisify(pipeline)(objectBuffer.Body, fileStream);
        }
        logger.info(`Downloaded ${key}`);
    }
    catch (getCommandError) {
        // Handle any errors that occur when downloading objects
        if (getCommandError.$metadata) {
            const { $metadata: { requestId, cfId, extendedRequestId, httpStatusCode }, $response: errorResponse, } = getCommandError;
            logger.error({
                requestId,
                cfId,
                extendedRequestId,
                httpStatusCode,
                errorResponse,
            });
        }
        else {
            const { errorCode, errorMessage } = getCommandError;
            logger.error({ errorCode, errorMessage });
        }
        logger.error(`Failed to download ${key}`);
        throw new Error('Failed to get object' + key);
    }
}
downloadFilesParallel()
    .then(() => {
    logger.info('Successfully downloaded files');
})
    .catch(err => {
    logger.error('Error downloading folder contents:', err);
});
//# sourceMappingURL=index.js.map