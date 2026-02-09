import { Router, Response } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { 
  getActivitiesForUser, 
  getUnreadCountForUser,
  markActivityAsRead,
  markAllActivitiesAsRead,
  dismissActivity,
  undismissActivity,
  dismissAllActivities,
  ActivityType
} from '../services/activities';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

/**
 * GET /api/activities
 * Get recent activities for projects the current user is a member of
 * Query params:
 * - limit: number (default 20)
 * - offset: number (default 0)
 * - type: ActivityType (filter by type)
 * - projectId: string (filter by project)
 * - unreadOnly: boolean (only return unread activities)
 */
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const isAdmin = req.user!.role === 'ADMIN';
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = parseInt(req.query.offset as string) || 0;
    const type = req.query.type as ActivityType | undefined;
    const projectId = req.query.projectId as string | undefined;
    const unreadOnly = req.query.unreadOnly === 'true';

    const result = await getActivitiesForUser(userId, { 
      limit, 
      offset, 
      type, 
      projectId, 
      unreadOnly,
      isAdmin,
    });
    
    res.json(result);
  } catch (error) {
    console.error('Error fetching activities:', error);
    res.status(500).json({ error: 'Failed to fetch activities' });
  }
});

/**
 * GET /api/activities/unread-count
 * Get count of unread activities for the current user
 */
router.get('/unread-count', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const isAdmin = req.user!.role === 'ADMIN';
    const count = await getUnreadCountForUser(userId, isAdmin);
    
    res.json({ count });
  } catch (error) {
    console.error('Error fetching unread count:', error);
    res.status(500).json({ error: 'Failed to fetch unread count' });
  }
});

/**
 * PATCH /api/activities/:id/read
 * Mark a single activity as read
 */
router.patch('/:id/read', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const activityId = req.params.id;

    await markActivityAsRead(activityId, userId);
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error marking activity as read:', error);
    res.status(500).json({ error: 'Failed to mark activity as read' });
  }
});

/**
 * PATCH /api/activities/read-all
 * Mark all activities as read for the current user
 */
router.patch('/read-all', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const isAdmin = req.user!.role === 'ADMIN';
    const count = await markAllActivitiesAsRead(userId, isAdmin);
    
    res.json({ success: true, count });
  } catch (error) {
    console.error('Error marking all activities as read:', error);
    res.status(500).json({ error: 'Failed to mark all activities as read' });
  }
});

/**
 * DELETE /api/activities/:id
 * Dismiss (hide) an activity for the current user
 */
router.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const activityId = req.params.id;

    await dismissActivity(activityId, userId);
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error dismissing activity:', error);
    res.status(500).json({ error: 'Failed to dismiss activity' });
  }
});

/**
 * PATCH /api/activities/:id/undismiss
 * Undismiss (restore) an activity for the current user
 */
router.patch('/:id/undismiss', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const activityId = req.params.id;

    await undismissActivity(activityId, userId);
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error undismissing activity:', error);
    res.status(500).json({ error: 'Failed to undismiss activity' });
  }
});

/**
 * DELETE /api/activities
 * Dismiss all activities for the current user
 */
router.delete('/', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const isAdmin = req.user!.role === 'ADMIN';

    const count = await dismissAllActivities(userId, isAdmin);
    
    res.json({ success: true, count });
  } catch (error) {
    console.error('Error dismissing all activities:', error);
    res.status(500).json({ error: 'Failed to dismiss all activities' });
  }
});

export default router;
