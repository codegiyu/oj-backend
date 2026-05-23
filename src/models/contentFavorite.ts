import { Schema, model } from 'mongoose';

const contentFavoriteSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    entityType: {
      type: String,
      required: true,
      enum: ['music', 'video', 'news', 'devotional'],
      index: true,
    },
    entityId: { type: Schema.Types.ObjectId, required: true, index: true },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    collection: 'content_favorites',
  }
);

contentFavoriteSchema.index({ user: 1, entityType: 1, entityId: 1 }, { unique: true });
contentFavoriteSchema.index({ user: 1, createdAt: -1 });

export const ContentFavorite = model('ContentFavorite', contentFavoriteSchema);
