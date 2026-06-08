import { buildUserRoomId } from './events';
import type { SocketUser } from './auth';

/** Users may only join their own notification room (and legacy userId-only room on connect). */
export function isAllowedSocketRoom(user: SocketUser, roomId: string): boolean {
  const allowedRoom = buildUserRoomId(user._id, user.userModel);

  return roomId === allowedRoom || roomId === user._id;
}
