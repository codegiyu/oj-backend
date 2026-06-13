export const MARKETPLACE_ORDER_RATE_LIMIT = {
  max: 10,
  timeWindow: '10 minutes',
  keyGenerator: (request: { ip: string }) => request.ip,
  errorResponseBuilder: () => ({
    statusCode: 429,
    success: false,
    message: 'Too many order attempts. Please wait 10 minutes.',
    responseCode: 429,
  }),
} as const;
