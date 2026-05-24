import { describe, expect, it } from 'vitest';
import { HomeAdvert } from '../../src/models/homeAdvert';

describe('HomeAdvert model', () => {
  it('allows empty imageUrl for create-then-upload flow', () => {
    const doc = new HomeAdvert({
      slot: 'after_hero',
      imageUrl: '',
      linkUrl: '',
      displayOrder: 0,
      isActive: true,
    });

    expect(doc.validateSync()).toBeUndefined();
  });

  it('requires slot', () => {
    const doc = new HomeAdvert({
      imageUrl: 'https://cdn.example/ad.jpg',
    });

    const err = doc.validateSync();
    expect(err?.errors.slot).toBeDefined();
  });
});
