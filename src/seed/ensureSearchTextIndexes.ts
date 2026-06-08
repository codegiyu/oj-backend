import { Music } from '../models/music';
import { Album } from '../models/album';
import { NewsArticle } from '../models/newsArticle';
import { Video } from '../models/video';
import { Devotional, Testimony, PrayerRequest, AskPastorQuestion, Poll, Resource } from '../models';
import { Artist } from '../models/artist';
import { logger } from '../utils/logger';

const SEARCH_INDEX_MODELS = [
  Music,
  Album,
  NewsArticle,
  Video,
  Devotional,
  Testimony,
  PrayerRequest,
  AskPastorQuestion,
  Poll,
  Artist,
  Resource,
];

/** Ensure MongoDB text indexes exist for unified public search. Idempotent via createIndexes(). */
export async function ensureSearchTextIndexes(): Promise<void> {
  await Promise.all(
    SEARCH_INDEX_MODELS.map(async model => {
      await model.createIndexes();
      logger.info(`Search text indexes ensured for ${model.modelName}`);
    })
  );
}
