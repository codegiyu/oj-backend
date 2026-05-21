import { NewsArticle } from '../../models/newsArticle';
import { findByIdOrSlug } from '../community/shared';

export async function listPublishedNews(options: {
  filter: Record<string, unknown>;
  sort: Record<string, 1 | -1>;
  skip: number;
  limit: number;
}): Promise<{ items: Record<string, unknown>[]; total: number }> {
  const [items, total] = await Promise.all([
    NewsArticle.find(options.filter)
      .sort(options.sort)
      .skip(options.skip)
      .limit(options.limit)
      .lean(),
    NewsArticle.countDocuments(options.filter),
  ]);

  return { items: items as unknown as Record<string, unknown>[], total };
}

export async function findPublishedNewsByIdOrSlug(
  idOrSlug: string
): Promise<Record<string, unknown> | null> {
  return findByIdOrSlug(NewsArticle, idOrSlug, { status: 'published' });
}
