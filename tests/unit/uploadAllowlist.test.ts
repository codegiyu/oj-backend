import { describe, expect, it } from 'vitest';
import {
  isAllowedUploadExtension,
  normalizeUploadExtension,
} from '../../src/constants/uploadAllowlist';

describe('uploadAllowlist', () => {
  it('normalizes extensions by trimming dots and lowercasing', () => {
    expect(normalizeUploadExtension('.PNG')).toBe('png');
    expect(normalizeUploadExtension('  JPEG  ')).toBe('jpeg');
  });

  it('allows image extensions for avatar intent', () => {
    expect(isAllowedUploadExtension('avatar', 'png')).toBe(true);
    expect(isAllowedUploadExtension('avatar', 'jpg')).toBe(true);
  });

  it('rejects executable extensions for image intents', () => {
    expect(isAllowedUploadExtension('avatar', 'exe')).toBe(false);
    expect(isAllowedUploadExtension('image', 'php')).toBe(false);
  });

  it('allows media extensions for other intent', () => {
    expect(isAllowedUploadExtension('other', 'mp3')).toBe(true);
    expect(isAllowedUploadExtension('other', 'pdf')).toBe(true);
  });

  it('rejects disallowed extensions for other intent', () => {
    expect(isAllowedUploadExtension('other', 'exe')).toBe(false);
  });
});
