import { beforeEach, describe, expect, it, vi } from 'vitest';

const addJobToQueue = vi.fn();

vi.mock('../../src/queues/main.queue', () => ({
  addJobToQueue: (...args: unknown[]) => addJobToQueue(...args),
}));

import {
  enqueueMediaMetadataProbe,
  MEDIA_METADATA_PROBE_DELAY_MS,
  shouldEnqueueMetadataProbe,
} from '../../src/utils/mediaMetadataEnqueue';

describe('mediaMetadataEnqueue', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    addJobToQueue.mockResolvedValue('job-123');
  });

  describe('shouldEnqueueMetadataProbe', () => {
    it('returns false when new URL is empty', () => {
      expect(shouldEnqueueMetadataProbe('https://old.example/a.mp3', '')).toBe(false);
      expect(shouldEnqueueMetadataProbe('https://old.example/a.mp3', '   ')).toBe(false);
    });

    it('returns false when URL is unchanged', () => {
      expect(
        shouldEnqueueMetadataProbe('https://cdn.example/track.mp3', 'https://cdn.example/track.mp3')
      ).toBe(false);
    });

    it('returns false for non-http(s) URLs', () => {
      expect(shouldEnqueueMetadataProbe('', '/relative/track.mp3')).toBe(false);
      expect(shouldEnqueueMetadataProbe('', 'ftp://cdn.example/track.mp3')).toBe(false);
    });

    it('returns true for YouTube URLs', () => {
      expect(
        shouldEnqueueMetadataProbe(
          '',
          'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
        )
      ).toBe(true);
    });

    it('returns true when a probeable http(s) URL changes', () => {
      expect(
        shouldEnqueueMetadataProbe(
          'https://cdn.example/old.mp3',
          'https://cdn.example/new.mp3'
        )
      ).toBe(true);
      expect(shouldEnqueueMetadataProbe('', 'https://cdn.example/new.mp3')).toBe(true);
    });
  });

  describe('enqueueMediaMetadataProbe', () => {
    it('enqueues extractMediaMetadata jobs for probeable URLs', async () => {
      const jobId = await enqueueMediaMetadataProbe({
        entityType: 'music',
        entityId: '507f1f77bcf86cd799439011',
        mediaUrl: 'https://cdn.example/track.mp3',
        mediaKind: 'audio',
      });

      expect(jobId).toBe('job-123');
      expect(addJobToQueue).toHaveBeenCalledWith(
        {
          type: 'extractMediaMetadata',
          entityType: 'music',
          entityId: '507f1f77bcf86cd799439011',
          mediaUrl: 'https://cdn.example/track.mp3',
          mediaKind: 'audio',
        },
        { delay: MEDIA_METADATA_PROBE_DELAY_MS }
      );
    });

    it('enqueues YouTube video URLs', async () => {
      const jobId = await enqueueMediaMetadataProbe({
        entityType: 'video',
        entityId: '507f1f77bcf86cd799439011',
        mediaUrl: 'https://youtu.be/dQw4w9WgXcQ',
        mediaKind: 'video',
      });

      expect(jobId).toBe('job-123');
      expect(addJobToQueue).toHaveBeenCalledWith(
        expect.objectContaining({
          mediaUrl: 'https://youtu.be/dQw4w9WgXcQ',
          mediaKind: 'video',
        }),
        { delay: MEDIA_METADATA_PROBE_DELAY_MS }
      );
    });

    it('skips enqueue for empty URLs', async () => {
      await expect(
        enqueueMediaMetadataProbe({
          entityType: 'video',
          entityId: '507f1f77bcf86cd799439011',
          mediaUrl: '',
          mediaKind: 'video',
        })
      ).resolves.toBeUndefined();

      expect(addJobToQueue).not.toHaveBeenCalled();
    });

    it('returns undefined when queue enqueue fails', async () => {
      addJobToQueue.mockRejectedValueOnce(new Error('redis down'));

      const jobId = await enqueueMediaMetadataProbe({
        entityType: 'video',
        entityId: '507f1f77bcf86cd799439011',
        mediaUrl: 'https://cdn.example/clip.mp4',
        mediaKind: 'video',
      });

      expect(jobId).toBeUndefined();
    });
  });
});
