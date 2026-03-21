import mongoose, { Schema, model } from 'mongoose';
import type { ModelPoll } from '../lib/types/constants';

const pollOptionSchema = new Schema(
  {
    _id: { type: Schema.Types.ObjectId, auto: true },
    text: { type: String, required: true },
    votes: { type: Number, default: 0 },
  },
  { _id: true }
);

const pollSchema = new Schema<ModelPoll>(
  {
    question: { type: String, required: true, trim: true },
    slug: { type: String, required: true, lowercase: true, trim: true, index: true },
    description: { type: String, default: '' },
    category: { type: String, default: '', index: true },
    options: { type: [pollOptionSchema], required: true, minlength: 2 },
    status: {
      type: String,
      enum: ['active', 'closed'],
      default: 'active',
      index: true,
    },
    startDate: { type: Date, default: Date.now },
    endDate: { type: Date, default: null },
    totalVotes: { type: Number, default: 0 },
    closedReason: { type: String, default: '' },
    closedBy: { type: Schema.Types.ObjectId, ref: 'Admin', default: null },
  },
  { timestamps: true, collection: 'polls' }
);

pollSchema.index({ status: 1, createdAt: -1 });

export const Poll = mongoose.models.Poll || model<ModelPoll>('Poll', pollSchema);
