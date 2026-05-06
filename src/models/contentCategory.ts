import mongoose, { Schema, model } from 'mongoose';
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

type UpdateDoc = Record<string, unknown> & { $set?: Record<string, unknown> };

async function buildCategorySlug(
  name: string,
  scope: string,
  excludeId?: unknown
): Promise<string> {
  const ContentCategoryModel = model<ModelContentCategory>('ContentCategory');
  const uniquenessFilter: Record<string, unknown> = { scope };
  if (excludeId) uniquenessFilter._id = { $ne: excludeId };
  return generateUniqueSlug(ContentCategoryModel, name, uniquenessFilter);
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const resolveUpdateValue = (update: UpdateDoc | undefined, path: string): unknown => {
  if (!update) return undefined;

  const segments = path.split('.');
  const traverse = (source: unknown) => {
    if (!isRecord(source)) return undefined;
    return segments.reduce<unknown>((acc, segment) => {
      if (isRecord(acc) && Object.prototype.hasOwnProperty.call(acc, segment)) {
        return acc[segment];
      }
      return undefined;
    }, source);
  };

  if (Object.prototype.hasOwnProperty.call(update, path)) {
    return update[path];
  }

  const directNested = traverse(update);
  if (directNested !== undefined) return directNested;

  if (isRecord(update.$set)) {
    if (Object.prototype.hasOwnProperty.call(update.$set, path)) {
      return update.$set[path];
    }
    const nestedSet = traverse(update.$set);
    if (nestedSet !== undefined) return nestedSet;
  }

  return undefined;
};

contentCategorySchema.pre('save', async function (this: ModelContentCategory) {
  if (!this.isModified('name')) return;
  this.slug = await buildCategorySlug(this.name, this.scope, this._id);
});
contentCategorySchema.pre(
  /update/i,
  async function (this: mongoose.Query<unknown, ModelContentCategory>) {
    const update = this.getUpdate() as UpdateDoc | undefined;
    if (!update) return;

    const newName = resolveUpdateValue(update, 'name');
    if (!newName || typeof newName !== 'string') return;

    const filter = this.getQuery() as Record<string, unknown>;
    const existing = await model<ModelContentCategory>('ContentCategory')
      .findOne(filter)
      .select('_id scope')
      .lean<ModelContentCategory | null>();

    if (!existing) return;

    const updatedScope = resolveUpdateValue(update, 'scope');
    const scopeCandidate =
      typeof updatedScope === 'string'
        ? updatedScope
        : typeof existing.scope === 'string'
          ? existing.scope
          : '';
    const scope = scopeCandidate.trim();

    if (!scope) return;

    const generatedSlug = await buildCategorySlug(newName.trim(), scope, existing._id);

    if (!isRecord(update.$set)) {
      update.$set = {};
    }

    update.$set.name = newName.trim();
    update.$set.slug = generatedSlug;

    this.setUpdate(update);
  }
);

export const ContentCategory = model<ModelContentCategory>(
  'ContentCategory',
  contentCategorySchema
);
