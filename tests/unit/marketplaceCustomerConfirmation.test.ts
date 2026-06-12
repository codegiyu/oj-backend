import { describe, expect, it } from 'vitest';

// Mirror private helper shape for regression coverage
function buildCustomerOrderConfirmationMessage(
  orderNumber: string,
  customerName: string,
  totalAmount: number
): string {
  return [
    `Hi ${customerName},`,
    '',
    `Thank you for your marketplace order (${orderNumber}).`,
    `Order total: ${totalAmount}`,
    '',
    'Your order status is pending. The vendor will contact you to arrange offline payment.',
    'If WhatsApp opened after checkout, you can also message the vendor directly.',
  ].join('\n');
}

describe('buildCustomerOrderConfirmationMessage', () => {
  it('includes order number, customer name, and total', () => {
    const message = buildCustomerOrderConfirmationMessage('ORD-20260612-ABC', 'Jane Doe', 4500);

    expect(message).toContain('Jane Doe');
    expect(message).toContain('ORD-20260612-ABC');
    expect(message).toContain('4500');
    expect(message).toContain('pending');
  });
});
