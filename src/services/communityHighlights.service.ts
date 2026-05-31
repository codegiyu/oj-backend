export type CommunityHighlightKind = 'testimony' | 'devotional' | 'prayer-request';

export interface CommunityHighlightItem {
  kind: CommunityHighlightKind;
  _id: string;
  href: string;
  title: string;
  preview: string;
  badge: string;
  author?: string;
  avatar?: string;
  coverImage?: string;
  timestamp: number;
  metaLabel?: string;
}

function asString(value: unknown, fallback = ''): string {
  if (value == null) return fallback;
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return fallback;
}

function parseTimestamp(value: unknown): number {
  if (value == null) return 0;
  const parsed = Date.parse(asString(value));
  return Number.isNaN(parsed) ? 0 : parsed;
}

function sortByTimestamp<T extends { timestamp: number }>(items: T[]): T[] {
  return [...items].sort((a, b) => b.timestamp - a.timestamp);
}

export function mergeCommunityHighlights(input: {
  testimonies: Array<Record<string, unknown>>;
  devotionals: Array<Record<string, unknown>>;
  prayerRequests: Array<Record<string, unknown>>;
  limit?: number;
}): CommunityHighlightItem[] {
  const limit = input.limit ?? 6;

  const testimonyItems: CommunityHighlightItem[] = input.testimonies.map(item => ({
    kind: 'testimony',
    _id: asString(item._id),
    href: `/community/testimonies/${asString(item._id || item.slug)}`,
    title: asString(item.title, asString(item.author, 'Testimony')),
    preview: asString(item.content),
    badge: 'Testimony',
    author: asString(item.author ?? item.name, 'Community member'),
    avatar: item.avatar != null ? asString(item.avatar) : undefined,
    timestamp: parseTimestamp(item.createdAt ?? item.timeAgo),
    metaLabel: item.likes != null ? `${asString(item.likes)} likes` : undefined,
  }));

  const devotionalItems: CommunityHighlightItem[] = input.devotionals.map(item => ({
    kind: 'devotional',
    _id: asString(item._id),
    href: `/community/devotionals/${asString(item.slug ?? item._id)}`,
    title: asString(item.title, 'Devotional'),
    preview: asString(item.excerpt ?? item.content),
    badge: 'Devotional',
    author: asString(item.author, 'OJ Community'),
    coverImage: item.coverImage != null ? asString(item.coverImage) : undefined,
    timestamp: parseTimestamp(item.createdAt ?? item.date),
    metaLabel: item.views != null ? `${asString(item.views)} views` : undefined,
  }));

  const prayerItems: CommunityHighlightItem[] = input.prayerRequests.map(item => ({
    kind: 'prayer-request',
    _id: asString(item._id),
    href: `/community/prayer-requests/${asString(item._id ?? item.slug)}`,
    title: asString(item.title, 'Prayer request'),
    preview: asString(item.content),
    badge: 'Prayer request',
    author: asString(item.author ?? item.name, 'Community member'),
    timestamp: parseTimestamp(item.createdAt ?? item.timeAgo),
    metaLabel: item.prayers != null ? `${asString(item.prayers)} prayers sent` : undefined,
  }));

  const sortedTestimonies = sortByTimestamp(testimonyItems);
  const sortedDevotionals = sortByTimestamp(devotionalItems);
  const sortedPrayers = sortByTimestamp(prayerItems);

  const merged: CommunityHighlightItem[] = [];
  let t = 0;
  let d = 0;
  let p = 0;

  while (
    merged.length < limit &&
    (t < sortedTestimonies.length || d < sortedDevotionals.length || p < sortedPrayers.length)
  ) {
    if (t < sortedTestimonies.length) {
      merged.push(sortedTestimonies[t]);
      t += 1;
    }
    if (merged.length >= limit) break;

    if (d < sortedDevotionals.length) {
      merged.push(sortedDevotionals[d]);
      d += 1;
    }
    if (merged.length >= limit) break;

    if (p < sortedPrayers.length) {
      merged.push(sortedPrayers[p]);
      p += 1;
    }
  }

  return sortByTimestamp(merged).slice(0, limit);
}
