import mongoose, { Schema, model } from 'mongoose';
import { ModelOrder } from '../lib/types/constants';

const orderItemSchema = new Schema(
  {
    product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    productName: { type: String },
    quantity: { type: Number, required: true },
    price: { type: Number, required: true },
    totalPrice: { type: Number, required: true },
    sku: { type: String },
    selectedOptions: { type: Schema.Types.Mixed },
  },
  { _id: false }
);

const orderSchema = new Schema<ModelOrder>(
  {
    orderNumber: { type: String, required: true, unique: true, index: true },
    customer: {
      name: { type: String, required: true },
      email: { type: String, required: true },
      phone: { type: String, required: true },
      address: { type: String, default: '' },
    },
    customerId: { type: Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    vendor: { type: Schema.Types.ObjectId, ref: 'Vendor', required: true, index: true },
    items: { type: [orderItemSchema], required: true },
    totalAmount: { type: Number, required: true },
    status: { type: String, required: true, default: 'pending', index: true },
    paymentStatus: { type: String, required: true, default: 'pending', index: true },
  },
  { timestamps: true, collection: 'orders' }
);

orderSchema.index({ vendor: 1, createdAt: -1 });

export const Order =
  mongoose.models.Order || model<ModelOrder>('Order', orderSchema);
