import type { Socket } from 'socket.io';
import { SOCKET_EVENTS } from './events';

export function sendSocketResponse(
  socket: Socket,
  ack: ((arg: { success: boolean; message?: string; data?: unknown; responseCode?: number }) => void) | undefined,
  payload: { success: boolean; message?: string; data?: unknown; responseCode?: number }
): void {
  if (ack && typeof ack === 'function') {
    ack(payload);
  } else {
    socket.emit(SOCKET_EVENTS.ERROR, payload);
  }
}
