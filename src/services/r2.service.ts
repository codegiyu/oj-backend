import { PutObjectCommand, HeadObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { customAlphabet } from 'nanoid';
import { r2Client, r2Config } from '../config/r2';
import type { EntityType, UploadIntent } from '../lib/types/constants';

const nanoid = customAlphabet('1234567890abcdefghijklmnopqrstuvwxyz', 12);

export interface GeneratePresignedUrlParams {
  entityType: EntityType;
  entityId: string;
  intent: UploadIntent;
  fileExtension?: string;
  contentType?: string;
  expiresIn?: number;
}

export interface GeneratePresignedUrlResult {
  filename: string;
  url: string;
  key: string;
  publicUrl: string;
}

export function getContentTypeFromExtension(extension: string): string {
  const ext = extension.toLowerCase().replace(/^\./, '');
  const contentTypes: Record<string, string> = {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    gif: 'image/gif',
    webp: 'image/webp',
    svg: 'image/svg+xml',
    bmp: 'image/bmp',
    ico: 'image/x-icon',
    pdf: 'application/pdf',
    doc: 'application/msword',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    xls: 'application/vnd.ms-excel',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ppt: 'application/vnd.ms-powerpoint',
    pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    mp4: 'video/mp4',
    webm: 'video/webm',
    mov: 'video/quicktime',
    avi: 'video/x-msvideo',
    mkv: 'video/x-matroska',
    m4v: 'video/x-m4v',
  };
  return contentTypes[ext] ?? 'application/octet-stream';
}

export async function generatePresignedUrl({
  entityType,
  entityId,
  intent,
  fileExtension = '',
  contentType = 'application/octet-stream',
  expiresIn = 3600,
}: GeneratePresignedUrlParams): Promise<GeneratePresignedUrlResult> {
  const ext = fileExtension.replace(/^\./, '');
  const filename = `${nanoid()}${ext ? `.${ext}` : ''}`;
  const key = `${r2Config.folderPrefix}/${entityType}/${entityId}/${intent}/${filename}`;

  const command = new PutObjectCommand({
    Bucket: r2Config.bucketName,
    Key: key,
    ContentType: contentType,
  });

  const url = await getSignedUrl(r2Client, command, { expiresIn });

  const baseUrl = r2Config.cdnUrl?.trim() || r2Config.publicUrl?.trim() || '';
  const publicUrl = baseUrl ? `${baseUrl.replace(/\/$/, '')}/${key}` : '';

  return { filename, url, key, publicUrl: publicUrl || key };
}

export async function headObjectInR2(key: string): Promise<{ exists: boolean; size?: number }> {
  try {
    const command = new HeadObjectCommand({
      Bucket: r2Config.bucketName,
      Key: key,
    });
    const res = await r2Client.send(command);
    return { exists: true, size: res.ContentLength };
  } catch (err: unknown) {
    const code = (err as { name?: string; $metadata?: { httpStatusCode?: number } })?.$metadata
      ?.httpStatusCode ?? (err as { name?: string }).name;
    if (code === 404 || (typeof code === 'number' && code === 404)) return { exists: false };
    throw err;
  }
}

export async function deleteFileFromR2(key: string): Promise<void> {
  const command = new DeleteObjectCommand({
    Bucket: r2Config.bucketName,
    Key: key,
  });
  await r2Client.send(command);
}

export function extractKeyFromUrl(url: string): string | null {
  const cdn = r2Config.cdnUrl?.trim();
  const pub = r2Config.publicUrl?.trim();
  if (cdn && url.startsWith(cdn)) return url.slice(cdn.length).replace(/^\//, '');
  if (pub && url.startsWith(pub)) return url.slice(pub.length).replace(/^\//, '');
  return null;
}
