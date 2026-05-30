import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: vi.fn(async () => 'https://r2.example.com/presigned?response-content-disposition=attachment'),
}));

vi.mock('../../src/config/r2', () => ({
  r2Client: {},
  r2Config: {
    bucketName: 'test-bucket',
    folderPrefix: 'production-files',
    cdnUrl: 'https://static.ojmultimedia.com',
    publicUrl: '',
  },
}));

import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import {
  generatePresignedDownloadUrl,
  resolveDownloadRedirectUrl,
  sanitizeDownloadFilename,
  shouldSetUploadContentDisposition,
} from '../../src/services/r2.service';

describe('r2.service download helpers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('sanitizes unsafe download filenames', () => {
    expect(sanitizeDownloadFilename('My Song (Live)!.mp3')).toBe('My Song (Live)_.mp3');
  });

  it('detects media extensions for upload disposition', () => {
    expect(shouldSetUploadContentDisposition('mp3', 'audio/mpeg')).toBe(true);
    expect(shouldSetUploadContentDisposition('jpg', 'image/jpeg')).toBe(false);
  });

  it('generates presigned download URL with attachment disposition', async () => {
    const url = await generatePresignedDownloadUrl('production-files/music/a/other/x.mp3', 'Song.mp3');

    expect(url).toContain('response-content-disposition=attachment');
    expect(getSignedUrl).toHaveBeenCalled();
  });

  it('resolves R2 CDN URLs to presigned attachment links', async () => {
    const publicUrl = 'https://static.ojmultimedia.com/production-files/music/a/other/x.mp3';
    const url = await resolveDownloadRedirectUrl(publicUrl, 'Song.mp3');

    expect(url).toContain('response-content-disposition=attachment');
  });

  it('returns external URLs unchanged when not on configured CDN', async () => {
    const external = 'https://cdn.example.com/track.mp3';
    const url = await resolveDownloadRedirectUrl(external, 'track.mp3');

    expect(url).toBe(external);
  });
});
