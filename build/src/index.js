/*
 * To download files from a folder in S3 bucket to local folder with the object key as name
 * update: Improved  custom logging using Winston
 * author: @Blazekiller8
 * modified-on: 2023/05/10
 * reference: https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/clients/client-s3/modules.html
 *                        : https://www.elastic.co/guide/en/ecs-logging/nodejs/current/winston.html#winston
 */
import { S3Client, GetObjectCommand, paginateListObjectsV2, winston, format, ecsFormat, createWriteStream, existsSync, mkdirSync, pipeline, promisify, config, formatDate, formatPrint, path, } from './import.js';
//Export log folder path
const LOG_DIR = config.logDir;
const ERROR_LOGS_DIR = path.join(LOG_DIR, 'error_logs');
const INFO_LOGS_DIR = path.join(LOG_DIR, 'info_logs');
const INPUT_LOGS_DIR = path.join(LOG_DIR, 'input_logs');
const COMBINED_LOGS_DIR = path.join(LOG_DIR, 'combined_logs');
// Set up Winston logger for general logging
const logger = winston.createLogger({
    format: ecsFormat(),
    transports: [
        new winston.transports.Console({
            format: winston.format.combine(winston.format.colorize(), ecsFormat(), format.printf(info => formatPrint(info))),
        }),
        new winston.transports.File({
            filename: path.join(ERROR_LOGS_DIR, `${formatDate()}-errors.log`),
            level: 'error',
            options: { flags: 'a' }, // Append to the file
        }),
        new winston.transports.File({
            filename: path.join(INFO_LOGS_DIR, `${formatDate()}-infos.log`),
            level: 'info',
            options: { flags: 'a' },
        }),
        new winston.transports.File({
            filename: path.join(INPUT_LOGS_DIR, `${formatDate()}-inputs.log`),
            level: 'warn',
            options: { flags: 'a' },
        }),
        new winston.transports.File({
            filename: path.join(COMBINED_LOGS_DIR, `${formatDate()}-combined.log`),
            options: { flags: 'a' },
        }),
    ],
});
// Check if the log folders exists, if not create them
if (!existsSync(LOG_DIR)) {
    mkdirSync(LOG_DIR);
    logger.info(`Created logs folder: ${LOG_DIR}`);
}
if (!existsSync(ERROR_LOGS_DIR)) {
    mkdirSync(ERROR_LOGS_DIR);
    logger.info(`Created logs folder: ${ERROR_LOGS_DIR}`);
}
if (!existsSync(INFO_LOGS_DIR)) {
    mkdirSync(INFO_LOGS_DIR);
    logger.info(`Created logs folder: ${INFO_LOGS_DIR}`);
}
if (!existsSync(INPUT_LOGS_DIR)) {
    mkdirSync(INPUT_LOGS_DIR);
    logger.info(`Created logs folder: ${INFO_LOGS_DIR}`);
}
if (!existsSync(COMBINED_LOGS_DIR)) {
    mkdirSync(COMBINED_LOGS_DIR);
    logger.info(`Created logs folder: ${COMBINED_LOGS_DIR}`);
}
// AWS credentials and S3 bucket  from .env
const AWS_ACCESS_KEY = config.accessKey;
const AWS_SECRET_KEY = config.secretKey;
const AWS_REGION = config.region;
const S3_BUCKET_NAME = config.bucketName;
const AWS_ENDPOINT = config.endpoint;
//Loaded from Command Line
const [, , S3_FOLDER_NAME, LOCAL_FOLDER_NAME] = process.argv;
if (AWS_ACCESS_KEY) {
    logger.warn('AWS_ACCESS_KEY found in .env file');
}
else {
    logger.warn('AWS_ACCESS_KEY not found in .env file');
    logger.error('AWS_ACCESS_KEY  not found in .env file.', {
        err: new Error('AWS_ACCESS_KEY not found'),
    });
    throw new Error('AWS_ACCESS_KEY  not found in .env file');
}
if (AWS_SECRET_KEY) {
    logger.warn('AWS_SECRET_KEY found in .env file');
}
else {
    logger.warn('AWS_SECRET_KEY not found in .env file');
    logger.error('AWS_SECRET_KEY  not found in .env file.', {
        err: new Error('AWS_SECRET_KEY not found'),
    });
    throw new Error('AWS_SECRET_KEY  not found in .env file');
}
if (AWS_REGION) {
    logger.warn('AWS_REGION found in .env file');
}
else {
    logger.warn('AWS_REGION not found in .env file');
    logger.error('AWS_REGION  not found in .env file.', {
        err: new Error('AWS_REGION not found'),
    });
    throw new Error('AWS_REGION  not found in .env file');
}
if (S3_BUCKET_NAME) {
    logger.warn('S3_BUCKET_NAME found in .env file');
}
else {
    logger.warn('S3_BUCKET_NAME not found in .env file');
    logger.error('S3_BUCKET_NAME  not found in .env file.', {
        err: new Error('S3_BUCKET_NAME not found'),
    });
    throw new Error('S3_BUCKET_NAME  not found in .env file');
}
if (S3_FOLDER_NAME) {
    logger.warn('S3_FOLDER_NAME Loaded from Command Line');
}
else {
    logger.warn('S3_FOLDER_NAME not found in Command Line');
    logger.error('S3_FOLDER_NAME not found in Command Line', {
        err: new Error('S3_FOLDER_NAME not found in Command Line'),
    });
    throw new Error('S3_FOLDER_NAME not found in Command Line');
}
if (LOCAL_FOLDER_NAME) {
    logger.warn('LOCAL_FOLDER_NAME Loaded from Command Line');
}
else {
    logger.warn('LOCAL_FOLDER_NAME not found in Command Line');
    logger.error('LOCAL_FOLDER_NAME not found in Command Line', {
        err: new Error('LOCAL_FOLDER_NAME not found in Command Line'),
    });
    throw new Error('LOCAL_FOLDER_NAME not found in Command Line');
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
    logger.warn('AWS_ENDPOINT found in .env file');
    logger.info("Programming running in 'dev' environment");
    // Configure and Create a Winston logger instance for logging AWS Client Events
    const SERVER_LOGS_DIR = path.join(LOG_DIR, 'server_logs');
    if (!existsSync(SERVER_LOGS_DIR)) {
        mkdirSync(SERVER_LOGS_DIR);
        logger.info(`Created logs folder: ${SERVER_LOGS_DIR}`);
    }
    const clientLogger = winston.createLogger({
        format: ecsFormat(),
        transports: [
            new winston.transports.File({
                filename: path.join(SERVER_LOGS_DIR, `${formatDate()}-server.log`),
                options: { flags: 'a' },
            }),
        ],
    });
    clientConfig.endpoint = AWS_ENDPOINT;
    clientConfig.forcePathStyle = true;
    clientConfig.logger = {
        debug: (message) => {
            clientLogger.debug(message);
        },
        info: (message) => {
            const logMessage = typeof message === 'object'
                ? JSON.stringify(message, null, 2)
                : message;
            clientLogger.info(logMessage);
        },
        warn: (message) => {
            const logMessage = typeof message === 'object'
                ? JSON.stringify(message, null, 2)
                : message;
            clientLogger.warn(logMessage);
        },
        error: (message) => {
            const logMessage = typeof message === 'object'
                ? JSON.stringify(message, null, 2)
                : message;
            clientLogger.error(logMessage);
        },
    };
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
        let pageCount = 0;
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
            logger.info(`Downloaded ${key}`);
        }
        else {
            logger.error(`Failure to download ${key}`);
        }
    }
    catch (getCommandError) {
        // Handle any errors that occur when downloading objects
        // if (getCommandError.$metadata) {
        //   const {requestId, cfId, extendedRequestId, httpStatusCode} =
        //     getCommandError.$metadata;
        //   logger.error({
        //     requestId,
        //     cfId,
        //     extendedRequestId,
        //     httpStatusCode,
        //     error: getCommandError.message, // Extract only the error message
        //   });
        // } else {
        //   const {errorCode, errorMessage, name, message, stack} = getCommandError;
        //   logger.error({errorCode, errorMessage, name, message, stack});
        // }
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