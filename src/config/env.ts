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
    readonly headers: {
      readonly access: string;
      readonly refresh: string;
    };
  };
  readonly auth: {
    readonly requireRefreshToken: boolean;
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
  readonly domain: string;
};

export class EnvironmentValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'EnvironmentValidationError';
  }
}

const MIN_SECRET_LENGTH = 16;

const DEV_JWT_SECRET = 'dev-only-jwt-secret-32chars-minimum!';
const DEV_REFRESH_SECRET = 'dev-only-refresh-secret-32chars-min!';

const LEGACY_INSECURE_SECRETS = new Set([
  'your-secret-key',
  'your-refresh-secret-key',
  'your-super-secret-jwt-key-change-in-production',
  'your-super-secret-refresh-token-key-change-in-production',
  DEV_JWT_SECRET,
  DEV_REFRESH_SECRET,
]);

const ALLOWED_NODE_ENVS = new Set(['development', 'test', 'production', 'staging']);

function resolveNodeEnv(raw: NodeJS.ProcessEnv): string {
  const value = raw.NODE_ENV?.trim() || 'development';

  return ALLOWED_NODE_ENVS.has(value) ? value : 'development';
}

function usesDevDefaults(nodeEnv: string): boolean {
  return nodeEnv === 'development' || nodeEnv === 'test';
}

function assertProductionSecret(name: string, value: string): void {
  const trimmed = value.trim();

  if (!trimmed) {
    throw new EnvironmentValidationError(`${name} is required when NODE_ENV=production`);
  }

  if (LEGACY_INSECURE_SECRETS.has(trimmed)) {
    throw new EnvironmentValidationError(
      `${name} must not use a placeholder or default value in production`
    );
  }

  if (trimmed.length < MIN_SECRET_LENGTH) {
    throw new EnvironmentValidationError(
      `${name} must be at least ${MIN_SECRET_LENGTH} characters when NODE_ENV=production`
    );
  }
}

function resolveSecrets(
  raw: NodeJS.ProcessEnv,
  nodeEnv: string
): { jwtSecret: string; refreshSecret: string; databaseUrl: string } {
  const jwtSecretInput = raw.JWT_SECRET?.trim() ?? '';
  const refreshSecretInput = raw.REFRESH_TOKEN_SECRET?.trim() ?? '';
  const databaseUrlInput = raw.DATABASE_URL?.trim() ?? '';

  if (nodeEnv === 'production') {
    if (!databaseUrlInput) {
      throw new EnvironmentValidationError('DATABASE_URL is required when NODE_ENV=production');
    }

    assertProductionSecret('JWT_SECRET', jwtSecretInput);
    assertProductionSecret('REFRESH_TOKEN_SECRET', refreshSecretInput);

    return {
      jwtSecret: jwtSecretInput,
      refreshSecret: refreshSecretInput,
      databaseUrl: databaseUrlInput,
    };
  }

  if (usesDevDefaults(nodeEnv)) {
    return {
      jwtSecret: jwtSecretInput || DEV_JWT_SECRET,
      refreshSecret: refreshSecretInput || DEV_REFRESH_SECRET,
      databaseUrl: databaseUrlInput || 'mongodb://localhost:27017/oj-multimedia',
    };
  }

  if (!databaseUrlInput) {
    throw new EnvironmentValidationError(`DATABASE_URL is required when NODE_ENV=${nodeEnv}`);
  }

  assertProductionSecret('JWT_SECRET', jwtSecretInput);
  assertProductionSecret('REFRESH_TOKEN_SECRET', refreshSecretInput);

  return {
    jwtSecret: jwtSecretInput,
    refreshSecret: refreshSecretInput,
    databaseUrl: databaseUrlInput,
  };
}

