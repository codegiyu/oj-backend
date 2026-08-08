import { shapeVideoDetail } from '../../../src/services/publicMedia.shaping';
import { isCompleteVideo } from '../../../src/utils/contentCompleteness';
describe('phase1 video media shaping and completeness', () => {
  it('shapeVideoDetail remaps YouTube stored only in videoFileUrl to embed playback', () => {
    const yt = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
    const shaped = shapeVideoDetail({
      _id: 'vid-yt',
      title: 'YT Clip',
      slug: 'yt-clip',
      videoFileUrl: yt,
      embedUrl: '',
      videoUrl: yt,
    });

    expect(shaped.videoFileUrl).toBe('');
    expect(shaped.embedUrl).toBe(yt);
    expect(shaped.youtubeEmbedUrl).toBe('https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ');
  });

  it('treats YouTube-in-file-field and parseable embeds as complete; rejects Vimeo-only', () => {
    expect(isCompleteVideo({ videoFileUrl: 'https://cdn/v.mp4' })).toBe(true);
    expect(isCompleteVideo({ embedUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' })).toBe(true);
    expect(isCompleteVideo({ videoFileUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' })).toBe(
      true
    );
    expect(isCompleteVideo({ embedUrl: 'https://vimeo.com/123' })).toBe(false);
    expect(isCompleteVideo({ videoUrl: '', videoFileUrl: '', embedUrl: '' })).toBe(false);
  });
});
