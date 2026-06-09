import type { UploadIntent } from '../lib/types/constants';

const IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'] as const;

const MEDIA_EXTENSIONS = [
  ...IMAGE_EXTENSIONS,
  'mp3',
  'wav',
  'flac',
  'aac',
  'm4a',
  'ogg',
  'mp4',
  'webm',
  'mov',
  'pdf',
] as const;

export const ALLOWED_EXTENSIONS_BY_INTENT: Record<UploadIntent, readonly string[]> = {
  avatar: IMAGE_EXTENSIONS,
  logo: IMAGE_EXTENSIONS,
  'card-image': IMAGE_EXTENSIONS,
  'banner-image': IMAGE_EXTENSIONS,
  image: IMAGE_EXTENSIONS,
  other: MEDIA_EXTENSIONS,
};

export function normalizeUploadExtension(fileExtension: string): string {
  return fileExtension.trim().replace(/^\./, '').toLowerCase();
}

export function isAllowedUploadExtension(intent: UploadIntent, fileExtension: string): boolean {
  const ext = normalizeUploadExtension(fileExtension);
  if (!ext) return false;

  return ALLOWED_EXTENSIONS_BY_INTENT[intent].includes(ext);
}

export function assertAllowedUploadExtension(intent: UploadIntent, fileExtension: string): void {
  if (!isAllowedUploadExtension(intent, fileExtension)) {
    const allowed = ALLOWED_EXTENSIONS_BY_INTENT[intent].join(', ');

    throw new Error(`File extension not allowed for intent "${intent}". Allowed: ${allowed}`);
  }
}
