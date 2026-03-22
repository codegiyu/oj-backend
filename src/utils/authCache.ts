/**
 * Redis-backed cache for User and Admin lookups by email.
 * Check cache first, then database. Invalidate on logout, update on user/admin changes.
 */
import { Admin } from '../models/admin';
import { User } from '../models/user';
import { addToCache, getFromCache, removeFromCache } from './cache';
import type { ModelAdmin, ModelUser } from '../lib/types/constants';

type CacheKey = `vol:admin:${string}` | `vol:user:${string}`;

function adminCacheKey(email: string): CacheKey {
  return `vol:admin:${email.toLowerCase().trim()}` as CacheKey;
}

function userCacheKey(email: string): CacheKey {
  return `vol:user:${email.toLowerCase().trim()}` as CacheKey;
}

/**
 * Find admin by email. Checks Redis cache first, then database.
 * Caches result when found.
 */
export async function findAdminByEmail(email: string): Promise<ModelAdmin | null> {
  const key = adminCacheKey(email);
  const cached = await getFromCache<ModelAdmin>(key);
  if (cached) return cached;

  const admin = await Admin.findOne({ email: email.toLowerCase().trim() }).lean<ModelAdmin>();

  if (admin) {
    await addToCache(key, admin);
  }
  return admin;
}

/**
 * Find user by email. Checks Redis cache first, then database.
 * Caches result when found.
 */
export async function findUserByEmail(email: string): Promise<ModelUser | null> {
  const key = userCacheKey(email);
  const cached = await getFromCache<ModelUser>(key);
  if (cached) return cached;

  const user = await User.findOne({ email: email.toLowerCase().trim() }).lean<ModelUser>();

  if (user) {
    await addToCache(key, user);
  }
  return user;
}

/**
 * Invalidate cached admin or user by email. Call on logout.
 */
export async function invalidateAuthCache(
  email: string,
  type: 'admin' | 'user'
): Promise<void> {
  const key = type === 'admin' ? adminCacheKey(email) : userCacheKey(email);
  await removeFromCache(key);
}

/**
 * Update cached admin. Overwrites cache with provided admin (full doc). Call after admin updates.
 */
export async function updateCachedAdmin(admin: ModelAdmin): Promise<void> {
  if (admin?.email) {
    await addToCache(adminCacheKey(admin.email), admin);
  }
}

/**
 * Update cached user. Overwrites cache with provided user (full doc). Call after user updates.
 */
export async function updateCachedUser(user: ModelUser): Promise<void> {
  if (user?.email) {
    await addToCache(userCacheKey(user.email), user);
  }
}

/**
 * Add admin to cache after sign-in or when first loaded. Overwrites existing.
 */
export async function addAdminToCache(admin: ModelAdmin): Promise<void> {
  if (admin?.email) {
    await addToCache(adminCacheKey(admin.email), admin);
  }
}

/**
 * Add user to cache after sign-in/sign-up or when first loaded. Overwrites existing.
 */
export async function addUserToCache(user: ModelUser): Promise<void> {
  if (user?.email) {
    await addToCache(userCacheKey(user.email), user);
  }
}
