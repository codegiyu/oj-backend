export const SOCKET_EVENTS = {
  SUBSCRIBE: 'subscribe',
  UNSUBSCRIBE: 'unsubscribe',
  FETCH_NOTIFICATIONS: 'fetch-notifications',
  ERROR: 'error',
} as const;

export function buildUserRoomId(userId: string, userModel: 'User' | 'Admin'): string {
  const prefix = userModel === 'Admin' ? 'admin' : 'user';
  return `${prefix}:${userId}`;
}

export function getNewNotificationEventName(userModel: 'User' | 'Admin', userId: string): string {
  const prefix = userModel === 'Admin' ? 'admin' : 'user';
  return `new-notification-${prefix}-${userId}`;
}
