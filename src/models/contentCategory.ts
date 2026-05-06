import { Schema, model, type Model } from 'mongoose';
import { CONTENT_CATEGORY_SCOPES, type ModelContentCategory } from '../lib/types/constants';
import { generateUniqueSlug } from '../utils/helpers';

const contentCategorySchema = new Schema<ModelContentCategory>(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, lowercase: true, trim: true, index: true },
    scope: {
      type: String,
      required: true,
      enum: CONTENT_CATEGORY_SCOPES,
      index: true,
    },
    displayOrder: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true, collection: 'contentcategories' }
);

contentCategorySchema.index({ scope: 1, isActive: 1, displayOrder: 1 });
contentCategorySchema.index({ scope: 1, slug: 1 }, { unique: true });

contentCategorySchema.pre('save', async function (this: ModelContentCategory) {
  if (!this.isModified('name')) return;
  const ContentCategoryModel = model<ModelContentCategory>('ContentCategory');
  const scopeFilter: Record<string, unknown> = { scope: this.scope };
  if (this._id) {
    scopeFilter._id = { $ne: this._id };
  }
  const slug = await generateUniqueSlug(
    ContentCategoryModel as Model<{ slug: string }>,
    this.name,
    scopeFilter
  );
  this.slug = slug;
});

export const ContentCategory = model<ModelContentCategory>(
  'ContentCategory',
  contentCategorySchema
);
