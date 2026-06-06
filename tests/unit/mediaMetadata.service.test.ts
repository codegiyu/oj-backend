import { Readable } from 'node:stream';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const parseStreamMock = vi.fn();
const musicFindByIdAndUpdate = vi.fn();
const videoFindByIdAndUpdate = vi.fn();
const dnsLookup = vi.fn();
const r2Send = vi.fn();

const { mockEnvironment } = vi.hoisted(() => ({
  mockEnvironment: {
    youtube: { apiKey: '' },
    r2: { cdnUrl: '', publicUrl: '' },
  },
}));

vi.mock('music-metadata', () => ({
  parseStream: (...args: unknown[]) => parseStreamMock(...args),
}));

vi.mock('node:dns/promises', () => ({
  default: {
    lookup: (...args: unknown[]) => dnsLookup(...args),
  },
}));

vi.mock('../../src/config/env', () => ({
  ENVIRONMENT: mockEnvironment,
}));

vi.mock('../../src/config/r2', () => ({
  r2Client: { send: (...args: unknown[]) => r2Send(...args) },
  r2Config: { bucketName: 'media-bucket' },
}));

vi.mock('../../src/models/music', () => ({
  Music: {
    findByIdAndUpdate: (...args: unknown[]) => musicFindByIdAndUpdate(...args),
  },
}));

vi.mock('../../src/models/video', () => ({
  Video: {
    findByIdAndUpdate: (...args: unknown[]) => videoFindByIdAndUpdate(...args),
  },
}));

import {
  assertSafeMediaUrl,
  parseIso8601DurationSeconds,
  probeMediaUrl,
  updateEntityMetadata,
} from '../../src/services/mediaMetadata.service';

