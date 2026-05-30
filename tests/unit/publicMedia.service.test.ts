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

vi.mock('../../src/services/r2.service', () => ({
  resolveDownloadRedirectUrl: vi.fn(async (url: string, filename?: string) => {
    if (url.includes('static.ojmultimedia.com')) {
      return `https://r2.example.com/presigned?file=${encodeURIComponent(filename ?? 'download')}`;
    }

    return url;
  }),
}));

import * as musicRepo from '../../src/repositories/public/music.repository';
import * as videoRepo from '../../src/repositories/public/video.repository';
import * as r2Service from '../../src/services/r2.service';
import { downloadPublicMusic, downloadPublicVideo } from '../../src/services/publicMedia.service';

describe('publicMedia.service downloads', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('blocks monetized music downloads', async () => {
    vi.mocked(musicRepo.findPublishedMusicByIdOrSlug).mockResolvedValue({
      _id: new mongoose.Types.ObjectId(),
      title: 'Song',
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

  it('redirects to explicit downloadUrl for free music', async () => {
    const id = new mongoose.Types.ObjectId();

    vi.mocked(musicRepo.findPublishedMusicByIdOrSlug).mockResolvedValue({
      _id: id,
      title: 'Song',
      audioUrl: 'https://cdn.example.com/track.mp3',
      downloadUrl: 'https://static.ojmultimedia.com/production-files/music/a/other/x.mp3',
      isMonetizable: false,
      category: 'gospel',
    });

    const result = await downloadPublicMusic({ params: { idOrSlug: 'track-1' } } as never);

    expect(result.redirectUrl).toContain('r2.example.com/presigned');
    expect(musicRepo.incrementMusicDownloads).toHaveBeenCalledWith(id);
    expect(r2Service.resolveDownloadRedirectUrl).toHaveBeenCalledWith(
      'https://static.ojmultimedia.com/production-files/music/a/other/x.mp3',
      'Song.mp3'
    );
  });

  it('falls back to audioUrl when downloadUrl is missing', async () => {
    const id = new mongoose.Types.ObjectId();

    vi.mocked(musicRepo.findPublishedMusicByIdOrSlug).mockResolvedValue({
      _id: id,
      title: 'Fallback Song',
      audioUrl: 'https://static.ojmultimedia.com/production-files/music/b/other/y.mp3',
      downloadUrl: '',
      isMonetizable: false,
      category: 'gospel',
    });

    const result = await downloadPublicMusic({ params: { idOrSlug: 'track-1' } } as never);

    expect(result.redirectUrl).toContain('r2.example.com/presigned');
    expect(r2Service.resolveDownloadRedirectUrl).toHaveBeenCalledWith(
      'https://static.ojmultimedia.com/production-files/music/b/other/y.mp3',
      'Fallback Song.mp3'
    );
    expect(musicRepo.incrementMusicDownloads).toHaveBeenCalledWith(id);
  });

  it('returns 404 for incomplete published music on download', async () => {
    vi.mocked(musicRepo.findPublishedMusicByIdOrSlug).mockResolvedValue({
      _id: new mongoose.Types.ObjectId(),
      title: 'Song',
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
      title: 'Clip',
      videoFileUrl: 'https://cdn.example.com/video.mp4',
      videoUrl: 'https://cdn.example.com/video.mp4',
      isMonetizable: true,
      price: 1000,
    });

    await expect(
      downloadPublicVideo({ params: { idOrSlug: 'video-1' } } as never)
    ).rejects.toMatchObject({ statusCode: 403 });
  });

  it('redirects hosted video through attachment resolver', async () => {
    const id = new mongoose.Types.ObjectId();

    vi.mocked(videoRepo.findPublishedVideoByIdOrSlug).mockResolvedValue({
      _id: id,
      title: 'My Video',
      videoFileUrl: 'https://static.ojmultimedia.com/production-files/resource/v/other/z.mp4',
      videoUrl: '',
      isMonetizable: false,
    });

    const result = await downloadPublicVideo({ params: { idOrSlug: 'video-1' } } as never);

    expect(result.redirectUrl).toContain('r2.example.com/presigned');
    expect(videoRepo.incrementVideoDownloads).toHaveBeenCalledWith(id);
    expect(r2Service.resolveDownloadRedirectUrl).toHaveBeenCalledWith(
      'https://static.ojmultimedia.com/production-files/resource/v/other/z.mp4',
      'My Video.mp4'
    );
  });
});
