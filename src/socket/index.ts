import { Server, type Socket } from 'socket.io';
import type { Server as HttpServer } from 'http';
import { ENVIRONMENT } from '../config/env';
import { authenticateSocket, type SocketUser } from './auth';
import { buildUserRoomId, getNewNotificationEventName, SOCKET_EVENTS } from './events';
import { sendSocketResponse } from './response';
import { listNotificationsForUser } from '../services/notification.service';
import { logger } from '../utils/logger';

let ioInstance: Server | null = null;

export function getIO(): Server | null {
  return ioInstance;
}

export function sendRealTimeNotification(
  userId: string,
  userModel: 'User' | 'Admin',
  notification: {
    _id: unknown;
    title?: string;
    message?: string;
    eventType?: string;
    isRead?: boolean;
    createdAt?: Date;
    status?: string;
    context?: unknown;
  }
): void {
  const io = getIO();
  if (!io) return;
  const room = buildUserRoomId(userId, userModel);
  const eventName = getNewNotificationEventName(userModel, userId);
  io.to(room).emit(eventName, {
    success: true,
    type: eventName,
    data: {
      _id: notification._id,
      title: notification.title,
      message: notification.message,
      eventType: notification.eventType,
      isRead: notification.isRead,
      createdAt: notification.createdAt,
      status: notification.status,
      context: notification.context,
    },
  });
}

function initializeEventListeners(_io: Server, socket: Socket & { user: SocketUser }): void {
  socket.on(SOCKET_EVENTS.SUBSCRIBE, (roomId: string, ack?: (arg: unknown) => void) => {
    if (roomId && typeof roomId === 'string') {
      socket.join(roomId);
      sendSocketResponse(socket, ack, { success: true, data: { roomId }, responseCode: 200 });
    } else {
      sendSocketResponse(socket, ack, { success: false, message: 'roomId required', responseCode: 400 });
    }
  });

  socket.on(SOCKET_EVENTS.UNSUBSCRIBE, (roomId: string, ack?: (arg: unknown) => void) => {
    if (roomId && typeof roomId === 'string') {
      socket.leave(roomId);
      sendSocketResponse(socket, ack, { success: true, data: { roomId }, responseCode: 200 });
    } else {
      sendSocketResponse(socket, ack, { success: false, message: 'roomId required', responseCode: 400 });
    }
  });

  socket.on(
    SOCKET_EVENTS.FETCH_NOTIFICATIONS,
    async (
      payload: { limit?: number; page?: number; isRead?: boolean } | undefined,
      ack?: (arg: unknown) => void
    ) => {
      try {
        const limit = payload?.limit ?? 20;
        const page = payload?.page ?? 1;
        const isRead = payload?.isRead;
        const result = await listNotificationsForUser(socket.user._id, socket.user.userModel, {
          limit,
          page,
          isRead,
        });
        sendSocketResponse(socket, ack, {
          success: true,
          data: { notifications: result.notifications, meta: result.meta },
          responseCode: 200,
        });
      } catch (err) {
        logger.error('fetch-notifications error', { err, socketId: socket.id });
        sendSocketResponse(socket, ack, {
          success: false,
          message: err instanceof Error ? err.message : 'Failed to fetch notifications',
          responseCode: 500,
        });
      }
    }
  );
}

export function attachSocketServer(httpServer: HttpServer): Server {
  const io = new Server(httpServer, {
    transports: ['polling', 'websocket'],
    cors: {
      origin: ENVIRONMENT.cors.origin,
      credentials: true,
    },
  });

  io.use(async (socket, next) => {
    const user = await authenticateSocket(socket);
    if (!user) {
      socket.emit(SOCKET_EVENTS.ERROR, { success: false, message: 'Unauthorized', responseCode: 401 });
      socket.disconnect(true);
      return;
    }
    (socket as Socket & { user: SocketUser }).user = user;
    next();
  });

  io.on('connection', (socket) => {
    const s = socket as Socket & { user: SocketUser };
    const userId = s.user._id;
    const userModel = s.user.userModel;
    const room = buildUserRoomId(userId, userModel);
    socket.join(room);
    socket.join(userId);
    initializeEventListeners(io, s);
    logger.info('Socket connected', { socketId: socket.id, userId, userModel });
    socket.on('disconnect', (reason) => {
      logger.info('Socket disconnected', { socketId: socket.id, reason });
    });
  });

  ioInstance = io;
  return io;
}
