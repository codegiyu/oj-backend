import { describe, expect, it } from 'vitest';
import mongoose from 'mongoose';
import {
  rankRelatedProducts,
  scoreRelatedProduct,
  type RelatedProductCandidate,
  type RelatedProductScoreInput,
} from '../../src/services/relatedProducts.service';

const sourceId = new mongoose.Types.ObjectId();
const vendorId = new mongoose.Types.ObjectId();
const categoryId = new mongoose.Types.ObjectId();
const subCategoryId = new mongoose.Types.ObjectId();

const source: RelatedProductScoreInput = {
  _id: sourceId,
  name: 'Blue Denim Jacket',
  price: 15000,
  vendor: vendorId,
  category: categoryId,
  subCategory: subCategoryId,
  tags: ['fashion', 'jacket'],
};

function candidate(
  overrides: Partial<RelatedProductCandidate> & Pick<RelatedProductCandidate, '_id' | 'name'>
): RelatedProductCandidate {
  return {
    slug: overrides.name.toLowerCase().replace(/\s+/g, '-'),
    price: 14000,
    vendor: vendorId,
    category: categoryId,
    subCategory: subCategoryId,
    tags: ['fashion'],
    ...overrides,
  };
}

describe('relatedProducts.service', () => {
  it('scores higher for same subcategory and shared tags', () => {
    const strong = candidate({ _id: new mongoose.Types.ObjectId(), name: 'Denim Coat' });
    const weak = candidate({
      _id: new mongoose.Types.ObjectId(),
      name: 'Phone Case',
      subCategory: new mongoose.Types.ObjectId(),
      category: new mongoose.Types.ObjectId(),
      vendor: new mongoose.Types.ObjectId(),
      tags: ['electronics'],
      price: 50000,
    });

    expect(scoreRelatedProduct(source, strong)).toBeGreaterThan(scoreRelatedProduct(source, weak));
  });

  it('ranks related products by score and excludes zero-score items', () => {
    const related = candidate({ _id: new mongoose.Types.ObjectId(), name: 'Denim Shirt' });
    const unrelated = candidate({
      _id: new mongoose.Types.ObjectId(),
      name: 'Laptop Stand',
      subCategory: new mongoose.Types.ObjectId(),
      category: new mongoose.Types.ObjectId(),
      vendor: new mongoose.Types.ObjectId(),
      tags: [],
      price: 90000,
    });

    const ranked = rankRelatedProducts(source, [unrelated, related], 4);

    expect(ranked).toHaveLength(1);
    expect(String(ranked[0]._id)).toBe(String(related._id));
  });

  it('returns negative score for the source product itself', () => {
    const self = candidate({ _id: sourceId, name: source.name });

    expect(scoreRelatedProduct(source, self)).toBe(-1);
  });
});
