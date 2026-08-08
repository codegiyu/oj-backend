import { resolveVideoMediaFields, youtubeEmbedUrlFromInput } from '../../../src/utils/videoEmbed';

describe('phaseA artist video detail media fields', () => {
  it('resolves YouTube-in-file into embed fields for detail round-trip', () => {
    const yt = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
    const resolved = resolveVideoMediaFields({
      videoFileUrl: yt,
      embedUrl: '',
      videoUrl: yt,
    });

    expect(resolved.videoFileUrl).toBe('');
    expect(resolved.embedUrl).toBe(yt);
    expect(youtubeEmbedUrlFromInput(resolved.embedUrl)).toBe(
      'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ'
    );
  });
});
