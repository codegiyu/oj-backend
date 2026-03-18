import mongoose, { Schema, model } from 'mongoose';
import type { ModelContactSubmission } from '../lib/types/constants';

const contactSubmissionSchema = new Schema<ModelContactSubmission>(
  {
    name: { type: String, required: true, trim: true, maxlength: 200 },
    phone: { type: String, required: true, trim: true, maxlength: 50 },
    email: { type: String, default: '', trim: true, lowercase: true, maxlength: 320 },
    subject: { type: String, required: true, trim: true, maxlength: 200 },
    message: { type: String, required: true, maxlength: 5000 },
  },
  { timestamps: true, collection: 'contactsubmissions' }
);

contactSubmissionSchema.index({ createdAt: -1 });

export const ContactSubmission =
  mongoose.models.ContactSubmission ||
  model<ModelContactSubmission>('ContactSubmission', contactSubmissionSchema);
