import { Readable } from 'node:stream';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const parseStreamMock = vi.fn();
const musicFindByIdAndUpdate = vi.fn();
const videoFindByIdAndUpdate = vi.fn();
const dnsLookup = vi.fn();

vi.mock('music-metadata', () => ({
  parseStream: (...args: unknown[]) => parseStreamMock(...args),
}));

vi.mock('node:dns/promises', () => ({
  default: {
    lookup: (...args: unknown[]) => dnsLookup(...args),
  },
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
  probeMediaUrl,
  updateEntityMetadata,
} from '../../src/services/mediaMetadata.service';

describe('mediaMetadata.service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
  });

  describe('updateEntityMetadata', () => {
    it('patches music metadata fields', async () => {
      await updateEntityMetadata('music', '507f1f77bcf86cd799439011', {
        durationSeconds: 184,
        mimeType: 'audio/mpeg',
      });

      expect(musicFindByIdAndUpdate).toHaveBeenCalledWith(
        '507f1f77bcf86cd799439011',
        {
          $set: {
            'metadata.durationSeconds': 184,
            'metadata.mimeType': 'audio/mpeg',
          },
        }
      );
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
