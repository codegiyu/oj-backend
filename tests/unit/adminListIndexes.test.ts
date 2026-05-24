/* eslint-disable @typescript-eslint/no-unsafe-argument */
import { describe, expect, it } from 'vitest';
import { Music } from '../../src/models/music';
import { Video } from '../../src/models/video';
import { NewsArticle } from '../../src/models/newsArticle';
import { EmailLog } from '../../src/models/emailLog';
import { Document } from '../../src/models/document';
import { Product } from '../../src/models/product';
import { Order } from '../../src/models/order';

function indexKeys(schema: { indexes: () => Array<unknown> }): string[] {
  return schema.indexes().map(spec => JSON.stringify(spec));
}

function hasIndexContaining(schema: { indexes: () => Array<unknown> }, fragment: string): boolean {
  return indexKeys(schema).some(key => key.includes(fragment));
}

describe('admin list compound indexes', () => {
  it('indexes music for status + category + createdAt lists', () => {
    expect(hasIndexContaining(Music.schema, '"status":1')).toBe(true);
    expect(hasIndexContaining(Music.schema, '"category":1')).toBe(true);
    expect(hasIndexContaining(Music.schema, '"createdAt":-1')).toBe(true);
  });

  it('indexes video for status + category + createdAt lists', () => {
    expect(hasIndexContaining(Video.schema, '"status":1')).toBe(true);
    expect(hasIndexContaining(Video.schema, '"category":1')).toBe(true);
  });

  it('indexes news for status + category + createdAt lists', () => {
    expect(hasIndexContaining(NewsArticle.schema, '"status":1')).toBe(true);
    expect(hasIndexContaining(NewsArticle.schema, '"category":1')).toBe(true);
  });

  it('indexes email logs for status + createdAt lists', () => {
    expect(hasIndexContaining(EmailLog.schema, '"status":1')).toBe(true);
    expect(hasIndexContaining(EmailLog.schema, '"createdAt":-1')).toBe(true);
  });

  it('indexes documents for entityType + status + createdAt lists', () => {
    expect(hasIndexContaining(Document.schema, '"entityType":1')).toBe(true);
    expect(hasIndexContaining(Document.schema, '"status":1')).toBe(true);
  });

  it('indexes marketplace products and orders for vendor-scoped lists', () => {
    expect(hasIndexContaining(Product.schema, '"vendor":1')).toBe(true);
    expect(hasIndexContaining(Order.schema, '"vendor":1')).toBe(true);
    expect(hasIndexContaining(Order.schema, '"customerId":1')).toBe(true);
  });
});
