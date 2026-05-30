import { describe, expect, it } from 'vitest';
import { coalesceMusicDownloadUrl } from '../../src/utils/musicDownloadUrl';

describe('coalesceMusicDownloadUrl', () => {
  it('prefers explicit downloadUrl', () => {
    expect(
      coalesceMusicDownloadUrl('https://cdn.example.com/play.mp3', 'https://cdn.example.com/dl.mp3')
    ).toBe('https://cdn.example.com/dl.mp3');
  });

  it('falls back to audioUrl when downloadUrl is empty', () => {
    expect(coalesceMusicDownloadUrl('https://cdn.example.com/play.mp3', '')).toBe(
      'https://cdn.example.com/play.mp3'
    );
  });

  it('returns empty when both are missing', () => {
    expect(coalesceMusicDownloadUrl(undefined, undefined)).toBe('');
  });
});
