import { Activity } from '@prisma/client';
import { emitToProject } from './socket';
import prisma from '../lib/prisma';

export type ActivityType = 
  | 'file_uploaded' 
  | 'cut_created' 
  | 'vibe_created' 
  | 'member_added' 
  | 'comment_added'
  | 'project_created'
  | 'lyrics_updated'
  | 'file_shared';

export interface CreateActivityOptions {
  type: ActivityType;
  userId: string;
  projectId: string;
  metadata?: Record<string, unknown>;
  resourceLink?: string;
}

export interface ActivityWithUser extends Activity {
  user: {
    id: string;
    name: string;
    avatarUrl: string | null;
  };
  isRead?: boolean;
}

export interface GetActivitiesOptions {
  limit?: number;
  offset?: number;
  type?: ActivityType;
  projectId?: string;
  unreadOnly?: boolean;
  isAdmin?: boolean;
}

export interface ActivitiesResponse {
  activities: ActivityWithUser[];
  total: number;
  unreadCount: number;
}

/**
 * Create an activity entry and broadcast it
 */
export async function createActivity(
  options: CreateActivityOptions
): Promise<Activity> {
  const { type, userId, projectId, metadata, resourceLink } = options;

  const activity = await prisma.activity.create({
    data: {
      type,
      userId,
      projectId,
      metadata: metadata ? JSON.stringify(metadata) : null,
      resourceLink,
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          avatarUrl: true,
        },
      },
      project: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  // Broadcast activity to project members via WebSocket
  emitToProject(projectId, 'activity', activity);

  console.log(`[Activity] Created activity ${type} by user ${userId} in project ${projectId}`);
  return activity;
}

/**
 * Get recent activities for projects the user has access to
 * Now includes read status and filtering options
 */
export async function getActivitiesForUser(
  userId: string,
  options: GetActivitiesOptions = {}
): Promise<ActivitiesResponse> {
  const { limit = 20, offset = 0, type, projectId, unreadOnly, isAdmin = false } = options;

  let projectIds: string[];

  if (isAdmin) {
    // Admins can see all projects
    const allProjects = await prisma.project.findMany({
      select: { id: true },
    });
    projectIds = allProjects.map(p => p.id);
  } else {
    // Regular users only see projects they're members of
    const projectMembers = await prisma.projectMember.findMany({
      where: { userId },
      select: { projectId: true },
    });
    projectIds = projectMembers.map(pm => pm.projectId);
  }

  // If specific projectId is requested, filter to just that project (if user has access)
  if (projectId) {
    if (!isAdmin && !projectIds.includes(projectId)) {
      return { activities: [], total: 0, unreadCount: 0 };
    }
    projectIds = [projectId];
  }

  if (projectIds.length === 0) {
    return { activities: [], total: 0, unreadCount: 0 };
  }

  // Build where clause
  const whereClause: {
    projectId: { in: string[] };
    type?: string;
    reads?: { none: { userId: string } };
  } = {
    projectId: { in: projectIds },
  };

  if (type) {
    whereClause.type = type;
  }

  if (unreadOnly) {
    whereClause.reads = { none: { userId } };
  }

  // Get total count
  const total = await prisma.activity.count({ where: whereClause });

  // Get unread count (activities without a read record for this user)
  const unreadCount = await prisma.activity.count({
    where: {
      projectId: { in: projectIds },
      reads: { none: { userId } },
    },
  });

  // Fetch activities with read status
  const activities = await prisma.activity.findMany({
    where: whereClause,
    include: {
      user: {
        select: {
          id: true,
          name: true,
          avatarUrl: true,
        },
      },
      reads: {
        where: { userId },
        select: { id: true },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
    skip: offset,
  });

  // Transform activities to include isRead boolean
  const activitiesWithReadStatus: ActivityWithUser[] = activities.map(activity => ({
    ...activity,
    isRead: activity.reads.length > 0,
    reads: undefined, // Remove the reads array from response
  })) as ActivityWithUser[];

  return {
    activities: activitiesWithReadStatus,
    total,
    unreadCount,
  };
}

/**
 * Get activities for a specific project
 */
export async function getActivitiesForProject(
  projectId: string,
  userId: string,
  options: { limit?: number; offset?: number } = {}
): Promise<ActivitiesResponse> {
  const { limit = 20, offset = 0 } = options;

  const total = await prisma.activity.count({
    where: { projectId },
  });

  const unreadCount = await prisma.activity.count({
    where: {
      projectId,
      reads: { none: { userId } },
    },
  });

  const activities = await prisma.activity.findMany({
    where: { projectId },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          avatarUrl: true,
        },
      },
      reads: {
        where: { userId },
        select: { id: true },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
    skip: offset,
  });

  const activitiesWithReadStatus: ActivityWithUser[] = activities.map(activity => ({
    ...activity,
    isRead: activity.reads.length > 0,
    reads: undefined,
  })) as ActivityWithUser[];

  return {
    activities: activitiesWithReadStatus,
    total,
    unreadCount,
  };
}

/**
 * Get count of unread activities for a user
 */
export async function getUnreadCountForUser(userId: string, isAdmin: boolean = false): Promise<number> {
  let projectIds: string[];

  if (isAdmin) {
    // Admins can see all projects
    const allProjects = await prisma.project.findMany({
      select: { id: true },
    });
    projectIds = allProjects.map(p => p.id);
  } else {
    // Regular users only see projects they're members of
    const projectMembers = await prisma.projectMember.findMany({
      where: { userId },
      select: { projectId: true },
    });
    projectIds = projectMembers.map(pm => pm.projectId);
  }

  if (projectIds.length === 0) {
    return 0;
  }

  return prisma.activity.count({
    where: {
      projectId: { in: projectIds },
      reads: { none: { userId } },
    },
  });
}

/**
 * Mark a single activity as read
 */
export async function markActivityAsRead(
  activityId: string,
  userId: string
): Promise<void> {
  // Upsert to handle duplicate calls gracefully
  await prisma.activityRead.upsert({
    where: {
      activityId_userId: {
        activityId,
        userId,
      },
    },
    create: {
      activityId,
      userId,
    },
    update: {}, // No update needed, just mark as existing
  });
}

/**
 * Mark all activities as read for a user
 */
export async function markAllActivitiesAsRead(userId: string, isAdmin: boolean = false): Promise<number> {
  let projectIds: string[];

  if (isAdmin) {
    // Admins can see all projects
    const allProjects = await prisma.project.findMany({
      select: { id: true },
    });
    projectIds = allProjects.map(p => p.id);
  } else {
    // Regular users only see projects they're members of
    const projectMembers = await prisma.projectMember.findMany({
      where: { userId },
      select: { projectId: true },
    });
    projectIds = projectMembers.map(pm => pm.projectId);
  }

  if (projectIds.length === 0) {
    return 0;
  }

  // Find all unread activities
  const unreadActivities = await prisma.activity.findMany({
    where: {
      projectId: { in: projectIds },
      reads: { none: { userId } },
    },
    select: { id: true },
  });

  if (unreadActivities.length === 0) {
    return 0;
  }

  // Create read records for all unread activities
  // Using a transaction to handle potential duplicates gracefully
  await prisma.$transaction(
    unreadActivities.map(activity =>
      prisma.activityRead.upsert({
        where: {
          activityId_userId: {
            activityId: activity.id,
            userId,
          },
        },
        create: {
          activityId: activity.id,
          userId,
        },
        update: {},
      })
    )
  );

  return unreadActivities.length;
}

/**
 * Clean up old activities (maintenance job)
 */
export async function cleanupOldActivities(daysOld: number = 90): Promise<number> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysOld);

  const result = await prisma.activity.deleteMany({
    where: {
      createdAt: { lt: cutoffDate },
    },
  });

  console.log(`[Activity] Cleaned up ${result.count} old activities`);
  return result.count;
}
