import mongoose from 'mongoose';
import { slugify } from '../utils/helpers';
import { logger } from '../utils/logger';
import { Category } from '../models/category';
import { SubCategory } from '../models/subCategory';
import { MARKETPLACE_CATEGORIES } from '../lib/seed/marketplaceCategories';
import { FeaturedOption } from '../models/featuredOption';
import { PromotionPricingOption } from '../models/promotionPricingOption';
import { ResourceDownloadCategory } from '../models/resourceDownloadCategory';
import { ContactMethod } from '../models/contactMethod';
import { PartnershipBenefit } from '../models/partnershipBenefit';
import { Role } from '../models/role';
import { SiteSettings, defaultSiteSettings } from '../models/siteSettings';
import { Admin } from '../models/admin';
import { authService } from '../services/auth.service';

/** Seed email used for both ContactMethod and admins */
const SEED_EMAIL = 'ohemultimedia@gmail.com';

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

export const seedPromotionContent = async (): Promise<void> => {
  const featuredOptions = [
    {
      title: 'Homepage Slider Banner',
      duration: '1 Week',
      price: '₦10,000',
      description: 'Get premium placement on the homepage slider to maximize daily visibility.',
      features: ['Homepage top placement', 'High-visibility banner slot', 'Priority exposure'],
      icon: 'home',
      displayOrder: 1,
    },
    {
      title: 'Trending Section',
      duration: '1 Week',
      price: '₦8,000',
      description: 'Appear inside the trending section for stronger discoverability.',
      features: ['Trending feed placement', 'Improved discovery potential', 'Weekly promotion window'],
      icon: 'trending-up',
      displayOrder: 2,
    },
    {
      title: 'Social Media Promo',
      duration: 'Flexible',
      price: '₦5,000 - ₦10,000',
      description: 'Promote your content across social channels with flexible budget options.',
      features: ['Multi-channel promo support', 'Flexible campaign scope', 'Audience growth support'],
      icon: 'mail',
      displayOrder: 3,
    },
  ];

  const pricingOptions = [
    {
      title: 'Basic Listing',
      price: '₦5,000',
      description: 'Solid starting package for creators looking for essential visibility.',
      features: ['Standard listing placement', 'Basic promotional coverage', 'Great for new releases'],
      isFeatured: false,
      displayOrder: 1,
    },
    {
      title: 'Featured Song',
      price: '₦8,000',
      description: 'Most popular plan with enhanced exposure and better placement.',
      features: ['Featured tag visibility', 'Priority listing position', 'Boosted audience reach'],
      isFeatured: true,
      displayOrder: 2,
    },
    {
      title: 'Artist Spotlight',
      price: '₦7,000',
      description: 'Highlight your artist brand and music with dedicated spotlight placement.',
      features: ['Artist-focused placement', 'Brand visibility boost', 'Stronger profile awareness'],
      isFeatured: false,
      displayOrder: 3,
    },
  ];

  const downloadCategories = [
    {
      title: 'Free E-books',
      count: '12+',
      description: 'Download practical e-books crafted to support your growth and creativity.',
      icon: '📚',
      href: '#free-ebooks',
      displayOrder: 1,
    },
    {
      title: 'Sermon Templates',
      count: '25+',
      description: 'Access reusable sermon templates for ministry preparation and planning.',
      icon: '📄',
      href: '/community/resources',
      displayOrder: 2,
    },
    {
      title: 'Free Beats',
      count: '50+',
      description: 'Explore free beats for writing, recording, and content production.',
      icon: '🎵',
      href: '#free-beats',
      displayOrder: 3,
    },
    {
      title: 'Wallpapers',
      count: '100+',
      description: 'Get inspirational wallpapers for mobile, desktop, and social sharing.',
      icon: '🖼️',
      href: '#wallpapers',
      displayOrder: 4,
    },
  ];

  const contactMethods = [
    {
      method: 'Email',
      value: SEED_EMAIL,
      action: `mailto:${SEED_EMAIL}`,
      icon: 'mail',
      displayOrder: 1,
    },
    {
      method: 'Phone',
      value: '+234 705 692 3436',
      action: 'tel:+2347056923436',
      icon: 'phone',
      displayOrder: 2,
    },
    {
      method: 'WhatsApp',
      value: '+234 913 667 0466',
      action: 'https://wa.me/2349136670466',
      icon: 'message-square',
      displayOrder: 3,
    },
  ];

  const partnershipBenefits = [
    { text: 'Long-term sponsorship opportunities', displayOrder: 1 },
    { text: 'Custom advertising solutions', displayOrder: 2 },
    { text: 'Brand visibility across all platforms', displayOrder: 3 },
    { text: 'Dedicated account manager', displayOrder: 4 },
    { text: 'Performance tracking and reports', displayOrder: 5 },
    { text: 'Flexible pricing and payment options', displayOrder: 6 },
  ];

  for (const item of featuredOptions) {
    await FeaturedOption.findOneAndUpdate(
      { title: item.title },
      { $set: { ...item, isActive: true } },
      { upsert: true, runValidators: true }
    );
  }

  for (const item of pricingOptions) {
    await PromotionPricingOption.findOneAndUpdate(
      { title: item.title },
      { $set: { ...item, isActive: true } },
      { upsert: true, runValidators: true }
    );
  }

  for (const item of downloadCategories) {
    await ResourceDownloadCategory.findOneAndUpdate(
      { title: item.title },
      { $set: { ...item, isActive: true } },
      { upsert: true, runValidators: true }
    );
  }

  for (const item of contactMethods) {
    await ContactMethod.findOneAndUpdate(
      { method: item.method },
      { $set: { ...item, isActive: true } },
      { upsert: true, runValidators: true }
    );
  }

  for (const item of partnershipBenefits) {
    await PartnershipBenefit.findOneAndUpdate(
      { text: item.text },
      { $set: { ...item, isActive: true } },
      { upsert: true, runValidators: true }
    );
  }

  logger.info('seedPromotionContent: promotion content upserted');
};

