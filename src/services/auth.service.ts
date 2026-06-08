import bcrypt from 'bcrypt';
import { logger } from '../utils/logger';

export async function hashPassword(password: string): Promise<string> {
  const saltRounds = 12;
  return bcrypt.hash(password, saltRounds);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  try {
    return bcrypt.compare(password, hash);
  } catch (error) {
    logger.error('Error comparing passwords:', error);
    return false;
  }
}
