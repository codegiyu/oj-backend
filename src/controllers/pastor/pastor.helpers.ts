import { leanIdToString } from '../../utils/leanId';
import {
  countQuestionAnswers,
  isQuestionAnswered,
  normalizeQuestionAnswers,
} from '../../services/pastor.service';
import { shapePastorDetail } from '../public/community.helpers';

type PopulatedPastorRef = {
  _id: unknown;
  name?: string;
  slug?: string;
  title?: string;
  church?: string;
  image?: string;
  bio?: string;
  expertise?: string[];
};

function toPastorRefSummary(
  pastor: PopulatedPastorRef | null | undefined
): Record<string, unknown> | null {
  if (!pastor) return null;

  return {
    _id: leanIdToString(pastor._id),
    name: pastor.name,
    slug: pastor.slug,
    title: pastor.title,
    church: pastor.church,
    image: pastor.image,
  };
}

function toIso(date: Date | string | undefined): string | undefined {
  if (!date) return undefined;
  const d = typeof date === 'string' ? new Date(date) : date;

  return d.toISOString();
}

function shapeAnswerItem(
  answer: {
    _id: unknown;
    answer: string;
    answeredAt?: Date | string;
    likes?: number;
    pastor?: PopulatedPastorRef | null;
  },
  populatedPastor?: PopulatedPastorRef | null
): Record<string, unknown> {
  const pastorRaw =
    populatedPastor ??
    (typeof answer.pastor === 'object' && answer.pastor !== null ? answer.pastor : null);

  return {
    _id: leanIdToString(answer._id),
    answer: answer.answer,
    answeredAt: toIso(answer.answeredAt),
    likes: answer.likes ?? 0,
    pastor: toPastorRefSummary(pastorRaw),
  };
}

export function serializePastorDoc(raw: Record<string, unknown>): Record<string, unknown> {
  return {
    _id: leanIdToString(raw._id),
    name: raw.name,
    slug: raw.slug,
    title: raw.title,
    church: raw.church,
    bio: raw.bio,
    image: raw.image,
    expertise: raw.expertise ?? [],
    questionsAnswered: raw.questionsAnswered ?? 0,
    rating: raw.rating ?? 0,
    isFeatured: raw.isFeatured,
    isActive: raw.isActive,
    displayOrder: raw.displayOrder,
    createdAt: toIso(raw.createdAt as Date | string | undefined),
    updatedAt: toIso(raw.updatedAt as Date | string | undefined),
  };
}

export function shapePastorQuestionListItem(raw: Record<string, unknown>): Record<string, unknown> {
  const requestedPastor = raw.requestedPastor as PopulatedPastorRef | null | undefined;
  const legacyPastor = raw.pastor as PopulatedPastorRef | null | undefined;

  return {
    _id: leanIdToString(raw._id),
    question: raw.question,
    category: raw.category,
    author: raw.author,
    status: raw.status,
    isPrivate: !!raw.isPrivate,
    isAnswered: isQuestionAnswered(raw as never),
    answersCount: countQuestionAnswers(raw as never),
    upvotes: raw.upvotes ?? 0,
    downvotes: raw.downvotes ?? 0,
    views: raw.views ?? 0,
    urgent: !!raw.urgent,
    createdAt: toIso(raw.createdAt as Date | string | undefined),
    requestedPastor: toPastorRefSummary(requestedPastor),
    pastor: toPastorRefSummary(legacyPastor),
  };
}

export function shapePastorQuestionDetail(raw: Record<string, unknown>): Record<string, unknown> {
  const answers = normalizeQuestionAnswers(raw as never);
  const requestedPastor = raw.requestedPastor as PopulatedPastorRef | null | undefined;
  const legacyPastor = raw.pastor as PopulatedPastorRef | null | undefined;

  return {
    _id: leanIdToString(raw._id),
    question: raw.question,
    slug: raw.slug,
    category: raw.category,
    author: raw.author,
    status: raw.status,
    isPrivate: !!raw.isPrivate,
    isAnswered: isQuestionAnswered(raw as never),
    upvotes: raw.upvotes ?? 0,
    downvotes: raw.downvotes ?? 0,
    views: raw.views ?? 0,
    helpful: raw.helpful ?? 0,
    urgent: !!raw.urgent,
    closedAt: toIso(raw.closedAt as Date | string | undefined),
    createdAt: toIso(raw.createdAt as Date | string | undefined),
    updatedAt: toIso(raw.updatedAt as Date | string | undefined),
    requestedPastor: requestedPastor
      ? shapePastorDetail(requestedPastor as Record<string, unknown>)
      : null,
    pastor: legacyPastor ? shapePastorDetail(legacyPastor as Record<string, unknown>) : null,
    answers: answers.map(answer =>
      shapeAnswerItem(
        answer as never,
        typeof answer.pastor === 'object' ? (answer.pastor as PopulatedPastorRef) : null
      )
    ),
  };
}

/** Admin list/detail: redact private question content to metadata only. */
export function shapeAdminPrivateQuestionMetadata(
  raw: Record<string, unknown>
): Record<string, unknown> {
  if (!raw.isPrivate) {
    return raw;
  }

  return {
    ...raw,
    question: '[Private question]',
    answer: raw.answer ? '[Private answer]' : raw.answer,
    email: raw.email ? '[redacted]' : raw.email,
    answers: Array.isArray(raw.answers)
      ? raw.answers.map(item => ({
          ...(item as Record<string, unknown>),
          answer: '[Private answer]',
        }))
      : raw.answers,
  };
}
