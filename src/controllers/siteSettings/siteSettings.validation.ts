import type { FastifySchema } from 'fastify';

const SLICE_NAMES = [
  'all',
  'appDetails',
  'seo',
  'legal',
  'email',
  'features',
  'analytics',
  'localization',
  'branding',
  'contactInfo',
  'socials',
] as const;

export type SiteSettingsSlice = (typeof SLICE_NAMES)[number];

export const getSiteSettingsParamsSchema: FastifySchema = {
  params: {
    type: 'object',
    properties: {
      slice: { type: 'string', enum: SLICE_NAMES },
    },
    required: ['slice'],
  },
};

export const updateSiteSettingsBodySchema: FastifySchema = {
  body: {
    type: 'object',
    required: ['settingsPayload'],
    properties: {
      settingsPayload: {
        type: 'array',
        items: {
          type: 'object',
          required: ['name', 'value'],
          properties: {
            name: { type: 'string', enum: SLICE_NAMES.filter(s => s !== 'all') },
            value: {},
          },
        },
      },
    },
  },
};