export function loadEnvironment(raw: NodeJS.ProcessEnv = process.env): Environment {
  const nodeEnv = resolveNodeEnv(raw);
  const { jwtSecret, refreshSecret, databaseUrl } = resolveSecrets(raw, nodeEnv);
  const redisUrl = raw.REDIS_URL?.trim() || 'redis://localhost:6379/0';

  return {
    nodeEnv,
    port: parseInt(raw.PORT || '3000', 10),
    host: raw.HOST || '0.0.0.0',
    databaseUrl,
    jwt: {
      secret: jwtSecret,
      expiresIn: raw.JWT_EXPIRES_IN || '7d',
      refreshSecret,
      refreshExpiresIn: raw.REFRESH_TOKEN_EXPIRES_IN || '30d',
      accessCookieMaxAge: parseInt(raw.ACCESS_COOKIE_MAX_AGE || String(7 * 24 * 60 * 60), 10),
      refreshCookieMaxAge: parseInt(
        raw.REFRESH_COOKIE_MAX_AGE || String(30 * 24 * 60 * 60),
        10
      ),
    },
    tokenNames: {
      cookies: {
        access: raw.TOKEN_COOKIE_ACCESS || 'oj-acc-token',
        refresh: raw.TOKEN_COOKIE_REFRESH || 'oj-ref-token',
      },
      headers: {
        access: raw.TOKEN_HEADER_ACCESS || raw.TOKEN_COOKIE_ACCESS || 'oj-acc-token',
        refresh: raw.TOKEN_HEADER_REFRESH || raw.TOKEN_COOKIE_REFRESH || 'oj-ref-token',
      },
    },
    auth: {
      requireRefreshToken: raw.REQUIRE_REFRESH_TOKEN === 'true',
    },
    google: {
      clientId: raw.GOOGLE_CLIENT_ID || '',
      clientSecret: raw.GOOGLE_CLIENT_SECRET || '',
    },
    redis: {
      url: redisUrl,
      cacheExpiry: parseInt(raw.CACHE_EXPIRY || '3600', 10),
    },
    aws: {
      accessKeyId: raw.AWS_ACCESS_KEY_ID || '',
      secretAccessKey: raw.AWS_SECRET_ACCESS_KEY || '',
      region: raw.AWS_REGION || 'us-east-1',
      s3Bucket: raw.S3_BUCKET_NAME || '',
    },
    r2: {
      accountId: raw.R2_ACCOUNT_ID || '',
      accessKeyId: raw.R2_ACCESS_KEY_ID || '',
      secretAccessKey: raw.R2_SECRET_ACCESS_KEY || '',
      bucketName: raw.R2_BUCKET_NAME || '',
      folderPrefix: raw.R2_FOLDER_PREFIX || 'staging-files',
      cdnUrl: raw.R2_CDN_URL || '',
      publicUrl: raw.R2_PUBLIC_URL || '',
    },
    email: {
      smtp: {
        host: raw.SMTP_HOST || 'smtp.gmail.com',
        port: parseInt(raw.SMTP_PORT || '587', 10),
        secure: raw.SMTP_SECURE === 'true',
        user: raw.SMTP_USER || '',
        pass: raw.SMTP_PASS || '',
      },
      from: raw.EMAIL_FROM || 'noreply@example.com',
      fromName: raw.EMAIL_FROM_NAME || 'OJ Multimedia',
    },
    branding: {
      appName: raw.APP_NAME || 'OJ Multimedia',
      primaryColor: raw.PRIMARY_COLOR || '#2563EB',
      secondaryColor: raw.SECONDARY_COLOR || '#404040',
      fontFamily: raw.FONT_FAMILY || 'Poppins',
      supportEmail: raw.SUPPORT_EMAIL || 'ohemultimedia@gmail.com',
      logoUrl: raw.LOGO_URL || '',
    },
    cors: {
      origin: raw.CORS_ORIGIN || 'http://localhost:3000',
    },
    rateLimit: {
      max: parseInt(raw.RATE_LIMIT_MAX || '100', 10),
      timeWindow: parseInt(raw.RATE_LIMIT_TIME_WINDOW || '60000', 10),
    },
    appUrls: {
      adminAppUrl: raw.ADMIN_APP_URL || 'http://localhost:3001',
      clientAppUrl: raw.CLIENT_APP_URL || 'http://localhost:3000',
    },
    domain: raw.DOMAIN || 'localhost',
  };
}

export const ENVIRONMENT: Environment = loadEnvironment(process.env);
