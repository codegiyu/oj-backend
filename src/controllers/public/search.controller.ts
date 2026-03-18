/**
 * Unified public search across music, videos, news, devotionals, testimonies,
 * prayer requests, questions, polls, artists, resources.
 */

import { FastifyRequest, FastifyReply } from 'fastify';
import { sendResponse } from '../../utils/response';
import { Music } from '../../models/music';
import { Video } from '../../models/video';
import { NewsArticle } from '../../models/newsArticle';
import {
  Devotional,
  Testimony,
  PrayerRequest,
  AskPastorQuestion,
  Poll,
  Resource,
} from '../../models';
import { Artist } from '../../models/artist';
import { toArtistSummary } from '../artist/artist.helpers';
import type { PopulatedArtistDoc } from '../artist/artist.helpers';
import { ARTIST_POPULATE_SELECT } from '../artist/artist.helpers';

const DEFAULT_LIMIT = 24;
const MAX_LIMIT = 50;
const PER_TYPE_LIMIT = 30;

type SearchResultItem = {
  _id: string;
  title: string;
  subtitle: string;
  type: string;
  image?: string;
  meta: string;
};

function idStr(v: unknown): string {
  if (v == null) return '';
  return String(v);
}

function buildRegex(q: string): RegExp {
  const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(escaped, 'i');
}

interface SearchQuerystring {
  q?: string;
  type?: string;
  page?: string;
  limit?: string;
}

