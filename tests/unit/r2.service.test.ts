import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';

const { getSignedUrlMock } = vi.hoisted(() => ({
  getSignedUrlMock: vi.fn(async () => 'https://r2.example.com/presigned'),
}));

vi.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: getSignedUrlMock,
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

import {
  generatePresignedDownloadUrl,
  generatePresignedUrl,
  resolveDownloadRedirectUrl,
  sanitizeDownloadFilename,
  shouldSetUploadContentDisposition,
} from '../../src/services/r2.service';

describe('r2.service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('generatePresignedUrl', () => {
    it('does not set ContentDisposition on upload presign for audio', async () => {
      await generatePresignedUrl({
        entityType: 'music',
        entityId: '507f1f77bcf86cd799439011',
        intent: 'other',
        fileExtension: 'mp3',
        contentType: 'audio/mpeg',
      });

      expect(getSignedUrlMock).toHaveBeenCalledTimes(1);
      const command = getSignedUrlMock.mock.calls[0]?.[1] as PutObjectCommand;
      expect(command).toBeInstanceOf(PutObjectCommand);
      expect(command.input.ContentType).toBe('audio/mpeg');
      expect(command.input.ContentDisposition).toBeUndefined();
    });
  });

  describe('download helpers', () => {
    it('sanitizes unsafe download filenames', () => {
      expect(sanitizeDownloadFilename('My Song (Live)!.mp3')).toBe('My Song (Live)_.mp3');
    });

    it('detects media extensions for legacy upload disposition helper', () => {
      expect(shouldSetUploadContentDisposition('mp3', 'audio/mpeg')).toBe(true);
      expect(shouldSetUploadContentDisposition('mp4', 'video/mp4')).toBe(true);
      expect(shouldSetUploadContentDisposition('jpg', 'image/jpeg')).toBe(false);
    });

    it('generates presigned download URL with attachment disposition', async () => {
      await generatePresignedDownloadUrl('production-files/music/a/other/x.mp3', 'Song.mp3');

      expect(getSignedUrlMock).toHaveBeenCalled();
      const command = getSignedUrlMock.mock.calls.at(-1)?.[1] as GetObjectCommand;
      expect(command).toBeInstanceOf(GetObjectCommand);
      expect(command.input.ResponseContentDisposition).toContain('attachment');
    });

    it('resolves R2 CDN URLs to presigned attachment links', async () => {
      const publicUrl = 'https://static.ojmultimedia.com/production-files/music/a/other/x.mp3';
      await resolveDownloadRedirectUrl(publicUrl, 'Song.mp3');

      expect(getSignedUrlMock).toHaveBeenCalled();
      const command = getSignedUrlMock.mock.calls.at(-1)?.[1] as GetObjectCommand;
      expect(command.input.ResponseContentDisposition).toContain('attachment');
    });

    it('returns external URLs unchanged when not on configured CDN', async () => {
      const external = 'https://cdn.example.com/track.mp3';
      const url = await resolveDownloadRedirectUrl(external, 'track.mp3');

      expect(url).toBe(external);
    });
  });
});
