import { describe, expect, it, vi, beforeEach } from 'vitest';
import { AppError } from '../../src/utils/AppError';
import {
  handlePresignedUrlRequest,
  resolveContentType,
} from '../../src/controllers/upload/upload.controller';

vi.mock('../../src/services/r2.service', () => ({
  generatePresignedUrl: vi.fn(async () => ({
    filename: 'test.jpg',
    url: 'https://upload.example/presigned',
    key: 'media/test.jpg',
    publicUrl: 'https://cdn.example/test.jpg',
  })),
  getContentTypeFromExtension: vi.fn((ext: string) => {
    const types: Record<string, string> = {
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      webp: 'image/webp',
      mp3: 'audio/mpeg',
      wav: 'audio/wav',
    };
    return types[ext] ?? 'application/octet-stream';
  }),
}));

vi.mock('../../src/models/document', () => ({
  Document: {
    create: vi.fn(async (data: Record<string, unknown>) => ({
      _id: { toString: () => '507f1f77bcf86cd799439011' },
      ...data,
    })),
  },
}));

describe('upload.controller shared helpers', () => {
  describe('resolveContentType', () => {
    it('prefers extension-derived type over generic browser MIME', () => {
      expect(resolveContentType('mp3', 'application/octet-stream', 'other')).toBe('audio/mpeg');
    });

    it('uses audio/mpeg for mp3 when contentType is empty', () => {
      expect(resolveContentType('mp3', '', 'other')).toBe('audio/mpeg');
    });

    it('prefers explicit non-generic contentType when extension is unknown', () => {
      expect(resolveContentType('xyz', 'image/png', 'image')).toBe('image/png');
    });

    it('derives from extension when contentType is absent', () => {
      expect(resolveContentType('webp', undefined, 'image')).toBe('image/webp');
    });

    it('defaults avatar intents to image/jpeg', () => {
      expect(resolveContentType('', undefined, 'avatar')).toBe('image/jpeg');
    });
  });

  describe('handlePresignedUrlRequest', () => {
    const reply = {
      status: vi.fn().mockReturnThis(),
      send: vi.fn(),
    };

    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('rejects disallowed client intents via allowedIntents', async () => {
      await expect(
        handlePresignedUrlRequest(
          {
            entityType: 'user',
            entityId: '507f1f77bcf86cd799439011',
            intent: 'audio',
            fileExtension: 'mp3',
          },
          {
            uploadedByModel: 'User',
            userId: '507f1f77bcf86cd799439011',
            allowedIntents: ['avatar', 'image'],
          },
          reply as never
        )
      ).rejects.toThrow(AppError);
    });

    it('allows admin uploads without allowedIntents restriction', async () => {
      await handlePresignedUrlRequest(
        {
          entityType: 'music',
          entityId: '507f1f77bcf86cd799439011',
          intent: 'image',
          fileExtension: 'jpg',
        },
        {
          uploadedByModel: 'Admin',
          userId: '507f1f77bcf86cd799439099',
        },
        reply as never
      );

      expect(reply.send).toHaveBeenCalled();
    });
  });
});
