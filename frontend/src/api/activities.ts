import api from './client';

export interface Activity {
  id: string;
  type: 'file_uploaded' | 'cut_created' | 'vibe_created' | 'member_added' | 'comment_added';
  userId: string;
  projectId: string;
  metadata: string | null;
  resourceLink: string | null;
  createdAt: string;
  user: {
    id: string;
    name: string;
    avatarUrl: string | null;
  };
}

export async function getActivities(limit: number = 10): Promise<Activity[]> {
  const response = await api.get<Activity[]>(`/activities?limit=${limit}`);
  return response.data;
}
