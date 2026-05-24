export const adminArtistPopulate = {
  path: 'artist' as const,
  select: '_id name slug image user',
  populate: { path: 'user', select: '_id' },
};

export const adminAlbumSummaryPopulate = {
  path: 'album' as const,
  select: '_id title slug',
};

export const adminMusicPopulate = [adminArtistPopulate, adminAlbumSummaryPopulate];
