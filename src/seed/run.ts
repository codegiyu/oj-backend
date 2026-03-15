/**
 * Standalone seed script. Connects to DB, runs seedDb(), then disconnects.
 * Usage: npm run seed
 */
import { connectDb, disconnectDb } from '../config/db';
import { seedDb } from './index';
import { logger } from '../utils/logger';

const run = async (): Promise<void> => {
  try {
    await connectDb();
    logger.info('Running seed...');
    await seedDb();
    logger.info('Seed completed successfully');
  } catch (error) {
    logger.error('Seed failed', { error });
    process.exit(1);
  } finally {
    await disconnectDb();
    process.exit(0);
  }
};

run();
