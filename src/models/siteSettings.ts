import mongoose, { Schema, model } from 'mongoose';
import { ModelSiteSettings, SOCIAL_PLATFORMS } from '../lib/types/constants';

const DayHoursSchema = new Schema(
  { start: { type: String, default: null }, end: { type: String, default: null } },
  { _id: false }
);

const OfficeHoursSchema = new Schema(
  {
    monday: { type: DayHoursSchema, default: null },
    tuesday: { type: DayHoursSchema, default: null },
    wednesday: { type: DayHoursSchema, default: null },
    thursday: { type: DayHoursSchema, default: null },
    friday: { type: DayHoursSchema, default: null },
    saturday: { type: DayHoursSchema, default: null },
    sunday: { type: DayHoursSchema, default: null },
  },
  { _id: false }
);

const ContactInfoSchema = new Schema(
  {
    address: { type: [String], default: [] },
    tel: { type: [String], default: [] },
    email: { type: [String], default: [] },
    whatsapp: { type: String, default: '' },
    locationUrl: { type: String, default: '' },
    officeHours: { type: OfficeHoursSchema, required: true, default: () => ({}) },
  },
  { _id: false }
);

const SocialSchema = new Schema(
  {
    platform: { type: String, required: true, enum: SOCIAL_PLATFORMS },
    href: { type: String, required: true },
  },
  { _id: false }
);

const AppDetailsSchema = new Schema(
  {
    logo: { type: String, default: '' },
    appName: { type: String, default: '' },
    description: { type: String, default: '' },
  },
  { _id: false }
);

const SEODetailsSchema = new Schema(
  {
    metaTitleTemplate: { type: String, default: '' },
    metaDescription: { type: String, default: '' },
    keywords: { type: [String], default: [] },
    ogImageUrl: { type: String, default: '' },
    faviconUrl: { type: String, default: '' },
    canonicalUrlBase: { type: String, default: '' },
    robotsIndex: { type: Boolean, default: true },
    robotsFollow: { type: Boolean, default: true },
  },
  { _id: false }
);

const LegalComplianceSchema = new Schema(
  {
    termsOfServiceUrl: { type: String, default: '' },
    privacyPolicyUrl: { type: String, default: '' },
    cookiePolicyUrl: { type: String, default: '' },
    disclaimerText: { type: String, default: '' },
  },
  { _id: false }
);

const EmailConfigSchema = new Schema(
  {
    fromEmail: { type: String, default: '' },
    fromName: { type: String, default: '' },
    replyToEmail: { type: String, default: '' },
  },
  { _id: false }
);

const FeatureFlagsSchema = new Schema(
  {
    maintenanceMode: { type: Boolean, default: false },
    registrationEnabled: { type: Boolean, default: true },
    loginEnabled: { type: Boolean, default: true },
  },
  { _id: false }
);

const AnalyticsSchema = new Schema(
  {
    googleAnalyticsId: { type: String, default: '' },
    facebookPixelId: { type: String, default: '' },
    otherTrackingIds: { type: [String], default: [] },
  },
  { _id: false }
);

const LocalizationSchema = new Schema(
  {
    defaultLanguage: { type: String, default: 'en' },
    supportedLanguages: { type: [String], default: ['en'] },
    defaultTimezone: { type: String, default: 'Africa/Lagos' },
    defaultCurrency: { type: String, default: 'NGN' },
  },
  { _id: false }
);

const BrandingSchema = new Schema(
  {
    faviconUrl: { type: String, default: '' },
    primaryBrandColor: { type: String, default: '' },
    secondaryBrandColor: { type: String, default: '' },
  },
  { _id: false }
);

const SiteSettingsSchema = new Schema<ModelSiteSettings>(
  {
    name: { type: String, required: true, default: 'settings' },
    appDetails: { type: AppDetailsSchema, required: true, default: () => ({}) },
    seo: { type: SEODetailsSchema, required: true, default: () => ({}) },
    legal: { type: LegalComplianceSchema, required: true, default: () => ({}) },
    email: { type: EmailConfigSchema, required: true, default: () => ({}) },
    features: { type: FeatureFlagsSchema, required: true, default: () => ({}) },
    analytics: { type: AnalyticsSchema, required: true, default: () => ({}) },
    localization: { type: LocalizationSchema, required: true, default: () => ({}) },
    branding: { type: BrandingSchema, required: true, default: () => ({}) },
    contactInfo: { type: ContactInfoSchema, required: true, default: () => ({}) },
    socials: { type: [SocialSchema], default: [] },
  },
  { timestamps: true, collection: 'sitesettings' }
);

const defaultSettings = {
  name: 'settings',
  appDetails: { logo: '', appName: '', description: '' },
  seo: {
    metaTitleTemplate: '',
    metaDescription: '',
    keywords: [],
    ogImageUrl: '',
    faviconUrl: '',
    canonicalUrlBase: '',
    robotsIndex: true,
    robotsFollow: true,
  },
  legal: {
    termsOfServiceUrl: '',
    privacyPolicyUrl: '',
    cookiePolicyUrl: '',
    disclaimerText: '',
  },
  email: { fromEmail: '', fromName: '', replyToEmail: '' },
  features: { maintenanceMode: false, registrationEnabled: true, loginEnabled: true },
  analytics: { googleAnalyticsId: '', facebookPixelId: '', otherTrackingIds: [] },
  localization: {
    defaultLanguage: 'en',
    supportedLanguages: ['en'],
    defaultTimezone: 'Africa/Lagos',
    defaultCurrency: 'NGN',
  },
  branding: { faviconUrl: '', primaryBrandColor: '', secondaryBrandColor: '' },
  contactInfo: {
    address: [],
    tel: [],
    email: [],
    whatsapp: '',
    locationUrl: '',
    officeHours: {
      monday: null,
      tuesday: null,
      wednesday: null,
      thursday: null,
      friday: null,
      saturday: null,
      sunday: null,
    },
  },
  socials: [],
};

SiteSettingsSchema.statics.getSettings = async function () {
  let settings = await this.findOne();
  if (!settings) {
    settings = await this.create(defaultSettings);
  }
  return settings;
};

export const SiteSettings =
  mongoose.models.SiteSettings || model<ModelSiteSettings>('SiteSettings', SiteSettingsSchema);
