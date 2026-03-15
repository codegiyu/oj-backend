import bcrypt from 'bcrypt';
import { logger } from '../utils/logger';

export class AuthService {
  async hashPassword(password: string): Promise<string> {
    const saltRounds = 12;
    return bcrypt.hash(password, saltRounds);
  }

  async comparePassword(password: string, hash: string): Promise<boolean> {
    try {
      return bcrypt.compare(password, hash);
    } catch (error) {
      logger.error('Error comparing passwords:', error);
      return false;
    }
  }

  generateTokenPayload(userId: string, email: string): { userId: string; email: string } {
    return {
      userId,
      email,
    };
  }
}

export const authService = new AuthService();
