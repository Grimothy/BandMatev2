import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FileAudio, FolderPlus, Music, UserPlus, MessageSquare } from 'lucide-react';
import { getActivities, Activity } from '../../api/activities';

function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return date.toLocaleDateString();
}

function getActivityIcon(type: Activity['type']) {
  switch (type) {
    case 'file_uploaded':
      return <FileAudio className="w-4 h-4" />;
    case 'cut_created':
      return <Music className="w-4 h-4" />;
    case 'vibe_created':
      return <FolderPlus className="w-4 h-4" />;
    case 'member_added':
      return <UserPlus className="w-4 h-4" />;
    case 'comment_added':
      return <MessageSquare className="w-4 h-4" />;
    default:
      return <Music className="w-4 h-4" />;
  }
}

function getActivityDescription(activity: Activity): string {
  const metadata = activity.metadata ? JSON.parse(activity.metadata) : {};
  
  switch (activity.type) {
    case 'file_uploaded':
      return `uploaded ${metadata.fileName || 'a file'}`;
    case 'cut_created':
      return `created cut "${metadata.cutName || 'Untitled'}"`;
    case 'vibe_created':
      return `created vibe "${metadata.vibeName || 'Untitled'}"`;
    case 'member_added':
      return `added ${metadata.memberName || 'a member'} to project`;
    case 'comment_added':
      return `commented on ${metadata.cutName || 'a cut'}`;
    default:
      return 'performed an action';
  }
}

function ActivityItem({ activity }: { activity: Activity }) {
  const description = getActivityDescription(activity);
  const icon = getActivityIcon(activity.type);

  return (
    <Link
      to={activity.resourceLink || '#'}
      className="flex items-start gap-2 p-2 rounded-md hover:bg-surface-light transition-colors group"
    >
      <div className="p-1.5 rounded bg-primary/10 text-primary flex-shrink-0 mt-0.5">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-text line-clamp-2">
          <span className="font-medium">{activity.user.name}</span>
          <span className="text-muted"> {description}</span>
        </p>
        <p className="text-xs text-muted mt-0.5">
          {formatTimeAgo(activity.createdAt)}
        </p>
      </div>
    </Link>
  );
}

export function ActivityFeed() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchActivities = async () => {
      try {
        const data = await getActivities(10);
        setActivities(data);
      } catch (error) {
        console.error('Failed to fetch activities:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchActivities();

    // Refresh activities every minute
    const interval = setInterval(fetchActivities, 60000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="px-4 py-3 border-b border-border">
      <h3 className="text-xs font-semibold text-muted uppercase tracking-wider mb-2">
        Recent Activity
      </h3>
      
      {isLoading ? (
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex items-start gap-2 p-2">
              <div className="w-7 h-7 rounded bg-surface-light animate-pulse" />
              <div className="flex-1 space-y-1">
                <div className="h-3 bg-surface-light rounded animate-pulse w-3/4" />
                <div className="h-2 bg-surface-light rounded animate-pulse w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : activities.length === 0 ? (
        <p className="text-xs text-muted py-2">No recent activity</p>
      ) : (
        <div className="space-y-1 max-h-64 overflow-y-auto custom-scrollbar">
          {activities.map((activity) => (
            <ActivityItem key={activity.id} activity={activity} />
          ))}
        </div>
      )}
    </div>
  );
}
