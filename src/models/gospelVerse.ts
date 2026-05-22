import { Schema, model } from 'mongoose';
import type { ModelGospelVerse } from '../lib/types/constants';

const gospelVerseSchema = new Schema<ModelGospelVerse>(
  {
    verse: { type: String, required: true, trim: true },
    reference: { type: String, required: true, trim: true, index: true },
    date: { type: Date, required: true, index: true },
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true, collection: 'gospel_verses' }
);

gospelVerseSchema.index({ isActive: 1, date: -1 });
gospelVerseSchema.index({ reference: 'text', verse: 'text' });

export const GospelVerse = model<ModelGospelVerse>('GospelVerse', gospelVerseSchema);
