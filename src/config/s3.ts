import { S3Client } from '@aws-sdk/client-s3';
import { ENVIRONMENT } from './env';

export const s3Client = new S3Client({
  region: ENVIRONMENT.aws.region,
  credentials: {
    accessKeyId: ENVIRONMENT.aws.accessKeyId,
    secretAccessKey: ENVIRONMENT.aws.secretAccessKey,
  },
});

export const s3Config = {
  bucket: ENVIRONMENT.aws.s3Bucket,
  region: ENVIRONMENT.aws.region,
};
