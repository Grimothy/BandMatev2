import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { config } from '../config/env';

let io: Server | null = null;

// Map of userId to their socket connections (a user can have multiple tabs/devices)
const userSockets: Map<string, Set<string>> = new Map();

interface JwtPayload {
  userId: string;
  email: string;
}

/**
 * Initialize Socket.io server
 */
export function initializeSocket(httpServer: HttpServer): Server {
  io = new Server(httpServer, {
    cors: {
      origin: config.nodeEnv === 'production' 
        ? false 
        : ['http://localhost:5173', 'http://127.0.0.1:5173'],
      credentials: true,
    },
  });

  // Authentication middleware
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    
    if (!token) {
      return next(new Error('Authentication required'));
    }

    try {
      const decoded = jwt.verify(token, config.jwt.accessSecret) as JwtPayload;
      socket.data.userId = decoded.userId;
      socket.data.email = decoded.email;
      next();
    } catch (error) {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket: Socket) => {
    const userId = socket.data.userId;
    console.log(`[Socket] User ${userId} connected (socket: ${socket.id})`);

    // Track this socket for the user
    if (!userSockets.has(userId)) {
      userSockets.set(userId, new Set());
    }
    userSockets.get(userId)!.add(socket.id);

    // Join user-specific room for targeted notifications
    socket.join(`user_${userId}`);

    // Handle disconnection
    socket.on('disconnect', () => {
      console.log(`[Socket] User ${userId} disconnected (socket: ${socket.id})`);
      
      const sockets = userSockets.get(userId);
      if (sockets) {
        sockets.delete(socket.id);
        if (sockets.size === 0) {
          userSockets.delete(userId);
        }
      }
    });

    // Handle marking notifications as read
    socket.on('notification:read', (notificationId: string) => {
      // This will be handled by the notification service
      console.log(`[Socket] User ${userId} marked notification ${notificationId} as read`);
    });
  });

  console.log('[Socket] Socket.io server initialized');
  return io;
}

/**
 * Get the Socket.io server instance
 */
export function getIO(): Server {
  if (!io) {
    throw new Error('Socket.io not initialized. Call initializeSocket first.');
  }
  return io;
}

/**
 * Emit a notification to a specific user
 */
export function emitToUser(userId: string, event: string, data: unknown): void {
  if (!io) {
    console.warn('[Socket] Cannot emit - Socket.io not initialized');
    return;
  }
  
  io.to(`user_${userId}`).emit(event, data);
  console.log(`[Socket] Emitted ${event} to user ${userId}`);
}

/**
 * Emit a notification to all connected users
 */
export function emitToAll(event: string, data: unknown): void {
  if (!io) {
    console.warn('[Socket] Cannot emit - Socket.io not initialized');
    return;
  }
  
  io.emit(event, data);
  console.log(`[Socket] Emitted ${event} to all users`);
}

/**
 * Check if a user is currently connected
 */
export function isUserOnline(userId: string): boolean {
  return userSockets.has(userId) && userSockets.get(userId)!.size > 0;
}

/**
 * Get count of online users
 */
export function getOnlineUserCount(): number {
  return userSockets.size;
}