/**
 * Seeds Role documents (super-admin, admin, customer).
 * Idempotent: upserts by slug.
 */
export const seedRoles = async (): Promise<void> => {
  const roles = [
    { slug: 'super-admin' as const, name: 'Super Admin', description: 'Full platform access' },
    { slug: 'admin' as const, name: 'Admin', description: 'Administrator access' },
    { slug: 'customer' as const, name: 'Customer', description: 'Customer/user access' },
  ];

  for (const r of roles) {
    await Role.findOneAndUpdate(
      { slug: r.slug },
      { $set: { name: r.name, description: r.description } },
      { upsert: true, runValidators: true }
    );
  }

  logger.info('seedRoles: roles upserted');
};

/**
 * Seeds site settings (singleton). Idempotent: upserts default settings from model.
 */
export const seedSiteSettings = async (): Promise<void> => {
  const siteSettingsCount = await SiteSettings.countDocuments();
  logger.info(`seedSiteSettings: number of site settings documents: ${siteSettingsCount}`);

  await SiteSettings.findOneAndUpdate(
    { name: 'settings' },
    { $setOnInsert: defaultSiteSettings },
    { upsert: true, runValidators: true }
  );

  const siteSettings = await SiteSettings.findOne();
  console.log('siteSettings', siteSettings);

  logger.info('seedSiteSettings: site settings upserted');
};

const ADMIN_SEED_PASSWORD = 'Admin@123';

/**
 * Seeds admin accounts. Idempotent: upserts by email, updates password if admin exists.
 * Admins: ohemultimedia@gmail.com, eomegbu@gmail.com (both password: Admin@123)
 */
export const seedAdmins = async (): Promise<void> => {
  await seedRoles(); // Ensure roles exist first

  const superAdminRole = await Role.findOne({ slug: 'super-admin' }).lean();
  if (!superAdminRole) {
    logger.warn('seedAdmins: super-admin role not found, skipping admin seed');
    return;
  }

  const admins = [
    { email: SEED_EMAIL, firstName: 'OJ', lastName: 'Multimedia' },
    { email: 'eomegbu@gmail.com', firstName: 'Code', lastName: 'Giyu' },
  ];

  const hashedPassword = await authService.hashPassword(ADMIN_SEED_PASSWORD);
  if (!hashedPassword) {
    logger.warn('seedAdmins: failed to hash password, skipping');
    return;
  }

  for (const a of admins) {
    const email = a.email.toLowerCase().trim();
    const existing = await Admin.findOne({ email }).select('_id').lean();

    await Admin.findOneAndUpdate(
      { email },
      {
        $set: {
          firstName: a.firstName,
          lastName: a.lastName,
          accountStatus: 'active',
          'auth.password.value': hashedPassword,
          'auth.roles': [
            { slug: superAdminRole.slug, roleId: superAdminRole._id },
          ],
        },
      },
      { upsert: true, runValidators: true }
    );

    if (existing) {
      logger.info(`seedAdmins: admin ${email} updated`);
    } else {
      logger.info(`seedAdmins: admin ${email} created`);
    }
  }

  logger.info('seedAdmins: admin accounts seeded');
};
