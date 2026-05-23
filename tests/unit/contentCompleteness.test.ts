import { describe, expect, it } from 'vitest';
import {
  isCompleteDevotional,
  isCompleteMusic,
  isCompletePrayerRequest,
  isCompleteResource,
  isCompleteTestimony,
  isCompleteVideo,
  isSermonCategory,
  mergePublicFilter,
  publishedMusicCompletenessFilter,
} from '../../src/utils/contentCompleteness';

describe('contentCompleteness', () => {
  it('detects sermon categories', () => {
    expect(isSermonCategory('sermon')).toBe(true);
    expect(isSermonCategory('Sermons')).toBe(true);
    expect(isSermonCategory('gospel')).toBe(false);
  });

  it('requires audioUrl for non-sermon music', () => {
    expect(isCompleteMusic({ category: 'gospel', audioUrl: 'https://cdn/a.mp3' })).toBe(true);
    expect(isCompleteMusic({ category: 'gospel', audioUrl: '   ' })).toBe(false);
    expect(isCompleteMusic({ category: 'gospel' })).toBe(false);
  });

  it('allows sermon music with audio or video', () => {
    expect(isCompleteMusic({ category: 'sermon', videoUrl: 'https://cdn/v.mp4' })).toBe(true);
    expect(isCompleteMusic({ category: 'sermon' })).toBe(false);
  });

  it('requires playable video sources', () => {
    expect(isCompleteVideo({ videoFileUrl: 'https://cdn/v.mp4' })).toBe(true);
    expect(isCompleteVideo({ embedUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' })).toBe(true);
    expect(isCompleteVideo({ videoUrl: '', videoFileUrl: '', embedUrl: '' })).toBe(false);
  });

  it('requires text content for devotionals and testimonies', () => {
    expect(isCompleteDevotional({ content: 'Hello' })).toBe(true);
    expect(isCompleteTestimony({ content: '   ' })).toBe(false);
  });

  it('requires prayer request content', () => {
    expect(isCompletePrayerRequest({ content: 'Please pray' })).toBe(true);
    expect(isCompletePrayerRequest({ title: 'Only title' })).toBe(false);
  });

  it('allows affiliate resources without fileUrl', () => {
    expect(isCompleteResource({ type: 'affiliate', fileUrl: '' })).toBe(true);
    expect(isCompleteResource({ type: 'ebook', fileUrl: '' })).toBe(false);
    expect(isCompleteResource({ type: 'ebook', fileUrl: 'https://cdn/book.pdf' })).toBe(true);
  });

  it('merges filters with $and when base already has conditions', () => {
    const merged = mergePublicFilter({ status: 'published' }, publishedMusicCompletenessFilter());

    expect(merged).toEqual({
      $and: [{ status: 'published' }, publishedMusicCompletenessFilter()],
    });
  });
});
