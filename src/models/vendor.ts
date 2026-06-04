import { Schema, model } from 'mongoose';
import { ModelVendor } from '../lib/types/constants';

const vendorSchema = new Schema<ModelVendor>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    name: { type: String, required: true },
    slug: { type: String, required: true, unique: true, index: true },
    email: { type: String, required: true, index: true },
    phone: { type: String, required: true },
    storeName: { type: String, required: true },
    storeDescription: { type: String, default: '' },
    logo: { type: String, default: '' },
    coverImage: { type: String, default: '' },
    whatsapp: { type: String, default: '' },
    address: { type: String, default: '' },
    bankAccountName: { type: String, default: '' },
    bankAccountNumber: { type: String, default: '' },
    bankName: { type: String, default: '' },
    status: {
      type: String,
      enum: ['pending', 'active', 'suspended', 'inactive', 'deactivated'],
      default: 'pending',
    },
    suspensionReason: { type: String, default: '' },
    statusChangedAt: { type: Date, default: null },
    statusChangedBy: { type: Schema.Types.ObjectId, default: null },
    isVerified: { type: Boolean, default: false },
    rejectionReason: { type: String, default: '' },
    rejectedAt: { type: Date, default: null },
    rejectedBy: { type: Schema.Types.ObjectId, ref: 'Admin', default: null },
    approvedAt: { type: Date, default: null },
    approvedBy: { type: Schema.Types.ObjectId, ref: 'Admin', default: null },
  },
  { timestamps: true, collection: 'vendors' }
);

vendorSchema.index({ status: 1 });

export const Vendor = model<ModelVendor>('Vendor', vendorSchema);
