import { AskPastorQuestion } from '../../models/askPastorQuestion';
import { findByIdOrSlug } from './shared';

export async function countAskPastorQuestions(): Promise<number> {
  return AskPastorQuestion.countDocuments({});
}

export async function listAskPastorQuestions(options: {
  filter: Record<string, unknown>;
  skip: number;
  limit: number;
}): Promise<{ items: Record<string, unknown>[]; total: number }> {
  const [items, total] = await Promise.all([
    AskPastorQuestion.find(options.filter)
      .sort({ createdAt: -1 })
      .populate('pastor')
      .skip(options.skip)
      .limit(options.limit)
      .lean(),
    AskPastorQuestion.countDocuments(options.filter),
  ]);

  return { items: items as unknown as Record<string, unknown>[], total };
}

export async function findAskPastorQuestionByIdOrSlug(
  idOrSlug: string
): Promise<Record<string, unknown> | null> {
  return findByIdOrSlug(AskPastorQuestion, idOrSlug, {});
}

export async function findAskPastorQuestionByIdPopulated(
  id: unknown
): Promise<Record<string, unknown> | null> {
  const doc = await AskPastorQuestion.findById(id).populate('pastor').lean();

  return doc as unknown as Record<string, unknown> | null;
}

export async function createAskPastorQuestion(
  data: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const doc = await AskPastorQuestion.create(data);
  const raw = (doc.toObject ? doc.toObject() : doc) as unknown as Record<string, unknown>;

  return raw;
}
