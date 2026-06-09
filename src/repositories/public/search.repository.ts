/**
 * Raw collection queries for unified public search.
 * Shaping and completeness checks live in publicSearch.service.ts.
 */

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
import { ARTIST_POPULATE_SELECT } from '../../controllers/artist/artist.helpers';

export async function searchMusicDocuments(
  filter: Record<string, unknown>,
  limit: number
): Promise<Record<string, unknown>[]> {
  const docs = await Music.find(filter)
    .populate('artist', ARTIST_POPULATE_SELECT)
    .limit(limit)
    .lean();

  return docs as unknown as Record<string, unknown>[];
}

export async function searchAlbumDocuments(
  filter: Record<string, unknown>,
  limit: number
): Promise<Record<string, unknown>[]> {
  const docs = await Album.find(filter)
    .populate('artist', ARTIST_POPULATE_SELECT)
    .limit(limit)
    .lean();

  return docs as unknown as Record<string, unknown>[];
}

export async function searchNewsDocuments(
  filter: Record<string, unknown>,
  limit: number
): Promise<Record<string, unknown>[]> {
  const docs = await NewsArticle.find(filter).limit(limit).lean();

  return docs as unknown as Record<string, unknown>[];
}

export async function searchVideoDocuments(
  filter: Record<string, unknown>,
  limit: number
): Promise<Record<string, unknown>[]> {
  const docs = await Video.find(filter)
    .populate('artist', ARTIST_POPULATE_SELECT)
    .limit(limit)
    .lean();

  return docs as unknown as Record<string, unknown>[];
}

export async function searchDevotionalDocuments(
  filter: Record<string, unknown>,
  limit: number
): Promise<Record<string, unknown>[]> {
  const docs = await Devotional.find(filter).limit(limit).lean();

  return docs as unknown as Record<string, unknown>[];
}

export async function searchTestimonyDocuments(
  filter: Record<string, unknown>,
  limit: number
): Promise<Record<string, unknown>[]> {
  const docs = await Testimony.find(filter).limit(limit).lean();

  return docs as unknown as Record<string, unknown>[];
}

export async function searchPrayerRequestDocuments(
  filter: Record<string, unknown>,
  limit: number
): Promise<Record<string, unknown>[]> {
  const docs = await PrayerRequest.find(filter).limit(limit).lean();

  return docs as unknown as Record<string, unknown>[];
}

export async function searchQuestionDocuments(
  filter: Record<string, unknown>,
  limit: number
): Promise<Record<string, unknown>[]> {
  const docs = await AskPastorQuestion.find(filter).limit(limit).lean();

  return docs as unknown as Record<string, unknown>[];
}

export async function searchPollDocuments(
  filter: Record<string, unknown>,
  limit: number
): Promise<Record<string, unknown>[]> {
  const docs = await Poll.find(filter).limit(limit).lean();

  return docs as unknown as Record<string, unknown>[];
}

export async function searchArtistDocuments(
  filter: Record<string, unknown>,
  limit: number
): Promise<Record<string, unknown>[]> {
  const docs = await Artist.find(filter).limit(limit).lean();

  return docs as unknown as Record<string, unknown>[];
}

export async function searchResourceDocuments(
  filter: Record<string, unknown>,
  limit: number
): Promise<Record<string, unknown>[]> {
  const docs = await Resource.find(filter).limit(limit).lean();

  return docs as unknown as Record<string, unknown>[];
}
