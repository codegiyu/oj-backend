import mongoose, { Schema, model } from 'mongoose';
import { IArtist, ArtistSocials } from '../lib/types/constants';

const socialsSchema = new Schema<ArtistSocials>(
  {
    facebook: { type: String, default: '' },
    instagram: { type: String, default: '' },
    twitter: { type: String, default: '' },
    youtube: { type: String, default: '' },
    website: { type: String, default: '' },
  },
  { _id: false }
);

const artistSchema = new Schema<IArtist>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    bio: { type: String, default: '' },
    image: { type: String, default: '' },
    coverImage: { type: String, default: '' },
    genre: { type: String, default: '', index: true },
    socials: { type: socialsSchema, default: () => ({}) },
    isFeatured: { type: Boolean, default: false, index: true },
    isActive: { type: Boolean, default: true, index: true },
    displayOrder: { type: Number, default: 0, index: true },
  },
  { timestamps: true, collection: 'artists' }
);

artistSchema.index({ isActive: 1, isFeatured: 1, displayOrder: 1 });
artistSchema.index({ user: 1 }, { sparse: true });

export const Artist =
  mongoose.models.Artist || model<IArtist>('Artist', artistSchema);
