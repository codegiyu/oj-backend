import { Schema, model } from 'mongoose';
import type { ModelMusic } from '../lib/types/constants';

const musicSchema = new Schema<ModelMusic>(
  {
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, lowercase: true, trim: true, index: true },
    artist: { type: Schema.Types.ObjectId, ref: 'Artist', default: null, index: true },
    album: { type: Schema.Types.ObjectId, ref: 'Album', default: null, index: true },
    description: { type: String, default: '' },
    lyrics: { type: String, default: '' },
    coverImage: { type: String, default: '' },
    audioUrl: { type: String, default: '' },
    videoUrl: { type: String, default: '' },
    downloadUrl: { type: String, default: '' },
    excerpt: { type: String, default: '' },
    category: { type: String, default: '', index: true },
    status: {
      type: String,
      enum: ['draft', 'published', 'archived'],
      default: 'draft',
      index: true,
    },
    isFeatured: { type: Boolean, default: false, index: true },
    isMonetizable: { type: Boolean, default: false },
    price: { type: Number, default: 0, min: 0 },
    displayOrder: { type: Number, default: 0, index: true },
    views: { type: Number, default: 0 },
    plays: { type: Number, default: 0 },
    downloads: { type: Number, default: 0 },
    // Moderation
    approvedAt: { type: Date, default: null },
    approvedBy: { type: Schema.Types.ObjectId, ref: 'Admin', default: null },
    rejectionReason: { type: String, default: '' },
    rejectedAt: { type: Date, default: null },
    rejectedBy: { type: Schema.Types.ObjectId, ref: 'Admin', default: null },
  },
  { timestamps: true, collection: 'music' }
);

musicSchema.index({ artist: 1, status: 1, createdAt: -1 });
musicSchema.index({ status: 1, category: 1, createdAt: -1 });
musicSchema.index({ album: 1, displayOrder: 1 });

export const Music = model<ModelMusic>('Music', musicSchema);
