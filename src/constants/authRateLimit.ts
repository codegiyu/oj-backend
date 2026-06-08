export const AUTH_SENSITIVE_RATE_LIMIT = {
  max: 5,
  timeWindow: '10 minutes',
  keyGenerator: (request: { ip: string }) => request.ip,
  errorResponseBuilder: () => ({
    statusCode: 429,
    success: false,
    message: 'Too many attempts. Please wait 10 minutes.',
    responseCode: 429,
  }),
} as const;
