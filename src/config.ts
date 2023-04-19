import dotenv from 'dotenv';

dotenv.config();

// AWS credentials and S3 bucket information
export const config = {
      accessKey: process.env.AWS_ACCESS_KEY,
      secretKey: process.env.AWS_SECRET_KEY,
      region: process.env.AWS_REGION,
      bucketName: process.env.S3_BUCKET_NAME,
      endpoint: process.env.AWS_ENDPOINT || undefined,
    };