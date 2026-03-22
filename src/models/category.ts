import mongoose, { Schema, model } from 'mongoose';
import { generateCategorySlug } from '../utils/helpers';

export interface ICategory {
  _id: mongoose.Types.ObjectId;
  name: string;
  slug: string;
  displayOrder: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const categorySchema = new Schema<ICategory>(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, index: true },
    displayOrder: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true, collection: 'categories' }
);

categorySchema.index({ displayOrder: 1 });

categorySchema.pre('save', async function (this: ICategory & mongoose.Document) {
  if (!this.isModified('name')) return;

  const CategoryModel = mongoose.models.Category || model<ICategory>('Category', categorySchema);
  const slug = await generateCategorySlug(
    CategoryModel as mongoose.Model<{ slug: string }>,
    this.name
  );
  this.slug = slug;
});

export const Category =
  mongoose.models.Category || model<ICategory>('Category', categorySchema);

