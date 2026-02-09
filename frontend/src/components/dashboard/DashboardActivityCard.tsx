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
  ArrowRightLeft,
  X
} from 'lucide-react';
import { Activity, ActivityType } from '../../api/activities';
import { useSocket } from '../../context/SocketContext';
import { Card } from '../ui/Card';
import { Skeleton } from '../ui/Skeleton';

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

interface DashboardActivityItemProps {
  activity: Activity;
  onClick: () => void;
  onDismiss: (e: React.MouseEvent) => void;
}

function DashboardActivityItem({ activity, onClick, onDismiss }: DashboardActivityItemProps) {
  const description = getActivityDescription(activity);
  const icon = getActivityIcon(activity.type);

  return (
    <button
      onClick={onClick}
      className={`w-full flex items-start gap-2 p-2 rounded-md text-left transition-colors hover:bg-surface-light group ${
        !activity.isRead ? 'bg-primary/5' : ''
      }`}
    >
      {/* Unread dot */}
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

      {/* Dismiss button */}
      <div
        role="button"
        tabIndex={0}
        onClick={onDismiss}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onDismiss(e as unknown as React.MouseEvent);
          }
        }}
        className="p-1 rounded hover:bg-surface-light transition-all flex-shrink-0 opacity-0 group-hover:opacity-100"
        title="Dismiss"
      >
        <X className="w-3.5 h-3.5 text-muted hover:text-error" />
      </div>
    </button>
  );
}

function ActivitySkeleton() {
  return (
    <div className="flex items-start gap-2 p-2">
      <Skeleton className="w-7 h-7 rounded flex-shrink-0" />
      <div className="flex-1 space-y-1">
        <Skeleton className="h-3 w-3/4" />
        <Skeleton className="h-2 w-1/3" />
      </div>
    </div>
  );
}

export function DashboardActivityCard() {
  const navigate = useNavigate();
  const { 
    activities, 
    unreadActivityCount, 
    isLoadingActivities,
    markActivityAsRead,
    dismissActivity
  } = useSocket();

  const handleActivityClick = async (activity: Activity) => {
    if (!activity.isRead) {
      await markActivityAsRead(activity.id);
    }
    if (activity.resourceLink) {
      navigate(activity.resourceLink);
    }
  };

  const handleDismiss = async (e: React.MouseEvent, activityId: string) => {
    e.stopPropagation();
    await dismissActivity(activityId);
  };

  // Get first 5 activities for dashboard
  const displayActivities = activities.slice(0, 5);

  return (
    <Card className="h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-text">Recent Activity</h3>
          {unreadActivityCount > 0 && (
            <span className="px-1.5 py-0.5 text-xs font-medium bg-primary/10 text-primary rounded-full">
              {unreadActivityCount} new
            </span>
          )}
        </div>
        <Link
          to="/activity"
          className="text-xs text-primary hover:underline flex items-center gap-1"
        >
          View all
          <ArrowRight className="w-3 h-3" />
        </Link>
      </div>

      {/* Activity list */}
      <div className="space-y-0.5 -mx-2">
        {isLoadingActivities ? (
          // Loading skeletons
          <>
            <ActivitySkeleton />
            <ActivitySkeleton />
            <ActivitySkeleton />
          </>
        ) : displayActivities.length === 0 ? (
          // Empty state
          <div className="py-6 text-center">
            <Music className="w-8 h-8 text-muted mx-auto mb-2" />
            <p className="text-xs text-muted">No recent activity</p>
          </div>
        ) : (
          // Activity items
          displayActivities.map((activity) => (
            <DashboardActivityItem
              key={activity.id}
              activity={activity}
              onClick={() => handleActivityClick(activity)}
              onDismiss={(e) => handleDismiss(e, activity.id)}
            />
          ))
        )}
      </div>

      {/* Footer - show only if there are more activities */}
      {activities.length > 5 && (
        <div className="mt-3 pt-3 border-t border-border">
          <Link
            to="/activity"
            className="block w-full text-center text-xs text-muted hover:text-text transition-colors py-1"
          >
            + {activities.length - 5} more activities
          </Link>
        </div>
      )}
    </Card>
  );
}
