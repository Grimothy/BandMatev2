import { Link, useNavigate } from 'react-router-dom';
import { 
  FileAudio, 
  FolderPlus, 
  Music, 
  UserPlus, 
  MessageSquare,
  FolderOpen,
  FileText,
  Share2,
  ArrowRight,
  ArrowRightLeft
} from 'lucide-react';
import { Activity, ActivityType } from '../../api/activities';
import { useSocket } from '../../context/SocketContext';

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

function getActivityIcon(type: ActivityType) {
  const iconClass = "w-3.5 h-3.5";
  switch (type) {
    case 'file_uploaded':
      return <FileAudio className={iconClass} />;
    case 'cut_created':
      return <Music className={iconClass} />;
    case 'cut_moved':
      return <ArrowRightLeft className={iconClass} />;
    case 'vibe_created':
      return <FolderPlus className={iconClass} />;
    case 'project_created':
      return <FolderOpen className={iconClass} />;
    case 'member_added':
      return <UserPlus className={iconClass} />;
    case 'comment_added':
      return <MessageSquare className={iconClass} />;
    case 'lyrics_updated':
      return <FileText className={iconClass} />;
    case 'file_shared':
      return <Share2 className={iconClass} />;
    default:
      return <Music className={iconClass} />;
  }
}

function getActivityDescription(activity: Activity): string {
  const metadata = activity.metadata ? JSON.parse(activity.metadata) : {};
  
  switch (activity.type) {
    case 'file_uploaded':
      return `uploaded ${metadata.fileName || 'a file'}`;
    case 'cut_created':
      return `created cut "${metadata.cutName || 'Untitled'}"`;
    case 'cut_moved':
      return `moved cut "${metadata.cutName || 'Untitled'}" to ${metadata.toVibeName || 'another vibe'}`;
    case 'vibe_created':
      return `created vibe "${metadata.vibeName || 'Untitled'}"`;
    case 'project_created':
      return `created project "${metadata.projectName || 'Untitled'}"`;
    case 'member_added':
      return `added ${metadata.memberName || 'a member'}`;
    case 'comment_added':
      return `commented on ${metadata.cutName || 'a cut'}`;
    case 'lyrics_updated':
      return `updated lyrics for ${metadata.cutName || 'a cut'}`;
    case 'file_shared':
      return `shared ${metadata.fileName || 'a file'}`;
    default:
      return 'performed an action';
  }
}

interface ActivityItemProps {
  activity: Activity;
  onMarkAsRead: (id: string) => void;
}

function ActivityItem({ activity, onMarkAsRead }: ActivityItemProps) {
  const navigate = useNavigate();
  const description = getActivityDescription(activity);
  const icon = getActivityIcon(activity.type);

  const handleClick = () => {
    if (!activity.isRead) {
      onMarkAsRead(activity.id);
    }
    if (activity.resourceLink) {
      navigate(activity.resourceLink);
    }
  };

  return (
    <button
      onClick={handleClick}
      className={`w-full flex items-start gap-2 p-2 rounded-md text-left transition-colors hover:bg-surface-light group ${
        !activity.isRead ? 'bg-primary/5' : ''
      }`}
    >
      {/* Unread indicator */}
      {!activity.isRead && (
        <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
      )}
      
      {/* Icon */}
      <div className="p-1.5 rounded bg-surface-light text-muted flex-shrink-0 group-hover:bg-primary/10 group-hover:text-primary transition-colors">
        {icon}
      </div>
      
      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted line-clamp-2">
          <span className="font-medium text-text">{activity.user.name}</span>
          {' '}{description}
        </p>
        <p className="text-xs text-muted/70 mt-0.5">
          {formatTimeAgo(activity.createdAt)}
        </p>
      </div>
    </button>
  );
}

export function ActivityFeed() {
  const { activities, unreadActivityCount, markActivityAsRead } = useSocket();

  // Show first 5 activities in sidebar preview
  const displayActivities = activities.slice(0, 5);
  const isLoading = activities.length === 0 && unreadActivityCount === 0;

  return (
    <div className="px-4 py-3 border-b border-border">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-xs font-semibold text-muted uppercase tracking-wider">
          Recent Activity
        </h3>
        {unreadActivityCount > 0 && (
          <span className="px-1.5 py-0.5 text-xs font-medium bg-primary/10 text-primary rounded-full">
            {unreadActivityCount} new
          </span>
        )}
      </div>
      
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
      ) : displayActivities.length === 0 ? (
        <p className="text-xs text-muted py-2">No recent activity</p>
      ) : (
        <>
          <div className="space-y-0.5 max-h-64 overflow-y-auto custom-scrollbar -mx-2">
            {displayActivities.map((activity) => (
              <ActivityItem 
                key={activity.id} 
                activity={activity}
                onMarkAsRead={markActivityAsRead}
              />
            ))}
          </div>
          
          {/* View all link */}
          {activities.length > 5 && (
            <Link
              to="/activity"
              className="flex items-center justify-center gap-1 mt-2 py-1.5 text-xs text-muted hover:text-primary transition-colors"
            >
              View all activity
              <ArrowRight className="w-3 h-3" />
            </Link>
          )}
        </>
      )}
    </div>
  );
}
