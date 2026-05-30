import { describe, expect, it } from 'vitest';
import {
  hasCompleteMediaMetadata,
  resolveMusicProbeTarget,
  resolveVideoProbeTarget,
  shouldBackfillMediaMetadata,
} from '../../src/utils/mediaMetadataBackfill';

describe('mediaMetadataBackfill helpers', () => {
  it('detects complete metadata when durationSeconds is positive', () => {
    expect(hasCompleteMediaMetadata({ durationSeconds: 180 })).toBe(true);
    expect(hasCompleteMediaMetadata({ durationSeconds: 0 })).toBe(false);
    expect(hasCompleteMediaMetadata({})).toBe(false);
    expect(shouldBackfillMediaMetadata({ durationSeconds: 120 })).toBe(false);
    expect(shouldBackfillMediaMetadata({})).toBe(true);
  });

  it('prefers music audioUrl over videoUrl', () => {
    expect(
      resolveMusicProbeTarget({
        audioUrl: 'https://cdn.example/track.mp3',
        videoUrl: 'https://cdn.example/clip.mp4',
      })
    ).toEqual({
      mediaUrl: 'https://cdn.example/track.mp3',
      mediaKind: 'audio',
    });
  });

  it('falls back to music videoUrl when audio is missing', () => {
    expect(
      resolveMusicProbeTarget({
        audioUrl: '',
        videoUrl: 'https://cdn.example/sermon.mp4',
      })
    ).toEqual({
      mediaUrl: 'https://cdn.example/sermon.mp4',
      mediaKind: 'video',
    });
  });

  it('skips non-probeable music URLs', () => {
    expect(
      resolveMusicProbeTarget({
        audioUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      })
    ).toBeNull();
  });

  it('prefers videoFileUrl over videoUrl', () => {
    expect(
      resolveVideoProbeTarget({
        videoFileUrl: 'https://cdn.example/file.mp4',
        videoUrl: 'https://cdn.example/legacy.mp4',
      })
    ).toEqual({
      mediaUrl: 'https://cdn.example/file.mp4',
      mediaKind: 'video',
    });
  });
});
