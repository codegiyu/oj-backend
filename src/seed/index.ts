import { logger } from '../utils/logger';
// import { backfillMediaMetadataOnce } from './backfillMediaMetadata';
// import { wipePastorAskDataOnce } from './wipePastorAskData';
import { seedContentCategories } from './functions';

export {
  seedMarketplaceCategories,
  seedPromotionContent,
  seedRoles,
  seedSiteSettings,
  seedAdmins,
  seedContentCategories,
  seedGospelVerses,
} from './functions';

export { backfillMediaMetadataOnce } from './backfillMediaMetadata';
export { migrateVideoMovieCategoryOnce } from './migrateVideoMovieCategory';
export { migrateArtistSpotlightFieldsOnce } from './migrateArtistSpotlightFields';
export { bootstrapMediaDailyMetricsOnce } from './bootstrapMediaDailyMetricsOnce';
export { wipePastorAskDataOnce } from './wipePastorAskData';
export { reconcileVendorUserLinksOnce } from './reconcileVendorUserLinks';

import { reconcileVendorUserLinksOnce } from './reconcileVendorUserLinks';
import { migrateArtistSpotlightFieldsOnce } from './migrateArtistSpotlightFields';
import { bootstrapMediaDailyMetricsOnce } from './bootstrapMediaDailyMetricsOnce';
import { migrateVideoMovieCategoryOnce } from './migrateVideoMovieCategory';

/**
 * Main seed entry: run any enabled seed/migration steps.
 * Uncomment the steps you need. Safe to run on every startup or via npm run seed.
 */
export const seedDb = async (): Promise<void> => {
  try {
    // Roles, site settings, and admins (admins depend on roles)
    // await seedSiteSettings();
    // await seedRoles();
    // await seedAdmins();
    // Idempotent: upsert categories and subcategories from MARKETPLACE_CATEGORIES
    // await seedMarketplaceCategories();
    // await seedPromotionContent();
    await seedContentCategories();
    // await seedGospelVerses();
    // await wipePastorAskDataOnce();
    // await backfillMediaMetadataOnce();
    await migrateVideoMovieCategoryOnce();
    await reconcileVendorUserLinksOnce();
    await migrateArtistSpotlightFieldsOnce();
    await bootstrapMediaDailyMetricsOnce();
  } catch (error) {
    logger.error('seedDb failed', { error });
    throw error;
  }
};
