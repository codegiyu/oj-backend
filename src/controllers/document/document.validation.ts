export const listDocumentsQuerystringSchema = {
  querystring: {
    type: 'object',
    properties: {
      page: { type: 'string' },
      limit: { type: 'string' },
      status: { type: 'string' },
      entityType: { type: 'string' },
      entityId: { type: 'string' },
      intent: { type: 'string' },
      sort: { type: 'string' },
    },
  },
} as const;

export const getDocumentDetailsParamsSchema = {
  params: {
    type: 'object',
    required: ['documentId'],
    properties: {
      documentId: { type: 'string' },
    },
  },
} as const;

export const verifyDocumentBodySchema = {
  body: {
    type: 'object',
    properties: {
      documentId: { type: 'string' },
      key: { type: 'string' },
    },
  },
} as const;

export const verifyDocumentAdminParamsSchema = {
  params: {
    type: 'object',
    required: ['documentId'],
    properties: {
      documentId: { type: 'string' },
    },
  },
} as const;
