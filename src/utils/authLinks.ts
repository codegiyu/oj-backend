export type AuthAccessType = 'client' | 'console';

export type PasswordAuthLinkTarget = 'reset' | 'invite';

/** Password reset / invite link TTL — must match Redis cache in sendPasswordResetLink. */
export const RESET_LINK_EXPIRATION_SECONDS = 60 * 30;

export const RESET_LINK_EXPIRATION_MINUTES = RESET_LINK_EXPIRATION_SECONDS / 60;

const AUTH_PATH_BY_TARGET: Record<AuthAccessType, Record<PasswordAuthLinkTarget, string>> = {
  console: {
    reset: '/admin/auth/reset-password',
    invite: '/admin/auth/accept-invite/create-password',
  },
  client: {
    reset: '/auth/reset-password',
    invite: '/auth/accept-invite/create-password',
  },
};

export function normalizeAppBaseUrl(baseUrl: string): string {
  return baseUrl.replace(/\/$/, '');
}

export function buildPasswordAuthUrl(options: {
  baseUrl: string;
  accessType: AuthAccessType;
  linkTarget?: PasswordAuthLinkTarget;
  email: string;
  scopeToken: string;
}): string {
  const { baseUrl, accessType, linkTarget = 'reset', email, scopeToken } = options;
  const path = AUTH_PATH_BY_TARGET[accessType][linkTarget];
  const root = normalizeAppBaseUrl(baseUrl);

  return `${root}${path}?email=${encodeURIComponent(email)}&scopeToken=${encodeURIComponent(scopeToken)}`;
}
