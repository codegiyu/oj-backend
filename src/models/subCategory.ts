import { Schema, model, type Model, Types } from 'mongoose';
import type { ModelSubCategory } from '../lib/types/constants';
import { generateSubCategorySlug } from '../utils/helpers';
import { Category } from './category';

const subCategorySchema = new Schema<ModelSubCategory>(
  {
    category: { type: Schema.Types.ObjectId, ref: 'Category', required: true, index: true },
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, index: true },
    displayOrder: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true, collection: 'subcategories' }
);

subCategorySchema.index({ category: 1, slug: 1 }, { unique: true });
subCategorySchema.index({ category: 1, displayOrder: 1 });

subCategorySchema.pre('save', async function (this) {
  if (!this.isModified('name') && !this.isModified('category')) return;

  const SubCategoryModel = model<ModelSubCategory>('SubCategory');

  const slug = await generateSubCategorySlug(
    Category,
    SubCategoryModel as Model<{ slug: string; category: Types.ObjectId }>,
    this.category,
    this.name
  );
  this.slug = slug;
});

export const SubCategory = model<ModelSubCategory>('SubCategory', subCategorySchema);
