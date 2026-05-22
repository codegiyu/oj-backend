import { describe, expect, it } from 'vitest';
import { shapeGospelVerseItem } from '../../src/controllers/admin/gospelVerseAdmin.controller';

describe('gospelVerseAdmin.controller', () => {
  it('shapeGospelVerseItem serializes dates and ids', () => {
    const shaped = shapeGospelVerseItem({
      _id: '507f1f77bcf86cd799439011',
      verse: 'For God so loved the world.',
      reference: 'John 3:16',
      date: new Date('2026-05-22T12:00:00.000Z'),
      isActive: true,
      createdAt: new Date('2026-05-20T12:00:00.000Z'),
      updatedAt: new Date('2026-05-21T12:00:00.000Z'),
    });

    expect(shaped).toMatchObject({
      _id: '507f1f77bcf86cd799439011',
      verse: 'For God so loved the world.',
      reference: 'John 3:16',
      date: '2026-05-22T12:00:00.000Z',
      isActive: true,
    });
  });
});
