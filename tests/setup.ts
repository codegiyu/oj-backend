process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret';
process.env.REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET || 'test-refresh-secret';
process.env.DATABASE_URL = process.env.DATABASE_URL || 'mongodb://localhost:27017/oj-test';
process.env.REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379/1';
