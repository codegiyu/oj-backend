export const loginBodySchema = {
  body: {
    type: 'object',
    required: ['email', 'password'],
    properties: {
      email: { type: 'string' },
      password: { type: 'string' },
    },
  },
} as const;

export const googleLoginBodySchema = {
  body: {
    type: 'object',
    required: ['googleCode'],
    properties: {
      googleCode: { type: 'string' },
    },
  },
} as const;

export const requestOTPBodySchema = {
  body: {
    type: 'object',
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
    required: ['code', 'email', 'scope'],
    properties: {
      code: { type: 'string' },
      email: { type: 'string' },
      scope: { type: 'string' },
    },
  },
} as const;

export const requestPasswordResetBodySchema = {
  body: {
    type: 'object',
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
    required: ['scopeToken', 'email', 'password', 'confirmPassword'],
    properties: {
      scopeToken: { type: 'string' },
      email: { type: 'string' },
      password: { type: 'string' },
      confirmPassword: { type: 'string' },
    },
  },
} as const;

export const changePasswordBodySchema = {
  body: {
    type: 'object',
    required: ['currentPassword', 'password', 'confirmPassword'],
    properties: {
      currentPassword: { type: 'string' },
      password: { type: 'string' },
      confirmPassword: { type: 'string' },
    },
  },
} as const;
