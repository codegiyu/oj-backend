import { describe, expect, it } from 'vitest';
import {
  findVariantBySku,
  resolveProductLinePrice,
  assertProductAvailableForCart,
} from '../../src/utils/marketplaceProduct';

describe('marketplaceProduct utils', () => {
  const productWithVariants = {
    price: 100,
    inStock: true,
    variants: [
      {
        sku: 'RED-M',
        price: 120,
        inStock: true,
        options: { Colour: 'Red', Size: 'M' },
        isDefault: true,
      },
      {
        sku: 'BLUE-L',
        price: 130,
        inStock: false,
        options: { Colour: 'Blue', Size: 'L' },
        isDefault: false,
      },
    ],
  };

  it('findVariantBySku matches case-insensitively', () => {
    const variant = findVariantBySku(productWithVariants, 'red-m');
    expect(variant?.price).toBe(120);
    expect(variant?.inStock).toBe(true);
  });

  it('resolveProductLinePrice uses variant price when sku present', () => {
    expect(resolveProductLinePrice(productWithVariants, 'RED-M')).toBe(120);
    expect(resolveProductLinePrice(productWithVariants)).toBe(100);
  });

  it('assertProductAvailableForCart rejects out-of-stock variant', () => {
    expect(() => assertProductAvailableForCart(productWithVariants, 'BLUE-L')).toThrow(
      /not in stock/i
    );
  });

  it('assertProductAvailableForCart rejects simple product when inStock is false', () => {
    expect(() =>
      assertProductAvailableForCart({ inStock: false, variants: undefined }, undefined)
    ).toThrow(/not in stock/i);
  });
});
