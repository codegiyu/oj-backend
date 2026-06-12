import type { PopulatedOrder } from '../lib/types/constants';

export function formatNaira(amount: number): string {
  return `₦${amount.toLocaleString('en-NG')}`;
}

function resolveVendorLabel(order: PopulatedOrder): string | undefined {
  const vendor = order.vendor;
  if (!vendor) return undefined;

  return vendor.storeName?.trim() || vendor.name?.trim() || undefined;
}

function formatOrderTimestamp(createdAt: Date | string | undefined): string {
  if (!createdAt) return '';

  const date = createdAt instanceof Date ? createdAt : new Date(createdAt);
  if (Number.isNaN(date.getTime())) return '';

  return date.toLocaleString('en-NG', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

export function formatMarketplaceOrderMessage(order: PopulatedOrder): string {
  const customer = order.customer;
  const items = order.items ?? [];
  const lines: string[] = [];

  lines.push('🛒 *New Order from OJ Multimedia Marketplace*', '');

  if (order.orderNumber) {
    lines.push(`*Order:* ${order.orderNumber}`);
  }

  const vendorLabel = resolveVendorLabel(order);
  if (vendorLabel) {
    lines.push(`*Vendor:* ${vendorLabel}`);
  }

  lines.push('', '*Customer Information:*');
  if (customer?.name) lines.push(`Name: ${customer.name}`);
  if (customer?.phone) lines.push(`Phone: ${customer.phone}`);
  if (customer?.email) lines.push(`Email: ${customer.email}`);

  if (customer?.address?.trim()) {
    lines.push('', '*Delivery Address:*', customer.address.trim());
  }

  lines.push('', '*Items:*');

  let computedTotal = 0;
  items.forEach((item, index) => {
    const name = item.productName?.trim() || item.product?.name?.trim() || 'Item';
    const qty = Number(item.quantity) || 0;
    const price = Number(item.price) || 0;
    const lineTotal = Number(item.totalPrice) || qty * price;
    computedTotal += lineTotal;

    lines.push(`${index + 1}. ${name}`);
    lines.push(`   Quantity: ${qty}`);
    lines.push(`   Price: ${formatNaira(price)} each`);
    lines.push(`   Subtotal: ${formatNaira(lineTotal)}`);

    if (item.sku?.trim()) {
      lines.push(`   SKU: ${item.sku.trim()}`);
    }

    lines.push('');
  });

  const totalAmount = Number(order.totalAmount) || computedTotal;
  lines.push('*Order Summary:*', `*Total: ${formatNaira(totalAmount)}*`);

  const notes = order.notes?.trim();
  if (notes) {
    lines.push('', '*Customer Notes:*', notes);
  }

  const placedAt = formatOrderTimestamp(order.createdAt);
  if (placedAt) {
    lines.push('', `_Order placed on ${placedAt}_`);
  }

  return lines
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function buildMarketplaceWhatsappLink(order: PopulatedOrder): {
  message: string;
  link?: string;
} {
  const message = formatMarketplaceOrderMessage(order);
  const whatsapp = order.vendor?.whatsapp?.trim();

  if (!whatsapp) {
    return { message };
  }

  const digits = whatsapp.replace(/\D/g, '');
  if (!digits.length) {
    return { message };
  }

  return {
    message,
    link: `https://wa.me/${digits}?text=${encodeURIComponent(message)}`,
  };
}
