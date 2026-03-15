import mongoose, { Schema, model } from 'mongoose';

const wishlistSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    product: { type: Schema.Types.ObjectId, ref: 'Product', required: true, index: true },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    collection: 'wishlists',
  }
);

wishlistSchema.index({ user: 1, product: 1 }, { unique: true });

export const Wishlist =
  mongoose.models.Wishlist || model('Wishlist', wishlistSchema);

