import type mongoose from 'mongoose';
import { HomeAdvert } from '../models/homeAdvert';
import { clampPublicCatalogLimit } from '../constants/pagination';
import type { HomeAdvertSlot, IHomeAdvert } from '../lib/types/constants';

export const PUBLIC_HOME_ADVERT_SORT = {
  slot: 1,
  displayOrder: 1,
  createdAt: 1,
} as const;

export type PublicHomeAdvertRow = {
  _id: mongoose.Types.ObjectId;
  slot: HomeAdvertSlot;
  imageUrl: string;
  linkUrl?: string;
  displayOrder: number;
  createdAt: Date;
};

export type PublicHomeAdvertDto = {
  _id: string;
  slot: HomeAdvertSlot;
  imageUrl: string;
  linkUrl?: string;
  displayOrder: number;
  createdAt: string;
};

export function mapPublicHomeAdvertRowToDto(row: PublicHomeAdvertRow): PublicHomeAdvertDto {
  return {
    _id: row._id.toString(),
    slot: row.slot,
    imageUrl: row.imageUrl,
    linkUrl: row.linkUrl,
    displayOrder: row.displayOrder,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function listActiveHomeAdverts(limit?: number): Promise<PublicHomeAdvertRow[]> {
  const cappedLimit = clampPublicCatalogLimit(limit);

  const items = await HomeAdvert.find({
    isActive: true,
    imageUrl: { $exists: true, $nin: ['', null] },
  })
    .sort(PUBLIC_HOME_ADVERT_SORT)
    .limit(cappedLimit)
    .lean<IHomeAdvert[]>();

  return items.map(a => ({
    _id: a._id,
    slot: a.slot,
    imageUrl: a.imageUrl,
    linkUrl: a.linkUrl,
    displayOrder: a.displayOrder ?? 0,
    createdAt: a.createdAt,
  }));
}
