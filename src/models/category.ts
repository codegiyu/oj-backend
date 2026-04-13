import { Schema, model, type Model } from 'mongoose';
import type { ModelCategory } from '../lib/types/constants';
import { generateCategorySlug } from '../utils/helpers';

const categorySchema = new Schema<ModelCategory>(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, index: true },
    displayOrder: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true, collection: 'categories' }
);

categorySchema.index({ displayOrder: 1 });

categorySchema.pre('save', async function (this) {
  if (!this.isModified('name')) return;

  const CategoryModel = model<ModelCategory>('Category');
  const slug = await generateCategorySlug(CategoryModel as Model<{ slug: string }>, this.name);
  this.slug = slug;
});

export const Category = model<ModelCategory>('Category', categorySchema);
