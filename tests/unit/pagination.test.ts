import { describe, expect, it } from 'vitest';
import {
  PUBLIC_CATALOG_MAX_ITEMS,
  clampPublicCatalogLimit,
} from '../../src/constants/pagination';

describe('clampPublicCatalogLimit', () => {
  it('defaults to the public catalog max', () => {
    expect(clampPublicCatalogLimit()).toBe(PUBLIC_CATALOG_MAX_ITEMS);
    expect(clampPublicCatalogLimit(undefined)).toBe(PUBLIC_CATALOG_MAX_ITEMS);
  });

  it('clamps values above the max', () => {
    expect(clampPublicCatalogLimit(500)).toBe(PUBLIC_CATALOG_MAX_ITEMS);
  });

  it('returns positive values below the max', () => {
    expect(clampPublicCatalogLimit(25)).toBe(25);
  });

  it('falls back to max for non-positive values', () => {
    expect(clampPublicCatalogLimit(0)).toBe(PUBLIC_CATALOG_MAX_ITEMS);
    expect(clampPublicCatalogLimit(-3)).toBe(PUBLIC_CATALOG_MAX_ITEMS);
  });
});
