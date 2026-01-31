import { PrismaClient, Notification } from '@prisma/client';
import { emitToUser, isUserOnline } from './socket';
import { sendNotificationEmail } from './email';

const prisma = new PrismaClient();

export type NotificationType = 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR';

export interface CreateNotificationOptions {
  recipientId: string;
  type: NotificationType;
  title: string;
  message: string;
  resourceLink?: string;
  sendEmail?: boolean; // If true, will send email regardless of online status
}

export interface NotificationPayload {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  resourceLink: string | null;
  isRead: boolean;
  createdAt: Date;
}

/**
 * Create and dispatch a notification
 * 
 * This is the central hub for all notifications:
 * 1. Creates a database record
 * 2. Emits real-time socket event to user
 * 3. Optionally sends email (if user offline or sendEmail=true)
 */
export async function createNotification(
  options: CreateNotificationOptions
): Promise<Notification> {
  const { recipientId, type, title, message, resourceLink, sendEmail = false } = options;

  // 1. Create database record
  const notification = await prisma.notification.create({
    data: {
      recipientId,
      type,
      title,
      message,
      resourceLink,
    },
  });

  // 2. Prepare payload for socket emission
  const payload: NotificationPayload = {
    id: notification.id,
    type: type as NotificationType,
    title: notification.title,
    message: notification.message,
    resourceLink: notification.resourceLink,
    isRead: notification.isRead,
    createdAt: notification.createdAt,
  };

  // 3. Emit real-time notification
  emitToUser(recipientId, 'notification', payload);

  // 4. Send email if requested or if user is offline
  const userOnline = isUserOnline(recipientId);
  const shouldSendEmail = sendEmail || !userOnline;

  if (shouldSendEmail) {
    // Fetch user email
    const user = await prisma.user.findUnique({
      where: { id: recipientId },
      select: { email: true },
    });

    if (user) {
      const emailSent = await sendNotificationEmail(
        user.email,
        title,
        message,
        resourceLink
      );

      // Update notification record
      if (emailSent) {
        await prisma.notification.update({
          where: { id: notification.id },
          data: { emailSent: true },
        });
      }
    }
  }

  console.log(`[Notification] Created notification for user ${recipientId}: ${title}`);
  return notification;
}

/**
 * Create notifications for multiple users
 */
export async function createBulkNotifications(
  recipientIds: string[],
  options: Omit<CreateNotificationOptions, 'recipientId'>
): Promise<Notification[]> {
  const notifications = await Promise.all(
    recipientIds.map((recipientId) =>
      createNotification({ ...options, recipientId })
    )
  );
  return notifications;
}

/**
 * Get notifications for a user
 */
export async function getNotifications(
  userId: string,
  options: { limit?: number; offset?: number; unreadOnly?: boolean } = {}
): Promise<{ notifications: Notification[]; unreadCount: number }> {
  const { limit = 20, offset = 0, unreadOnly = false } = options;

  const where = {
    recipientId: userId,
    ...(unreadOnly ? { isRead: false } : {}),
  };

  const [notifications, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    }),
    prisma.notification.count({
      where: { recipientId: userId, isRead: false },
    }),
  ]);

  return { notifications, unreadCount };
}

/**
 * Mark a notification as read
 */
export async function markAsRead(
  notificationId: string,
  userId: string
): Promise<Notification | null> {
  const notification = await prisma.notification.findFirst({
    where: { id: notificationId, recipientId: userId },
  });

  if (!notification) {
    return null;
  }

  return prisma.notification.update({
    where: { id: notificationId },
    data: { isRead: true },
  });
}

/**
 * Mark all notifications as read for a user
 */
export async function markAllAsRead(userId: string): Promise<number> {
  const result = await prisma.notification.updateMany({
    where: { recipientId: userId, isRead: false },
    data: { isRead: true },
  });

  return result.count;
}

/**
 * Delete a notification
 */
export async function deleteNotification(
  notificationId: string,
  userId: string
): Promise<boolean> {
  const notification = await prisma.notification.findFirst({
    where: { id: notificationId, recipientId: userId },
  });

  if (!notification) {
    return false;
  }

  await prisma.notification.delete({
    where: { id: notificationId },
  });

  return true;
}

/**
 * Delete old notifications (cleanup job)
 */
export async function cleanupOldNotifications(daysOld: number = 30): Promise<number> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysOld);

  const result = await prisma.notification.deleteMany({
    where: {
      createdAt: { lt: cutoffDate },
      isRead: true, // Only delete read notifications
    },
  });

  console.log(`[Notification] Cleaned up ${result.count} old notifications`);
  return result.count;
}
