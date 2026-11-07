export const loginBodySchema = {
  body: {
    type: 'object',
    additionalProperties: false,
    required: ['email', 'password'],
    properties: {
      email: { type: 'string' },
      password: { type: 'string', minLength: 8, maxLength: 256 },
    },
  },
} as const;

export const googleLoginBodySchema = {
  body: {
    type: 'object',
    additionalProperties: false,
    required: ['googleCode'],
    properties: {
      googleCode: { type: 'string' },
    },
  },
} as const;

export const requestOTPBodySchema = {
  body: {
    type: 'object',
    additionalProperties: false,
    required: ['email', 'scope'],
    properties: {
      email: { type: 'string' },
      scope: { type: 'string', enum: ['verify-email'] },
    },
  },
} as const;

export const verifyOTPBodySchema = {
  body: {
    type: 'object',
    additionalProperties: false,
    required: ['code', 'email', 'scope'],
    properties: {
      code: { type: 'string' },
      email: { type: 'string' },
      scope: { type: 'string', enum: ['verify-email'] },
    },
  },
} as const;

export const requestPasswordResetBodySchema = {
  body: {
    type: 'object',
    additionalProperties: false,
    required: ['email', 'scope'],
    properties: {
      email: { type: 'string' },
      scope: { type: 'string', enum: ['reset-password'] },
      accessType: { type: 'string', enum: ['client', 'console'] },
    },
  },
} as const;

export const resetPasswordBodySchema = {
  body: {
    type: 'object',
    additionalProperties: false,
    required: ['scopeToken', 'email', 'password', 'confirmPassword'],
    properties: {
      scopeToken: { type: 'string' },
      email: { type: 'string' },
      password: { type: 'string', minLength: 8, maxLength: 256 },
      confirmPassword: { type: 'string', minLength: 8, maxLength: 256 },
    },
  },
} as const;

export const changePasswordBodySchema = {
  body: {
    type: 'object',
    additionalProperties: false,
    required: ['currentPassword', 'password', 'confirmPassword'],
    properties: {
      currentPassword: { type: 'string', minLength: 8, maxLength: 256 },
      password: { type: 'string', minLength: 8, maxLength: 256 },
      confirmPassword: { type: 'string', minLength: 8, maxLength: 256 },
    },
  },
} as const;
