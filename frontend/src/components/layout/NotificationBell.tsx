import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Bell, 
  CheckCheck,
  FileAudio, 
  FolderPlus, 
  Music, 
  UserPlus, 
  MessageSquare,
  FolderOpen,
  FileText,
  Share2,
  ArrowRightLeft,
  X
} from 'lucide-react';
import { useSocket } from '../../context/SocketContext';
import { Activity, ActivityType } from '../../api/activities';

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
  const iconClass = "w-4 h-4";
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

function getActivityIconColor(type: ActivityType): string {
  switch (type) {
    case 'file_uploaded':
    case 'file_shared':
      return 'text-blue-500';
    case 'cut_created':
    case 'vibe_created':
      return 'text-purple-500';
    case 'cut_moved':
      return 'text-amber-500';
    case 'project_created':
      return 'text-green-500';
    case 'member_added':
      return 'text-yellow-500';
    case 'comment_added':
      return 'text-pink-500';
    case 'lyrics_updated':
      return 'text-orange-500';
    default:
      return 'text-primary';
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

export function NotificationBell() {
  const { activities, unreadActivityCount, markActivityAsRead, markAllActivitiesAsRead, dismissActivity } = useSocket();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleActivityClick = async (activity: Activity) => {
    if (!activity.isRead) {
      await markActivityAsRead(activity.id);
    }
    if (activity.resourceLink) {
      navigate(activity.resourceLink);
      setIsOpen(false);
    }
  };

  const handleDismiss = async (e: React.MouseEvent, activityId: string) => {
    e.stopPropagation();
    await dismissActivity(activityId);
  };

  // Show first 10 activities in the dropdown
  const displayActivities = activities.slice(0, 10);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-muted hover:text-text transition-colors rounded-lg hover:bg-surface-light"
        aria-label="Activity notifications"
      >
        <Bell className="w-5 h-5" />
        {unreadActivityCount > 0 && (
          <span className="absolute top-0 right-0 flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-error rounded-full transform translate-x-1 -translate-y-1">
            {unreadActivityCount > 99 ? '99+' : unreadActivityCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-96 bg-surface border border-border rounded-lg shadow-xl z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <h3 className="font-semibold text-text">Recent Activity</h3>
            {unreadActivityCount > 0 && (
              <button
                onClick={() => {
                  markAllActivitiesAsRead();
                }}
                className="flex items-center gap-1 text-xs text-primary hover:text-primary-dark transition-colors"
              >
                <CheckCheck className="w-4 h-4" />
                Mark all read
              </button>
            )}
          </div>

          {/* Activity List */}
          <div className="max-h-96 overflow-y-auto">
            {displayActivities.length === 0 ? (
              <div className="px-4 py-8 text-center text-muted">
                <Bell className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No recent activity</p>
              </div>
            ) : (
              displayActivities.map((activity) => {
                const description = getActivityDescription(activity);
                const icon = getActivityIcon(activity.type);
                const iconColor = getActivityIconColor(activity.type);

                return (
                  <button
                    key={activity.id}
                    onClick={() => handleActivityClick(activity)}
                    className={`w-full text-left px-4 py-3 border-b border-border last:border-b-0 hover:bg-surface-light transition-colors ${
                      !activity.isRead ? 'bg-primary/5' : ''
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {/* Unread indicator - always reserve space */}
                      <div className={`w-2 h-2 mt-2 rounded-full flex-shrink-0 ${!activity.isRead ? 'bg-primary' : 'bg-transparent'}`} />
                      
                      {/* Icon */}
                      <div className={`p-2 rounded-lg ${iconColor} flex-shrink-0`}>
                        {icon}
                      </div>
                      
                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-text">
                          <span className="font-medium">{activity.user.name}</span>
                          {' '}{description}
                        </p>
                        <p className="text-xs text-muted mt-0.5">
                          {formatTimeAgo(activity.createdAt)}
                        </p>
                      </div>

                      {/* Dismiss button */}
                      <div
                        role="button"
                        tabIndex={0}
                        onClick={(e) => handleDismiss(e, activity.id)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            handleDismiss(e as unknown as React.MouseEvent, activity.id);
                          }
                        }}
                        className="p-1 rounded hover:bg-surface-light transition-all flex-shrink-0"
                        title="Dismiss"
                      >
                        <X className="w-4 h-4 text-muted hover:text-error" />
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {/* Footer */}
          <div className="px-4 py-2 border-t border-border bg-surface-light">
            <Link
              to="/activity"
              onClick={() => setIsOpen(false)}
              className="text-xs text-primary hover:text-primary-dark transition-colors text-center block"
            >
              View all activity
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
