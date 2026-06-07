import { describe, expect, it } from 'vitest';
import {
  shapeArtistDetail,
  shapeArtistListItem,
} from '../../src/controllers/public/community.helpers';

describe('community.helpers artist shapers', () => {
  it('shapeArtistListItem uses followerCount, stats, and isFollowing', () => {
    const shaped = shapeArtistListItem(
      {
        _id: '507f1f77bcf86cd799439011',
        name: 'Artist',
        slug: 'artist',
        image: 'img.jpg',
        genre: 'Gospel',
        followerCount: 42,
        user: '507f1f77bcf86cd799439099',
      },
      { stats: { songs: 5, videos: 2 }, isFollowing: true }
    );

    expect(shaped).toMatchObject({
      followers: 42,
      verified: true,
      songs: 5,
      videos: 2,
      isFollowing: true,
    });
  });

  it('shapeArtistDetail includes detail fields and list stats', () => {
    const shaped = shapeArtistDetail(
      {
        _id: '507f1f77bcf86cd799439011',
        name: 'Artist',
        slug: 'artist',
        coverImage: 'cover.jpg',
        bio: 'Bio',
        socials: { youtube: 'https://youtube.com' },
        followerCount: 10,
      },
      { stats: { songs: 1, videos: 0 }, isFollowing: false }
    );

    expect(shaped).toMatchObject({
      followers: 10,
      songs: 1,
      coverImage: 'cover.jpg',
      bio: 'Bio',
      isFollowing: false,
    });
  });
});
