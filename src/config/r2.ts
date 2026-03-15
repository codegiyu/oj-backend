import { S3Client } from '@aws-sdk/client-s3';
import { ENVIRONMENT } from './env';
import { AppError } from '../utils/AppError';

/**
 * Validate required R2 configuration. Throws at module load if critical env vars are missing.
 * Warns if neither CDN_URL nor PUBLIC_URL is set (public file URLs may not work).
 */
function validateR2Config(): void {
  const missingVars: string[] = [];
  const r2 = ENVIRONMENT.r2;

  if (!r2.accountId || r2.accountId.trim() === '') missingVars.push('R2_ACCOUNT_ID');
  if (!r2.accessKeyId || r2.accessKeyId.trim() === '') missingVars.push('R2_ACCESS_KEY_ID');
  if (!r2.secretAccessKey || r2.secretAccessKey.trim() === '') missingVars.push('R2_SECRET_ACCESS_KEY');
  if (!r2.bucketName || r2.bucketName.trim() === '') missingVars.push('R2_BUCKET_NAME');
  if (!r2.folderPrefix || r2.folderPrefix.trim() === '') missingVars.push('R2_FOLDER_PREFIX');

  if (missingVars.length > 0) {
    throw new AppError(
      `Missing or empty required R2 configuration: ${missingVars.join(', ')}. Set these environment variables.`,
      500
    );
  }

  if (
    (!r2.cdnUrl || r2.cdnUrl.trim() === '') &&
    (!r2.publicUrl || r2.publicUrl.trim() === '')
  ) {
    console.warn(
      'Warning: Neither R2_CDN_URL nor R2_PUBLIC_URL is set. Public file URLs may not work correctly.'
    );
  }
}

validateR2Config();

const accountId = ENVIRONMENT.r2.accountId;
const endpoint =
  accountId && accountId.trim()
    ? `https://${accountId}.r2.cloudflarestorage.com`
    : undefined;

export const r2Client = new S3Client({
  region: 'auto',
  ...(endpoint && {
    endpoint,
    forcePathStyle: false,
  }),
  credentials: {
    accessKeyId: ENVIRONMENT.r2.accessKeyId,
    secretAccessKey: ENVIRONMENT.r2.secretAccessKey,
  },
});

export const r2Config = {
  bucketName: ENVIRONMENT.r2.bucketName,
  folderPrefix: ENVIRONMENT.r2.folderPrefix,
  cdnUrl: ENVIRONMENT.r2.cdnUrl,
  publicUrl: ENVIRONMENT.r2.publicUrl,
};
