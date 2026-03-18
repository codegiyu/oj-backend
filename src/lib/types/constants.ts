/* eslint-disable @typescript-eslint/no-explicit-any */
import mongoose, { Document } from 'mongoose';
import { JOB_TYPE } from './queues';
import { AccessScope } from '@/utils/token';

export interface IUser {
  _id: mongoose.Types.ObjectId;
  googleId?: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  avatar?: string;
  title?: string;
  accountStatus: AccountStatus;
  email: string;
  phoneNumber?: string;
  gender?: Gender;
  auth: UserAuth;
  kyc: KYC;
  preferences?: UserPreferences;
  /** Link to Artist profile for artist dashboard. */
  artistId?: mongoose.Types.ObjectId;
  /** Link to Vendor for vendor dashboard. */
  vendorId?: mongoose.Types.ObjectId;
  isDeleted?: boolean;
  deleteRequestedAt?: Date;
  deletionApprovedAt?: Date;
  deletionApprovedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export type AuthUser = { userId: string; email: string; scope: AccessScope; jti: string };

export interface UserPreferences {
  realtimeNotifications?: boolean;
  emailNotifications?: boolean;
  smsNotifications?: boolean;
  marketingEmails?: boolean;
}

export interface UserAuth {
  password?: {
    value: string;
    passwordChangedAt?: Date;
  };
  roles: AuthUserRole[];
  lastLogin?: Date;
  refreshTokenJTI?: string;
  pushToken?: string;
}

export interface AuthUserRole {
  roleId: mongoose.Types.ObjectId;
  slug: string;
}

export interface IAdmin {
  _id: mongoose.Types.ObjectId;
  firstName: string;
  lastName: string;
  email: string;
  avatar?: string;
  accountStatus: AccountStatus;
  auth: UserAuth;
  preferences?: UserPreferences;
  createdAt: Date;
  updatedAt: Date;
}

export interface IRole {
  _id: mongoose.Types.ObjectId;
  name: string;
  slug: string;
  description: string;
  permissions: Permission[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Permission {
  slug: string;
  name: string;
  description: string;
  isRestricted?: boolean;
}

export interface KYC {
  email: {
    isVerified: boolean;
    data: any;
  };
  phoneNumber: {
    isVerified: boolean;
    data: any;
  };
}

export interface DayHours {
  start: string | null;
  end: string | null;
}

export interface OfficeHours {
  monday: DayHours | null;
  tuesday: DayHours | null;
  wednesday: DayHours | null;
  thursday: DayHours | null;
  friday: DayHours | null;
  saturday: DayHours | null;
  sunday: DayHours | null;
}

export interface ContactInfo {
  address: string[];
  tel: string[];
  email: string[];
  whatsapp: string;
  locationUrl: string;
  officeHours: OfficeHours;
}

export interface Social {
  platform: SocialPlatform;
  href: string;
}

export interface AppDetails {
  logo: string;
  appName: string;
  description: string;
}

export interface SEODetails {
  metaTitleTemplate: string;
  metaDescription: string;
  keywords: string[];
  ogImageUrl: string;
  faviconUrl: string;
  canonicalUrlBase: string;
  robotsIndex: boolean;
  robotsFollow: boolean;
}

export interface LegalCompliance {
  termsOfServiceUrl: string;
  privacyPolicyUrl: string;
  cookiePolicyUrl: string;
  disclaimerText: string;
}

export interface EmailConfig {
  fromEmail: string;
  fromName: string;
  replyToEmail: string;
}

export interface FeatureFlags {
  maintenanceMode: boolean;
  registrationEnabled: boolean;
  loginEnabled: boolean;
}

export interface Analytics {
  googleAnalyticsId: string;
  facebookPixelId: string;
  otherTrackingIds: string[];
}

export interface Localization {
  defaultLanguage: string;
  supportedLanguages: string[];
  defaultTimezone: string;
  defaultCurrency: string;
}

export interface Branding {
  faviconUrl: string;
  primaryBrandColor: string;
  secondaryBrandColor: string;
}

export interface ISiteSettings {
  _id: mongoose.Types.ObjectId;
  name: string;
  appDetails: AppDetails;
  seo: SEODetails;
  legal: LegalCompliance;
  email: EmailConfig;
  features: FeatureFlags;
  analytics: Analytics;
  localization: Localization;
  branding: Branding;
  contactInfo: ContactInfo;
  socials: Social[];
  createdAt: Date;
  updatedAt: Date;
}

export interface IDocument {
  _id: mongoose.Types.ObjectId;
  entityType: EntityType;
  entityId: mongoose.Types.ObjectId;
  intent: UploadIntent;
  filename: string;
  key: string;
  publicUrl: string;
  uploadUrl: string;
  fileExtension: string;
  contentType: string;
  status: DocumentStatus;
  uploadedAt?: Date;
  verifiedAt?: Date;
  expiresAt: Date;
  size?: number;
  metadata?: Record<string, unknown>;
  uploadedBy?: mongoose.Types.ObjectId;
  uploadedByModel?: 'User' | 'Admin';
  errorMessage?: string;
  isDeleted?: boolean;
  deletedAt?: Date;
  deletedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export interface IEmailLog {
  _id: mongoose.Types.ObjectId;
  jobId: string;
  type: JOB_TYPE;
  to: string;
  from: string;
  subject: string;
  status: EmailStatus;
  messageId?: string;
  provider: string;
  error?: string;
  retryCount?: number;
  htmlContent?: string;
  sentAt?: Date;
  deliveredAt?: Date;
  openedAt?: Date;
  clickedAt?: Date;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export type NotificationEmailDelivery = {
  status: string;
  jobId?: string;
  lastAttemptAt?: Date;
  lastSentAt?: Date;
  lastError?: string;
  statusReason?: string;
};

export type NotificationStatus = 'active' | 'expired';

export type INotification = {
  _id: mongoose.Types.ObjectId;
  user: mongoose.Types.ObjectId;
  userModel: 'User' | 'Admin';
  eventType?: string;
  title?: string;
  message?: string;
  isRead: boolean;
  readAt: Date | null;
  status: NotificationStatus;
  expiredAt: Date | null;
  createdAt: Date;
  triggerDate: Date;
  expiresAt: Date;
  context?: Record<string, unknown>;
  emailDelivery: NotificationEmailDelivery;
};

export const SOCIAL_PLATFORMS = [
  'facebook',
  'instagram',
  'linkedin',
  'twitter',
  'tiktok',
  'whatsapp',
  'youtube',
  'x',
] as const;
export type SocialPlatform = (typeof SOCIAL_PLATFORMS)[number];

export type ACCESS_TYPES = 'client' | 'console';

export const USER_ROLES = ['customer', 'admin', 'super-admin'] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const GENDERS = ['male', 'female', 'others'] as const;
export type Gender = (typeof GENDERS)[number];

export const ACCOUNT_STATUSES = [
  'unverified',
  'active',
  'suspended',
  'deleted',
  'blacklisted',
] as const;
export type AccountStatus = (typeof ACCOUNT_STATUSES)[number];

export const DOCUMENT_STATUSES = ['pending', 'uploaded', 'verified', 'failed', 'expired'] as const;
export type DocumentStatus = (typeof DOCUMENT_STATUSES)[number];

export const EMAIL_STATUSES = [
  'pending',
  'sent',
  'delivered',
  'bounced',
  'failed',
  'opened',
  'clicked',
] as const;
export type EmailStatus = (typeof EMAIL_STATUSES)[number];

export const UPLOAD_INTENTS = [
  'avatar',
  'logo',
  'card-image',
  'banner-image',
  'image',
  'other',
] as const;
export type UploadIntent = (typeof UPLOAD_INTENTS)[number];

export const ROLE_SLUGS = ['super-admin', 'admin', 'customer'] as const;
export type RoleSlug = (typeof ROLE_SLUGS)[number];

export const ENTITY_TYPES = [
  'user',
  'admin',
  'gospel-verse',
  'artist',
  'music',
  'pastor',
  'devotional',
  'news-article',
  'resource',
  'prayer-request',
  'testimony',
  'poll',
  'vendor',
  'product',
  'order',
  'newsletter',
] as const;
export type EntityType = (typeof ENTITY_TYPES)[number];

// Content types (abbreviated for models)
export interface IGospelVerse {
  _id: mongoose.Types.ObjectId;
  verse: string;
  reference: string;
  date: Date;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface IArtistProfile {
  _id: mongoose.Types.ObjectId;
  user: mongoose.Types.ObjectId;
  name: string;
  slug: string;
  bio?: string;
  image?: string;
  coverImage?: string;
  genre?: string;
  socials?: Record<string, string>;
  isFeatured: boolean;
  isActive: boolean;
  displayOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

/** Artist model: name, details, and association to platform media (Music/Video reference this artist). */
export interface IArtist {
  _id: mongoose.Types.ObjectId;
  /** User that owns this artist profile (for artist dashboard). */
  user?: mongoose.Types.ObjectId;
  name: string;
  slug: string;
  bio?: string;
  image?: string;
  coverImage?: string;
  genre?: string;
  socials?: ArtistSocials;
  isFeatured: boolean;
  isActive: boolean;
  displayOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface ArtistSocials {
  facebook?: string;
  instagram?: string;
  twitter?: string;
  youtube?: string;
  website?: string;
  [key: string]: string | undefined;
}

export interface IMusic {
  _id: mongoose.Types.ObjectId;
  title: string;
  slug: string;
  artist: mongoose.Types.ObjectId;
  description?: string;
  lyrics?: string;
  coverImage?: string;
  audioUrl?: string;
  videoUrl?: string;
  category?: string;
  status: 'draft' | 'published' | 'archived';
  isFeatured: boolean;
  isMonetizable?: boolean;
  displayOrder: number;
  plays?: number;
  downloads?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface IVideo {
  _id: mongoose.Types.ObjectId;
  title: string;
  slug: string;
  artist: mongoose.Types.ObjectId;
  description?: string;
  thumbnail?: string;
  videoUrl?: string;
  category?: string;
  status: 'draft' | 'published' | 'archived';
  isFeatured: boolean;
  isMonetizable?: boolean;
  displayOrder: number;
  views?: number;
  createdAt: Date;
  updatedAt: Date;
}

/** Pastor for "Ask a pastor": list/detail and assignment to questions. */
export interface IPastor {
  _id: mongoose.Types.ObjectId;
  name: string;
  slug: string;
  title?: string;
  church?: string;
  bio?: string;
  image?: string;
  expertise?: string[];
  questionsAnswered?: number;
  rating?: number;
  isFeatured: boolean;
  isActive: boolean;
  displayOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

/** Devotional types for community list filtering (daily, latest, popular, etc.). */
export const DEVOTIONAL_TYPES = [
  'daily',
  'latest',
  'popular',
  'bible-study',
  'prayer-points',
  'living-tips',
  'marriage-family',
] as const;
export type DevotionalType = (typeof DEVOTIONAL_TYPES)[number];

export interface IDevotional {
  _id: mongoose.Types.ObjectId;
  title: string;
  slug: string;
  excerpt?: string;
  content: string;
  type?: DevotionalType;
  category?: string;
  author?: mongoose.Types.ObjectId | string;
  verse?: string;
  date?: Date;
  readingTime?: number;
  lessons?: string[];
  duration?: number;
  views?: number;
  status: 'draft' | 'published' | 'archived';
  isFeatured: boolean;
  displayOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface INewsArticle {
  _id: mongoose.Types.ObjectId;
  title: string;
  slug: string;
  content: string;
  excerpt?: string;
  coverImage?: string;
  images: string[];
  category?: string;
  author?: string;
  status: 'draft' | 'published' | 'archived';
  isFeatured: boolean;
  displayOrder: number;
  views?: number;
  /** When true, filter for type=video on list. */
  hasVideo?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/** Resource types for community resources list. */
export const RESOURCE_TYPES = ['ebook', 'template', 'beat', 'wallpaper', 'affiliate'] as const;
export type ResourceType = (typeof RESOURCE_TYPES)[number];

export interface IResource {
  _id: mongoose.Types.ObjectId;
  title: string;
  slug: string;
  description?: string;
  type: ResourceType;
  category?: string;
  fileUrl?: string;
  coverImage?: string;
  price?: number;
  isFree?: boolean;
  downloads?: number;
  status: 'draft' | 'published' | 'archived';
  isFeatured: boolean;
  displayOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

/** Community prayer request: title, content, author (display name), status active|answered. */
export interface IPrayerRequest {
  _id: mongoose.Types.ObjectId;
  title: string;
  slug: string;
  content: string;
  author: string;
  email?: string;
  category?: string;
  prayers: number;
  comments: number;
  urgent: boolean;
  testimony?: string;
  answeredAt?: Date;
  status: 'active' | 'answered';
  createdAt: Date;
  updatedAt: Date;
}

/** Contact form submission: name, phone (required), email (optional), subject, message (persisted for admin/reply). */
export interface IContactSubmission {
  _id: mongoose.Types.ObjectId;
  name: string;
  phone: string;
  email?: string;
  subject: string;
  message: string;
  createdAt: Date;
  updatedAt: Date;
}

/** Community testimony: author (display), content, likes, comments count. */
export interface ITestimony {
  _id: mongoose.Types.ObjectId;
  slug: string;
  author: string;
  avatar?: string;
  content: string;
  likes: number;
  comments: number;
  category?: string;
  status: 'draft' | 'published' | 'archived';
  isFeatured: boolean;
  displayOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

/** Ask a pastor question: question text, answer, pastor ref, status active|answered. */
export interface IAskPastorQuestion {
  _id: mongoose.Types.ObjectId;
  question: string;
  slug: string;
  author: string;
  email?: string;
  category?: string;
  status: 'active' | 'answered';
  answer?: string;
  pastor?: mongoose.Types.ObjectId;
  answeredAt?: Date;
  views: number;
  helpful: number;
  urgent: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/** Poll option subdocument: _id for voting, text, votes. */
export interface IPollOption {
  _id: mongoose.Types.ObjectId;
  text: string;
  votes: number;
}

export interface IPoll {
  _id: mongoose.Types.ObjectId;
  question: string;
  slug: string;
  description?: string;
  category?: string;
  options: IPollOption[];
  status: 'active' | 'closed';
  startDate?: Date;
  endDate?: Date;
  totalVotes: number;
  createdAt: Date;
  updatedAt: Date;
}

/** Tracks a single vote per poll (by session or user) to prevent duplicate votes. */
export interface IPollVote {
  _id: mongoose.Types.ObjectId;
  poll: mongoose.Types.ObjectId;
  optionId: mongoose.Types.ObjectId;
  voterIdentifier: string;
  createdAt: Date;
}

export const PRODUCT_CATEGORIES = [
  'fashion',
  'food',
  'health-beauty',
  'accessories',
  'electronics',
  'books',
  'other',
] as const;
export type ProductCategory = (typeof PRODUCT_CATEGORIES)[number];

export interface IVendor {
  _id: mongoose.Types.ObjectId;
  name: string;
  slug: string;
  email: string;
  phone: string;
  storeName: string;
  storeDescription?: string;
  logo?: string;
  coverImage?: string;
  status: 'pending' | 'active' | 'suspended' | 'inactive';
  isVerified: boolean;
  whatsapp?: string;
  address?: string;
  bankAccountName?: string;
  bankAccountNumber?: string;
  bankName?: string;
  createdAt: Date;
  updatedAt: Date;
}

/** Variation option (e.g. Colour with values [Red, Blue]). */
export interface IVariationOption {
  name: string;
  values: string[];
}

/** Product variant: one combination of option values with its own price and inStock. Only one variant per product may have isDefault true. */
export interface IProductVariant {
  options: Record<string, string>;
  price: number;
  inStock: boolean;
  isDefault: boolean;
  sku?: string;
  image?: string;
}

export interface IProduct {
  _id: mongoose.Types.ObjectId;
  name: string;
  slug: string;
  vendor: mongoose.Types.ObjectId;
  description?: string;
  category?: mongoose.Types.ObjectId | null;
  subCategory?: mongoose.Types.ObjectId | null;
  tags?: string[];
  price: number;
  images: string[];
  inStock: boolean;
  variationOptions?: IVariationOption[];
  variants?: IProductVariant[];
  status: 'draft' | 'published' | 'archived';
  isFeatured: boolean;
  displayOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface IOrderItem {
  product: mongoose.Types.ObjectId;
  productName?: string;
  quantity: number;
  price: number;
  totalPrice: number;
  /** Variant SKU when product has variants (required for variant products). */
  sku?: string;
  /** Selected variant options (e.g. { Colour: 'Red', Size: 'M' }) for display. */
  selectedOptions?: Record<string, string>;
}

export interface IOrder {
  _id: mongoose.Types.ObjectId;
  orderNumber: string;
  customer: { name: string; email: string; phone: string; address?: string };
  customerId?: mongoose.Types.ObjectId;
  vendor: mongoose.Types.ObjectId;
  items: IOrderItem[];
  totalAmount: number;
  status: string;
  paymentStatus: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ICartItem {
  product: mongoose.Types.ObjectId;
  quantity: number;
  sku?: string;
}

export interface ICart {
  _id: mongoose.Types.ObjectId;
  user: mongoose.Types.ObjectId;
  items: ICartItem[];
  createdAt: Date;
  updatedAt: Date;
}

export interface INewsletter {
  _id: mongoose.Types.ObjectId;
  email: string;
  name?: string;
  status: 'active' | 'unsubscribed';
  subscribedAt: Date;
  unsubscribedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface IModelIndex {
  find: any;
}

export type ModelUser = IUser & IModelIndex & Document;
export type ModelAdmin = IAdmin & IModelIndex & Document;
export type ModelRole = IRole & IModelIndex & Document;
export type ModelSiteSettings = ISiteSettings & IModelIndex & Document;
export type ModelDocument = IDocument & IModelIndex & Document;
export type ModelEmailLog = IEmailLog & IModelIndex & Document;
export type ModelNotification = INotification & IModelIndex & Document;
export type ModelGospelVerse = IGospelVerse & IModelIndex & Document;
export type ModelArtistProfile = IArtistProfile & IModelIndex & Document;
export type ModelArtist = IArtist & IModelIndex & Document;
export type ModelMusic = IMusic & IModelIndex & Document;
export type ModelVideo = IVideo & IModelIndex & Document;
export type ModelPastor = IPastor & IModelIndex & Document;
export type ModelDevotional = IDevotional & IModelIndex & Document;
export type ModelNewsArticle = INewsArticle & IModelIndex & Document;
export type ModelResource = IResource & IModelIndex & Document;
export type ModelPrayerRequest = IPrayerRequest & IModelIndex & Document;
export type ModelContactSubmission = IContactSubmission & IModelIndex & Document;
export type ModelTestimony = ITestimony & IModelIndex & Document;
export type ModelAskPastorQuestion = IAskPastorQuestion & IModelIndex & Document;
export type ModelPoll = IPoll & IModelIndex & Document;
export type ModelPollVote = IPollVote & IModelIndex & Document;
export type ModelVendor = IVendor & IModelIndex & Document;
export type ModelProduct = IProduct & IModelIndex & Document;
export type ModelOrder = IOrder & IModelIndex & Document;
export type ModelNewsletter = INewsletter & IModelIndex & Document;
export type ModelCart = ICart & IModelIndex & Document;
