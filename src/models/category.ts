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

(categorySchema.pre as any)('save', function (this: ICategory & mongoose.Document, next: (err?: Error) => void) {
  if (!this.isModified('name')) return next();

  const CategoryModel = mongoose.models.Category || model<ICategory>('Category', categorySchema);

  generateCategorySlug(CategoryModel as mongoose.Model<{ slug: string }>, this.name)
    .then(slug => {
      this.slug = slug;
      next();
    })
    .catch(err => next(err as Error));
});

export const Category =
  mongoose.models.Category || model<ICategory>('Category', categorySchema);

