import { describe, expect, it } from 'vitest';
import { shapeVideoItem } from '../../src/services/adminVideo.service';

describe('adminVideo.service shapeVideoItem', () => {
  it('includes metadata and tags in admin video responses', () => {
    const shaped = shapeVideoItem({
      _id: 'vid1',
      title: 'Sample',
      slug: 'sample',
      status: 'published',
      category: 'music',
      tags: ['live'],
      metadata: { durationSeconds: 125 },
    });

    expect(shaped.tags).toEqual(['live']);
    expect(shaped.metadata).toEqual({ durationSeconds: 125 });
  });

  it('defaults metadata and tags when absent', () => {
    const shaped = shapeVideoItem({
      _id: 'vid2',
      title: 'No meta',
      slug: 'no-meta',
      status: 'draft',
      category: 'short',
    });

    expect(shaped.tags).toEqual([]);
    expect(shaped.metadata).toEqual({});
  });
});
