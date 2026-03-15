import mongoose, { Schema, model } from 'mongoose';
import type { ModelMusic } from '../lib/types/constants';

const musicSchema = new Schema<ModelMusic>(
  {
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, lowercase: true, trim: true, index: true },
    artist: { type: Schema.Types.ObjectId, ref: 'Artist', required: true, index: true },
    description: { type: String, default: '' },
    lyrics: { type: String, default: '' },
    coverImage: { type: String, default: '' },
    audioUrl: { type: String, default: '' },
    videoUrl: { type: String, default: '' },
    category: { type: String, default: '', index: true },
    status: {
      type: String,
      enum: ['draft', 'published', 'archived'],
      default: 'draft',
      index: true,
    },
    isFeatured: { type: Boolean, default: false, index: true },
    isMonetizable: { type: Boolean, default: false },
    displayOrder: { type: Number, default: 0, index: true },
    plays: { type: Number, default: 0 },
    downloads: { type: Number, default: 0 },
  },
  { timestamps: true, collection: 'music' }
);

musicSchema.index({ artist: 1, status: 1, createdAt: -1 });

export const Music =
  mongoose.models.Music || model<ModelMusic>('Music', musicSchema);

