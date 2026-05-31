import { Schema, model } from 'mongoose';
import type { ModelAskPastorAnswerLike } from '../lib/types/constants';

const askPastorAnswerLikeSchema = new Schema<ModelAskPastorAnswerLike>(
  {
    question: {
      type: Schema.Types.ObjectId,
      ref: 'AskPastorQuestion',
      required: true,
      index: true,
    },
    answerId: { type: Schema.Types.ObjectId, required: true, index: true },
    voterIdentifier: { type: String, required: true, index: true },
  },
  { timestamps: true, collection: 'askpastoranswerlikes' }
);

askPastorAnswerLikeSchema.index({ question: 1, answerId: 1, voterIdentifier: 1 }, { unique: true });

export const AskPastorAnswerLike = model<ModelAskPastorAnswerLike>(
  'AskPastorAnswerLike',
  askPastorAnswerLikeSchema
);
