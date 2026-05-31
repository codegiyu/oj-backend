/**
 * Unified public search across music, videos, news, devotionals, testimonies,
 * prayer requests, questions, polls, artists, resources.
 */

import { FastifyRequest, FastifyReply } from 'fastify';
import { sendResponse } from '../../utils/response';
import { Music } from '../../models/music';
import { Video } from '../../models/video';
import { Album } from '../../models/album';
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
import {
  isCompleteDevotional,
  isCompleteMusic,
  isCompleteNewsArticle,
  isCompletePrayerRequest,
  isCompleteResource,
  isCompleteTestimony,
  isCompleteVideo,
  mergePublicFilter,
  publishedMusicCompletenessFilter,
  publishedResourceCompletenessFilter,
  publishedTextContentCompletenessFilter,
  publishedVideoCompletenessFilter,
} from '../../utils/contentCompleteness';
import { leanIdToString } from '../../utils/leanId';

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

/** Safe display string for lean search documents (avoids [object Object] stringification). */
function searchDisplayStr(value: unknown): string {
  if (value == null) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (value instanceof Date) return value.toISOString();

  return '';
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
    sendResponse(
      reply,
      200,
      {
        results: [],
        pagination: { page: 1, limit, total: 0, totalPages: 0 },
      },
      'Search results.'
    );
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
    : ['music', 'album', 'news', 'video', ...COMMUNITY_TYPES];

  if (searchTypes.includes('music')) {
    const runMusic = await Music.find(
      mergePublicFilter(
        {
          status: 'published',
          $or: [{ title: regex }, { description: regex }, { category: regex }],
        },
        publishedMusicCompletenessFilter()
      )
    )
      .populate('artist', ARTIST_POPULATE_SELECT)
      .limit(PER_TYPE_LIMIT)
      .lean();

    for (const doc of runMusic as unknown as Record<string, unknown>[]) {
      if (!isCompleteMusic(doc)) continue;
      const artist = toArtistSummary(doc.artist as PopulatedArtistDoc);
      results.push({
        _id: leanIdToString(doc._id),
        title: searchDisplayStr(doc.title),
        subtitle: artist?.name ?? '',
        type: 'music',
        image: doc.coverImage as string | undefined,
        meta: searchDisplayStr(doc.plays) || searchDisplayStr(doc.duration),
      });
    }
  }

  if (searchTypes.includes('album')) {
    const docs = await Album.find({
      status: 'published',
      $or: [{ title: regex }, { description: regex }, { excerpt: regex }],
    })
      .populate('artist', ARTIST_POPULATE_SELECT)
      .limit(PER_TYPE_LIMIT)
      .lean();

    for (const doc of docs as unknown as Record<string, unknown>[]) {
      const artist = toArtistSummary(doc.artist as PopulatedArtistDoc);
      results.push({
        _id: leanIdToString(doc._id),
        title: searchDisplayStr(doc.title),
        subtitle: artist?.name ?? '',
        type: 'album',
        image: doc.coverImage as string | undefined,
        meta: searchDisplayStr(doc.releaseDate),
      });
    }
  }

  if (searchTypes.includes('news')) {
    const docs = await NewsArticle.find(
      mergePublicFilter(
        {
          status: 'published',
          $or: [{ title: regex }, { category: regex }, { content: regex }],
        },
        publishedTextContentCompletenessFilter()
      )
    )
      .limit(PER_TYPE_LIMIT)
      .lean();
    for (const doc of docs as unknown as Record<string, unknown>[]) {
      if (!isCompleteNewsArticle(doc)) continue;
      results.push({
        _id: leanIdToString(doc._id),
        title: searchDisplayStr(doc.title),
        subtitle: searchDisplayStr(doc.category),
        type: 'news',
        image: doc.image as string | undefined,
        meta: searchDisplayStr(doc.readTime),
      });
    }
  }

  if (searchTypes.includes('video')) {
    const docs = await Video.find(
      mergePublicFilter(
        {
          status: 'published',
          $or: [{ title: regex }, { description: regex }, { category: regex }],
        },
        publishedVideoCompletenessFilter()
      )
    )
      .populate('artist', ARTIST_POPULATE_SELECT)
      .limit(PER_TYPE_LIMIT)
      .lean();
    for (const doc of docs as unknown as Record<string, unknown>[]) {
      if (!isCompleteVideo(doc)) continue;
      const artist = toArtistSummary(doc.artist as PopulatedArtistDoc);
      results.push({
        _id: leanIdToString(doc._id),
        title: searchDisplayStr(doc.title),
        subtitle: artist?.name ?? '',
        type: 'video',
        image: doc.thumbnail as string | undefined,
        meta: searchDisplayStr(doc.duration) || searchDisplayStr(doc.views),
      });
    }
  }

  if (searchTypes.includes('devotional')) {
    const docs = await Devotional.find(
      mergePublicFilter(
        {
          status: 'published',
          $or: [
            { title: regex },
            { excerpt: regex },
            { content: regex },
            { category: regex },
            { author: regex },
          ],
        },
        publishedTextContentCompletenessFilter()
      )
    )
      .limit(PER_TYPE_LIMIT)
      .lean();
    for (const doc of docs as unknown as Record<string, unknown>[]) {
      if (!isCompleteDevotional(doc)) continue;
      results.push({
        _id: leanIdToString(doc._id),
        title: searchDisplayStr(doc.title),
        subtitle: searchDisplayStr(doc.category) || searchDisplayStr(doc.author),
        type: 'devotional',
        meta: searchDisplayStr(doc.readingTime) || searchDisplayStr(doc.date),
      });
    }
  }

  if (searchTypes.includes('testimony')) {
    const docs = await Testimony.find(
      mergePublicFilter(
        {
          status: 'published',
          $or: [{ content: regex }, { author: regex }, { category: regex }],
        },
        publishedTextContentCompletenessFilter()
      )
    )
      .limit(PER_TYPE_LIMIT)
      .lean();
    for (const doc of docs as unknown as Record<string, unknown>[]) {
      if (!isCompleteTestimony(doc)) continue;
      const testimonyPreview = typeof doc.content === 'string' ? doc.content.slice(0, 60) : '';

      results.push({
        _id: leanIdToString(doc._id),
        title: testimonyPreview || searchDisplayStr(doc.author),
        subtitle: searchDisplayStr(doc.author),
        type: 'testimony',
        image: doc.avatar as string | undefined,
        meta: searchDisplayStr(doc.category),
      });
    }
  }

  if (searchTypes.includes('prayer-request')) {
    const docs = await PrayerRequest.find(
      mergePublicFilter(
        {
          $or: [{ title: regex }, { content: regex }, { author: regex }, { category: regex }],
        },
        publishedTextContentCompletenessFilter()
      )
    )
      .limit(PER_TYPE_LIMIT)
      .lean();
    for (const doc of docs as unknown as Record<string, unknown>[]) {
      if (!isCompletePrayerRequest(doc)) continue;
      results.push({
        _id: leanIdToString(doc._id),
        title: searchDisplayStr(doc.title),
        subtitle: searchDisplayStr(doc.author),
        type: 'prayer-request',
        meta: searchDisplayStr(doc.category),
      });
    }
  }

  if (searchTypes.includes('question')) {
    const docs = await AskPastorQuestion.find({
      isPrivate: { $ne: true },
      $or: [{ question: regex }, { author: regex }, { category: regex }],
    })
      .limit(PER_TYPE_LIMIT)
      .lean();
    for (const doc of docs as unknown as Record<string, unknown>[]) {
      results.push({
        _id: leanIdToString(doc._id),
        title: searchDisplayStr(doc.question),
        subtitle: searchDisplayStr(doc.author),
        type: 'question',
        meta: searchDisplayStr(doc.category),
      });
    }
  }

  if (searchTypes.includes('poll')) {
    const docs = await Poll.find({
      $or: [{ question: regex }, { description: regex }, { category: regex }],
    })
      .limit(PER_TYPE_LIMIT)
      .lean();
    for (const doc of docs as unknown as Record<string, unknown>[]) {
      const totalVotesRaw = Number(doc.totalVotes);
      const totalVotes = Number.isFinite(totalVotesRaw) ? totalVotesRaw : 0;

      results.push({
        _id: leanIdToString(doc._id),
        title: searchDisplayStr(doc.question),
        subtitle: searchDisplayStr(doc.category),
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
    for (const doc of docs as unknown as Record<string, unknown>[]) {
      results.push({
        _id: leanIdToString(doc._id),
        title: searchDisplayStr(doc.name),
        subtitle: searchDisplayStr(doc.genre),
        type: 'artist',
        image: doc.image as string | undefined,
        meta: '',
      });
    }
  }

  if (searchTypes.includes('resource')) {
    const docs = await Resource.find(
      mergePublicFilter(
        {
          status: 'published',
          $or: [{ title: regex }, { description: regex }, { type: regex }, { category: regex }],
        },
        publishedResourceCompletenessFilter()
      )
    )
      .limit(PER_TYPE_LIMIT)
      .lean();
    for (const doc of docs as unknown as Record<string, unknown>[]) {
      if (!isCompleteResource(doc)) continue;
      results.push({
        _id: leanIdToString(doc._id),
        title: searchDisplayStr(doc.title),
        subtitle: searchDisplayStr(doc.type) || searchDisplayStr(doc.category),
        type: 'resource',
        image: (doc.coverImage ?? doc.cover) as string | undefined,
        meta: searchDisplayStr(doc.downloads),
      });
    }
  }

  const total = results.length;
  const totalPages = Math.ceil(total / limit);
  const skip = (page - 1) * limit;
  const paginated = results.slice(skip, skip + limit);

  sendResponse(
    reply,
    200,
    {
      results: paginated,
      pagination: { page, limit, total, totalPages },
    },
    'Search results.'
  );
}
