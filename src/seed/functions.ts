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
import { ContentCategory } from '../models/contentCategory';
import { GospelVerse } from '../models/gospelVerse';
import { authService } from '../services/auth.service';
import { ICategory, IRole, ISubCategory, type ContentCategoryScope } from '../lib/types/constants';
import { ADMIN_PERMISSIONS, DEFAULT_ADMIN_ROLE_PERMISSIONS } from '../constants/adminPermissions';
import { permissionsForRoleSlug } from '../services/adminPermission.service';

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
      .lean<ICategory>();

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
        .lean<ISubCategory>();

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
      features: [
        'Trending feed placement',
        'Improved discovery potential',
        'Weekly promotion window',
      ],
      icon: 'trending-up',
      displayOrder: 2,
    },
    {
      title: 'Social Media Promo',
      duration: 'Flexible',
      price: '₦5,000 - ₦10,000',
      description: 'Promote your content across social channels with flexible budget options.',
      features: [
        'Multi-channel promo support',
        'Flexible campaign scope',
        'Audience growth support',
      ],
      icon: 'mail',
      displayOrder: 3,
    },
  ];

  const pricingOptions = [
    {
      title: 'Basic Listing',
      price: '₦5,000',
      description: 'Solid starting package for creators looking for essential visibility.',
      features: [
        'Standard listing placement',
        'Basic promotional coverage',
        'Great for new releases',
      ],
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
      features: [
        'Artist-focused placement',
        'Brand visibility boost',
        'Stronger profile awareness',
      ],
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
    {
      slug: 'super-admin' as const,
      name: 'Super Admin',
      description: 'Full platform access',
      permissions: ADMIN_PERMISSIONS,
    },
    {
      slug: 'admin' as const,
      name: 'Admin',
      description: 'Administrator access',
      permissions: DEFAULT_ADMIN_ROLE_PERMISSIONS.map(slug =>
        ADMIN_PERMISSIONS.find(permission => permission.slug === slug)
      ).filter((permission): permission is (typeof ADMIN_PERMISSIONS)[number] =>
        Boolean(permission)
      ),
    },
    {
      slug: 'customer' as const,
      name: 'Customer',
      description: 'Customer/user access',
      permissions: [],
    },
  ];

  for (const r of roles) {
    await Role.findOneAndUpdate(
      { slug: r.slug },
      { $set: { name: r.name, description: r.description, permissions: r.permissions } },
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

  // If more than one SiteSettings document exists, delete all but one
  if (siteSettingsCount > 1) {
    const docs = await SiteSettings.find();
    if (docs.length > 1) {
      // Keep the first one, remove the rest
      const idsToDelete = docs.slice(1).map(doc => doc._id);
      await SiteSettings.deleteMany({ _id: { $in: idsToDelete } });
      logger.info(`seedSiteSettings: Deleted ${idsToDelete.length} extra site settings documents`);
    }
  }

  await SiteSettings.findOneAndUpdate(
    { name: 'settings' },
    { $set: defaultSiteSettings },
    { upsert: true, runValidators: true }
  );

  await SiteSettings.findOne();

  logger.info('seedSiteSettings: site settings upserted');
};

const ADMIN_SEED_PASSWORD = 'Admin@123';

type SeedContentCategory = {
  scope: ContentCategoryScope;
  name: string;
  displayOrder: number;
};

const CONTENT_CATEGORY_SEEDS: SeedContentCategory[] = [
  // Music
  { scope: 'music', name: 'Afrobeats', displayOrder: 1 },
  { scope: 'music', name: 'Hip-Hop', displayOrder: 2 },
  { scope: 'music', name: 'Pop', displayOrder: 3 },
  { scope: 'music', name: 'R&B', displayOrder: 4 },
  { scope: 'music', name: 'Gospel', displayOrder: 5 },
  { scope: 'music', name: 'Instrumental', displayOrder: 6 },
  { scope: 'music', name: 'Acoustic', displayOrder: 7 },
  { scope: 'music', name: 'Worship', displayOrder: 8 },
  { scope: 'music', name: 'Spoken Word', displayOrder: 9 },
  { scope: 'music', name: 'Sermon', displayOrder: 10 },
  // Videos
  { scope: 'video', name: 'Music Videos', displayOrder: 1 },
  { scope: 'video', name: 'Short Clips', displayOrder: 2 },
  { scope: 'video', name: 'Talks & Speeches', displayOrder: 3 },
  { scope: 'video', name: 'Creative Content', displayOrder: 4 },
  { scope: 'video', name: 'Inspirational', displayOrder: 5 },
  { scope: 'video', name: 'Live Performances', displayOrder: 6 },
  { scope: 'video', name: 'Podcasts / Video Talks', displayOrder: 7 },
  { scope: 'video', name: 'Sermons', displayOrder: 8 },
  { scope: 'video', name: 'Movies', displayOrder: 9 },
  { scope: 'video', name: 'Drama', displayOrder: 10 },
  // News
  { scope: 'news', name: 'Christian Celebrity News', displayOrder: 1 },
  { scope: 'news', name: 'Church & Ministry Announcements', displayOrder: 2 },
  { scope: 'news', name: 'Inspirational Stories', displayOrder: 3 },
  { scope: 'news', name: 'Scholarship Alerts', displayOrder: 4 },
  { scope: 'news', name: 'Jobs (NGO / Faith-based)', displayOrder: 5 },
  { scope: 'news', name: 'Christian Movie Reviews', displayOrder: 6 },
  // Devotionals
  { scope: 'devotional', name: 'Faith', displayOrder: 1 },
  { scope: 'devotional', name: 'Peace & Rest', displayOrder: 2 },
  { scope: 'devotional', name: 'Growth', displayOrder: 3 },
  { scope: 'devotional', name: 'Purpose', displayOrder: 4 },
  { scope: 'devotional', name: 'Prayer', displayOrder: 5 },
  // Resources
  { scope: 'resource', name: 'Bible Study', displayOrder: 1 },
  { scope: 'resource', name: 'Sermons', displayOrder: 2 },
  { scope: 'resource', name: 'Templates', displayOrder: 3 },
  { scope: 'resource', name: 'Music', displayOrder: 4 },
  { scope: 'resource', name: 'Wallpapers', displayOrder: 5 },
  { scope: 'resource', name: 'Affiliate', displayOrder: 6 },
  // Testimonies
  { scope: 'testimony', name: 'Healing', displayOrder: 1 },
  { scope: 'testimony', name: 'Purpose', displayOrder: 2 },
  { scope: 'testimony', name: 'Prayer', displayOrder: 3 },
  { scope: 'testimony', name: 'Marriage', displayOrder: 4 },
  { scope: 'testimony', name: 'Provision', displayOrder: 5 },
  { scope: 'testimony', name: 'Deliverance', displayOrder: 6 },
  { scope: 'testimony', name: 'Salvation', displayOrder: 7 },
  { scope: 'testimony', name: 'Blessing', displayOrder: 8 },
  // Prayer requests
  { scope: 'prayer-request', name: 'Healing', displayOrder: 1 },
  { scope: 'prayer-request', name: 'Finance', displayOrder: 2 },
  { scope: 'prayer-request', name: 'Family', displayOrder: 3 },
  { scope: 'prayer-request', name: 'Career', displayOrder: 4 },
  { scope: 'prayer-request', name: 'Spiritual', displayOrder: 5 },
  { scope: 'prayer-request', name: 'Protection', displayOrder: 6 },
  { scope: 'prayer-request', name: 'Other', displayOrder: 7 },
  // Polls
  { scope: 'poll', name: 'Worship', displayOrder: 1 },
  { scope: 'poll', name: 'Spiritual Growth', displayOrder: 2 },
  { scope: 'poll', name: 'Content', displayOrder: 3 },
  { scope: 'poll', name: 'Devotionals', displayOrder: 4 },
  { scope: 'poll', name: 'Sermons', displayOrder: 5 },
  { scope: 'poll', name: 'Ministry', displayOrder: 6 },
  { scope: 'poll', name: 'Prayer', displayOrder: 7 },
  { scope: 'poll', name: 'Social Media', displayOrder: 8 },
  // Ask-a-pastor questions
  { scope: 'question', name: 'Faith', displayOrder: 1 },
  { scope: 'question', name: 'Relationships', displayOrder: 2 },
  { scope: 'question', name: 'Spiritual Growth', displayOrder: 3 },
  { scope: 'question', name: 'Finance', displayOrder: 4 },
  { scope: 'question', name: 'Bible Study', displayOrder: 5 },
  { scope: 'question', name: 'Prayer', displayOrder: 6 },
];

export const seedContentCategories = async (): Promise<void> => {
  let created = 0;
  let updated = 0;

  // Temporary reset requested: clear all content categories before reseeding.
  // await ContentCategory.deleteMany({});

  for (const category of CONTENT_CATEGORY_SEEDS) {
    const categorySlug = slugify(category.name);

    const existing = await ContentCategory.findOne({
      scope: category.scope,
      slug: categorySlug,
    })
      .select('_id')
      .lean();

    // Filter keys (scope, slug) must not repeat in $set/$setOnInsert — MongoDB upsert conflicts (code 40).
    await ContentCategory.findOneAndUpdate(
      { scope: category.scope, slug: categorySlug },
      {
        $set: {
          name: category.name,
          displayOrder: category.displayOrder,
          isActive: true,
        },
      },
      { upsert: true, runValidators: true, setDefaultsOnInsert: true }
    );

    if (existing) updated += 1;
    else created += 1;
  }

  logger.info(`seedContentCategories: ${created} created, ${updated} updated`);
};

/**
 * Seeds admin accounts. Idempotent: upserts by email, updates password if admin exists.
 * Admins: ohemultimedia@gmail.com, eomegbu@gmail.com (both password: Admin@123)
 */
export const seedAdmins = async (): Promise<void> => {
  await seedRoles(); // Ensure roles exist first

  const superAdminRole = await Role.findOne({ slug: 'super-admin' }).lean<IRole>();
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
          'auth.roles': [{ slug: superAdminRole.slug, roleId: superAdminRole._id }],
          'auth.permissions': permissionsForRoleSlug(superAdminRole.slug)
            .map(slug => ADMIN_PERMISSIONS.find(permission => permission.slug === slug))
            .filter((permission): permission is (typeof ADMIN_PERMISSIONS)[number] =>
              Boolean(permission)
            ),
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

/** Idempotent sample gospel verses for admin dashboard / local dev. */
export const seedGospelVerses = async (): Promise<void> => {
  const samples = [
    {
      verse: 'For God so loved the world, that he gave his only begotten Son.',
      reference: 'John 3:16',
      date: new Date(),
      isActive: true,
    },
    {
      verse: 'I can do all things through Christ which strengtheneth me.',
      reference: 'Philippians 4:13',
      date: new Date(Date.now() + 86400000),
      isActive: true,
    },
  ];

  for (const sample of samples) {
    const existing = await GospelVerse.findOne({
      reference: sample.reference,
      verse: sample.verse,
    })
      .select('_id')
      .lean();

    if (existing) {
      await GospelVerse.updateOne({ _id: existing._id }, { $set: sample });
      continue;
    }

    await GospelVerse.create(sample);
  }

  logger.info('seedGospelVerses: sample verses upserted');
};
