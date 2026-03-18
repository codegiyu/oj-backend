import mongoose, { Schema, model } from 'mongoose';
import type { ModelPollVote } from '../lib/types/constants';

const pollVoteSchema = new Schema<ModelPollVote>(
  {
    poll: { type: Schema.Types.ObjectId, ref: 'Poll', required: true, index: true },
    optionId: { type: Schema.Types.ObjectId, required: true },
    voterIdentifier: { type: String, required: true, index: true },
  },
  { timestamps: true, collection: 'pollvotes' }
);

pollVoteSchema.index({ poll: 1, voterIdentifier: 1 }, { unique: true });

export const PollVote =
  mongoose.models.PollVote || model<ModelPollVote>('PollVote', pollVoteSchema);
