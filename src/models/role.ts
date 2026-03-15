import mongoose, { Schema, model } from 'mongoose';
import { ROLE_SLUGS, ModelRole } from '../lib/types/constants';

const roleSchema = new Schema<ModelRole>(
  {
    name: { type: String, required: true, unique: true },
    description: { type: String, required: true },
    slug: { type: String, enum: ROLE_SLUGS, required: true, unique: true },
    permissions: {
      type: [
        {
          _id: false,
          slug: { type: String, required: true },
          name: { type: String, required: true },
          description: { type: String, required: true },
          isRestricted: { type: Boolean },
        },
      ],
      default: [],
    },
  },
  { timestamps: true, collection: 'roles' }
);

export const Role = mongoose.models.Role || model<ModelRole>('Role', roleSchema);
