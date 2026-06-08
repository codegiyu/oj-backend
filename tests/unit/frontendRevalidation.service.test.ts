import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import {
  frontendPathsForContent,
  requestFrontendRevalidation,
} from '../../src/services/frontendRevalidation.service';

describe('frontendRevalidation.service', () => {
  beforeEach(() => {
    vi.stubEnv('FRONTEND_REVALIDATION_URL', 'http://localhost:3000/api/revalidate');
    vi.stubEnv('FRONTEND_REVALIDATION_SECRET', 'backend-secret');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true }));
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('builds music publish paths', () => {
    expect(frontendPathsForContent('music_item', 'abc')).toEqual(['/', '/music', '/music/abc']);
  });

  it('posts deduplicated paths to the frontend revalidation endpoint', async () => {
    await requestFrontendRevalidation(['/music', '/music', '/news']);

    expect(fetch).toHaveBeenCalledWith(
      'http://localhost:3000/api/revalidate',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'x-revalidate-secret': 'backend-secret',
        }),
        body: JSON.stringify({ paths: ['/music', '/news'] }),
      })
    );
  });

  it('accepts REVALIDATION_SECRET as an alias for the webhook secret', async () => {
    vi.stubEnv('FRONTEND_REVALIDATION_SECRET', '');
    vi.stubEnv('REVALIDATION_SECRET', 'canonical-secret');

    await requestFrontendRevalidation(['/music']);

    expect(fetch).toHaveBeenCalledWith(
      'http://localhost:3000/api/revalidate',
      expect.objectContaining({
        headers: expect.objectContaining({
          'x-revalidate-secret': 'canonical-secret',
        }),
      })
    );
  });

  it('no-ops when frontend revalidation env is missing', async () => {
    vi.stubEnv('FRONTEND_REVALIDATION_URL', '');
    await requestFrontendRevalidation(['/music']);
    expect(fetch).not.toHaveBeenCalled();
  });
});
