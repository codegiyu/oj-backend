import mongoose from 'mongoose';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AppError } from '../../src/utils/AppError';

vi.mock('../../src/repositories/public/music.repository', () => ({
  findPublishedMusicByIdOrSlug: vi.fn(),
  incrementMusicDownloads: vi.fn(),
}));

vi.mock('../../src/repositories/public/video.repository', () => ({
  findPublishedVideoByIdOrSlug: vi.fn(),
  incrementVideoDownloads: vi.fn(),
}));

import * as musicRepo from '../../src/repositories/public/music.repository';
import * as videoRepo from '../../src/repositories/public/video.repository';
import { downloadPublicMusic, downloadPublicVideo } from '../../src/services/publicMedia.service';

describe('publicMedia.service downloads', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('blocks monetized music downloads', async () => {
    vi.mocked(musicRepo.findPublishedMusicByIdOrSlug).mockResolvedValue({
      _id: new mongoose.Types.ObjectId(),
      audioUrl: 'https://cdn.example.com/track.mp3',
      downloadUrl: 'https://cdn.example.com/track-dl.mp3',
      isMonetizable: true,
      price: 500,
      category: 'gospel',
    });

    await expect(
      downloadPublicMusic({ params: { idOrSlug: 'track-1' } } as never)
    ).rejects.toMatchObject({ statusCode: 403 });
  });

  it('redirects only to explicit downloadUrl for free music', async () => {
    const id = new mongoose.Types.ObjectId();

    vi.mocked(musicRepo.findPublishedMusicByIdOrSlug).mockResolvedValue({
      _id: id,
      audioUrl: 'https://cdn.example.com/track.mp3',
      downloadUrl: 'https://cdn.example.com/track-dl.mp3',
      isMonetizable: false,
      category: 'gospel',
    });

    const result = await downloadPublicMusic({ params: { idOrSlug: 'track-1' } } as never);

    expect(result.redirectUrl).toBe('https://cdn.example.com/track-dl.mp3');
    expect(musicRepo.incrementMusicDownloads).toHaveBeenCalledWith(id);
  });

  it('does not fall back to audioUrl when downloadUrl is missing', async () => {
    vi.mocked(musicRepo.findPublishedMusicByIdOrSlug).mockResolvedValue({
      _id: new mongoose.Types.ObjectId(),
      audioUrl: 'https://cdn.example.com/track.mp3',
      downloadUrl: '',
      isMonetizable: false,
      category: 'gospel',
    });

    await expect(
      downloadPublicMusic({ params: { idOrSlug: 'track-1' } } as never)
    ).rejects.toMatchObject({ statusCode: 404 });
  });

  it('returns 404 for incomplete published music on download', async () => {
    vi.mocked(musicRepo.findPublishedMusicByIdOrSlug).mockResolvedValue({
      _id: new mongoose.Types.ObjectId(),
      audioUrl: '',
      downloadUrl: 'https://cdn.example.com/track-dl.mp3',
      isMonetizable: false,
      category: 'gospel',
    });

    await expect(
      downloadPublicMusic({ params: { idOrSlug: 'track-1' } } as never)
    ).rejects.toBeInstanceOf(AppError);
  });

  it('blocks monetized video downloads', async () => {
    vi.mocked(videoRepo.findPublishedVideoByIdOrSlug).mockResolvedValue({
      _id: new mongoose.Types.ObjectId(),
      videoFileUrl: 'https://cdn.example.com/video.mp4',
      videoUrl: 'https://cdn.example.com/video.mp4',
      isMonetizable: true,
      price: 1000,
    });

    await expect(
      downloadPublicVideo({ params: { idOrSlug: 'video-1' } } as never)
    ).rejects.toMatchObject({ statusCode: 403 });
  });
});
