import mongoose, { Schema, model } from 'mongoose';
import type { IProductVariant, IVariationOption } from '../lib/types/constants';
import { ModelProduct } from '../lib/types/constants';

const variationOptionSchema = new Schema<IVariationOption>(
  {
    name: { type: String, required: true },
    values: { type: [String], required: true },
  },
  { _id: false }
);

const productVariantSchema = new Schema<IProductVariant>(
  {
    options: { type: Schema.Types.Mixed, required: true },
    price: { type: Number, required: true },
    inStock: { type: Boolean, required: true },
    isDefault: { type: Boolean, default: false },
    sku: { type: String, default: '' },
    image: { type: String, default: '' },
  },
  { _id: false }
);

const productSchema = new Schema<ModelProduct>(
  {
    name: { type: String, required: true },
    slug: { type: String, required: true, index: true },
    vendor: { type: Schema.Types.ObjectId, ref: 'Vendor', required: true, index: true },
    description: { type: String, default: '' },
    category: { type: Schema.Types.ObjectId, ref: 'Category', default: null, index: true },
    subCategory: { type: Schema.Types.ObjectId, ref: 'SubCategory', default: null, index: true },
    tags: { type: [String], default: [] },
    price: { type: Number, required: true },
    images: { type: [String], default: [] },
    inStock: { type: Boolean, default: true },
    variationOptions: { type: [variationOptionSchema], default: undefined },
    variants: { type: [productVariantSchema], default: undefined },
    status: {
      type: String,
      enum: ['draft', 'published', 'archived'],
      default: 'draft',
      index: true,
    },
    isFeatured: { type: Boolean, default: false },
    displayOrder: { type: Number, default: 0 },
    rejectionReason: { type: String, default: '' },
    rejectedAt: { type: Date, default: null },
    rejectedBy: { type: Schema.Types.ObjectId, ref: 'Admin', default: null },
    approvedAt: { type: Date, default: null },
    approvedBy: { type: Schema.Types.ObjectId, ref: 'Admin', default: null },
  },
  { timestamps: true, collection: 'products' }
);

/** Generate Cartesian product of option name->values. Returns array of option key-value maps. */
function getAllCombinations(opts: IVariationOption[]): Record<string, string>[] {
  if (opts.length === 0) return [{}];
  const [first, ...rest] = opts;
  const restCombos = getAllCombinations(rest);
  const result: Record<string, string>[] = [];
  for (const value of first.values) {
    for (const combo of restCombos) {
      result.push({ ...combo, [first.name]: value });
    }
  }
  return result;
}

/** Normalize options to a comparable key (sorted key=value pairs). */
function optionsKey(options: Record<string, string>): string {
  return Object.keys(options)
    .sort()
    .map(k => `${k}=${options[k]}`)
    .join('|');
}

/** Generate default SKU from slug and options (uppercase). */
function defaultSku(slug: string, options: Record<string, string>): string {
  const parts = Object.keys(options)
    .sort()
    .map(k => String(options[k]).replace(/\s+/g, '-'));
  return `${slug}-${parts.join('-')}`.toUpperCase().replace(/[^A-Z0-9-]/gi, '');
}

productSchema.pre('save', function (this: ModelProduct, ...args: unknown[]) {
  const next = args[args.length - 1] as (err?: Error) => void;
  const doc = this;
  const opts = doc.variationOptions;
  const vars = doc.variants;

  if (!opts?.length || !vars?.length) {
    return next();
  }

  const requiredCombos = new Set(getAllCombinations(opts).map(c => optionsKey(c)));
  const seen = new Set<string>();

  for (const v of vars) {
    const key = optionsKey(v.options);
    if (!requiredCombos.has(key)) {
      return next(
        new Error(
          `Variant options ${JSON.stringify(v.options)} do not match variationOptions; every combination must exist exactly once.`
        )
      );
    }
    if (seen.has(key)) {
      return next(new Error(`Duplicate variant for combination: ${key}`));
    }
    seen.add(key);
  }

  if (seen.size !== requiredCombos.size) {
    const missing = [...requiredCombos].filter(k => !seen.has(k));
    return next(
      new Error(`Missing variants for combination(s): ${missing.join(', ')}. Every combination of variationOptions must have one variant.`)
    );
  }

  for (const v of doc.variants!) {
    if (v.sku == null || String(v.sku).trim() === '') {
      v.sku = defaultSku(doc.slug, v.options);
    } else {
      v.sku = String(v.sku).toUpperCase();
    }
  }

  const defaultCount = doc.variants!.filter(v => v.isDefault === true).length;
  if (defaultCount === 0) {
    doc.variants![0].isDefault = true;
  } else if (defaultCount > 1) {
    const firstIndex = doc.variants!.findIndex(v => v.isDefault === true);
    doc.variants!.forEach((v, i) => {
      v.isDefault = i === firstIndex;
    });
  }

  const anyInStock = doc.variants!.some(v => v.inStock === true);
  const allOutOfStock = doc.variants!.every(v => v.inStock === false);
  if (allOutOfStock) {
    doc.inStock = false;
  } else if (anyInStock) {
    doc.inStock = true;
  }

  next();
});

productSchema.index({ vendor: 1, status: 1 });
productSchema.index({ category: 1, status: 1 });
productSchema.index({ slug: 1, vendor: 1 }, { unique: true });

export const Product =
  mongoose.models.Product || model<ModelProduct>('Product', productSchema);
