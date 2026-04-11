import { createHash } from 'crypto';
import { FastifyRequest, FastifyReply } from 'fastify';
import { Music } from '../../models/music';
import { Video } from '../../models/video';
import { Devotional } from '../../models/devotional';
import { NewsArticle } from '../../models/newsArticle';
import { ContentAnalyticsDedupe } from '../../models/contentAnalyticsDedupe';
import { AppError } from '../../utils/AppError';
import { sendResponse } from '../../utils/response';
import { findByIdOrSlug } from './community.helpers';

type EntityType = 'music' | 'video' | 'devotional' | 'news-article';
type AnalyticsEvent = 'view' | 'play' | 'download';

function buildDedupeKey(
  request: FastifyRequest,
  body: { entityType: string; entityIdOrSlug: string; event: string; clientSessionId?: string }
): string {
  const idem = request.headers['idempotency-key'];
  if (typeof idem === 'string' && idem.trim().length > 0) {
    return `idemp:${idem.trim().slice(0, 200)}`;
  }
  const session = (body.clientSessionId ?? 'anon').trim().slice(0, 128);
  const h = createHash('sha256')
    .update(`${body.entityType}|${body.entityIdOrSlug}|${body.event}|${session}`)
    .digest('hex');
  return `evt:${h}`;
}

async function tryInsertDedupe(key: string): Promise<boolean> {
  try {
    await ContentAnalyticsDedupe.create({ key });
    return true;
  } catch (e: unknown) {
    const code = (e as { code?: number })?.code;
    if (code === 11000) return false;
    throw e;
  }
}

export async function postPublicContentAnalyticsEvent(
  request: FastifyRequest<{
    Body: {
      entityType: EntityType;
      entityIdOrSlug: string;
      event: AnalyticsEvent;
      clientSessionId?: string;
    };
  }>,
  reply: FastifyReply
): Promise<void> {
  const body = request.body;
  if (!body?.entityType || !body.entityIdOrSlug || !body.event) {
    throw new AppError('entityType, entityIdOrSlug, and event are required', 400);
  }

  const allowedTypes: EntityType[] = ['music', 'video', 'devotional', 'news-article'];
  if (!allowedTypes.includes(body.entityType)) {
    throw new AppError('Invalid entityType', 400);
  }

  const allowedEvents: AnalyticsEvent[] = ['view', 'play', 'download'];
  if (!allowedEvents.includes(body.event)) {
    throw new AppError('Invalid event', 400);
  }

  const key = buildDedupeKey(request, body);
  const isNew = await tryInsertDedupe(key);
  if (!isNew) {
    sendResponse(reply, 200, { ok: true }, 'Event deduplicated.');
    return;
  }

  const idOrSlug = String(body.entityIdOrSlug).trim();
  if (!idOrSlug) throw new AppError('entityIdOrSlug is required', 400);

  if (body.entityType === 'music') {
    const doc = await findByIdOrSlug(Music, idOrSlug, { status: 'published' });
    if (!doc) throw new AppError('Music not found', 404);
    const inc: Record<string, number> = {};
    if (body.event === 'view') inc.views = 1;
    else if (body.event === 'play') inc.plays = 1;
    else inc.downloads = 1;
    await Music.updateOne({ _id: doc._id }, { $inc: inc });
  } else if (body.entityType === 'video') {
    const doc = await findByIdOrSlug(Video, idOrSlug, { status: 'published' });
    if (!doc) throw new AppError('Video not found', 404);
    const inc: Record<string, number> = {};
    if (body.event === 'view') inc.views = 1;
    else if (body.event === 'play') inc.plays = 1;
    else inc.downloads = 1;
    await Video.updateOne({ _id: doc._id }, { $inc: inc });
  } else if (body.entityType === 'devotional') {
    const doc = await findByIdOrSlug(Devotional, idOrSlug, { status: 'published' });
    if (!doc) throw new AppError('Devotional not found', 404);
    if (body.event === 'download') {
      sendResponse(reply, 200, { ok: true }, 'Event acknowledged.');
      return;
    }
    const inc: Record<string, number> = body.event === 'view' ? { views: 1 } : { plays: 1 };
    await Devotional.updateOne({ _id: doc._id }, { $inc: inc });
  } else {
    const doc = await findByIdOrSlug(NewsArticle, idOrSlug, { status: 'published' });
    if (!doc) throw new AppError('Article not found', 404);
    if (body.event !== 'view') {
      sendResponse(reply, 200, { ok: true }, 'No metric for this event type.');
      return;
    }
    await NewsArticle.updateOne({ _id: doc._id }, { $inc: { views: 1 } });
  }

  sendResponse(reply, 200, { ok: true }, 'Event recorded.');
}
