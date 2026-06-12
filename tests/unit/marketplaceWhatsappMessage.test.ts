import { describe, expect, it } from 'vitest';
import mongoose from 'mongoose';
import type { PopulatedOrder } from '../../src/lib/types/constants';
import {
  buildMarketplaceWhatsappLink,
  formatMarketplaceOrderMessage,
  formatNaira,
} from '../../src/utils/marketplaceWhatsappMessage';

function buildSampleOrder(overrides: Partial<PopulatedOrder> = {}): PopulatedOrder {
  return {
    _id: new mongoose.Types.ObjectId(),
    orderNumber: 'ORD-20260612-ABC123',
    customer: {
      name: 'Jane Doe',
      email: 'jane@example.com',
      phone: '+2348031234567',
      address: '12 Main St, Lagos',
    },
    status: 'pending',
    paymentStatus: 'pending',
    createdAt: new Date('2026-06-12T16:30:00.000Z'),
    updatedAt: new Date('2026-06-12T16:30:00.000Z'),
    vendor: {
      _id: new mongoose.Types.ObjectId(),
      storeName: 'Grace Fashion Co',
      whatsapp: '+234 913 667 0466',
    },
    items: [
      {
        product: {
          _id: new mongoose.Types.ObjectId(),
          name: 'Modest Dress',
        },
        productName: 'Modest Dress',
        quantity: 2,
        price: 5000,
        totalPrice: 10000,
        sku: 'DRESS-L',
      },
    ],
    totalAmount: 10000,
    notes: 'Please call before delivery',
    ...overrides,
  } as PopulatedOrder;
}

describe('formatNaira', () => {
  it('formats amounts with naira symbol', () => {
    expect(formatNaira(10000)).toBe('₦10,000');
  });
});

describe('formatMarketplaceOrderMessage', () => {
  it('includes customer, vendor, items, notes, and formatted currency', () => {
    const message = formatMarketplaceOrderMessage(buildSampleOrder());

    expect(message).toContain('*New Order from OJ Multimedia Marketplace*');
    expect(message).toContain('*Order:* ORD-20260612-ABC123');
    expect(message).toContain('*Vendor:* Grace Fashion Co');
    expect(message).toContain('Name: Jane Doe');
    expect(message).toContain('*Delivery Address:*');
    expect(message).toContain('12 Main St, Lagos');
    expect(message).toContain('Modest Dress');
    expect(message).toContain('SKU: DRESS-L');
    expect(message).toContain('₦5,000 each');
    expect(message).toContain('*Total: ₦10,000*');
    expect(message).toContain('*Customer Notes:*');
    expect(message).toContain('Please call before delivery');
    expect(message).toContain('_Order placed on');
  });

  it('omits notes section when notes are empty', () => {
    const message = formatMarketplaceOrderMessage(buildSampleOrder({ notes: '' }));

    expect(message).not.toContain('*Customer Notes:*');
  });
});

describe('buildMarketplaceWhatsappLink', () => {
  it('returns wa.me link with encoded message when vendor has whatsapp', () => {
    const { message, link } = buildMarketplaceWhatsappLink(buildSampleOrder());

    expect(message).toContain('Grace Fashion Co');
    expect(link).toMatch(/^https:\/\/wa\.me\/2349136670466\?text=/);
    expect(decodeURIComponent(link!.split('?text=')[1] ?? '')).toBe(message);
  });

  it('returns message only when vendor whatsapp is missing', () => {
    const order = buildSampleOrder({
      vendor: {
        _id: new mongoose.Types.ObjectId(),
        storeName: 'No WhatsApp Vendor',
      },
    });

    const { message, link } = buildMarketplaceWhatsappLink(order);

    expect(message).toContain('No WhatsApp Vendor');
    expect(link).toBeUndefined();
  });
});
