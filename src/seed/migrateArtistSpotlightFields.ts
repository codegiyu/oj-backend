import { Artist } from '../models/artist';

/**
 * One-time: copy legacy isFeatured/displayOrder into music spotlight fields.
 */
export async function migrateArtistSpotlightFields(): Promise<{ updated: number }> {
  const result = await Artist.updateMany(
    {
      $or: [
        { isMusicFeatured: { $exists: false } },
        { isRising: { $exists: false } },
        { isCreatorSpotlight: { $exists: false } },
      ],
    },
    [
      {
        $set: {
          isMusicFeatured: { $ifNull: ['$isMusicFeatured', '$isFeatured'] },
          isRising: { $ifNull: ['$isRising', false] },
          isCreatorSpotlight: { $ifNull: ['$isCreatorSpotlight', false] },
          musicFeaturedDisplayOrder: {
            $ifNull: ['$musicFeaturedDisplayOrder', '$displayOrder'],
          },
          risingArtistDisplayOrder: { $ifNull: ['$risingArtistDisplayOrder', 0] },
          creatorSpotlightDisplayOrder: { $ifNull: ['$creatorSpotlightDisplayOrder', 0] },
        },
      },
    ]
  );

  return { updated: result.modifiedCount };
}
