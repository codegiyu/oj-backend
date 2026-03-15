import mongoose, { Schema, model } from 'mongoose';
import type { ModelNewsArticle } from '../lib/types/constants';

const newsArticleSchema = new Schema<ModelNewsArticle>(
  {
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, lowercase: true, trim: true, index: true },
    content: { type: String, default: '' },
    excerpt: { type: String, default: '' },
    coverImage: { type: String, default: '' },
    images: { type: [String], default: [] },
    category: { type: String, default: '', index: true },
    author: { type: String, default: '' },
    status: {
      type: String,
      enum: ['draft', 'published', 'archived'],
      default: 'draft',
      index: true,
    },
    isFeatured: { type: Boolean, default: false, index: true },
    displayOrder: { type: Number, default: 0, index: true },
    views: { type: Number, default: 0 },
    hasVideo: { type: Boolean, default: false, index: true },
  },
  { timestamps: true, collection: 'newsarticles' }
);

newsArticleSchema.index({ status: 1, createdAt: -1 });
newsArticleSchema.index({ status: 1, isFeatured: 1 });

export const NewsArticle =
  mongoose.models.NewsArticle || model<ModelNewsArticle>('NewsArticle', newsArticleSchema);
