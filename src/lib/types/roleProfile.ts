export const ROLE_PROFILE_TYPES = ['vendor', 'artist', 'pastor'] as const;
export type RoleProfileType = (typeof ROLE_PROFILE_TYPES)[number];

export const PROFILE_STATUSES = ['active', 'deactivated', 'suspended'] as const;
export type ProfileStatus = (typeof PROFILE_STATUSES)[number];

export const APPEAL_STATUSES = ['pending', 'accepted', 'rejected'] as const;
export type AppealStatus = (typeof APPEAL_STATUSES)[number];

export const UNKNOWN_PUBLIC_DISPLAY_NAME = 'Unknown user';
