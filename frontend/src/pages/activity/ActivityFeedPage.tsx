import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FileAudio, 
  FolderPlus, 
  Music, 
  UserPlus, 
  MessageSquare, 
  FolderOpen,
  FileText,
  Share2,
  Check,
  Filter,
  ChevronDown,
  ArrowRightLeft,
  X,
  Trash2
} from 'lucide-react';
import { 
  Activity, 
  ActivityType, 
  getActivities, 
  markActivityAsRead, 
  markAllActivitiesAsRead,
  dismissActivity 
} from '../../api/activities';
import { getProjects } from '../../api/projects';
import { Project } from '../../types';
import { Button } from '../../components/ui/Button';
import { Loading } from '../../components/ui/Loading';
import { useSocket } from '../../context/SocketContext';

const ACTIVITY_TYPES: { value: ActivityType | ''; label: string }[] = [
  { value: '', label: 'All Types' },
  { value: 'file_uploaded', label: 'Files Uploaded' },
  { value: 'cut_created', label: 'Cuts Created' },
  { value: 'cut_moved', label: 'Cuts Moved' },
  { value: 'vibe_created', label: 'Vibes Created' },
  { value: 'project_created', label: 'Projects Created' },
  { value: 'member_added', label: 'Members Added' },
  { value: 'comment_added', label: 'Comments' },
  { value: 'lyrics_updated', label: 'Lyrics Updated' },
  { value: 'file_shared', label: 'Files Shared' },
];

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

function formatFullDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleString();
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

function getActivityIconBgColor(type: ActivityType): string {
  switch (type) {
    case 'file_uploaded':
      return 'bg-blue-500/10 text-blue-400';
    case 'cut_created':
      return 'bg-purple-500/10 text-purple-400';
    case 'cut_moved':
      return 'bg-amber-500/10 text-amber-400';
    case 'vibe_created':
      return 'bg-green-500/10 text-green-400';
    case 'project_created':
      return 'bg-yellow-500/10 text-yellow-400';
    case 'member_added':
      return 'bg-cyan-500/10 text-cyan-400';
    case 'comment_added':
      return 'bg-orange-500/10 text-orange-400';
    case 'lyrics_updated':
      return 'bg-pink-500/10 text-pink-400';
    case 'file_shared':
      return 'bg-indigo-500/10 text-indigo-400';
    default:
      return 'bg-primary/10 text-primary';
  }
}

function getActivityDescription(activity: Activity): React.ReactNode {
  const metadata = activity.metadata ? JSON.parse(activity.metadata) : {};
  
  switch (activity.type) {
    case 'file_uploaded':
      return <>uploaded <span className="font-medium text-text">{metadata.fileName || 'a file'}</span> to {metadata.cutName}</>;
    case 'cut_created':
      return <>created cut <span className="font-medium text-text">"{metadata.cutName || 'Untitled'}"</span></>;
    case 'cut_moved':
      return <>moved cut <span className="font-medium text-text">"{metadata.cutName || 'Untitled'}"</span> from {metadata.fromVibeName} to <span className="font-medium text-text">{metadata.toVibeName}</span></>;
    case 'vibe_created':
      return <>created vibe <span className="font-medium text-text">"{metadata.vibeName || 'Untitled'}"</span></>;
    case 'project_created':
      return <>created project <span className="font-medium text-text">"{metadata.projectName || 'Untitled'}"</span></>;
    case 'member_added':
      return <>added <span className="font-medium text-text">{metadata.memberName || 'a member'}</span> to {metadata.projectName}</>;
    case 'comment_added':
      return <>{metadata.isReply ? 'replied to a comment on' : 'commented on'} <span className="font-medium text-text">{metadata.cutName}</span></>;
    case 'lyrics_updated':
      return <>updated lyrics for <span className="font-medium text-text">{metadata.cutName}</span></>;
    case 'file_shared':
      return <>shared <span className="font-medium text-text">{metadata.fileName || 'a file'}</span> publicly</>;
    default:
      return 'performed an action';
  }
}

interface ActivityItemProps {
  activity: Activity;
  onMarkAsRead: (id: string) => void;
  onDismiss: (id: string) => void;
}

