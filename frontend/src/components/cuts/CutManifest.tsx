import { useEffect, useState } from 'react';
import { useSocket } from '../../context/SocketContext';
import { Activity, ActivityType } from '../../api/activities';
import {
  FileAudio,
  FolderPlus,
  Music,
  UserPlus,
  MessageSquare,
  FolderOpen,
  FileText,
  Share2,
  Loader2,
  ArrowRightLeft,
} from 'lucide-react';
import { Card } from '../ui/Card';

interface CutManifestProps {
  cutId: string;
}

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
  const iconClass = 'w-5 h-5';
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
      return 'bg-blue-500/10 text-blue-500';
    case 'cut_created':
    case 'vibe_created':
      return 'bg-purple-500/10 text-purple-500';
    case 'cut_moved':
      return 'bg-amber-500/10 text-amber-500';
    case 'project_created':
      return 'bg-green-500/10 text-green-500';
    case 'member_added':
      return 'bg-yellow-500/10 text-yellow-500';
    case 'comment_added':
      return 'bg-pink-500/10 text-pink-500';
    case 'lyrics_updated':
      return 'bg-orange-500/10 text-orange-500';
    default:
      return 'bg-primary/10 text-primary';
  }
}

function getActivityDescription(activity: Activity): string {
  const metadata = activity.metadata ? JSON.parse(activity.metadata) : {};

  switch (activity.type) {
    case 'file_uploaded':
      return `uploaded ${metadata.fileName || 'a file'}`;
    case 'cut_created':
      return `created this cut`;
    case 'cut_moved':
      return `moved this cut from ${metadata.fromVibeName || 'another vibe'} to ${metadata.toVibeName || 'this vibe'}`;
    case 'comment_added':
      return `commented on ${metadata.cutName || 'this cut'}`;
    case 'lyrics_updated':
      return `updated lyrics`;
    case 'file_shared':
      return `shared ${metadata.fileName || 'a file'}`;
    default:
      return 'performed an action';
  }
}

export function CutManifest({ cutId }: CutManifestProps) {
  const { activities, isLoadingActivities } = useSocket();
  const [cutActivities, setCutActivities] = useState<Activity[]>([]);

  useEffect(() => {
    // Filter activities that are related to this cut
    // We check if the resourceLink contains the cut ID
    const filtered = activities.filter((activity) => {
      if (!activity.resourceLink) return false;
      // Check if the resource link contains this cut's ID
      // resourceLink format: /cuts/{cutId} or /cuts/{cutId}?tab=...
      return activity.resourceLink.startsWith(`/cuts/${cutId}`) || 
             activity.resourceLink.includes(`/cuts/${cutId}?`);
    });

    setCutActivities(filtered);
  }, [activities, cutId]);

  if (isLoadingActivities) {
    return (
      <Card className="text-center py-12">
        <Loader2 className="w-8 h-8 text-primary mx-auto mb-4 animate-spin" />
        <p className="text-muted">Loading activity...</p>
      </Card>
    );
  }

  if (cutActivities.length === 0) {
    return (
      <Card className="text-center py-12">
        <Music className="w-12 h-12 text-muted mx-auto mb-4 opacity-50" />
        <p className="text-muted">No activity yet for this cut</p>
        <p className="text-sm text-muted mt-1">
          Actions like uploads, comments, and lyrics updates will appear here
        </p>
      </Card>
    );
  }

  return (
    <Card>
      <div className="space-y-1">
        {cutActivities.map((activity) => {
          const description = getActivityDescription(activity);
          const icon = getActivityIcon(activity.type);
          const iconColor = getActivityIconColor(activity.type);

          return (
            <div
              key={activity.id}
              className="flex items-start gap-4 p-4 hover:bg-surface-light rounded-lg transition-colors border-b border-border last:border-b-0"
            >
              {/* Icon */}
              <div className={`p-3 rounded-lg ${iconColor} flex-shrink-0`}>
                {icon}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <p className="text-text">
                  <span className="font-medium">{activity.user.name}</span>{' '}
                  {description}
                </p>
                <p className="text-xs text-muted mt-1">
                  {formatTimeAgo(activity.createdAt)}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Summary footer */}
      <div className="mt-4 pt-4 border-t border-border">
        <p className="text-xs text-muted text-center">
          Showing {cutActivities.length} action{cutActivities.length !== 1 ? 's' : ''} for this cut
        </p>
      </div>
    </Card>
  );
}
