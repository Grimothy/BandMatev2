import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { config } from '../config/env';
import cookie from 'cookie';

const prisma = new PrismaClient();

let io: Server | null = null;

// Map of userId to their socket connections (a user can have multiple tabs/devices)
const userSockets: Map<string, Set<string>> = new Map();

interface JwtPayload {
  userId: string;
  email: string;
}

/**
 * Parse cookies from socket handshake
 */
function getTokenFromSocket(socket: Socket): string | null {
  // First try auth.token (passed explicitly by client)
  if (socket.handshake.auth.token) {
    return socket.handshake.auth.token;
  }
  
  // Fall back to cookies (for OAuth users with httpOnly cookies)
  const cookieHeader = socket.handshake.headers.cookie;
  if (cookieHeader) {
    const cookies = cookie.parse(cookieHeader);
    if (cookies.accessToken) {
      return cookies.accessToken;
    }
  }
  
  return null;
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
    const token = getTokenFromSocket(socket);
    
    if (!token) {
      console.log('[Socket] Auth failed: No token found in auth or cookies');
      return next(new Error('Authentication required'));
    }

    try {
      const decoded = jwt.verify(token, config.jwt.accessSecret) as JwtPayload;
      socket.data.userId = decoded.userId;
      socket.data.email = decoded.email;
      next();
    } catch (error) {
      console.log('[Socket] Auth failed: Invalid token');
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', async (socket: Socket) => {
    const userId = socket.data.userId;
    console.log(`[Socket] User ${userId} connected (socket: ${socket.id})`);

    // Track this socket for the user
    if (!userSockets.has(userId)) {
      userSockets.set(userId, new Set());
    }
    userSockets.get(userId)!.add(socket.id);

    // Join user-specific room for targeted notifications
    socket.join(`user_${userId}`);

    // Join all project rooms the user is a member of
    try {
      const projectMemberships = await prisma.projectMember.findMany({
        where: { userId },
        select: { projectId: true },
      });
      
      for (const membership of projectMemberships) {
        socket.join(`project_${membership.projectId}`);
        console.log(`[Socket] User ${userId} joined project room: project_${membership.projectId}`);
      }
      
      // Also check if user is admin - admins join all project rooms
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { role: true },
      });
      
      if (user?.role === 'ADMIN') {
        const allProjects = await prisma.project.findMany({
          select: { id: true },
        });
        for (const project of allProjects) {
          socket.join(`project_${project.id}`);
        }
        console.log(`[Socket] Admin ${userId} joined all ${allProjects.length} project rooms`);
      }
    } catch (error) {
      console.error(`[Socket] Error joining project rooms for user ${userId}:`, error);
    }

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

/**
 * Emit an event to all members of a project
 * Note: This requires project membership to be checked
 */
export function emitToProject(projectId: string, event: string, data: unknown): void {
  if (!io) {
    console.warn('[Socket] Cannot emit - Socket.io not initialized');
    return;
  }
  
  io.to(`project_${projectId}`).emit(event, data);
  console.log(`[Socket] Emitted ${event} to project ${projectId}`);
}

/**
 * Add a user to a project room (call when member is added to project)
 */
export function addUserToProjectRoom(userId: string, projectId: string): void {
  if (!io) {
    console.warn('[Socket] Cannot add to room - Socket.io not initialized');
    return;
  }
  
  const socketIds = userSockets.get(userId);
  if (!socketIds) {
    // User not currently connected, they'll join when they reconnect
    return;
  }
  
  for (const socketId of socketIds) {
    const socket = io.sockets.sockets.get(socketId);
    if (socket) {
      socket.join(`project_${projectId}`);
      console.log(`[Socket] Added user ${userId} to project room: project_${projectId}`);
    }
  }
}

/**
 * Remove a user from a project room (call when member is removed from project)
 */
export function removeUserFromProjectRoom(userId: string, projectId: string): void {
  if (!io) {
    console.warn('[Socket] Cannot remove from room - Socket.io not initialized');
    return;
  }
  
  const socketIds = userSockets.get(userId);
  if (!socketIds) {
    return;
  }
  
  for (const socketId of socketIds) {
    const socket = io.sockets.sockets.get(socketId);
    if (socket) {
      socket.leave(`project_${projectId}`);
      console.log(`[Socket] Removed user ${userId} from project room: project_${projectId}`);
    }
  }
}

/**
 * Add all admins to a new project room (call when project is created)
 */
export async function addAdminsToProjectRoom(projectId: string): Promise<void> {
  if (!io) {
    console.warn('[Socket] Cannot add admins to room - Socket.io not initialized');
    return;
  }
  
  try {
    const admins = await prisma.user.findMany({
      where: { role: 'ADMIN' },
      select: { id: true },
    });
    
    for (const admin of admins) {
      addUserToProjectRoom(admin.id, projectId);
    }
  } catch (error) {
    console.error('[Socket] Error adding admins to project room:', error);
  }
}
