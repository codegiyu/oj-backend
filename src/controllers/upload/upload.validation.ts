export const presignedUrlBodySchema = {
  body: {
    type: 'object',
    required: ['entityType', 'entityId', 'intent'],
    properties: {
      entityType: { type: 'string' },
      entityId: { type: 'string' },
      intent: { type: 'string' },
      fileExtension: { type: 'string' },
      contentType: { type: 'string' },
      files: {
        type: 'array',
        maxItems: 20,
        items: {
          type: 'object',
          required: ['fileExtension'],
          properties: {
            fileExtension: { type: 'string' },
            contentType: { type: 'string' },
          },
        },
      },
    },
  },
} as const;
