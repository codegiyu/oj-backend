import mongoose, { type HydratedDocument } from 'mongoose';
import { Pastor } from '../../models/pastor';
import { PastorApplication } from '../../models/pastorApplication';
import { AskPastorQuestion } from '../../models/askPastorQuestion';
import { User } from '../../models/user';
import type {
  IAskPastorQuestion,
  IPastor,
  IPastorApplication,
  IUser,
  ModelPastorApplication,
} from '../../lib/types/constants';

const PASTOR_REF_SELECT = 'name slug image title church';

export async function findUserPastorId(
  userId: string | mongoose.Types.ObjectId
): Promise<Pick<IUser, 'pastorId'> | null> {
  return User.findById(userId).select('pastorId').lean<Pick<IUser, 'pastorId'> | null>();
}

export async function findPastorLeanById(
  pastorId: mongoose.Types.ObjectId
): Promise<IPastor | null> {
  return Pastor.findById(pastorId).lean<IPastor | null>();
}

export async function findPastorDocumentById(
  pastorId: mongoose.Types.ObjectId
): Promise<HydratedDocument<IPastor> | null> {
  return Pastor.findById(pastorId);
}

export async function findPastorApplicationByUserId(
  userId: string | mongoose.Types.ObjectId
): Promise<IPastorApplication | null> {
  return PastorApplication.findOne({ user: userId }).lean<IPastorApplication | null>();
}

export async function findPastorApplicationDocumentByUserId(
  userId: string | mongoose.Types.ObjectId
): Promise<HydratedDocument<ModelPastorApplication> | null> {
  return PastorApplication.findOne({ user: userId });
}

export async function createPastorApplication(
  data: Record<string, unknown>
): Promise<HydratedDocument<ModelPastorApplication>> {
  return PastorApplication.create(data);
}

export async function incrementPastorQuestionsAnsweredCount(
  pastorId: mongoose.Types.ObjectId
): Promise<void> {
  await Pastor.updateOne({ _id: pastorId }, { $inc: { questionsAnswered: 1 } });
}

export async function findPastorQuestionsAnsweredCount(
  pastorId: mongoose.Types.ObjectId
): Promise<number | undefined> {
  const pastor = await Pastor.findById(pastorId).select('questionsAnswered').lean();

  return pastor?.questionsAnswered;
}

export async function countPastorPortalQuestions(filter: Record<string, unknown>): Promise<number> {
  return AskPastorQuestion.countDocuments(filter);
}

export async function listPastorPortalQuestions(options: {
  filter: Record<string, unknown>;
  sort: string;
  skip: number;
  limit: number;
}): Promise<IAskPastorQuestion[]> {
  return AskPastorQuestion.find(options.filter)
    .sort(options.sort)
    .populate('requestedPastor', PASTOR_REF_SELECT)
    .populate('pastor', PASTOR_REF_SELECT)
    .skip(options.skip)
    .limit(options.limit)
    .lean<IAskPastorQuestion[]>();
}

export async function findPastorPortalQuestionById(options: {
  questionId: mongoose.Types.ObjectId;
  accessFilter: Record<string, unknown>;
}): Promise<IAskPastorQuestion | null> {
  return AskPastorQuestion.findOne({
    _id: options.questionId,
    ...options.accessFilter,
  })
    .populate('requestedPastor')
    .populate('pastor')
    .populate('answers.pastor', PASTOR_REF_SELECT)
    .lean<IAskPastorQuestion | null>();
}

export async function findPastorPortalQuestionDocumentForAnswer(options: {
  questionId: mongoose.Types.ObjectId;
  accessFilter: Record<string, unknown>;
}): Promise<HydratedDocument<IAskPastorQuestion> | null> {
  return AskPastorQuestion.findOne({
    _id: options.questionId,
    status: { $in: ['active', 'answered'] },
    ...options.accessFilter,
  });
}

export async function findPastorQuestionPopulatedById(
  questionId: mongoose.Types.ObjectId
): Promise<IAskPastorQuestion | null> {
  return AskPastorQuestion.findById(questionId)
    .populate('requestedPastor')
    .populate('pastor')
    .populate('answers.pastor', PASTOR_REF_SELECT)
    .lean<IAskPastorQuestion | null>();
}

export async function countActivePastorAccessibleQuestions(
  accessFilter: Record<string, unknown>
): Promise<number> {
  return AskPastorQuestion.countDocuments({
    status: 'active',
    ...accessFilter,
  });
}

export async function countAssignedPastorQuestions(
  pastorId: mongoose.Types.ObjectId
): Promise<number> {
  return AskPastorQuestion.countDocuments({
    requestedPastor: pastorId,
    status: { $in: ['active', 'answered'] },
  });
}

export async function aggregatePastorAnswerUpvotes(
  pastorId: mongoose.Types.ObjectId
): Promise<number> {
  const voteAgg = await AskPastorQuestion.aggregate<{ totalUpvotes: number }>([
    { $match: { 'answers.pastor': pastorId } },
    { $unwind: '$answers' },
    { $match: { 'answers.pastor': pastorId } },
    { $group: { _id: null, totalUpvotes: { $sum: { $ifNull: ['$upvotes', 0] } } } },
  ]);

  return voteAgg[0]?.totalUpvotes ?? 0;
}
