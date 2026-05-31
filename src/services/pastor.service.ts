import mongoose from 'mongoose';
import { AskPastorQuestion } from '../models/askPastorQuestion';
import type { IAskPastorAnswer, IAskPastorQuestion } from '../lib/types/constants';

/** Count answers from the answers[] subdoc, falling back to legacy single-answer fields. */
export function countQuestionAnswers(
  question: Pick<IAskPastorQuestion, 'answers' | 'answer'>
): number {
  if (Array.isArray(question.answers) && question.answers.length > 0) {
    return question.answers.length;
  }

  if (typeof question.answer === 'string' && question.answer.trim().length > 0) {
    return 1;
  }

  return 0;
}

/** Whether a question has at least one answer (new or legacy shape). */
export function isQuestionAnswered(
  question: Pick<IAskPastorQuestion, 'answers' | 'answer' | 'status'>
): boolean {
  if (question.status === 'answered') return true;

  return countQuestionAnswers(question) > 0;
}

/** Normalize answers for API responses, synthesizing from legacy fields when needed. */
export function normalizeQuestionAnswers(
  question: Pick<IAskPastorQuestion, 'answers' | 'answer' | 'pastor' | 'answeredAt'>
): IAskPastorAnswer[] {
  if (Array.isArray(question.answers) && question.answers.length > 0) {
    return question.answers;
  }

  if (typeof question.answer === 'string' && question.answer.trim() && question.pastor) {
    return [
      {
        _id: new mongoose.Types.ObjectId(),
        pastor: question.pastor,
        answer: question.answer,
        answeredAt: question.answeredAt ?? new Date(),
        likes: 0,
      },
    ];
  }

  return [];
}

/** Public list filter: exclude private questions from unauthenticated public listings. */
export function publicQuestionVisibilityFilter(): Record<string, unknown> {
  return { isPrivate: { $ne: true } };
}

/** Questions a pastor may view/answer: public, assigned to them, or explicitly requested. */
export function pastorQuestionAccessFilter(
  pastorId: mongoose.Types.ObjectId
): Record<string, unknown> {
  return {
    $or: [
      { isPrivate: { $ne: true } },
      { requestedPastor: pastorId },
      { 'answers.pastor': pastorId },
    ],
  };
}

/** Questions visible to the submitting user (includes their private questions). */
export function submitterQuestionFilter(userId: mongoose.Types.ObjectId): Record<string, unknown> {
  return { submittedBy: userId };
}

export async function incrementPastorQuestionsAnswered(
  pastorId: mongoose.Types.ObjectId
): Promise<void> {
  const { Pastor } = await import('../models/pastor');
  await Pastor.updateOne({ _id: pastorId }, { $inc: { questionsAnswered: 1 } });
}

export async function buildPastorDashboardStats(pastorId: mongoose.Types.ObjectId): Promise<{
  questionsAnswered: number;
  pendingQuestions: number;
  assignedQuestions: number;
  totalUpvotes: number;
}> {
  const [pastor, pendingQuestions, assignedQuestions, voteAgg] = await Promise.all([
    import('../models/pastor').then(({ Pastor }) =>
      Pastor.findById(pastorId).select('questionsAnswered').lean()
    ),
    AskPastorQuestion.countDocuments({
      status: 'active',
      ...pastorQuestionAccessFilter(pastorId),
    }),
    AskPastorQuestion.countDocuments({
      requestedPastor: pastorId,
      status: { $in: ['active', 'answered'] },
    }),
    AskPastorQuestion.aggregate<{ totalUpvotes: number }>([
      { $match: { 'answers.pastor': pastorId } },
      { $unwind: '$answers' },
      { $match: { 'answers.pastor': pastorId } },
      { $group: { _id: null, totalUpvotes: { $sum: { $ifNull: ['$upvotes', 0] } } } },
    ]),
  ]);

  return {
    questionsAnswered: pastor?.questionsAnswered ?? 0,
    pendingQuestions,
    assignedQuestions,
    totalUpvotes: voteAgg[0]?.totalUpvotes ?? 0,
  };
}
