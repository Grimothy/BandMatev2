import api from './client';

export type ActivityType = 
  | 'file_uploaded' 
  | 'cut_created'
  | 'cut_moved' 
  | 'vibe_created' 
  | 'member_added' 
  | 'comment_added'
  | 'project_created'
  | 'lyrics_updated'
  | 'file_shared';

export interface Activity {
  id: string;
  type: ActivityType;
  userId: string;
  projectId: string;
  metadata: string | null;
  resourceLink: string | null;
  createdAt: string;
  isRead: boolean;
  user: {
    id: string;
    name: string;
    avatarUrl: string | null;
  };
}

export interface ActivitiesResponse {
  activities: Activity[];
  total: number;
  unreadCount: number;
}

export interface GetActivitiesParams {
  limit?: number;
  offset?: number;
  type?: ActivityType;
  projectId?: string;
  unreadOnly?: boolean;
}

/**
 * Get activities with optional filtering
 */
export async function getActivities(params: GetActivitiesParams = {}): Promise<ActivitiesResponse> {
  const searchParams = new URLSearchParams();
  
  if (params.limit) searchParams.append('limit', params.limit.toString());
  if (params.offset) searchParams.append('offset', params.offset.toString());
  if (params.type) searchParams.append('type', params.type);
  if (params.projectId) searchParams.append('projectId', params.projectId);
  if (params.unreadOnly) searchParams.append('unreadOnly', 'true');

  const queryString = searchParams.toString();
  const url = queryString ? `/activities?${queryString}` : '/activities';
  
  const response = await api.get<ActivitiesResponse>(url);
  return response.data;
}

/**
 * Get count of unread activities
 */
export async function getUnreadActivityCount(): Promise<number> {
  const response = await api.get<{ count: number }>('/activities/unread-count');
  return response.data.count;
}

/**
 * Mark a single activity as read
 */
export async function markActivityAsRead(activityId: string): Promise<void> {
  await api.patch(`/activities/${activityId}/read`);
}

/**
 * Mark all activities as read
 */
export async function markAllActivitiesAsRead(): Promise<number> {
  const response = await api.patch<{ success: boolean; count: number }>('/activities/read-all');
  return response.data.count;
}

/**
 * Dismiss an activity (hide from user's feed without deleting for others)
 */
export async function dismissActivity(activityId: string): Promise<void> {
  await api.delete(`/activities/${activityId}`);
}

/**
 * Undismiss an activity (restore to user's feed)
 */
export async function undismissActivity(activityId: string): Promise<void> {
  await api.patch(`/activities/${activityId}/undismiss`);
}

/**
 * Dismiss all activities
 */
export async function dismissAllActivities(): Promise<number> {
  const response = await api.delete<{ success: boolean; count: number }>('/activities');
  return response.data.count;
}
