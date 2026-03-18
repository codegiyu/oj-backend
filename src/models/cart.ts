import mongoose, { Schema, model } from 'mongoose';
import type { ModelCart } from '../lib/types/constants';

const cartItemSchema = new Schema(
  {
    product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    quantity: { type: Number, required: true, min: 1 },
    sku: { type: String },
  },
  { _id: false }
);

const cartSchema = new Schema<ModelCart>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },
    items: { type: [cartItemSchema], default: [] },
  },
  { timestamps: true, collection: 'carts' }
);

cartSchema.index({ user: 1 });

export const Cart = mongoose.models.Cart || model<ModelCart>('Cart', cartSchema);

