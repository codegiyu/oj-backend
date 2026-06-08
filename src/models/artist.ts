import { Schema, model } from 'mongoose';
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
    isRising: { type: Boolean, default: false, index: true },
    isMusicFeatured: { type: Boolean, default: false, index: true },
    isCreatorSpotlight: { type: Boolean, default: false, index: true },
    isActive: { type: Boolean, default: true, index: true },
    profileStatus: {
      type: String,
      enum: ['active', 'deactivated', 'suspended'],
      default: 'active',
      index: true,
    },
    suspensionReason: { type: String, default: '' },
    statusChangedAt: { type: Date, default: null },
    statusChangedBy: { type: Schema.Types.ObjectId, default: null },
    displayOrder: { type: Number, default: 0, index: true },
    risingArtistDisplayOrder: { type: Number, default: 0, index: true },
    musicFeaturedDisplayOrder: { type: Number, default: 0, index: true },
    creatorSpotlightDisplayOrder: { type: Number, default: 0, index: true },
    followerCount: { type: Number, default: 0, index: true },
  },
  { timestamps: true, collection: 'artists' }
);

artistSchema.index({ isActive: 1, isFeatured: 1, displayOrder: 1 });
artistSchema.index({ isActive: 1, isRising: 1, risingArtistDisplayOrder: 1 });
artistSchema.index({ isActive: 1, isMusicFeatured: 1, musicFeaturedDisplayOrder: 1 });
artistSchema.index({ isActive: 1, isCreatorSpotlight: 1, creatorSpotlightDisplayOrder: 1 });
artistSchema.index({ user: 1 }, { sparse: true });
artistSchema.index({ name: 'text', genre: 'text', bio: 'text' });

export const Artist = model<IArtist>('Artist', artistSchema);
