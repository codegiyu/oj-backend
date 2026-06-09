/**
 * Community overview and highlights public API business logic.
 */

import * as devotionalRepo from '../../repositories/community/devotional.repository';
import * as testimonyRepo from '../../repositories/community/testimony.repository';
import {
  countPrayerRequests,
  findRecentActivePrayerRequests,
} from '../../repositories/community/prayerRequest.repository';
import * as askPastorRepo from '../../repositories/community/askPastor.repository';
import * as pollRepo from '../../repositories/community/poll.repository';
import * as resourceRepo from '../../repositories/community/resource.repository';
import { countActiveCommunityArtists } from '../../repositories/community/artist.repository';
import {
  shapeDevotionalListItem,
  shapeTestimonyListItem,
  shapePrayerRequestListItem,
} from '../../controllers/public/community.helpers';
import {
  FEATURED_TESTIMONIES_LIMIT,
  TRENDING_DEVOTIONALS_LIMIT,
  RECENT_PRAYER_REQUESTS_LIMIT,
} from '../../constants/pagination';
import {
  mergePublicFilter,
  publishedTextContentCompletenessFilter,
} from '../../utils/contentCompleteness';

export async function getCommunity(): Promise<{
  statusCode: number;
  data: unknown;
  message: string;
}> {
  const [
    devotionalsCount,
    testimoniesCount,
    prayerRequestsCount,
    questionsCount,
    pollsCount,
    resourcesCount,
    artistsCount,
  ] = await Promise.all([
    devotionalRepo.countPublishedDevotionals(),
    testimonyRepo.countPublishedTestimonies(),
    countPrayerRequests(),
    askPastorRepo.countAskPastorQuestions(),
    pollRepo.countPolls(),
    resourceRepo.countPublishedResources(),
    countActiveCommunityArtists(),
  ]);

  const [featuredTestimonies, trendingDevotionals, recentPrayerRequests] = await Promise.all([
    testimonyRepo.findFeaturedTestimonies(FEATURED_TESTIMONIES_LIMIT),
    devotionalRepo.findTrendingDevotionals(TRENDING_DEVOTIONALS_LIMIT),
    findRecentActivePrayerRequests(RECENT_PRAYER_REQUESTS_LIMIT),
  ]);

  return {
    statusCode: 200,
    data: {
      categoryCounts: {
        devotionals: devotionalsCount,
        testimonies: testimoniesCount,
        prayerRequests: prayerRequestsCount,
        askAPastor: questionsCount,
        polls: pollsCount,
        resources: resourcesCount,
        artists: artistsCount,
        promoteYourContent: 0,
      },
      featuredTestimonies: (featuredTestimonies as unknown as Record<string, unknown>[]).map(
        shapeTestimonyListItem
      ),
      trendingDevotionals: (trendingDevotionals as unknown as Record<string, unknown>[]).map(
        shapeDevotionalListItem
      ),
      recentPrayerRequests: (recentPrayerRequests as unknown as Record<string, unknown>[]).map(
        shapePrayerRequestListItem
      ),
    },
    message: 'Community data loaded.',
  };
}

export async function getCommunityHighlights(): Promise<{
  statusCode: number;
  data: unknown;
  message: string;
}> {
  const { mergeCommunityHighlights } = await import('../communityHighlights.service');

  const [testimoniesRes, devotionalsRes, prayerRes] = await Promise.all([
    testimonyRepo.listPublishedTestimonies({
      filter: mergePublicFilter({ status: 'published' }, publishedTextContentCompletenessFilter()),
      sort: { createdAt: -1 },
      skip: 0,
      limit: 4,
    }),
    devotionalRepo.findTrendingDevotionals(4),
    findRecentActivePrayerRequests(4),
  ]);

  const highlights = mergeCommunityHighlights({
    testimonies: testimoniesRes.items as unknown as Record<string, unknown>[],
    devotionals: devotionalsRes as unknown as Record<string, unknown>[],
    prayerRequests: prayerRes as unknown as Record<string, unknown>[],
    limit: 6,
  });

  return {
    statusCode: 200,
    data: { highlights },
    message: 'Community highlights loaded.',
  };
}
