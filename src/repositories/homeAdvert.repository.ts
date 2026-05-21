import type mongoose from 'mongoose';
import { HomeAdvert } from '../models/homeAdvert';
import { clampPublicCatalogLimit } from '../constants/pagination';
import type { IHomeAdvert } from '../lib/types/constants';

export type PublicHomeAdvertRow = Pick<IHomeAdvert, 'slot' | 'imageUrl' | 'displayOrder'> & {
  _id: mongoose.Types.ObjectId;
  linkUrl?: string;
};

export async function listActiveHomeAdverts(limit?: number): Promise<PublicHomeAdvertRow[]> {
  const cappedLimit = clampPublicCatalogLimit(limit);

  const items = await HomeAdvert.find({ isActive: true })
    .sort({ slot: 1, displayOrder: 1 })
    .limit(cappedLimit)
    .lean<IHomeAdvert[]>();

  return items.map(a => ({
    _id: a._id,
    slot: a.slot,
    imageUrl: a.imageUrl,
    linkUrl: a.linkUrl,
    displayOrder: a.displayOrder ?? 0,
  }));
}
