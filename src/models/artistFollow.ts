import { Schema, model } from 'mongoose';
import type { ModelArtistFollow } from '../lib/types/constants';

const artistFollowSchema = new Schema<ModelArtistFollow>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    artist: {
      type: Schema.Types.ObjectId,
      ref: 'Artist',
      required: true,
      index: true,
    },
  },
  { timestamps: { createdAt: true, updatedAt: false }, collection: 'artist_follows' }
);

artistFollowSchema.index({ user: 1, artist: 1 }, { unique: true });
artistFollowSchema.index({ artist: 1, createdAt: -1 });
artistFollowSchema.index({ user: 1, createdAt: -1 });

export const ArtistFollow = model<ModelArtistFollow>('ArtistFollow', artistFollowSchema);
