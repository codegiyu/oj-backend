/**
 * Community API helpers: findByIdOrSlug, timeAgo, and response shapers for list/detail.
 */

import mongoose from 'mongoose';

/** Resolve document by id (ObjectId) or slug. Returns null if not found. */
export async function findByIdOrSlug<T>(
  model: mongoose.Model<T>,
  idOrSlug: string,
  filter: Record<string, unknown> = {}
): Promise<Record<string, unknown> | null> {
  const q = { ...filter } as Record<string, unknown>;
  if (
    mongoose.Types.ObjectId.isValid(idOrSlug) &&
    String(new mongoose.Types.ObjectId(idOrSlug)) === idOrSlug
  ) {
    q._id = new mongoose.Types.ObjectId(idOrSlug);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- dynamic filter at runtime
    const byId = await model.findOne(q as any).lean();
    if (byId) return byId as Record<string, unknown>;
  }
  delete q._id;
  q.slug = idOrSlug;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- dynamic filter at runtime
  const bySlug = await model.findOne(q as any).lean();
  return bySlug as Record<string, unknown> | null;
}

/** Format a date as a human-readable "time ago" string. */
export function timeAgo(date: Date | string | undefined): string {
  if (!date) return '';
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const sec = Math.floor((now.getTime() - d.getTime()) / 1000);
  if (sec < 60) return 'Just now';
  if (sec < 3600) return `${Math.floor(sec / 60)}m ago`;
  if (sec < 86400) return `${Math.floor(sec / 3600)}h ago`;
  if (sec < 2592000) return `${Math.floor(sec / 86400)}d ago`;
  if (sec < 31536000) return `${Math.floor(sec / 2592000)}mo ago`;
  return `${Math.floor(sec / 31536000)}y ago`;
}

function toIso(date: Date | string | undefined): string | undefined {
  if (!date) return undefined;
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toISOString();
}

function idStr(v: unknown): string | undefined {
  if (v == null) return undefined;
  return String(v);
}

/** Shape devotional for list item. */
export function shapeDevotionalListItem(raw: Record<string, unknown>): Record<string, unknown> {
  return {
    _id: idStr(raw._id),
    title: raw.title,
    slug: raw.slug,
    excerpt: raw.excerpt ?? (typeof raw.content === 'string' ? raw.content.slice(0, 160) : ''),
    category: raw.category,
    author: raw.author,
    views: raw.views ?? 0,
    createdAt: toIso(raw.createdAt as Date),
    type: raw.type,
    verse: raw.verse,
    date: toIso(raw.date as Date),
    readingTime: raw.readingTime,
    lessons: raw.lessons,
    duration: raw.duration,
  };
}

/** Shape devotional for detail (full document). */
export function shapeDevotionalDetail(raw: Record<string, unknown>): Record<string, unknown> {
  return {
    _id: idStr(raw._id),
    title: raw.title,
    slug: raw.slug,
    excerpt: raw.excerpt,
    content: raw.content,
    type: raw.type,
    category: raw.category,
    author: raw.author,
    verse: raw.verse,
    date: toIso(raw.date as Date),
    readingTime: raw.readingTime,
    lessons: raw.lessons,
    duration: raw.duration,
    views: raw.views ?? 0,
    createdAt: toIso(raw.createdAt as Date),
    updatedAt: toIso(raw.updatedAt as Date),
  };
}

/** Shape testimony for list item. */
export function shapeTestimonyListItem(raw: Record<string, unknown>): Record<string, unknown> {
  return {
    _id: idStr(raw._id),
    author: raw.author,
    avatar: raw.avatar,
    content: raw.content,
    likes: raw.likes ?? 0,
    comments: raw.comments ?? 0,
    timeAgo: timeAgo(raw.createdAt as Date),
    category: raw.category,
  };
}

/** Shape testimony for detail. */
export function shapeTestimonyDetail(raw: Record<string, unknown>): Record<string, unknown> {
  return {
    _id: idStr(raw._id),
    slug: raw.slug,
    author: raw.author,
    avatar: raw.avatar,
    content: raw.content,
    likes: raw.likes ?? 0,
    comments: raw.comments ?? 0,
    category: raw.category,
    createdAt: toIso(raw.createdAt as Date),
    updatedAt: toIso(raw.updatedAt as Date),
  };
}

/** Shape prayer request for list item. */
export function shapePrayerRequestListItem(raw: Record<string, unknown>): Record<string, unknown> {
  return {
    _id: idStr(raw._id),
    title: raw.title,
    content: raw.content,
    author: raw.author,
    category: raw.category,
    prayers: raw.prayers ?? 0,
    comments: raw.comments ?? 0,
    timeAgo: timeAgo(raw.createdAt as Date),
    urgent: !!raw.urgent,
    testimony: raw.testimony,
    answeredDate: toIso(raw.answeredAt as Date),
  };
}

/** Shape prayer request for detail. */
export function shapePrayerRequestDetail(raw: Record<string, unknown>): Record<string, unknown> {
  return {
    _id: idStr(raw._id),
    title: raw.title,
    content: raw.content,
    author: raw.author,
    category: raw.category,
    prayers: raw.prayers ?? 0,
    comments: raw.comments ?? 0,
    urgent: !!raw.urgent,
    testimony: raw.testimony,
    answeredAt: toIso(raw.answeredAt as Date),
    status: raw.status,
    createdAt: toIso(raw.createdAt as Date),
    updatedAt: toIso(raw.updatedAt as Date),
  };
}