function ActivityItem({ activity, onMarkAsRead, onDismiss }: ActivityItemProps) {
  const navigate = useNavigate();
  const description = getActivityDescription(activity);
  const icon = getActivityIcon(activity.type);
  const iconBgColor = getActivityIconBgColor(activity.type);

  const handleClick = () => {
    if (!activity.isRead) {
      onMarkAsRead(activity.id);
    }
    if (activity.resourceLink) {
      navigate(activity.resourceLink);
    }
  };

  return (
    <div
      onClick={handleClick}
      className={`flex items-start gap-3 p-4 rounded-lg transition-colors cursor-pointer group ${
        activity.isRead 
          ? 'bg-surface hover:bg-surface-light' 
          : 'bg-primary/5 hover:bg-primary/10 border-l-2 border-primary'
      }`}
    >
      {/* Unread indicator */}
      {!activity.isRead && (
        <div className="w-2 h-2 rounded-full bg-primary mt-2 flex-shrink-0" />
      )}
      
      {/* Icon */}
      <div className={`p-2 rounded-lg flex-shrink-0 ${iconBgColor}`}>
        {icon}
      </div>
      
      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="text-sm text-muted">
          <span className="font-semibold text-text">{activity.user.name}</span>
          {' '}
          {description}
        </p>
        <p 
          className="text-xs text-muted mt-1" 
          title={formatFullDate(activity.createdAt)}
        >
          {formatTimeAgo(activity.createdAt)}
        </p>
      </div>

      {/* Mark as read button for unread items */}
      {!activity.isRead && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onMarkAsRead(activity.id);
          }}
          className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-surface-light transition-all"
          title="Mark as read"
        >
          <Check className="w-4 h-4 text-muted" />
        </button>
      )}

      {/* Dismiss button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onDismiss(activity.id);
        }}
        className="p-1 rounded hover:bg-surface-light transition-all"
        title="Dismiss"
      >
        <X className="w-4 h-4 text-muted hover:text-error" />
      </button>
    </div>
  );
}

export function ActivityFeedPage() {
  const { 
    dismissActivity: contextDismissActivity,
    dismissAllActivities: contextDismissAllActivities,
    fetchActivities: refreshContext 
  } = useSocket();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [total, setTotal] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);
  
  // Filters
  const [selectedType, setSelectedType] = useState<ActivityType | ''>('');
  const [selectedProject, setSelectedProject] = useState<string>('');
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  const loadActivities = useCallback(async (reset = false) => {
    try {
      if (reset) {
        setIsLoading(true);
      } else {
        setIsLoadingMore(true);
      }

      const offset = reset ? 0 : activities.length;
      const result = await getActivities({
        limit: 20,
        offset,
        type: selectedType || undefined,
        projectId: selectedProject || undefined,
        unreadOnly: showUnreadOnly,
      });

      if (reset) {
        setActivities(result.activities);
      } else {
        setActivities(prev => [...prev, ...result.activities]);
      }
      
      setTotal(result.total);
      setUnreadCount(result.unreadCount);
      setHasMore(offset + result.activities.length < result.total);
    } catch (error) {
      console.error('Failed to load activities:', error);
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  }, [activities.length, selectedType, selectedProject, showUnreadOnly]);

  // Load projects for filter dropdown
  useEffect(() => {
    const loadProjects = async () => {
      try {
        const projectList = await getProjects();
        setProjects(projectList);
      } catch (error) {
        console.error('Failed to load projects:', error);
      }
    };
    loadProjects();
  }, []);

  // Load activities on mount and filter change
  useEffect(() => {
    loadActivities(true);
  }, [selectedType, selectedProject, showUnreadOnly]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleMarkAsRead = async (activityId: string) => {
    try {
      await markActivityAsRead(activityId);
      setActivities(prev =>
        prev.map(a => a.id === activityId ? { ...a, isRead: true } : a)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
      refreshContext();
    } catch (error) {
      console.error('Failed to mark as read:', error);
    }
  };

  const handleDismiss = async (activityId: string) => {
    try {
      const activity = activities.find(a => a.id === activityId);
      const wasUnread = activity && !activity.isRead;
      
      // Remove from local state
      setActivities(prev => prev.filter(a => a.id !== activityId));
      setTotal(prev => prev - 1);
      if (wasUnread) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
      
      // Call context dismiss (handles API and Undo toast)
      await contextDismissActivity(activityId);
      
      // Note: If user clicks "Undo" in the toast, the context will refetch, 
      // but we also need to refetch here or rely on the fact that context fetch
      // doesn't automatically update this page's local state.
      // However, undismissActivity in context calls fetchActivities() which is refreshContext.
      // We might want to listen for changes or just accept that the feed needs a manual refresh or 
      // we can trigger a refresh if we detect an undismiss.
    } catch (error) {
      console.error('Failed to dismiss activity:', error);
      loadActivities(true);
    }
  };

  const handleDismissAll = async () => {
    if (window.confirm('Are you sure you want to dismiss all activities? This will hide them from your feed.')) {
      try {
        await contextDismissAllActivities();
        setActivities([]);
        setUnreadCount(0);
        setTotal(0);
        setHasMore(false);
      } catch (error) {
        console.error('Failed to dismiss all:', error);
      }
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await markAllActivitiesAsRead();
      setActivities(prev => prev.map(a => ({ ...a, isRead: true })));
      setUnreadCount(0);
      refreshContext();
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    }
  };

  const clearFilters = () => {
    setSelectedType('');
    setSelectedProject('');
    setShowUnreadOnly(false);
  };

  const hasActiveFilters = selectedType || selectedProject || showUnreadOnly;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text">Activity Feed</h1>
          <p className="text-muted mt-1">
            {unreadCount > 0 ? (
              <>You have <span className="text-primary font-medium">{unreadCount} unread</span> activities</>
            ) : (
              'Stay up to date with your team\'s activity'
            )}
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleMarkAllAsRead}
            >
              <Check className="w-4 h-4 mr-1" />
              Mark all read
            </Button>
          )}
          {activities.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleDismissAll}
              className="text-muted hover:text-error"
            >
              <Trash2 className="w-4 h-4 mr-1" />
              Dismiss all
            </Button>
          )}
          <Button
            variant={showFilters ? 'primary' : 'outline'}
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="w-4 h-4 mr-1" />
            Filters
            {hasActiveFilters && (
              <span className="ml-1 w-2 h-2 rounded-full bg-primary" />
            )}
          </Button>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="bg-surface rounded-lg p-4 border border-border space-y-4">
          <div className="flex flex-wrap gap-4">
            {/* Type filter */}
            <div className="flex-1 min-w-[200px]">
              <label className="block text-xs font-medium text-muted mb-1">
                Activity Type
              </label>
              <div className="relative">
                <select
                  value={selectedType}
                  onChange={(e) => setSelectedType(e.target.value as ActivityType | '')}
                  className="w-full appearance-none bg-surface-light border border-border rounded-lg px-3 py-2 pr-8 text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary/50"
                >
                  {ACTIVITY_TYPES.map(type => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted pointer-events-none" />
              </div>
            </div>

            {/* Project filter */}
            <div className="flex-1 min-w-[200px]">
              <label className="block text-xs font-medium text-muted mb-1">
                Project
              </label>
              <div className="relative">
                <select
                  value={selectedProject}
                  onChange={(e) => setSelectedProject(e.target.value)}
                  className="w-full appearance-none bg-surface-light border border-border rounded-lg px-3 py-2 pr-8 text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary/50"
                >
                  <option value="">All Projects</option>
                  {projects.map(project => (
                    <option key={project.id} value={project.id}>
                      {project.name}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Unread only toggle */}
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showUnreadOnly}
                onChange={(e) => setShowUnreadOnly(e.target.checked)}
                className="w-4 h-4 rounded border-border bg-surface-light text-primary focus:ring-primary/50"
              />
              <span className="text-sm text-text">Show unread only</span>
            </label>

            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="text-sm text-primary hover:underline"
              >
                Clear filters
              </button>
            )}
          </div>
        </div>
      )}

      {/* Activity List */}
      {isLoading ? (
        <Loading className="py-12" />
      ) : activities.length === 0 ? (
        <div className="bg-surface rounded-lg p-12 text-center border border-border">
          <div className="w-16 h-16 rounded-full bg-surface-light flex items-center justify-center mx-auto mb-4">
            <Music className="w-8 h-8 text-muted" />
          </div>
          <h3 className="text-lg font-medium text-text mb-2">No activities found</h3>
          <p className="text-muted text-sm">
            {hasActiveFilters 
              ? 'Try adjusting your filters to see more activities.'
              : 'When you or your team members take actions, they\'ll appear here.'}
          </p>
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="mt-4 text-primary hover:underline text-sm"
            >
              Clear filters
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {activities.map((activity) => (
            <ActivityItem
              key={activity.id}
              activity={activity}
              onMarkAsRead={handleMarkAsRead}
              onDismiss={handleDismiss}
            />
          ))}

          {/* Load more */}
          {hasMore && (
            <div className="pt-4 text-center">
              <Button
                variant="outline"
                onClick={() => loadActivities(false)}
                disabled={isLoadingMore}
              >
                {isLoadingMore ? 'Loading...' : 'Load more'}
              </Button>
            </div>
          )}

          {/* End of list */}
          {!hasMore && activities.length > 0 && (
            <p className="text-center text-sm text-muted py-4">
              You've reached the end ({total} total activities)
            </p>
          )}
        </div>
      )}
    </div>
  );
}
