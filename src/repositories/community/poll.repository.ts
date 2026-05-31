import mongoose from 'mongoose';
import { Poll } from '../../models/poll';
import { PollVote } from '../../models/pollVote';
import { findByIdOrSlug } from './shared';

export async function countPolls(): Promise<number> {
  return Poll.countDocuments({});
}

export async function listPolls(options: {
  filter: Record<string, unknown>;
  skip: number;
  limit: number;
}): Promise<{ items: Record<string, unknown>[]; total: number }> {
  const [items, total] = await Promise.all([
    Poll.find(options.filter)
      .sort({ createdAt: -1 })
      .populate('submittedBy', 'firstName lastName')
      .skip(options.skip)
      .limit(options.limit)
      .lean(),
    Poll.countDocuments(options.filter),
  ]);

  return { items: items as unknown as Record<string, unknown>[], total };
}

export async function findPollByIdOrSlug(
  idOrSlug: string
): Promise<Record<string, unknown> | null> {
  const doc = await findByIdOrSlug(Poll, idOrSlug, {});
  if (!doc) return null;
  const populated = await Poll.findById((doc as { _id: unknown })._id)
    .populate('submittedBy', 'firstName lastName')
    .lean();
  return (populated ?? doc) as unknown as Record<string, unknown>;
}

export async function findPollById(id: string): Promise<Record<string, unknown> | null> {
  const doc = await Poll.findById(id).lean();

  return doc as unknown as Record<string, unknown> | null;
}

export async function createPoll(data: Record<string, unknown>): Promise<Record<string, unknown>> {
  const doc = await Poll.create(data);
  const raw = (doc.toObject ? doc.toObject() : doc) as unknown as Record<string, unknown>;

  return raw;
}

export async function findPollVote(pollId: mongoose.Types.ObjectId, voterIdentifier: string) {
  return PollVote.findOne({ poll: pollId, voterIdentifier });
}

export async function createPollVote(data: {
  poll: mongoose.Types.ObjectId;
  optionId: mongoose.Types.ObjectId;
  voterIdentifier: string;
}): Promise<void> {
  await PollVote.create(data);
}

export async function incrementPollVote(
  pollId: mongoose.Types.ObjectId,
  optionIndex: number
): Promise<void> {
  await Poll.updateOne(
    { _id: pollId },
    { $inc: { totalVotes: 1, [`options.${optionIndex}.votes`]: 1 } }
  );
}
