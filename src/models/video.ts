import { Schema, model } from 'mongoose';
import type { ModelVideo } from '../lib/types/constants';

const videoSchema = new Schema<ModelVideo>(
  {
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, lowercase: true, trim: true, index: true },
    artist: { type: Schema.Types.ObjectId, ref: 'Artist', default: null, index: true },
    description: { type: String, default: '' },
    thumbnail: { type: String, default: '' },
    videoUrl: { type: String, default: '' },
    videoFileUrl: { type: String, default: '' },
    embedUrl: { type: String, default: '' },
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
  { timestamps: true, collection: 'videos' }
);

videoSchema.index({ artist: 1, status: 1, createdAt: -1 });

export const Video = model<ModelVideo>('Video', videoSchema);
