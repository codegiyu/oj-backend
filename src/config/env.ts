import dotenv from 'dotenv';

dotenv.config();

export type Environment = {
  readonly nodeEnv: string;
  readonly port: number;
  readonly host: string;
  readonly databaseUrl: string;
  readonly jwt: {
    readonly secret: string;
    readonly expiresIn: string;
    readonly refreshSecret: string;
    readonly refreshExpiresIn: string;
    readonly accessCookieMaxAge: number;
    readonly refreshCookieMaxAge: number;
  };
  readonly tokenNames: {
    readonly cookies: {
      readonly access: string;
      readonly refresh: string;
    };
  };
  readonly google: {
    readonly clientId: string;
    readonly clientSecret: string;
  };
  readonly redis: {
    readonly url: string;
    readonly cacheExpiry: number;
  };
  readonly aws: {
    readonly accessKeyId: string;
    readonly secretAccessKey: string;
    readonly region: string;
    readonly s3Bucket: string;
  };
  readonly r2: {
    readonly accountId: string;
    readonly accessKeyId: string;
    readonly secretAccessKey: string;
    readonly bucketName: string;
    readonly folderPrefix: string;
    readonly cdnUrl: string;
    readonly publicUrl: string;
  };
  readonly email: {
    readonly smtp: {
      readonly host: string;
      readonly port: number;
      readonly secure: boolean;
      readonly user: string;
      readonly pass: string;
    };
    readonly from: string;
    readonly fromName: string;
  };
  readonly branding: {
    readonly appName: string;
    readonly primaryColor: string;
    readonly secondaryColor: string;
    readonly fontFamily: string;
    readonly supportEmail: string;
    readonly logoUrl: string;
  };
  readonly cors: {
    readonly origin: string;
  };
  readonly rateLimit: {
    readonly max: number;
    readonly timeWindow: number;
  };
  readonly appUrls: {
    readonly adminAppUrl: string;
    readonly clientAppUrl: string;
  };
};

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379/0';

export const ENVIRONMENT: Environment = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3000', 10),
  host: process.env.HOST || '0.0.0.0',
  databaseUrl: process.env.DATABASE_URL || 'mongodb://localhost:27017/oj-multimedia',
  jwt: {
    secret: process.env.JWT_SECRET || 'your-secret-key',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    refreshSecret: process.env.REFRESH_TOKEN_SECRET || 'your-refresh-secret-key',
    refreshExpiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN || '30d',
    accessCookieMaxAge: parseInt(
      process.env.ACCESS_COOKIE_MAX_AGE || String(7 * 24 * 60 * 60),
      10
    ),
    refreshCookieMaxAge: parseInt(
      process.env.REFRESH_COOKIE_MAX_AGE || String(30 * 24 * 60 * 60),
      10
    ),
  },
  tokenNames: {
    cookies: {
      access: process.env.TOKEN_COOKIE_ACCESS || 'oj-acc-token',
      refresh: process.env.TOKEN_COOKIE_REFRESH || 'oj-ref-token',
    },
  },
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID || '',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
  },
  redis: {
    url: redisUrl,
    cacheExpiry: parseInt(process.env.CACHE_EXPIRY || '3600', 10),
  },
  aws: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
    region: process.env.AWS_REGION || 'us-east-1',
    s3Bucket: process.env.S3_BUCKET_NAME || '',
  },
  r2: {
    accountId: process.env.R2_ACCOUNT_ID || '',
    accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
    bucketName: process.env.R2_BUCKET_NAME || '',
    folderPrefix: process.env.R2_FOLDER_PREFIX || 'staging-files',
    cdnUrl: process.env.R2_CDN_URL || '',
    publicUrl: process.env.R2_PUBLIC_URL || '',
  },
  email: {
    smtp: {
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587', 10),
      secure: process.env.SMTP_SECURE === 'true',
      user: process.env.SMTP_USER || '',
      pass: process.env.SMTP_PASS || '',
    },
    from: process.env.EMAIL_FROM || 'noreply@example.com',
    fromName: process.env.EMAIL_FROM_NAME || 'OJ Multimedia',
  },
  branding: {
    appName: process.env.APP_NAME || 'OJ Multimedia',
    primaryColor: process.env.PRIMARY_COLOR || '#2563EB',
    secondaryColor: process.env.SECONDARY_COLOR || '#404040',
    fontFamily: process.env.FONT_FAMILY || 'Poppins',
    supportEmail: process.env.SUPPORT_EMAIL || 'ohemultimedia@gmail.com',
    logoUrl: process.env.LOGO_URL || '',
  },
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  },
  rateLimit: {
    max: parseInt(process.env.RATE_LIMIT_MAX || '100', 10),
    timeWindow: parseInt(process.env.RATE_LIMIT_TIME_WINDOW || '60000', 10),
  },
  appUrls: {
    adminAppUrl: process.env.ADMIN_APP_URL || 'http://localhost:3001',
    clientAppUrl: process.env.CLIENT_APP_URL || 'http://localhost:3000',
  },
};
