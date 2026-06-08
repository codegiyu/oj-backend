import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { ensureSearchTextIndexes } from '../../../src/seed/ensureSearchTextIndexes';

describe('Phase 17 contract — search text indexes', () => {
  it('exports ensureSearchTextIndexes migration entrypoint', () => {
    expect(typeof ensureSearchTextIndexes).toBe('function');
  });

  it('declares text indexes on all searchable collections', () => {
    const modelFiles = [
      'music.ts',
      'album.ts',
      'newsArticle.ts',
      'video.ts',
      'devotional.ts',
      'testimony.ts',
      'prayerRequest.ts',
      'askPastorQuestion.ts',
      'poll.ts',
      'artist.ts',
      'resource.ts',
    ];

    for (const file of modelFiles) {
      const source = readFileSync(join(process.cwd(), 'src', 'models', file), 'utf8');
      expect(source).toMatch(/index\(\{[^}]*'text'/);
    }
  });

  it('routes search through mergeSearchIntoFilter helper', () => {
    const service = readFileSync(
      join(process.cwd(), 'src', 'services', 'publicSearch.service.ts'),
      'utf8'
    );

    expect(service).toContain('mergeSearchIntoFilter');
    expect(service).not.toContain('$regex');
  });
});
