import { describe, expect, it } from 'vitest';
import { shapeProductItem } from '../../src/controllers/admin/productAdmin.shapes';
import { shapeMarketplaceProductRow } from '../../src/utils/marketplaceProductShape';

describe('productAdmin.shapes', () => {
  it('shapeProductItem includes vendorSlug from populated vendor ref', () => {
    const shaped = shapeProductItem({
      _id: '507f1f77bcf86cd799439011',
      name: 'Sample Product',
      slug: 'sample-product',
      vendor: {
        _id: '507f1f77bcf86cd799439012',
        storeName: 'Ada Store',
        slug: 'ada-store',
      },
      price: 1000,
      status: 'published',
    });

    expect(shaped).toMatchObject({
      vendor: '507f1f77bcf86cd799439012',
      vendorName: 'Ada Store',
      vendorSlug: 'ada-store',
    });
  });
});

describe('marketplaceProductShape', () => {
  it('shapeMarketplaceProductRow always includes vendorWhatsapp', () => {
    const shaped = shapeMarketplaceProductRow({
      _id: '507f1f77bcf86cd799439011',
      name: 'Sample Product',
      slug: 'sample-product',
      vendor: {
        _id: '507f1f77bcf86cd799439012',
        storeName: 'Ada Store',
        slug: 'ada-store',
        whatsapp: '+2348000000000',
      },
    });

    expect(shaped).toMatchObject({
      vendor: '507f1f77bcf86cd799439012',
      vendorName: 'Ada Store',
      vendorSlug: 'ada-store',
      vendorWhatsapp: '+2348000000000',
    });
  });

  it('shapeMarketplaceProductRow sets vendorWhatsapp to null when missing', () => {
    const shaped = shapeMarketplaceProductRow({
      _id: '507f1f77bcf86cd799439011',
      name: 'Sample Product',
      slug: 'sample-product',
      vendor: {
        _id: '507f1f77bcf86cd799439012',
        storeName: 'Ada Store',
        slug: 'ada-store',
      },
    });

    expect(shaped.vendorWhatsapp).toBeNull();
  });
});
