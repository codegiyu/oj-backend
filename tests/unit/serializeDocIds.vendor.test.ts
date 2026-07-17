import mongoose from 'mongoose';
import { describe, expect, it } from 'vitest';
import { serializeDocIds } from '../../src/controllers/artist/artist.helpers';

describe('serializeDocIds vendor-shaped docs', () => {
  it('stringifies ObjectIds and ISO-formats vendor lifecycle dates', () => {
    const id = new mongoose.Types.ObjectId();
    const approvedBy = new mongoose.Types.ObjectId();
    const approvedAt = new Date('2026-03-01T12:00:00.000Z');

    const serialized = serializeDocIds({
      _id: id,
      storeName: 'Grace Store',
      status: 'active',
      approvedBy,
      approvedAt,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
    });

    expect(serialized._id).toBe(String(id));
    expect(serialized.approvedBy).toBe(String(approvedBy));
    expect(serialized.approvedAt).toBe('2026-03-01T12:00:00.000Z');
    expect(serialized.createdAt).toBe('2026-01-01T00:00:00.000Z');
  });
});
