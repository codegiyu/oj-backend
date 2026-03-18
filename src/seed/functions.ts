import mongoose from 'mongoose';
import { slugify } from '../utils/helpers';
import { logger } from '../utils/logger';
import { Category } from '../models/category';
import { SubCategory } from '../models/subCategory';
import { MARKETPLACE_CATEGORIES } from '../lib/seed/marketplaceCategories';

/**
 * Seeds Category and SubCategory documents from MARKETPLACE_CATEGORIES.
 * Idempotent: upserts by slug (category) and by category + slug (subcategory).
 * Safe to run on every startup or via npm run seed.
 */
export const seedMarketplaceCategories = async (): Promise<void> => {
  let categoriesCreated = 0;
  let categoriesUpdated = 0;
  let subCategoriesCreated = 0;
  let subCategoriesUpdated = 0;

  for (let order = 0; order < MARKETPLACE_CATEGORIES.length; order++) {
    const cat = MARKETPLACE_CATEGORIES[order];
    const categorySlug = slugify(cat.name);

    const existingCategory = await Category.findOne({ slug: categorySlug })
      .select('_id slug name')
      .lean();

    const categoryDoc = await Category.findOneAndUpdate(
      { slug: categorySlug },
      {
        $set: {
          name: cat.name,
          displayOrder: order,
          isActive: true,
        },
        $setOnInsert: {
          slug: categorySlug,
        },
      },
      { upsert: true, returnDocument: 'after', runValidators: true }
    );

    if (existingCategory) {
      categoriesUpdated += 1;
    } else {
      categoriesCreated += 1;
    }

    const categoryId = (categoryDoc as { _id: mongoose.Types.ObjectId })._id;

    for (let subOrder = 0; subOrder < cat.subCategories.length; subOrder++) {
      const sub = cat.subCategories[subOrder];
      const subSlug = `${categorySlug}-${slugify(sub.name)}`;

      const existingSub = await SubCategory.findOne({
        category: categoryId,
        slug: subSlug,
      })
        .select('_id')
        .lean();

      await SubCategory.findOneAndUpdate(
        { category: categoryId, slug: subSlug },
        {
          $set: {
            name: sub.name,
            displayOrder: subOrder,
            isActive: true,
          },
          $setOnInsert: {
            category: categoryId,
            slug: subSlug,
          },
        },
        { upsert: true, returnDocument: 'after', runValidators: true }
      );

      if (existingSub) {
        subCategoriesUpdated += 1;
      } else {
        subCategoriesCreated += 1;
      }
    }
  }

  logger.info(
    `seedMarketplaceCategories: ${categoriesCreated} categories created, ${categoriesUpdated} updated; ` +
      `${subCategoriesCreated} subcategories created, ${subCategoriesUpdated} updated`
  );
};
