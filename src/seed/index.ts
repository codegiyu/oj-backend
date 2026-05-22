/* eslint-disable @typescript-eslint/require-await */
import { logger } from '../utils/logger';
// import { seedContentCategories } from './functions';

export {
  seedMarketplaceCategories,
  seedPromotionContent,
  seedRoles,
  seedSiteSettings,
  seedAdmins,
  seedContentCategories,
  seedGospelVerses,
} from './functions';

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
    // await seedContentCategories();
    // await seedGospelVerses();
  } catch (error) {
    logger.error('seedDb failed', { error });
    throw error;
  }
};
