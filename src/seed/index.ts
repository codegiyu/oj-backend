import { seedMarketplaceCategories } from './functions';
import { logger } from '../utils/logger';

export { seedMarketplaceCategories } from './functions';

/**
 * Main seed entry: run any enabled seed/migration steps.
 * Uncomment the steps you need. Safe to run on every startup or via npm run seed.
 */
export const seedDb = async (): Promise<void> => {
  try {
    // Idempotent: upsert categories and subcategories from MARKETPLACE_CATEGORIES
    await seedMarketplaceCategories();

    // Add more seed steps here as needed, e.g.:
    // await seedRolesAndPermissions();
    // await seedSuperAdmin();
  } catch (error) {
    logger.error('seedDb failed', { error });
    throw error;
  }
};
