/**
 * Clone all R2 objects from one folder prefix to another within the same bucket.
 *
 * Usage:
 *   tsx scripts/clone-r2-prefix.ts --source <src-prefix> --dest <dest-prefix>
 *
 * Required env vars (reads from .env by default):
 *   R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME
 *
 * Example:
 *   tsx scripts/clone-r2-prefix.ts --source prod-files --dest staging-files
 */

import dotenv from 'dotenv';
import { S3Client, ListObjectsV2Command, CopyObjectCommand } from '@aws-sdk/client-s3';

dotenv.config();

function parseArgs(): { source: string; dest: string } {
  const args = process.argv.slice(2);
  let source = '';
  let dest = '';

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--source' && args[i + 1]) source = args[++i];
    if (args[i] === '--dest' && args[i + 1]) dest = args[++i];
  }

  if (!source || !dest) {
    console.error('Usage: tsx scripts/clone-r2-prefix.ts --source <src-prefix> --dest <dest-prefix>');
    process.exit(1);
  }

  return { source, dest };
}

function buildClient(): S3Client {
  const accountId = process.env.R2_ACCOUNT_ID?.trim();
  const accessKeyId = process.env.R2_ACCESS_KEY_ID?.trim();
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY?.trim();

  const missing: string[] = [];
  if (!accountId) missing.push('R2_ACCOUNT_ID');
  if (!accessKeyId) missing.push('R2_ACCESS_KEY_ID');
  if (!secretAccessKey) missing.push('R2_SECRET_ACCESS_KEY');
  if (!process.env.R2_BUCKET_NAME?.trim()) missing.push('R2_BUCKET_NAME');

  if (missing.length) {
    console.error(`Missing required env vars: ${missing.join(', ')}`);
    process.exit(1);
  }

  return new S3Client({
    region: 'auto',
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    requestChecksumCalculation: 'WHEN_REQUIRED',
    responseChecksumValidation: 'WHEN_REQUIRED',
    credentials: {
      accessKeyId: accessKeyId!,
      secretAccessKey: secretAccessKey!,
    },
  });
}

async function listAllObjects(client: S3Client, bucket: string, prefix: string): Promise<string[]> {
  const keys: string[] = [];
  let continuationToken: string | undefined;

  do {
    const command = new ListObjectsV2Command({
      Bucket: bucket,
      Prefix: prefix + '/',
      ContinuationToken: continuationToken,
    });

    const response = await client.send(command);

    for (const obj of response.Contents ?? []) {
      if (obj.Key) keys.push(obj.Key);
    }

    continuationToken = response.NextContinuationToken;
  } while (continuationToken);

  return keys;
}

async function copyObjects(
  client: S3Client,
  bucket: string,
  sourceKeys: string[],
  sourcePrefix: string,
  destPrefix: string
): Promise<void> {
  let copied = 0;
  let failed = 0;

  for (const sourceKey of sourceKeys) {
    const destKey = destPrefix + sourceKey.slice(sourcePrefix.length);

    try {
      await client.send(
        new CopyObjectCommand({
          Bucket: bucket,
          CopySource: `${bucket}/${sourceKey}`,
          Key: destKey,
        })
      );

      copied++;
      if (copied % 50 === 0) {
        process.stdout.write(`  Copied ${copied}/${sourceKeys.length}...\n`);
      }
    } catch (err) {
      console.error(`  FAILED: ${sourceKey} → ${destKey}`, err);
      failed++;
    }
  }

  console.log(`\nDone. Copied: ${copied}, Failed: ${failed}`);
}

async function main(): Promise<void> {
  const { source, dest } = parseArgs();
  const bucket = process.env.R2_BUCKET_NAME!.trim();
  const client = buildClient();

  console.log(`Bucket : ${bucket}`);
  console.log(`Source : ${source}/`);
  console.log(`Dest   : ${dest}/`);
  console.log('Listing objects...');

  const keys = await listAllObjects(client, bucket, source);

  if (keys.length === 0) {
    console.log(`No objects found under prefix "${source}/" — nothing to copy.`);
    return;
  }

  console.log(`Found ${keys.length} objects. Starting copy...\n`);
  await copyObjects(client, bucket, keys, source, dest);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
