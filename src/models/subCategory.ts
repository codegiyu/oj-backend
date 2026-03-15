import mongoose, { Schema, model } from 'mongoose';
import { generateSubCategorySlug } from '../utils/helpers';
import { Category } from './category';

export interface ISubCategory {
  _id: mongoose.Types.ObjectId;
  category: mongoose.Types.ObjectId;
  name: string;
  slug: string;
  displayOrder: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const subCategorySchema = new Schema<ISubCategory>(
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

(subCategorySchema.pre as any)('save', function (
  this: ISubCategory & mongoose.Document,
  next: (err?: Error) => void
) {
  if (!this.isModified('name') && !this.isModified('category')) return next();

  const SubCategoryModel =
    mongoose.models.SubCategory || model<ISubCategory>('SubCategory', subCategorySchema);

  generateSubCategorySlug(
    Category,
    SubCategoryModel as mongoose.Model<{ slug: string; category: mongoose.Types.ObjectId }>,
    this.category,
    this.name
  )
    .then(slug => {
      this.slug = slug;
      next();
    })
    .catch(err => next(err as Error));
});

export const SubCategory =
  mongoose.models.SubCategory || model<ISubCategory>('SubCategory', subCategorySchema);

