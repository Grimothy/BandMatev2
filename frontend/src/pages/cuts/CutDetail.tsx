import { useState, useEffect, useRef, memo, useCallback } from 'react';
import { useParams, Link, useNavigate, useSearchParams } from 'react-router-dom';
import { getCut, uploadAudio, deleteAudio, updateAudioLabel, addComment, deleteComment, addReply, updateComment, updateCut, deleteCut } from '../../api/cuts';
import { uploadCut, uploadStem } from '../../api/files';
import { useAuth } from '../../hooks/useAuth';
import { Cut, Comment, CommentMarkerGroup } from '../../types';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Loading } from '../../components/ui/Loading';
import { SideSheet, ConfirmationModal } from '../../components/ui/Modal';
import { Tabs, TabPanel } from '../../components/ui/Tabs';
import { Waveform, WaveformHandle } from '../../components/audio/Waveform';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetBody } from '../../components/ui/sheet';
import { CutFileExplorer } from '../../components/files/CutFileExplorer';
import { LyricsEditor } from '../../components/lyrics/LyricsEditor';
import { ActionSheet } from '../../components/ui/ActionMenu';
import { CutManifest } from '../../components/cuts/CutManifest';

// Icons for ActionMenu
const InfoIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const EditIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
  </svg>
);

const DeleteIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
  </svg>
);

// Tab type definition
type CutTab = 'manifest' | 'audio' | 'files' | 'lyrics';

interface CommentItemProps {
  comment: Comment;
  cut: Cut;
  user: { id: string; role: string } | null;
  selectedAudioFileId: string | null;
  replyingToId: string | null;
  replyText: string;
  isAddingReply: boolean;
  editingCommentId: string | null;
  editingCommentContent: string;
  isEditingComment: boolean;
  highlightedCommentId: string | null;
  onStartReply: (commentId: string) => void;
  onCancelReply: () => void;
  onSubmitReply: (parentId: string) => void;
  onReplyTextChange: (text: string) => void;
  onStartEdit: (commentId: string, content: string) => void;
  onCancelEdit: () => void;
  onSaveEdit: (commentId: string) => void;
  onEditContentChange: (content: string) => void;
  onDeleteComment: (commentId: string) => void;
  onCommentClick: (audioFileId: string, timestamp: number | null) => void;
  formatTime: (seconds: number) => string;
  depth: number;
}

