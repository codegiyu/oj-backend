import mongoose, { Schema, model } from 'mongoose';
import { generateUniqueSlug } from '../utils/helpers';
import type { ContentCategoryScope } from '../lib/types/constants';

export interface IContentCategoryDoc {
  _id: mongoose.Types.ObjectId;
  name: string;
  slug: string;
  scope: ContentCategoryScope;
  displayOrder: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const contentCategorySchema = new Schema<IContentCategoryDoc>(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, lowercase: true, trim: true, index: true },
    scope: {
      type: String,
      required: true,
      enum: ['music', 'video', 'news', 'devotional'],
      index: true,
    },
    displayOrder: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true, collection: 'contentcategories' }
);

contentCategorySchema.index({ scope: 1, isActive: 1, displayOrder: 1 });
contentCategorySchema.index({ scope: 1, slug: 1 }, { unique: true });

contentCategorySchema.pre('save', async function (this: IContentCategoryDoc & mongoose.Document) {
  if (!this.isModified('name')) return;
  const Model =
    mongoose.models.ContentCategory ||
    model<IContentCategoryDoc>('ContentCategory', contentCategorySchema);
  const scopeFilter: Record<string, unknown> = { scope: this.scope };
  if (this._id) {
    scopeFilter._id = { $ne: this._id };
  }
  const slug = await generateUniqueSlug(
    Model as mongoose.Model<{ slug: string }>,
    this.name,
    scopeFilter
  );
  this.slug = slug;
});

export const ContentCategory =
  mongoose.models.ContentCategory ||
  model<IContentCategoryDoc>('ContentCategory', contentCategorySchema);
