import mongoose, { Schema, model } from 'mongoose';
import type { ModelAskPastorQuestion } from '../lib/types/constants';

const askPastorQuestionSchema = new Schema<ModelAskPastorQuestion>(
  {
    question: { type: String, required: true },
    slug: { type: String, required: true, lowercase: true, trim: true, index: true },
    author: { type: String, required: true, trim: true },
    email: { type: String, default: '' },
    category: { type: String, default: '', index: true },
    status: {
      type: String,
      enum: ['active', 'answered'],
      default: 'active',
      index: true,
    },
    answer: { type: String, default: '' },
    pastor: { type: Schema.Types.ObjectId, ref: 'Pastor', default: null, index: true },
    answeredAt: { type: Date, default: null },
    views: { type: Number, default: 0 },
    helpful: { type: Number, default: 0 },
    urgent: { type: Boolean, default: false },
    rejectionReason: { type: String, default: '' },
    rejectedAt: { type: Date, default: null },
    rejectedBy: { type: Schema.Types.ObjectId, ref: 'Admin', default: null },
  },
  { timestamps: true, collection: 'askpastorquestions' }
);

askPastorQuestionSchema.index({ status: 1, createdAt: -1 });
askPastorQuestionSchema.index({ status: 1, category: 1, createdAt: -1 });

export const AskPastorQuestion =
  mongoose.models.AskPastorQuestion ||
  model<ModelAskPastorQuestion>('AskPastorQuestion', askPastorQuestionSchema);