describe('mediaMetadata.service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockEnvironment.youtube.apiKey = '';
    mockEnvironment.r2.cdnUrl = '';
    mockEnvironment.r2.publicUrl = '';
    dnsLookup.mockResolvedValue([{ address: '93.184.216.34', family: 4 }]);
    parseStreamMock.mockResolvedValue({
      format: {
        duration: 183.6,
        mimeType: 'audio/mpeg',
        bitrate: 320000,
        sampleRate: 44100,
        codec: 'mp3',
        container: 'MPEG',
      },
    });
    musicFindByIdAndUpdate.mockReturnValue({ exec: vi.fn().mockResolvedValue({ _id: 'music-id' }) });
    videoFindByIdAndUpdate.mockReturnValue({ exec: vi.fn().mockResolvedValue({ _id: 'video-id' }) });
    r2Send.mockResolvedValue({
      Body: Readable.from([Buffer.from('fake-video')]),
      ContentType: 'video/mp4',
    });
  });

  describe('assertSafeMediaUrl', () => {
    it('rejects non-http(s) protocols', async () => {
      await expect(assertSafeMediaUrl('ftp://example.com/track.mp3')).rejects.toMatchObject({
        message: 'Media URL must use http or https',
      });
    });

    it('rejects localhost hosts', async () => {
      await expect(assertSafeMediaUrl('http://localhost/track.mp3')).rejects.toMatchObject({
        message: 'Media URL host is not allowed',
      });
    });

    it('rejects private IP addresses', async () => {
      await expect(assertSafeMediaUrl('http://192.168.1.10/track.mp3')).rejects.toMatchObject({
        message: 'Media URL host is not allowed',
      });
    });

    it('rejects hosts that resolve to private IPs', async () => {
      dnsLookup.mockResolvedValueOnce([{ address: '10.0.0.5', family: 4 }]);

      await expect(assertSafeMediaUrl('https://cdn.example.com/track.mp3')).rejects.toMatchObject({
        message: 'Media URL host is not allowed',
      });
    });

    it('accepts public http(s) URLs', async () => {
      const parsed = await assertSafeMediaUrl('https://cdn.example.com/track.mp3');

      expect(parsed.hostname).toBe('cdn.example.com');
    });
  });

  describe('parseIso8601DurationSeconds', () => {
    it('parses YouTube ISO8601 durations', () => {
      expect(parseIso8601DurationSeconds('PT1M30S')).toBe(90);
      expect(parseIso8601DurationSeconds('PT2H3M4S')).toBe(7384);
      expect(parseIso8601DurationSeconds('P1DT1H')).toBe(90000);
    });

    it('returns undefined for invalid durations', () => {
      expect(parseIso8601DurationSeconds('')).toBeUndefined();
      expect(parseIso8601DurationSeconds('PT0S')).toBeUndefined();
    });
  });

  describe('probeMediaUrl', () => {
    it('probes audio URLs via music-metadata', async () => {
      const nodeStream = Readable.from([Buffer.from('fake-audio')]);
      const webStream = Readable.toWeb(nodeStream) as import('stream/web').ReadableStream;

      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: true,
          url: 'https://cdn.example.com/track.mp3',
          headers: {
            get: (name: string) => (name.toLowerCase() === 'content-type' ? 'audio/mpeg' : null),
          },
          body: webStream,
        })
      );

      const result = await probeMediaUrl('https://cdn.example.com/track.mp3', 'audio');

      expect(parseStreamMock).toHaveBeenCalled();
      expect(result).toMatchObject({
        durationSeconds: 184,
        mimeType: 'audio/mpeg',
        bitrate: 320000,
        sampleRate: 44100,
        codec: 'mp3',
        container: 'MPEG',
        mediaKind: 'audio',
      });
      expect(result.probedAt).toEqual(expect.any(String));

      vi.unstubAllGlobals();
    });

    it('probes YouTube URLs via the Data API', async () => {
      mockEnvironment.youtube.apiKey = 'test-youtube-key';

      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: true,
          json: async () => ({
            items: [{ contentDetails: { duration: 'PT4M12S' } }],
          }),
        })
      );

      const result = await probeMediaUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ', 'video');

      expect(result).toMatchObject({
        durationSeconds: 252,
        provider: 'youtube',
        mediaKind: 'video',
      });

      vi.unstubAllGlobals();
    });

    it('falls back to R2 GetObject when public HTTP fetch fails', async () => {
      mockEnvironment.r2.cdnUrl = 'https://cdn.example.com';

      vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('public fetch failed')));

      const result = await probeMediaUrl('https://cdn.example.com/videos/clip.mp4', 'video');

      expect(r2Send).toHaveBeenCalled();
      expect(parseStreamMock).toHaveBeenCalled();
      expect(result.provider).toBe('r2');

      vi.unstubAllGlobals();
    });
  });

  describe('updateEntityMetadata', () => {
    it('patches individual metadata fields without replacing the whole object', async () => {
      await updateEntityMetadata('video', '507f1f77bcf86cd799439011', {
        durationSeconds: 252,
        provider: 'youtube',
      });

      expect(videoFindByIdAndUpdate).toHaveBeenCalledWith('507f1f77bcf86cd799439011', {
        $set: {
          'metadata.durationSeconds': 252,
          'metadata.provider': 'youtube',
        },
      });
    });

    it('patches music metadata fields', async () => {
      await updateEntityMetadata('music', '507f1f77bcf86cd799439011', {
        durationSeconds: 184,
        mimeType: 'audio/mpeg',
      });

      expect(musicFindByIdAndUpdate).toHaveBeenCalledWith('507f1f77bcf86cd799439011', {
        $set: {
          'metadata.durationSeconds': 184,
          'metadata.mimeType': 'audio/mpeg',
        },
      });
    });

    it('throws when entity id is invalid', async () => {
      await expect(
        updateEntityMetadata('video', 'not-an-id', { durationSeconds: 10 })
      ).rejects.toMatchObject({
        message: 'Invalid entity id for metadata update',
      });
    });

    it('throws when entity is missing', async () => {
      musicFindByIdAndUpdate.mockReturnValueOnce({ exec: vi.fn().mockResolvedValue(null) });

      await expect(
        updateEntityMetadata('music', '507f1f77bcf86cd799439011', { durationSeconds: 10 })
      ).rejects.toMatchObject({
        message: 'Music not found',
      });
    });
  });
});
