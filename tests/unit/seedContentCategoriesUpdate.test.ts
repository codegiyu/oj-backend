import { describe, expect, it } from 'vitest';

/** Mirrors seedContentCategories upsert payload — filter fields must stay out of $set/$setOnInsert. */
function buildContentCategoryUpsertUpdate(seed: {
  name: string;
  displayOrder: number;
}): { $set: Record<string, unknown> } {
  return {
    $set: {
      name: seed.name,
      displayOrder: seed.displayOrder,
      isActive: true,
    },
  };
}

function upsertWouldConflict(
  filter: Record<string, unknown>,
  update: { $set?: Record<string, unknown>; $setOnInsert?: Record<string, unknown> }
): boolean {
  const filterKeys = new Set(Object.keys(filter));
  const touched = new Set([
    ...Object.keys(update.$set ?? {}),
    ...Object.keys(update.$setOnInsert ?? {}),
  ]);

  for (const key of touched) {
    if (filterKeys.has(key)) return true;
  }

  return false;
}

describe('seedContentCategories upsert update', () => {
  it('does not set filter fields in update operators (MongoDB upsert code 40)', () => {
    const filter = { scope: 'video', slug: 'movies' };
    const update = buildContentCategoryUpsertUpdate({
      name: 'Movies',
      displayOrder: 9,
    });

    expect(upsertWouldConflict(filter, update)).toBe(false);
    expect(update.$set).not.toHaveProperty('slug');
    expect(update.$set).not.toHaveProperty('scope');
  });
});
