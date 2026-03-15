import type { FastifySchema } from 'fastify';

const statusEnum = ['draft', 'published', 'archived'] as const;

export const updateArtistMeBodySchema: FastifySchema = {
  body: {
    type: 'object',
    properties: {
      name: { type: 'string' },
      bio: { type: 'string' },
      image: { type: 'string' },
      coverImage: { type: 'string' },
      genre: { type: 'string' },
      socials: {
        type: 'object',
        properties: {
          facebook: { type: 'string' },
          instagram: { type: 'string' },
          twitter: { type: 'string' },
          youtube: { type: 'string' },
          website: { type: 'string' },
        },
      },
    },
  },
};

export const listMusicQuerystringSchema: FastifySchema = {
  querystring: {
    type: 'object',
    properties: {
      page: { type: 'string', pattern: '^[0-9]+$' },
      limit: { type: 'string', pattern: '^[0-9]+$' },
      status: { type: 'string', enum: statusEnum },
      search: { type: 'string' },
      sort: { type: 'string' },
    },
  },
};

export const listVideosQuerystringSchema: FastifySchema = {
  querystring: {
    type: 'object',
    properties: {
      page: { type: 'string', pattern: '^[0-9]+$' },
      limit: { type: 'string', pattern: '^[0-9]+$' },
      status: { type: 'string', enum: statusEnum },
      search: { type: 'string' },
      sort: { type: 'string' },
    },
  },
};

/** Shared param schema for music/video resource id (GET/PATCH/DELETE). */
export const resourceIdParamSchema: FastifySchema = {
  params: {
    type: 'object',
    required: ['id'],
    properties: { id: { type: 'string' } },
  },
};

export const createMusicBodySchema: FastifySchema = {
  body: {
    type: 'object',
    required: ['title'],
    properties: {
      title: { type: 'string' },
      description: { type: 'string' },
      lyrics: { type: 'string' },
      coverImage: { type: 'string' },
      audioUrl: { type: 'string' },
      videoUrl: { type: 'string' },
      category: { type: 'string' },
      isMonetizable: { type: 'boolean' },
    },
  },
};

export const updateMusicSchema: FastifySchema = {
  params: {
    type: 'object',
    required: ['id'],
    properties: { id: { type: 'string' } },
  },
  body: {
    type: 'object',
    properties: {
      title: { type: 'string' },
      description: { type: 'string' },
      lyrics: { type: 'string' },
      coverImage: { type: 'string' },
      audioUrl: { type: 'string' },
      videoUrl: { type: 'string' },
      category: { type: 'string' },
      status: { type: 'string', enum: statusEnum },
      isMonetizable: { type: 'boolean' },
    },
  },
};

export const createVideoBodySchema: FastifySchema = {
  body: {
    type: 'object',
    required: ['title'],
    properties: {
      title: { type: 'string' },
      description: { type: 'string' },
      thumbnail: { type: 'string' },
      videoUrl: { type: 'string' },
      category: { type: 'string' },
      isMonetizable: { type: 'boolean' },
    },
  },
};

export const updateVideoSchema: FastifySchema = {
  params: {
    type: 'object',
    required: ['id'],
    properties: { id: { type: 'string' } },
  },
  body: {
    type: 'object',
    properties: {
      title: { type: 'string' },
      description: { type: 'string' },
      thumbnail: { type: 'string' },
      videoUrl: { type: 'string' },
      category: { type: 'string' },
      status: { type: 'string', enum: statusEnum },
      isMonetizable: { type: 'boolean' },
    },
  },
};