const getInitials = (name: string) => {
  return name
    .split(' ')
    .map(part => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
};

const getColorFromId = (id: string) => {
  const colors = [
    'bg-blue-500', 'bg-green-500', 'bg-yellow-500', 
    'bg-purple-500', 'bg-pink-500', 'bg-indigo-500',
    'bg-red-500', 'bg-teal-500'
  ];
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
};

const CommentItem = memo(function CommentItem({
  comment,
  cut,
  user,
  selectedAudioFileId,
  replyingToId,
  replyText,
  isAddingReply,
  editingCommentId,
  editingCommentContent,
  isEditingComment,
  highlightedCommentId,
  onStartReply,
  onCancelReply,
  onSubmitReply,
  onReplyTextChange,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
  onEditContentChange,
  onDeleteComment,
  onCommentClick,
  formatTime,
  depth,
}: CommentItemProps) {
  const audioIndex = cut.managedFiles?.findIndex(a => a.id === comment.managedFileId) ?? -1;
  const audioLabel = comment.managedFile?.name || comment.managedFile?.originalName || 'Unknown';
  const isReply = comment.parentId !== null;
  const isReplying = replyingToId === comment.id;
  const isEditing = editingCommentId === comment.id;
  const canModify = comment.userId === user?.id || user?.role === 'ADMIN';
  const hasTimestamp = comment.timestamp !== null;
  const isHighlighted = highlightedCommentId === comment.id;

  const handleTimestampClick = () => {
    if (hasTimestamp) {
      onCommentClick(comment.managedFileId, comment.timestamp);
    }
  };

  return (
    <div id={`comment-${comment.id}`} className={depth > 0 ? 'ml-6 border-l-2 border-border pl-3' : ''}>
      <div
        className={`flex gap-3 p-3 rounded-lg group transition-all ${
          isHighlighted
            ? 'bg-primary/20 ring-2 ring-primary shadow-lg animate-pulse'
            : comment.managedFileId === selectedAudioFileId
            ? 'bg-primary/10 ring-1 ring-primary/30'
            : 'bg-surface-light'
        }`}
      >
        <div className="flex-shrink-0 space-y-1">
          {hasTimestamp ? (
            <button
              onClick={handleTimestampClick}
              className="inline-block px-2 py-1 bg-primary/20 text-primary text-xs font-mono rounded hover:bg-primary/30 transition-colors cursor-pointer"
              title="Click to seek to this time"
            >
              {formatTime(comment.timestamp as number)}
            </button>
          ) : (
            <span className="inline-block px-2 py-1 bg-muted/20 text-muted text-xs rounded">
              Reply
            </span>
          )}
          {!isReply && (
            <div className="flex items-center gap-1">
              <span
                className={`inline-flex items-center justify-center w-5 h-5 text-xs font-medium rounded ${
                  comment.managedFileId === selectedAudioFileId
                    ? 'bg-primary text-white'
                    : 'bg-muted/30 text-muted'
                }`}
              >
                #{audioIndex + 1}
              </span>
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              {comment.user.avatarUrl ? (
                <img
                  src={comment.user.avatarUrl}
                  alt={comment.user.name}
                  className="w-5 h-5 rounded-full object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div
                  className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] text-white font-medium ${getColorFromId(comment.user.id)}`}
                >
                  {getInitials(comment.user.name)}
                </div>
              )}
              <span className="font-medium text-text text-sm">{comment.user.name}</span>
            </div>
            {!isReply && (
              <>
                <span className="text-xs text-muted">on</span>
                <span className="text-xs text-primary font-medium truncate max-w-32" title={audioLabel}>
                  {audioLabel}
                </span>
              </>
            )}
            <span className="text-xs text-muted">
              • {new Date(comment.createdAt).toLocaleDateString()}
            </span>
          </div>
          
          {/* Comment content or edit form */}
          {isEditing ? (
            <div className="mt-2">
              <textarea
                value={editingCommentContent}
                onChange={(e) => onEditContentChange(e.target.value)}
                className="w-full px-3 py-2 bg-background border border-border rounded text-text text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
                rows={2}
                autoFocus
              />
              <div className="flex justify-end gap-2 mt-2">
                <button
                  onClick={onCancelEdit}
                  className="px-3 py-1.5 text-sm text-muted hover:text-text transition-colors"
                  disabled={isEditingComment}
                >
                  Cancel
                </button>
                <button
                  onClick={() => onSaveEdit(comment.id)}
                  disabled={!editingCommentContent.trim() || isEditingComment}
                  className="px-3 py-1.5 text-sm bg-primary text-white rounded hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isEditingComment ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>
          ) : (
            <p className="text-muted text-sm mt-1">{comment.content}</p>
          )}
          
          {/* Action buttons - Reply and Edit */}
          {!isEditing && user && (
            <div className="flex items-center gap-3 mt-2">
              {!isReply && (
                <button
                  onClick={() => onStartReply(comment.id)}
                  className="text-xs text-primary hover:text-primary/80 transition-colors"
                >
                  Reply
                </button>
              )}
              {canModify && (
                <button
                  onClick={() => onStartEdit(comment.id, comment.content)}
                  className="text-xs text-muted hover:text-primary transition-colors"
                >
                  Edit
                </button>
              )}
            </div>
          )}
        </div>
        
        {/* Delete button */}
        {canModify && !isEditing && (
          <button
            onClick={() => onDeleteComment(comment.id)}
            className="flex-shrink-0 p-1 text-muted hover:text-error transition-colors"
            title="Delete"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        )}
      </div>

      {/* Inline Reply Form */}
      {isReplying && (
        <div className="mt-2 ml-6 p-3 bg-surface-light rounded-lg border border-border">
          <textarea
            value={replyText}
            onChange={(e) => onReplyTextChange(e.target.value)}
            placeholder="Write a reply..."
            className="w-full px-3 py-2 bg-background border border-border rounded text-text text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
            rows={2}
            autoFocus
          />
          <div className="flex justify-end gap-2 mt-2">
            <button
              onClick={onCancelReply}
              className="px-3 py-1.5 text-sm text-muted hover:text-text transition-colors"
              disabled={isAddingReply}
            >
              Cancel
            </button>
            <button
              onClick={() => onSubmitReply(comment.id)}
              disabled={!replyText.trim() || isAddingReply}
              className="px-3 py-1.5 text-sm bg-primary text-white rounded hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isAddingReply ? 'Posting...' : 'Reply'}
            </button>
          </div>
        </div>
      )}

      {/* Nested Replies */}
      {comment.replies && comment.replies.length > 0 && (
        <div className="mt-2 space-y-2">
          {comment.replies.map((reply) => (
            <CommentItem
              key={reply.id}
              comment={reply}
              cut={cut}
              user={user}
              selectedAudioFileId={selectedAudioFileId}
              replyingToId={replyingToId}
              replyText={replyText}
              isAddingReply={isAddingReply}
              editingCommentId={editingCommentId}
              editingCommentContent={editingCommentContent}
              isEditingComment={isEditingComment}
              highlightedCommentId={highlightedCommentId}
              onStartReply={onStartReply}
              onCancelReply={onCancelReply}
              onSubmitReply={onSubmitReply}
              onReplyTextChange={onReplyTextChange}
              onStartEdit={onStartEdit}
              onCancelEdit={onCancelEdit}
              onSaveEdit={onSaveEdit}
              onEditContentChange={onEditContentChange}
              onDeleteComment={onDeleteComment}
              onCommentClick={onCommentClick}
              formatTime={formatTime}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
});

// Comments Section Component (reusable for desktop sidebar and mobile drawer)
interface CommentsSectionProps {
  cut: Cut;
  user: { id: string; role: string } | null;
  selectedAudio: any;
  selectedAudioFileId: string | null;
  commentTimestamp: number;
  commentText: string;
  isAddingComment: boolean;
  replyingToId: string | null;
  replyText: string;
  isAddingReply: boolean;
  editingCommentId: string | null;
  editingCommentContent: string;
  isEditingComment: boolean;
  highlightedCommentId: string | null;
  onCommentTextChange: (text: string) => void;
  onAddComment: () => void;
  onStartReply: (commentId: string) => void;
  onCancelReply: () => void;
  onSubmitReply: (parentId: string) => void;
  onReplyTextChange: (text: string) => void;
  onStartEdit: (commentId: string, content: string) => void;
  onCancelEdit: () => void;
  onSaveEdit: (commentId: string) => void;
  onEditContentChange: (content: string) => void;
  onDeleteComment: (commentId: string) => void;
  onCommentClick: (audioFileId: string, timestamp: number | null) => void;
  formatTime: (seconds: number) => string;
}

const CommentsSection = memo(function CommentsSection({
  cut,
  user,
  selectedAudio,
  selectedAudioFileId,
  commentTimestamp,
  commentText,
  isAddingComment,
  replyingToId,
  replyText,
  isAddingReply,
  editingCommentId,
  editingCommentContent,
  isEditingComment,
  highlightedCommentId,
  onCommentTextChange,
  onAddComment,
  onStartReply,
  onCancelReply,
  onSubmitReply,
  onReplyTextChange,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
  onEditContentChange,
  onDeleteComment,
  onCommentClick,
  formatTime,
}: CommentsSectionProps) {
  return (
    <div className="space-y-6">
      {/* Add Comment */}
      <Card>
        <h3 className="font-semibold text-text mb-4">Add Comment</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-muted mb-1.5">
              Audio File
            </label>
            <div className="px-3 py-2 bg-surface-light rounded text-sm">
              {selectedAudio ? (
                <span className="text-text text-sm">
                  {selectedAudio.name || selectedAudio.originalName}
                </span>
              ) : (
                <span className="text-muted italic text-sm">Click on an audio file to select</span>
              )}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-muted mb-1.5">
              Timestamp
            </label>
            <Input
              type="text"
              value={formatTime(commentTimestamp)}
              readOnly
              className="text-center text-sm"
            />
            <span className="text-xs text-muted block mt-1">Click on waveform to set</span>
          </div>
          <Input
            label="Comment"
            placeholder="Add your feedback..."
            value={commentText}
            onChange={(e) => onCommentTextChange(e.target.value)}
          />
          <Button
            onClick={onAddComment}
            isLoading={isAddingComment}
            disabled={!commentText.trim() || !selectedAudioFileId}
            className="w-full"
          >
            Add Comment
          </Button>
        </div>
      </Card>

      {/* Comments Timeline */}
      <Card>
        <h3 className="font-semibold text-text mb-4">
          Comments Timeline ({cut.comments?.length || 0})
        </h3>
        {cut.comments?.length === 0 ? (
          <p className="text-muted text-center py-8 text-sm">No comments yet</p>
        ) : (
          <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
            {cut.comments?.map((comment) => (
              <CommentItem
                key={comment.id}
                comment={comment}
                cut={cut}
                user={user}
                selectedAudioFileId={selectedAudioFileId}
                replyingToId={replyingToId}
                replyText={replyText}
                isAddingReply={isAddingReply}
                editingCommentId={editingCommentId}
                editingCommentContent={editingCommentContent}
                isEditingComment={isEditingComment}
                highlightedCommentId={highlightedCommentId}
                onStartReply={onStartReply}
                onCancelReply={onCancelReply}
                onSubmitReply={onSubmitReply}
                onReplyTextChange={onReplyTextChange}
                onStartEdit={onStartEdit}
                onCancelEdit={onCancelEdit}
                onSaveEdit={onSaveEdit}
                onEditContentChange={onEditContentChange}
                onDeleteComment={onDeleteComment}
                onCommentClick={onCommentClick}
                formatTime={formatTime}
                depth={0}
              />
            ))}
          </div>
        )}
      </Card>
    </div>
  );
});

export function CutDetail() {
  const { id } = useParams<{ id: string }>();
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const audioFileInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const waveformRefs = useRef<Map<string, WaveformHandle>>(new Map());
  
  const [cut, setCut] = useState<Cut | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [activeTab, setActiveTab] = useState<CutTab>(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam && ['manifest', 'audio', 'files', 'lyrics'].includes(tabParam)) {
      return tabParam as CutTab;
    }
    return 'manifest';
  });
  const [fileExplorerKey, setFileExplorerKey] = useState(0);
  const [commentText, setCommentText] = useState('');
  const [commentTimestamp, setCommentTimestamp] = useState(0);
  const [selectedAudioFileId, setSelectedAudioFileId] = useState<string | null>(null);
  const [isAddingComment, setIsAddingComment] = useState(false);
  const [editingLabelId, setEditingLabelId] = useState<string | null>(null);
  const [editingLabelValue, setEditingLabelValue] = useState('');
  const [replyingToId, setReplyingToId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [isAddingReply, setIsAddingReply] = useState(false);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingCommentContent, setEditingCommentContent] = useState('');
  const [isEditingComment, setIsEditingComment] = useState(false);
  
  // Comments drawer state (for mobile)
  const [isCommentsDrawerOpen, setIsCommentsDrawerOpen] = useState(false);

  // Deep-link: highlight a specific comment from notification
  const [highlightedCommentId, setHighlightedCommentId] = useState<string | null>(
    searchParams.get('comment')
  );
  
  // Comment marker state
  const [activeMarkerTimestamp, setActiveMarkerTimestamp] = useState<number | null>(null);
  
  // Cut action modals
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [editCutName, setEditCutName] = useState('');
  const [editCutBpm, setEditCutBpm] = useState<string>('');
  const [editCutTimeSignature, setEditCutTimeSignature] = useState<string>('');
  const [isUpdatingCut, setIsUpdatingCut] = useState(false);
  const [isDeletingCut, setIsDeletingCut] = useState(false);

  const fetchCut = async () => {
    if (!id) return;
    try {
      const data = await getCut(id);
      setCut(data);
      // Auto-select first audio file if none selected
      if (!selectedAudioFileId && data.managedFiles && data.managedFiles.length > 0) {
        setSelectedAudioFileId(data.managedFiles[0].id);
      }
    } catch (error) {
      console.error('Failed to fetch cut:', error);
      navigate('/projects');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCut();
  }, [id]);

  // Deep-link: scroll to highlighted comment once cut data loads, then clean up URL
  useEffect(() => {
    if (!cut || !highlightedCommentId) return;

    // Find the comment (could be top-level or a reply)
    const findComment = (comments: Comment[]): Comment | undefined => {
      for (const c of comments) {
        if (c.id === highlightedCommentId) return c;
        if (c.replies) {
          const found = findComment(c.replies);
          if (found) return found;
        }
      }
      return undefined;
    };

    const comment = cut.comments ? findComment(cut.comments) : undefined;
    if (comment) {
      // Select the audio file this comment is on
      setSelectedAudioFileId(comment.managedFileId);

      // On mobile, open the comments drawer
      if (window.innerWidth < 1024) {
        setIsCommentsDrawerOpen(true);
      }

      // Scroll to the comment element after a brief delay for render
      setTimeout(() => {
        const el = document.getElementById(`comment-${highlightedCommentId}`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 300);
    }

    // Clean up query params from URL without navigation
    const newParams = new URLSearchParams(searchParams);
    newParams.delete('tab');
    newParams.delete('comment');
    setSearchParams(newParams, { replace: true });

    // Clear highlight after a few seconds
    const timer = setTimeout(() => setHighlightedCommentId(null), 4000);
    return () => clearTimeout(timer);
  }, [cut, highlightedCommentId]);

  const handleAudioUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !id) return;

    setIsUploading(true);
    try {
      const newAudioFile = await uploadAudio(id, file);
      setSelectedAudioFileId(newAudioFile.id);
      fetchCut();
    } catch (error) {
      console.error('Failed to upload audio:', error);
    } finally {
      setIsUploading(false);
      // Reset the input
      if (audioFileInputRef.current) {
        audioFileInputRef.current.value = '';
      }
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !id) return;

    // Detect file type
    const isZip = file.name.toLowerCase().endsWith('.zip');

    setIsUploading(true);
    try {
      if (isZip) {
        await uploadStem(id, file);
      } else {
        await uploadCut(id, file);
      }
      // Trigger refresh of file explorer
      setFileExplorerKey(prev => prev + 1);
      // Also refresh cut data so Audio tab gets the new file
      fetchCut();
    } catch (error) {
      console.error('Failed to upload file:', error);
    } finally {
      setIsUploading(false);
      // Reset the input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDeleteAudio = async (audioId: string) => {
    if (!confirm('Are you sure you want to delete this audio file? All comments on this audio will also be deleted.') || !id) return;
    try {
      await deleteAudio(id, audioId);
      // If we deleted the selected audio, reset selection
      if (selectedAudioFileId === audioId) {
        setSelectedAudioFileId(null);
      }
      fetchCut();
    } catch (error) {
      console.error('Failed to delete audio:', error);
    }
  };

  const handleStartEditLabel = (audioId: string, currentLabel: string | null) => {
    setEditingLabelId(audioId);
    setEditingLabelValue(currentLabel || '');
  };

  const handleSaveLabel = async (audioId: string) => {
    if (!id) return;
    try {
      await updateAudioLabel(id, audioId, editingLabelValue);
      setEditingLabelId(null);
      fetchCut();
    } catch (error) {
      console.error('Failed to update audio label:', error);
    }
  };

  const handleCancelEditLabel = () => {
    setEditingLabelId(null);
    setEditingLabelValue('');
  };

  const handleAddComment = async () => {
    if (!commentText.trim() || !id || !selectedAudioFileId) return;

    setIsAddingComment(true);
    try {
      await addComment(id, {
        content: commentText,
        timestamp: commentTimestamp,
        audioFileId: selectedAudioFileId,
      });
      setCommentText('');
      fetchCut();
    } catch (error) {
      console.error('Failed to add comment:', error);
    } finally {
      setIsAddingComment(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!id) return;
    try {
      await deleteComment(id, commentId);
      fetchCut();
    } catch (error) {
      console.error('Failed to delete comment:', error);
    }
  };

  const handleStartReply = useCallback((commentId: string) => {
    setReplyingToId(commentId);
    setReplyText('');
  }, []);

  const handleCancelReply = useCallback(() => {
    setReplyingToId(null);
    setReplyText('');
  }, []);

  const handleSubmitReply = async (parentId: string) => {
    if (!replyText.trim() || !id) return;

    setIsAddingReply(true);
    try {
      await addReply(id, parentId, replyText);
      setReplyingToId(null);
      setReplyText('');
      fetchCut();
    } catch (error) {
      console.error('Failed to add reply:', error);
    } finally {
      setIsAddingReply(false);
    }
  };

  const handleStartEditComment = useCallback((commentId: string, content: string) => {
    setEditingCommentId(commentId);
    setEditingCommentContent(content);
  }, []);

  const handleCancelEditComment = useCallback(() => {
    setEditingCommentId(null);
    setEditingCommentContent('');
  }, []);

  const handleSaveEditComment = async (commentId: string) => {
    if (!editingCommentContent.trim() || !id) return;

    setIsEditingComment(true);
    try {
      await updateComment(id, commentId, editingCommentContent);
      setEditingCommentId(null);
      setEditingCommentContent('');
      fetchCut();
    } catch (error) {
      console.error('Failed to update comment:', error);
    } finally {
      setIsEditingComment(false);
    }
  };

  const handleCommentClick = useCallback((audioFileId: string, timestamp: number | null) => {
    if (timestamp === null) return;
    
    // Select the audio file
    setSelectedAudioFileId(audioFileId);
    
    // Seek the waveform to the timestamp
    const waveform = waveformRefs.current.get(audioFileId);
    if (waveform) {
      waveform.seekTo(timestamp);
    }
  }, []);

  // Handler for lyrics seeking
  const handleLyricsSeek = (audioFileId: string, timestamp: number) => {
    setSelectedAudioFileId(audioFileId);
    const waveform = waveformRefs.current.get(audioFileId);
    if (waveform) {
      waveform.seekTo(timestamp);
    }
  };

  // Get current playback time from selected audio
  const getCurrentPlaybackTime = (): number => {
    if (!selectedAudioFileId) return 0;
    const waveform = waveformRefs.current.get(selectedAudioFileId);
    if (waveform) {
      return waveform.getCurrentTime?.() ?? 0;
    }
    return 0;
  };

  const setWaveformRef = (audioId: string) => (ref: WaveformHandle | null) => {
    if (ref) {
      waveformRefs.current.set(audioId, ref);
    } else {
      waveformRefs.current.delete(audioId);
    }
  };

  const handleTimeClick = (audioFileId: string) => (time: number) => {
    setCommentTimestamp(time);
    setSelectedAudioFileId(audioFileId);
  };

  const handleMarkerClick = (audioFileId: string) => (timestamp: number) => {
    // Set active marker for highlight animation
    setActiveMarkerTimestamp(timestamp);
    setTimeout(() => setActiveMarkerTimestamp(null), 2000);
    
    // On desktop, scroll sidebar to first comment at this timestamp
    if (window.innerWidth >= 1024) {
      const comments = getCommentsForAudio(audioFileId).filter(c => c.timestamp !== null);
      const firstComment = comments.find(c => Math.round(c.timestamp!) === timestamp);
      if (firstComment) {
        // Use existing comment click handler to scroll and highlight
        handleCommentClick(audioFileId, timestamp);
      }
    }
  };

  const formatTime = useCallback((seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }, []);

  // Group comments by timestamp for waveform markers
  const getCommentMarkerGroups = useCallback((audioFileId: string): CommentMarkerGroup[] => {
    const comments = cut?.comments?.filter(c => c.managedFileId === audioFileId && c.timestamp !== null) || [];
    
    if (comments.length === 0) return [];
    
    // Group by rounded timestamp (nearest second)
    const groups = new Map<number, typeof comments>();
    
    comments.forEach(comment => {
      const timestamp = Math.round(comment.timestamp!);
      if (!groups.has(timestamp)) {
        groups.set(timestamp, []);
      }
      groups.get(timestamp)!.push(comment);
    });
    
    // Convert to marker groups with user colors
    return Array.from(groups.entries())
      .map(([timestamp, groupComments]) => ({
        timestamp,
        count: groupComments.length,
        comments: groupComments.map(c => ({
          id: c.id,
          user: c.user,
          content: c.content,
          timestamp: c.timestamp!,
        })),
        userColors: groupComments.slice(0, 3).map(c => getColorFromId(c.userId)),
      }))
      .sort((a, b) => a.timestamp - b.timestamp);
  }, [cut?.comments]);

  const getCommentsForAudio = (audioFileId: string) => {
    return cut?.comments?.filter(c => c.managedFileId === audioFileId) || [];
  };

  const getSelectedAudio = () => {
    return cut?.managedFiles?.find(a => a.id === selectedAudioFileId);
  };

  // Cut action handlers
  const handleOpenEditModal = () => {
    if (cut) {
      setEditCutName(cut.name);
      setEditCutBpm(cut.bpm?.toString() || '');
      setEditCutTimeSignature(cut.timeSignature || '');
      setShowEditModal(true);
    }
  };

  const handleSaveCutEdit = async () => {
    if (!id || !editCutName.trim()) return;
    
    setIsUpdatingCut(true);
    try {
      await updateCut(id, {
        name: editCutName,
        bpm: editCutBpm ? parseInt(editCutBpm, 10) : null,
        timeSignature: editCutTimeSignature || null,
      });
      setShowEditModal(false);
      fetchCut();
    } catch (error) {
      console.error('Failed to update cut:', error);
    } finally {
      setIsUpdatingCut(false);
    }
  };

  const handleDeleteCut = async () => {
    if (!id || !cut) return;
    
    setIsDeletingCut(true);
    try {
      await deleteCut(id);
      // Navigate back to the project page after deletion
      navigate(`/projects/${cut.vibe?.project?.id}`);
    } catch (error) {
      console.error('Failed to delete cut:', error);
      setIsDeletingCut(false);
    }
  };

  if (isLoading) {
    return <Loading className="py-12" />;
  }

  if (!cut) {
    return (
      <Card className="text-center py-12">
        <p className="text-muted">Cut not found</p>
        <Link to="/projects" className="text-primary hover:underline mt-2 inline-block">
          Back to projects
        </Link>
      </Card>
    );
  }

  const selectedAudio = getSelectedAudio();

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <nav className="flex items-center text-sm text-muted">
        <Link to="/projects" className="hover:text-text">Projects</Link>
        <span className="mx-2">/</span>
        <Link to={`/projects/${cut.vibe?.project?.id}`} className="hover:text-text">
          {cut.vibe?.project?.name}
        </Link>
        <span className="mx-2">/</span>
        <span className="text-muted">{cut.vibe?.name}</span>
        <span className="mx-2">/</span>
        <span className="text-text">{cut.name}</span>
        <ActionSheet
          className="ml-1 p-1"
          title={cut.name}
          items={[
            {
              label: 'View Info',
              description: 'See cut details and metadata',
              icon: <InfoIcon />,
              onClick: () => setShowInfoModal(true),
            },
            {
              label: 'Edit Details',
              description: 'Update name, BPM, and time signature',
              icon: <EditIcon />,
              onClick: handleOpenEditModal,
              visible: isAdmin,
            },
            {
              label: 'Delete Cut',
              description: 'Permanently remove this cut',
              icon: <DeleteIcon />,
              onClick: () => setShowDeleteModal(true),
              variant: 'danger',
              visible: isAdmin,
            },
          ]}
        />
      </nav>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-text">{cut.name}</h1>
          <div className="flex items-center gap-2 mt-2">
            {cut.bpm && (
              <span className="inline-flex items-center px-2 py-1 text-sm font-medium rounded-full bg-primary/20 text-primary">
                {cut.bpm} BPM
              </span>
            )}
            {cut.timeSignature && (
              <span className="inline-flex items-center px-2 py-1 text-sm font-medium rounded-full bg-secondary/20 text-secondary-foreground">
                {cut.timeSignature}
              </span>
            )}
          </div>
          <p className="text-muted mt-1">
            {cut.managedFiles?.length || 0} audio files • {cut.comments?.length || 0} comments
          </p>
        </div>
        <div>
          {/* Hidden file inputs */}
          <input
            ref={audioFileInputRef}
            type="file"
            accept="audio/*"
            onChange={handleAudioUpload}
            className="hidden"
          />
          <input
            ref={fileInputRef}
            type="file"
            accept="audio/*,.zip"
            onChange={handleFileUpload}
            className="hidden"
          />
          
          {activeTab === 'audio' && (
            <Button
              onClick={() => audioFileInputRef.current?.click()}
              isLoading={isUploading}
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              Upload Audio
            </Button>
          )}
          {activeTab === 'files' && (
            <Button
              onClick={() => fileInputRef.current?.click()}
              isLoading={isUploading}
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              Upload Audio or Stems
            </Button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <Tabs
        tabs={[
          { id: 'manifest', label: 'Manifest' },
          { id: 'audio', label: 'Audio', badge: cut.managedFiles?.length || 0 },
          { id: 'files', label: 'Files' },
          { id: 'lyrics', label: 'Lyrics' },
        ]}
        activeTab={activeTab}
        onChange={(tabId) => setActiveTab(tabId as CutTab)}
      />

      {/* Manifest Tab Content */}
      <TabPanel id="manifest" activeTab={activeTab}>
        <CutManifest cutId={cut.id} />
      </TabPanel>

      {/* Audio Tab Content */}
      <TabPanel id="audio" activeTab={activeTab} className="space-y-6">
        {/* Layout wrapper - responsive grid for desktop */}
        <div className="lg:grid lg:grid-cols-3 lg:gap-6 lg:items-start">
          {/* Audio Files - left side on desktop, full width on mobile */}
          <div className="lg:col-span-2 space-y-4">
            {cut.managedFiles?.length === 0 ? (
              <Card className="text-center py-12">
                <svg className="w-12 h-12 text-muted mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                </svg>
                <p className="text-muted">No audio files yet</p>
                <p className="text-sm text-muted mt-1">Upload an audio file to get started</p>
              </Card>
            ) : (
              cut.managedFiles?.map((audio, index) => {
                const audioComments = getCommentsForAudio(audio.id);
                const isSelected = selectedAudioFileId === audio.id;
                const markerGroups = getCommentMarkerGroups(audio.id);

                return (
                  <Card 
                    key={audio.id} 
                    className={`space-y-3 transition-all ${isSelected ? 'ring-2 ring-primary' : 'hover:ring-1 hover:ring-border'}`}
                    onClick={() => setSelectedAudioFileId(audio.id)}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        {editingLabelId === audio.id ? (
                          <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="text"
                              value={editingLabelValue}
                              onChange={(e) => setEditingLabelValue(e.target.value)}
                              placeholder="e.g., Mix v2, Drums Only, Final Master"
                              className="flex-1 px-3 py-1.5 bg-background border border-border rounded text-text text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                              autoFocus
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleSaveLabel(audio.id);
                                if (e.key === 'Escape') handleCancelEditLabel();
                              }}
                            />
                            <button
                              onClick={() => handleSaveLabel(audio.id)}
                              className="p-1.5 text-primary hover:bg-primary/10 rounded transition-colors"
                              title="Save"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                            </button>
                            <button
                              onClick={handleCancelEditLabel}
                              className="p-1.5 text-muted hover:text-error hover:bg-error/10 rounded transition-colors"
                              title="Cancel"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded ${isSelected ? 'bg-primary text-white' : 'bg-primary/20 text-primary'}`}>
                              #{index + 1}
                            </span>
                            {audio.name ? (
                              <h3 className="font-semibold text-text">{audio.name}</h3>
                            ) : (
                              <h3 className="font-medium text-muted italic">No label</h3>
                            )}
                            <button
                              onClick={(e) => { e.stopPropagation(); handleStartEditLabel(audio.id, audio.name); }}
                              className="p-1 text-muted hover:text-primary transition-colors"
                              title="Edit label"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                              </svg>
                            </button>
                            <span className="text-xs text-muted ml-2">
                              {audioComments.length} comment{audioComments.length !== 1 ? 's' : ''}
                            </span>
                          </div>
                        )}
                        <div className="flex items-center gap-1 mt-1">
                          <p className="text-sm text-muted">
                            {audio.originalName} • Uploaded by
                          </p>
                          {audio.uploadedBy && (
                            <div className="flex items-center gap-1.5 ml-1">
                              {audio.uploadedBy.avatarUrl ? (
                                <img
                                  src={audio.uploadedBy.avatarUrl}
                                  alt={audio.uploadedBy.name}
                                  className="w-4 h-4 rounded-full object-cover"
                                  referrerPolicy="no-referrer"
                                />
                              ) : (
                                <div
                                  className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] text-white font-medium ${getColorFromId(audio.uploadedBy.id)}`}
                                >
                                  {getInitials(audio.uploadedBy.name)}
                                </div>
                              )}
                              <span className="text-sm text-muted">{audio.uploadedBy.name}</span>
                            </div>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDeleteAudio(audio.id); }}
                        className="flex-shrink-0 p-2 text-muted hover:text-error hover:bg-error/10 rounded transition-colors"
                        title="Delete audio file (and its comments)"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                    <div onClick={(e) => e.stopPropagation()}>
                      <Waveform
                        ref={setWaveformRef(audio.id)}
                        audioUrl={`/${audio.path}`}
                        onTimeClick={handleTimeClick(audio.id)}
                        markerGroups={markerGroups}
                        onMarkerClick={handleMarkerClick(audio.id)}
                        activeMarkerTimestamp={activeMarkerTimestamp}
                      />
                    </div>
                  </Card>
                );
              })
            )}
          </div>

          {/* Comments Section - sticky sidebar on desktop, hidden on mobile */}
          {cut.managedFiles && cut.managedFiles.length > 0 && (
            <div className="hidden lg:block lg:col-span-1 lg:sticky lg:top-6">
              <CommentsSection
                cut={cut}
                user={user}
                selectedAudio={selectedAudio}
                selectedAudioFileId={selectedAudioFileId}
                commentTimestamp={commentTimestamp}
                commentText={commentText}
                isAddingComment={isAddingComment}
                replyingToId={replyingToId}
                replyText={replyText}
                isAddingReply={isAddingReply}
                editingCommentId={editingCommentId}
                editingCommentContent={editingCommentContent}
                isEditingComment={isEditingComment}
                highlightedCommentId={highlightedCommentId}
                onCommentTextChange={setCommentText}
                onAddComment={handleAddComment}
                onStartReply={handleStartReply}
                onCancelReply={handleCancelReply}
                onSubmitReply={handleSubmitReply}
                onReplyTextChange={setReplyText}
                onStartEdit={handleStartEditComment}
                onCancelEdit={handleCancelEditComment}
                onSaveEdit={handleSaveEditComment}
                onEditContentChange={setEditingCommentContent}
                onDeleteComment={handleDeleteComment}
                onCommentClick={handleCommentClick}
                formatTime={formatTime}
              />
            </div>
          )}
        </div>

        {/* Floating Action Button (FAB) for mobile - only show when there are audio files */}
        {cut.managedFiles && cut.managedFiles.length > 0 && (
          <button
            onClick={() => setIsCommentsDrawerOpen(true)}
            className="lg:hidden fixed bottom-6 right-6 z-40 w-14 h-14 rounded-full bg-primary text-white shadow-lg hover:shadow-xl transition-all hover:scale-105 flex items-center justify-center"
            aria-label="Open comments"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
            </svg>
            {cut.comments && cut.comments.length > 0 && (
              <span className="absolute -top-1 -right-1 w-6 h-6 bg-secondary text-white text-xs font-bold rounded-full flex items-center justify-center">
                {cut.comments.length}
              </span>
            )}
          </button>
        )}

        {/* Comments Drawer for mobile */}
        <Sheet open={isCommentsDrawerOpen} onOpenChange={setIsCommentsDrawerOpen}>
          <SheetContent side="bottom" className="h-[85vh] p-0">
            <SheetHeader className="p-6 pb-4 border-b border-border">
              <SheetTitle>Comments</SheetTitle>
            </SheetHeader>
            <SheetBody className="p-6">
              <CommentsSection
                cut={cut}
                user={user}
                selectedAudio={selectedAudio}
                selectedAudioFileId={selectedAudioFileId}
                commentTimestamp={commentTimestamp}
                commentText={commentText}
                isAddingComment={isAddingComment}
                replyingToId={replyingToId}
                replyText={replyText}
                isAddingReply={isAddingReply}
                editingCommentId={editingCommentId}
                editingCommentContent={editingCommentContent}
                isEditingComment={isEditingComment}
                highlightedCommentId={highlightedCommentId}
                onCommentTextChange={setCommentText}
                onAddComment={handleAddComment}
                onStartReply={handleStartReply}
                onCancelReply={handleCancelReply}
                onSubmitReply={handleSubmitReply}
                onReplyTextChange={setReplyText}
                onStartEdit={handleStartEditComment}
                onCancelEdit={handleCancelEditComment}
                onSaveEdit={handleSaveEditComment}
                onEditContentChange={setEditingCommentContent}
                onDeleteComment={handleDeleteComment}
                onCommentClick={handleCommentClick}
                formatTime={formatTime}
              />
            </SheetBody>
          </SheetContent>
        </Sheet>
      </TabPanel>

      {/* Files Tab Content */}
      <TabPanel id="files" activeTab={activeTab}>
        <CutFileExplorer 
          key={fileExplorerKey}
          cutId={id!}
          vibeName={cut.vibe?.name}
          vibeImage={cut.vibe?.image}
          projectName={cut.vibe?.project?.name}
          projectImage={cut.vibe?.project?.image}
          onUploadRequest={() => fileInputRef.current?.click()}
          onFileChange={fetchCut}
        />
      </TabPanel>

      {/* Lyrics Tab Content */}
      <TabPanel id="lyrics" activeTab={activeTab}>
        <LyricsEditor
          cutId={id!}
          audioFiles={cut.managedFiles || []}
          onSeek={handleLyricsSeek}
          getCurrentTime={getCurrentPlaybackTime}
        />
      </TabPanel>

      {/* Cut Info Modal */}
      <SideSheet
        isOpen={showInfoModal}
        onClose={() => setShowInfoModal(false)}
        title="Cut Information"
        description="Details about this cut"
        footer={
          <Button variant="ghost" onClick={() => setShowInfoModal(false)}>
            Close
          </Button>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-muted mb-1">Name</label>
            <p className="text-text">{cut.name}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-muted mb-1">Project</label>
            <p className="text-text">{cut.vibe?.project?.name}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-muted mb-1">Vibe</label>
            <p className="text-text">{cut.vibe?.name}</p>
          </div>
          <div className="flex gap-8">
            <div>
              <label className="block text-sm font-medium text-muted mb-1">BPM</label>
              <p className="text-text">{cut.bpm || 'Not set'}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-muted mb-1">Time Signature</label>
              <p className="text-text">{cut.timeSignature || 'Not set'}</p>
            </div>
          </div>
          <div className="flex gap-8">
            <div>
              <label className="block text-sm font-medium text-muted mb-1">Audio Files</label>
              <p className="text-text">{cut.managedFiles?.length || 0}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-muted mb-1">Comments</label>
              <p className="text-text">{cut.comments?.length || 0}</p>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-muted mb-1">Created</label>
            <p className="text-text">{new Date(cut.createdAt).toLocaleDateString()}</p>
          </div>
        </div>
      </SideSheet>

      {/* Cut Edit Modal */}
      <SideSheet
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        title="Edit Cut"
        description="Update cut details"
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowEditModal(false)} disabled={isUpdatingCut}>
              Cancel
            </Button>
            <Button onClick={handleSaveCutEdit} isLoading={isUpdatingCut}>
              Save Changes
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label="Name"
            placeholder="Enter cut name..."
            value={editCutName}
            onChange={(e) => setEditCutName(e.target.value)}
          />
          <Input
            label="BPM (Beats Per Minute)"
            type="number"
            placeholder="e.g., 120"
            value={editCutBpm}
            onChange={(e) => setEditCutBpm(e.target.value)}
            min={1}
            max={999}
          />
          <div>
            <label className="block text-sm font-medium text-text mb-1">
              Time Signature
            </label>
            <select
              value={editCutTimeSignature}
              onChange={(e) => setEditCutTimeSignature(e.target.value)}
              className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            >
              <option value="">Select time signature</option>
              <option value="4/4">4/4 (Common Time)</option>
              <option value="3/4">3/4 (Waltz)</option>
              <option value="6/8">6/8</option>
              <option value="2/4">2/4</option>
              <option value="5/4">5/4</option>
              <option value="7/8">7/8</option>
              <option value="12/8">12/8</option>
            </select>
          </div>
        </div>
      </SideSheet>

      {/* Cut Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Delete Cut"
        description="This action cannot be undone"
      >
        <div className="space-y-4">
          <p className="text-muted">
            Are you sure you want to delete{' '}
            <span className="text-text font-medium">{cut.name}</span>?
            This will also delete all audio files, comments, and lyrics associated with this cut.
          </p>
          <div className="flex justify-end gap-3 pt-4 border-t border-border">
            <Button variant="ghost" onClick={() => setShowDeleteModal(false)} disabled={isDeletingCut}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleDeleteCut} isLoading={isDeletingCut}>
              Delete Cut
            </Button>
          </div>
        </div>
      </ConfirmationModal>
    </div>
  );
}
