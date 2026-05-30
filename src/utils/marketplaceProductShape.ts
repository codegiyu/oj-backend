import mongoose from 'mongoose';

type PopulatedVendor = {
  _id?: mongoose.Types.ObjectId;
  storeName?: string;
  slug?: string;
  whatsapp?: string;
} | null;

type PopulatedCategory = {
  _id?: mongoose.Types.ObjectId;
  name?: string;
  slug?: string;
} | null;

type PopulatedSubCategory = {
  _id?: mongoose.Types.ObjectId;
  name?: string;
  slug?: string;
  category?: mongoose.Types.ObjectId;
} | null;

export function shapeMarketplaceProductRow(row: Record<string, unknown>): Record<string, unknown> {
  const v = row.vendor as PopulatedVendor;
  const c = row.category as PopulatedCategory;
  const s = row.subCategory as PopulatedSubCategory;

  return {
    ...row,
    vendorName: v?.storeName ?? null,
    vendorSlug: v?.slug ?? null,
    vendorWhatsapp: v?.whatsapp ?? null,
    vendor: (v?._id ?? row.vendor)?.toString(),
    category: c
      ? {
          _id: c._id?.toString(),
          name: c.name,
          slug: c.slug,
        }
      : undefined,
    subCategory: s
      ? {
          _id: s._id?.toString(),
          name: s.name,
          slug: s.slug,
          category: s.category?.toString(),
        }
      : undefined,
  };
}
