import mongoose from 'mongoose';
import { ENVIRONMENT } from './env';
import { logger } from '../utils/logger';

export const connectDb = async (): Promise<void> => {
  try {
    await mongoose.connect(ENVIRONMENT.databaseUrl);
    logger.info('MongoDB connected');
  } catch (error) {
    logger.error('MongoDB connection error:', error);
    throw error;
  }
};

export const disconnectDb = async (): Promise<void> => {
  try {
    await mongoose.disconnect();
    logger.info('MongoDB disconnected');
  } catch (error) {
    logger.error('MongoDB disconnect error:', error);
    throw error;
  }
};
