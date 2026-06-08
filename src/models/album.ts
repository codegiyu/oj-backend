import mongoose, { Schema, model } from 'mongoose';
import type { ModelAlbum } from '../lib/types/constants';

const albumSchema = new Schema<ModelAlbum>(
  {
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, lowercase: true, trim: true, index: true },
    artist: { type: Schema.Types.ObjectId, ref: 'Artist', default: null, index: true },
    description: { type: String, default: '' },
    excerpt: { type: String, default: '' },
    coverImage: { type: String, default: '' },
    releaseDate: { type: Date, default: null },
    status: {
      type: String,
      enum: ['draft', 'published', 'archived'],
      default: 'draft',
      index: true,
    },
    isFeatured: { type: Boolean, default: false, index: true },
    displayOrder: { type: Number, default: 0, index: true },
    views: { type: Number, default: 0 },
    plays: { type: Number, default: 0 },
  },
  { timestamps: true, collection: 'albums' }
);

albumSchema.index({ artist: 1, status: 1, createdAt: -1 });
albumSchema.index({ slug: 1, artist: 1 }, { unique: true });
albumSchema.index({ title: 'text', description: 'text', excerpt: 'text' });

export const Album: mongoose.Model<ModelAlbum> = model<ModelAlbum>('Album', albumSchema);
