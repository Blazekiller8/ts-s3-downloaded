/*
 * To Upload Sample files to test folder in S3 bucket
 * @author: Sivaraam T K
 * @modified-on: 2023/04/24
 * @reference: https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/clients/client-s3/modules.html
 */
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { config } from './config.js';
// AWS credentials and S3 bucket  from .env
const AWS_ACCESS_KEY = config.accessKey;
const AWS_SECRET_KEY = config.secretKey;
const AWS_REGION = config.region;
const AWS_ENDPOINT = config.endpoint;
if (!AWS_ACCESS_KEY || !AWS_SECRET_KEY || !AWS_REGION) {
    throw new Error('AWS credentials and S3 bucket information not found in .env file.');
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
clientConfig.endpoint = AWS_ENDPOINT;
clientConfig.forcePathStyle = true;
clientConfig.logger = console;
// Create an instance of the S3 client
const s3Client = new S3Client(clientConfig);
async function uploadMultipleTimes() {
    const bucketName = 'test-bucket';
    const keyPrefix = 'test/test';
    const numberOfUploads = 1100; // Upload the file under more than 1000 unique names
    const promises = [];
    for (let i = 0; i < numberOfUploads; i++) {
        const uniqueKey = `${keyPrefix}-${i}.txt`;
        const putCommandInput = {
            Bucket: bucketName,
            Key: uniqueKey,
            Body: 'This is the content of the test file.',
        };
        const putCommand = new PutObjectCommand(putCommandInput);
        const uploadPromise = s3Client.send(putCommand);
        promises.push(uploadPromise);
    }
    await Promise.all(promises);
    console.log(`Uploaded ${numberOfUploads} times.`);
}
uploadMultipleTimes().catch(console.error);
//# sourceMappingURL=test-upload.js.map