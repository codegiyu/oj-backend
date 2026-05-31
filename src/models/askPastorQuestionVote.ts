import { Schema, model } from 'mongoose';
import type { ModelAskPastorQuestionVote } from '../lib/types/constants';

const askPastorQuestionVoteSchema = new Schema<ModelAskPastorQuestionVote>(
  {
    question: {
      type: Schema.Types.ObjectId,
      ref: 'AskPastorQuestion',
      required: true,
      index: true,
    },
    voterIdentifier: { type: String, required: true, index: true },
    direction: { type: String, enum: ['up', 'down'], required: true },
  },
  { timestamps: true, collection: 'askpastorquestionvotes' }
);

askPastorQuestionVoteSchema.index({ question: 1, voterIdentifier: 1 }, { unique: true });

export const AskPastorQuestionVote = model<ModelAskPastorQuestionVote>(
  'AskPastorQuestionVote',
  askPastorQuestionVoteSchema
);