/** Shape pastor for list item. */
export function shapePastorListItem(raw: Record<string, unknown>): Record<string, unknown> {
  return {
    _id: idStr(raw._id),
    name: raw.name,
    title: raw.title,
    church: raw.church,
    image: raw.image,
    expertise: raw.expertise ?? [],
    questionsAnswered: raw.questionsAnswered ?? 0,
    rating: raw.rating ?? 0,
  };
}

/** Shape pastor for detail (and populated ref in question). */
export function shapePastorDetail(raw: Record<string, unknown>): Record<string, unknown> {
  return {
    _id: idStr(raw._id),
    name: raw.name,
    slug: raw.slug,
    title: raw.title,
    church: raw.church,
    image: raw.image,
    bio: raw.bio,
    expertise: raw.expertise ?? [],
    questionsAnswered: raw.questionsAnswered ?? 0,
    rating: raw.rating ?? 0,
  };
}

/** Shape question for list item. */
export function shapeQuestionListItem(
  raw: Record<string, unknown>,
  pastor?: Record<string, unknown> | null
): Record<string, unknown> {
  const item: Record<string, unknown> = {
    _id: idStr(raw._id),
    question: raw.question,
    category: raw.category,
    author: raw.author,
    views: raw.views ?? 0,
    answers: raw.status === 'answered' ? 1 : 0,
    timeAgo: timeAgo(raw.createdAt as Date),
    urgent: !!raw.urgent,
    answer: raw.answer,
    answeredDate: toIso(raw.answeredAt as Date),
    helpful: raw.helpful ?? 0,
  };
  if (pastor) item.pastor = shapePastorDetail(pastor);
  return item;
}

/** Shape question for detail. */
export function shapeQuestionDetail(
  raw: Record<string, unknown>,
  pastor?: Record<string, unknown> | null
): Record<string, unknown> {
  const detail: Record<string, unknown> = {
    _id: idStr(raw._id),
    question: raw.question,
    slug: raw.slug,
    category: raw.category,
    author: raw.author,
    status: raw.status,
    answer: raw.answer,
    answeredAt: toIso(raw.answeredAt as Date),
    views: raw.views ?? 0,
    helpful: raw.helpful ?? 0,
    urgent: !!raw.urgent,
    createdAt: toIso(raw.createdAt as Date),
    updatedAt: toIso(raw.updatedAt as Date),
  };
  if (pastor) detail.pastor = shapePastorDetail(pastor);
  return detail;
}

/** Shape poll option with percentage. */
function shapePollOption(
  opt: { _id: unknown; text: string; votes: number },
  totalVotes: number
): Record<string, unknown> {
  const votes = Number(opt.votes) || 0;
  const percentage = totalVotes > 0 ? Math.round((votes / totalVotes) * 100) : 0;
  return {
    _id: idStr(opt._id),
    text: opt.text,
    votes,
    percentage,
  };
}

/** Shape poll for list item. */
export function shapePollListItem(raw: Record<string, unknown>): Record<string, unknown> {
  const options = Array.isArray(raw.options) ? raw.options : [];
  const totalVotes = Number(raw.totalVotes) || 0;
  return {
    _id: idStr(raw._id),
    question: raw.question,
    description: raw.description,
    options: options.map((o: { _id: unknown; text: string; votes: number }) =>
      shapePollOption(o, totalVotes)
    ),
    totalVotes,
    status: raw.status,
    timeAgo: timeAgo(raw.createdAt as Date),
    endDate: toIso(raw.endDate as Date),
  };
}

/** Shape poll for detail (same as list with full options). */
export function shapePollDetail(raw: Record<string, unknown>): Record<string, unknown> {
  const list = shapePollListItem(raw);
  return {
    ...list,
    slug: raw.slug,
    category: raw.category,
    startDate: toIso(raw.startDate as Date),
    endDate: toIso(raw.endDate as Date),
    createdAt: toIso(raw.createdAt as Date),
    updatedAt: toIso(raw.updatedAt as Date),
  };
}

/** Shape artist (community) for list item. */
export function shapeArtistListItem(raw: Record<string, unknown>): Record<string, unknown> {
  return {
    _id: idStr(raw._id),
    name: raw.name,
    slug: raw.slug,
    image: raw.image,
    genre: raw.genre,
    followers: 0,
    verified: false,
    songs: 0,
  };
}

/** Shape artist for detail. */
export function shapeArtistDetail(raw: Record<string, unknown>): Record<string, unknown> {
  return {
    _id: idStr(raw._id),
    name: raw.name,
    slug: raw.slug,
    image: raw.image,
    coverImage: raw.coverImage,
    bio: raw.bio,
    genre: raw.genre,
    socials: raw.socials,
  };
}

/** Shape resource for list item. */
export function shapeResourceListItem(raw: Record<string, unknown>): Record<string, unknown> {
  return {
    _id: idStr(raw._id),
    title: raw.title,
    slug: raw.slug,
    description: raw.description,
    type: raw.type,
    category: raw.category,
    coverImage: raw.coverImage,
    downloads: raw.downloads ?? 0,
    price: raw.price,
    isFree: raw.isFree,
  };
}

/** Shape resource for detail. */
export function shapeResourceDetail(raw: Record<string, unknown>): Record<string, unknown> {
  return {
    _id: idStr(raw._id),
    title: raw.title,
    slug: raw.slug,
    description: raw.description,
    type: raw.type,
    category: raw.category,
    fileUrl: raw.fileUrl,
    coverImage: raw.coverImage,
    downloads: raw.downloads ?? 0,
    price: raw.price,
    isFree: raw.isFree,
    createdAt: toIso(raw.createdAt as Date),
    updatedAt: toIso(raw.updatedAt as Date),
  };
}
