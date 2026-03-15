import { EMAIL_STATUSES, ModelEmailLog } from '../lib/types/constants';
import mongoose, { Schema, model } from 'mongoose';

export const EmailLogSchema = new Schema<ModelEmailLog>(
  {
    jobId: { type: String, required: true, index: true },
    type: { type: String, required: true, index: true },
    to: { type: String, required: true, index: true },
    from: { type: String, required: true },
    subject: { type: String, required: true },
    status: {
      type: String,
      enum: EMAIL_STATUSES,
      default: 'pending',
      index: true,
    },
    messageId: { type: String, sparse: true },
    provider: { type: String, default: 'smtp' },
    error: { type: String },
    retryCount: { type: Number, default: 0 },
    htmlContent: { type: String },
    sentAt: { type: Date },
    deliveredAt: { type: Date },
    openedAt: { type: Date },
    clickedAt: { type: Date },
    metadata: { type: Schema.Types.Mixed },
  },
  { timestamps: true }
);

export const EmailLog =
  mongoose.models.EmailLog || model<ModelEmailLog>('EmailLog', EmailLogSchema);
