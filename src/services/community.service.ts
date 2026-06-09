/**
 * Community public API — re-export facade for backward-compatible imports.
 */

export { getCommunity, getCommunityHighlights } from './community/communityOverview.service';

export { listDevotionals, getDevotionalByIdOrSlug } from './community/devotionals.service';

export {
  listTestimonies,
  getTestimonyByIdOrSlug,
  submitTestimony,
} from './community/testimonies.service';

export {
  listPrayerRequests,
  getPrayerRequestByIdOrSlug,
  submitPrayerRequest,
  recordPrayerForRequest,
  getPrayerRequestsHub,
} from './community/prayerRequests.service';

export {
  listAskAPastorQuestions,
  getAskAPastorQuestionByIdOrSlug,
  getAskAPastorPastorByIdOrSlug,
  listAskAPastorPastors,
  submitQuestion,
  voteAskPastorQuestion,
  likeAskPastorAnswer,
  getAskAPastorHub,
} from './community/askPastorCommunity.service';

export { listPolls, getPollByIdOrSlug, createPoll, votePoll } from './community/polls.service';

export {
  listCommunityArtists,
  getCommunityArtistByIdOrSlug,
} from './community/communityArtists.service';

export {
  listResourceCounts,
  listResources,
  getResourceByIdOrSlug,
} from './community/communityResources.service';