export async function search(
  request: FastifyRequest<{ Querystring: SearchQuerystring }>,
  reply: FastifyReply
): Promise<void> {
  const q = (request.query.q ?? '').trim();
  const typeFilter = request.query.type;
  const page = Math.max(1, parseInt(request.query.page ?? '1', 10) || 1);
  const limit = Math.min(
    MAX_LIMIT,
    Math.max(1, parseInt(request.query.limit ?? String(DEFAULT_LIMIT), 10) || DEFAULT_LIMIT)
  );

  const results: SearchResultItem[] = [];

  if (!q) {
    sendResponse(reply, 200, {
      results: [],
      pagination: { page: 1, limit, total: 0, totalPages: 0 },
    }, 'Search results.');
    return;
  }

  const regex = buildRegex(q);
  const COMMUNITY_TYPES = [
    'devotional',
    'testimony',
    'prayer-request',
    'question',
    'poll',
    'artist',
    'resource',
  ] as const;
  const searchTypes: string[] = typeFilter
    ? typeFilter === 'community'
      ? [...COMMUNITY_TYPES]
      : [typeFilter]
    : ['music', 'news', 'video', ...COMMUNITY_TYPES];

  if (searchTypes.includes('music')) {
    const runMusic = await Music.find({
      status: 'published',
      $or: [
        { title: regex },
        { description: regex },
        { category: regex },
      ],
    })
      .populate('artist', ARTIST_POPULATE_SELECT)
      .limit(PER_TYPE_LIMIT)
      .lean();

    for (const doc of runMusic as Record<string, unknown>[]) {
      const artist = toArtistSummary(doc.artist as PopulatedArtistDoc);
      results.push({
        _id: idStr(doc._id),
        title: String(doc.title ?? ''),
        subtitle: artist?.name ?? '',
        type: 'music',
        image: doc.coverImage as string | undefined,
        meta: String(doc.plays ?? doc.duration ?? ''),
      });
    }
  }

  if (searchTypes.includes('news')) {
    const docs = await NewsArticle.find({
      $or: [{ title: regex }, { category: regex }, { content: regex }],
    })
      .limit(PER_TYPE_LIMIT)
      .lean();
    for (const doc of docs as Record<string, unknown>[]) {
      results.push({
        _id: idStr(doc._id),
        title: String(doc.title ?? ''),
        subtitle: String(doc.category ?? ''),
        type: 'news',
        image: doc.image as string | undefined,
        meta: String(doc.readTime ?? ''),
      });
    }
  }

  if (searchTypes.includes('video')) {
    const docs = await Video.find({
      status: 'published',
      $or: [{ title: regex }, { description: regex }, { category: regex }],
    })
      .populate('artist', ARTIST_POPULATE_SELECT)
      .limit(PER_TYPE_LIMIT)
      .lean();
    for (const doc of docs as Record<string, unknown>[]) {
      const artist = toArtistSummary(doc.artist as PopulatedArtistDoc);
      results.push({
        _id: idStr(doc._id),
        title: String(doc.title ?? ''),
        subtitle: artist?.name ?? '',
        type: 'video',
        image: doc.thumbnail as string | undefined,
        meta: String(doc.duration ?? doc.views ?? ''),
      });
    }
  }

  if (searchTypes.includes('devotional')) {
    const docs = await Devotional.find({
      status: 'published',
      $or: [{ title: regex }, { excerpt: regex }, { content: regex }, { category: regex }, { author: regex }],
    })
      .limit(PER_TYPE_LIMIT)
      .lean();
    for (const doc of docs as Record<string, unknown>[]) {
      results.push({
        _id: idStr(doc._id),
        title: String(doc.title ?? ''),
        subtitle: String(doc.category ?? doc.author ?? ''),
        type: 'devotional',
        meta: String(doc.readingTime ?? doc.date ?? ''),
      });
    }
  }

  if (searchTypes.includes('testimony')) {
    const docs = await Testimony.find({
      status: 'published',
      $or: [{ content: regex }, { author: regex }, { category: regex }],
    })
      .limit(PER_TYPE_LIMIT)
      .lean();
    for (const doc of docs as Record<string, unknown>[]) {
      results.push({
        _id: idStr(doc._id),
        title: String((doc.content as string)?.slice(0, 60) ?? doc.author ?? ''),
        subtitle: String(doc.author ?? ''),
        type: 'testimony',
        image: doc.avatar as string | undefined,
        meta: String(doc.category ?? ''),
      });
    }
  }

  if (searchTypes.includes('prayer-request')) {
    const docs = await PrayerRequest.find({
      $or: [{ title: regex }, { content: regex }, { author: regex }, { category: regex }],
    })
      .limit(PER_TYPE_LIMIT)
      .lean();
    for (const doc of docs as Record<string, unknown>[]) {
      results.push({
        _id: idStr(doc._id),
        title: String(doc.title ?? ''),
        subtitle: String(doc.author ?? ''),
        type: 'prayer-request',
        meta: String(doc.category ?? ''),
      });
    }
  }

  if (searchTypes.includes('question')) {
    const docs = await AskPastorQuestion.find({
      $or: [{ question: regex }, { author: regex }, { category: regex }],
    })
      .limit(PER_TYPE_LIMIT)
      .lean();
    for (const doc of docs as Record<string, unknown>[]) {
      results.push({
        _id: idStr(doc._id),
        title: String(doc.question ?? ''),
        subtitle: String(doc.author ?? ''),
        type: 'question',
        meta: String(doc.category ?? ''),
      });
    }
  }

  if (searchTypes.includes('poll')) {
    const docs = await Poll.find({
      $or: [{ question: regex }, { description: regex }, { category: regex }],
    })
      .limit(PER_TYPE_LIMIT)
      .lean();
    for (const doc of docs as Record<string, unknown>[]) {
      const totalVotes = Number(doc.totalVotes) ?? 0;
      results.push({
        _id: idStr(doc._id),
        title: String(doc.question ?? ''),
        subtitle: String(doc.category ?? ''),
        type: 'poll',
        meta: `${totalVotes} votes`,
      });
    }
  }

  if (searchTypes.includes('artist')) {
    const docs = await Artist.find({
      $or: [{ name: regex }, { genre: regex }, { bio: regex }],
    })
      .limit(PER_TYPE_LIMIT)
      .lean();
    for (const doc of docs as Record<string, unknown>[]) {
      results.push({
        _id: idStr(doc._id),
        title: String(doc.name ?? ''),
        subtitle: String(doc.genre ?? ''),
        type: 'artist',
        image: doc.image as string | undefined,
        meta: '',
      });
    }
  }

  if (searchTypes.includes('resource')) {
    const docs = await Resource.find({
      status: 'published',
      $or: [{ title: regex }, { description: regex }, { type: regex }, { category: regex }],
    })
      .limit(PER_TYPE_LIMIT)
      .lean();
    for (const doc of docs as Record<string, unknown>[]) {
      results.push({
        _id: idStr(doc._id),
        title: String(doc.title ?? ''),
        subtitle: String(doc.type ?? doc.category ?? ''),
        type: 'resource',
        image: (doc.coverImage ?? doc.cover) as string | undefined,
        meta: String(doc.downloads ?? ''),
      });
    }
  }

  const total = results.length;
  const totalPages = Math.ceil(total / limit);
  const skip = (page - 1) * limit;
  const paginated = results.slice(skip, skip + limit);

  sendResponse(reply, 200, {
    results: paginated,
    pagination: { page, limit, total, totalPages },
  }, 'Search results.');
}
