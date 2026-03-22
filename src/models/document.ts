import {
  DOCUMENT_STATUSES,
  ENTITY_TYPES,
  ModelDocument,
  UPLOAD_INTENTS,
} from '../lib/types/constants';
import mongoose, { Schema, model } from 'mongoose';

export const DocumentSchema = new Schema<ModelDocument>(
  {
    entityType: {
      type: String,
      enum: ENTITY_TYPES,
      required: true,
      index: true,
    },
    entityId: { type: Schema.Types.ObjectId, required: true, index: true },
    intent: {
      type: String,
      enum: UPLOAD_INTENTS,
      required: true,
      index: true,
    },
    filename: { type: String, required: true },
    key: { type: String, required: true, unique: true, index: true },
    publicUrl: { type: String, required: true },
    uploadUrl: { type: String, required: true },
    fileExtension: { type: String, required: true, maxlength: 10 },
    contentType: { type: String, required: true, maxlength: 100 },
    status: {
      type: String,
      enum: DOCUMENT_STATUSES,
      default: 'pending',
      required: true,
      index: true,
    },
    uploadedAt: { type: Date },
    verifiedAt: { type: Date },
    expiresAt: { type: Date, required: true },
    size: { type: Number },
    metadata: { type: Schema.Types.Mixed },
    uploadedBy: { type: Schema.Types.ObjectId, refPath: 'uploadedByModel' },
    uploadedByModel: { type: String, enum: ['User', 'Admin'] },
    errorMessage: { type: String },
    isDeleted: { type: Boolean, default: false, index: true },
    deletedAt: { type: Date },
    deletedBy: { type: Schema.Types.ObjectId, ref: 'Admin' },
  },
  { timestamps: true }
);

DocumentSchema.index({ entityType: 1, entityId: 1, status: 1 });
DocumentSchema.index({ expiresAt: 1 });

// Exclude soft-deleted documents from queries by default
DocumentSchema.pre(/^find/, function () {
  this.find({ isDeleted: { $ne: true } });
});

export const Document =
  mongoose.models.Document || model<ModelDocument>('Document', DocumentSchema);
