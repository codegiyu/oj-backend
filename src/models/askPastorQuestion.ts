import { Schema, model } from 'mongoose';
import type { ModelAskPastorQuestion } from '../lib/types/constants';

const askPastorAnswerSchema = new Schema(
  {
    pastor: { type: Schema.Types.ObjectId, ref: 'Pastor', required: true },
    answer: { type: String, required: true },
    answeredAt: { type: Date, default: Date.now },
    likes: { type: Number, default: 0 },
  },
  { _id: true }
);

const askPastorQuestionSchema = new Schema<ModelAskPastorQuestion>(
  {
    question: { type: String, required: true },
    slug: { type: String, required: true, lowercase: true, trim: true, index: true },
    author: { type: String, required: true, trim: true },
    submittedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    email: { type: String, default: '' },
    category: { type: String, default: '', index: true },
    status: {
      type: String,
      enum: ['active', 'answered', 'closed'],
      default: 'active',
      index: true,
    },
    answer: { type: String, default: '' },
    pastor: { type: Schema.Types.ObjectId, ref: 'Pastor', default: null, index: true },
    answeredAt: { type: Date, default: null },
    requestedPastor: { type: Schema.Types.ObjectId, ref: 'Pastor', default: null, index: true },
    isPrivate: { type: Boolean, default: false, index: true },
    upvotes: { type: Number, default: 0 },
    downvotes: { type: Number, default: 0 },
    closedAt: { type: Date, default: null },
    closedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    answers: { type: [askPastorAnswerSchema], default: [] },
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
askPastorQuestionSchema.index({ isPrivate: 1, status: 1, createdAt: -1 });

export const AskPastorQuestion = model<ModelAskPastorQuestion>(
  'AskPastorQuestion',
  askPastorQuestionSchema
);
