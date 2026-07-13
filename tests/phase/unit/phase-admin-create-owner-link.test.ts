import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('phase admin create owner link', () => {
  it('admin artist create accepts optional ownerUserId', () => {
    const src = readFileSync(
      join(process.cwd(), 'src/controllers/admin/artistAdmin.controller.ts'),
      'utf8'
    );

    expect(src).toContain('ownerUserId?: string');
    expect(src).toContain("$set: { artistId: artist._id }");
  });

  it('admin vendor create accepts optional ownerUserId', () => {
    const src = readFileSync(
      join(process.cwd(), 'src/controllers/admin/vendorAdmin.controller.ts'),
      'utf8'
    );

    expect(src).toContain('ownerUserId?: string');
    expect(src).toContain("$set: { vendorId: vendor._id }");
  });
});
