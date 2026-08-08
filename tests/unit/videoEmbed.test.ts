import {
  isLikelyYoutubeUrl,
  parseYoutubeId,
  resolveVideoMediaFields,
  youtubeEmbedUrlFromInput,
} from '../../src/utils/videoEmbed';

const SAMPLE_ID = 'dQw4w9WgXcQ';

describe('parseYoutubeId', () => {
  it('parses watch, shorts, embed, and youtu.be URLs', () => {
    expect(parseYoutubeId(`https://www.youtube.com/watch?v=${SAMPLE_ID}`)).toBe(SAMPLE_ID);
    expect(parseYoutubeId(`https://youtu.be/${SAMPLE_ID}`)).toBe(SAMPLE_ID);
    expect(parseYoutubeId(`https://www.youtube.com/embed/${SAMPLE_ID}`)).toBe(SAMPLE_ID);
    expect(parseYoutubeId(`https://www.youtube.com/shorts/${SAMPLE_ID}`)).toBe(SAMPLE_ID);
  });

  it('parses live and music.youtube.com hosts', () => {
    expect(parseYoutubeId(`https://www.youtube.com/live/${SAMPLE_ID}`)).toBe(SAMPLE_ID);
    expect(parseYoutubeId(`https://music.youtube.com/watch?v=${SAMPLE_ID}`)).toBe(SAMPLE_ID);
  });

  it('rejects playlists, channels, and non-YouTube URLs', () => {
    expect(parseYoutubeId('https://www.youtube.com/playlist?list=PLxxxx')).toBeNull();
    expect(parseYoutubeId('https://www.youtube.com/@channel')).toBeNull();
    expect(parseYoutubeId('https://vimeo.com/123456')).toBeNull();
    expect(parseYoutubeId('https://cdn.example.com/video.mp4')).toBeNull();
  });
});

describe('youtubeEmbedUrlFromInput / isLikelyYoutubeUrl', () => {
  it('builds nocookie embed URLs for parseable ids', () => {
    expect(youtubeEmbedUrlFromInput(`https://youtu.be/${SAMPLE_ID}`)).toBe(
      `https://www.youtube-nocookie.com/embed/${SAMPLE_ID}`
    );
    expect(isLikelyYoutubeUrl(`https://youtu.be/${SAMPLE_ID}`)).toBe(true);
    expect(isLikelyYoutubeUrl('https://cdn.example.com/video.mp4')).toBe(false);
  });
});

describe('resolveVideoMediaFields', () => {
  it('keeps hosted file URLs in videoFileUrl', () => {
    const resolved = resolveVideoMediaFields({
      videoFileUrl: 'https://cdn.example.com/clip.mp4',
      embedUrl: '',
      videoUrl: '',
    });

    expect(resolved).toEqual({
      videoFileUrl: 'https://cdn.example.com/clip.mp4',
      embedUrl: '',
      videoUrl: 'https://cdn.example.com/clip.mp4',
    });
  });

  it('moves YouTube from videoFileUrl into embedUrl', () => {
    const yt = `https://www.youtube.com/watch?v=${SAMPLE_ID}`;
    const resolved = resolveVideoMediaFields({
      videoFileUrl: yt,
      embedUrl: '',
      videoUrl: '',
    });

    expect(resolved.videoFileUrl).toBe('');
    expect(resolved.embedUrl).toBe(yt);
    expect(resolved.videoUrl).toBe(yt);
  });

  it('prefers explicit embedUrl when videoFileUrl is also YouTube', () => {
    const preferred = `https://youtu.be/${SAMPLE_ID}`;
    const other = `https://www.youtube.com/watch?v=${SAMPLE_ID}`;
    const resolved = resolveVideoMediaFields({
      videoFileUrl: other,
      embedUrl: preferred,
      videoUrl: '',
    });

    expect(resolved.videoFileUrl).toBe('');
    expect(resolved.embedUrl).toBe(preferred);
  });

  it('splits legacy videoUrl YouTube into embedUrl', () => {
    const yt = `https://youtu.be/${SAMPLE_ID}`;
    const resolved = resolveVideoMediaFields({
      videoFileUrl: '',
      embedUrl: '',
      videoUrl: yt,
    });

    expect(resolved.videoFileUrl).toBe('');
    expect(resolved.embedUrl).toBe(yt);
    expect(resolved.videoUrl).toBe(yt);
  });

  it('uses legacy non-YouTube videoUrl as file when videoFileUrl empty', () => {
    const file = 'https://cdn.example.com/legacy.mp4';
    const resolved = resolveVideoMediaFields({
      videoFileUrl: '',
      embedUrl: '',
      videoUrl: file,
    });

    expect(resolved.videoFileUrl).toBe(file);
    expect(resolved.embedUrl).toBe('');
    expect(resolved.videoUrl).toBe(file);
  });
});
