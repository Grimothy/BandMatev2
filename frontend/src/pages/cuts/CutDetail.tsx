import { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { getCut, uploadAudio, deleteAudio, updateAudioLabel, addComment, deleteComment, addReply, updateComment, updateCut, deleteCut } from '../../api/cuts';
import { uploadCut } from '../../api/files';
import { useAuth } from '../../hooks/useAuth';
import { Cut, Comment } from '../../types';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Loading } from '../../components/ui/Loading';
import { Modal } from '../../components/ui/Modal';
import { Tabs, TabPanel } from '../../components/ui/Tabs';
import { Waveform, WaveformHandle } from '../../components/audio/Waveform';
import { CutFileExplorer } from '../../components/files/CutFileExplorer';
import { LyricsEditor } from '../../components/lyrics/LyricsEditor';
import { ActionMenu } from '../../components/ui/ActionMenu';

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
type CutTab = 'audio' | 'files' | 'lyrics';

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

function CommentItem({
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

  const handleTimestampClick = () => {
    if (hasTimestamp) {
      onCommentClick(comment.managedFileId, comment.timestamp);
    }
  };

  return (
    <div className={depth > 0 ? 'ml-6 border-l-2 border-border pl-3' : ''}>
      <div
        className={`flex gap-3 p-3 rounded-lg group transition-colors ${
          comment.managedFileId === selectedAudioFileId
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
}

export function CutDetail() {
  const { id } = useParams<{ id: string }>();
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const audioFileInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const waveformRefs = useRef<Map<string, WaveformHandle>>(new Map());
  
  const [cut, setCut] = useState<Cut | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [activeTab, setActiveTab] = useState<CutTab>('audio');
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
  
  // Cut action modals
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [editCutName, setEditCutName] = useState('');
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

    setIsUploading(true);
    try {
      await uploadCut(id, file);
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

  const handleStartReply = (commentId: string) => {
    setReplyingToId(commentId);
    setReplyText('');
  };

  const handleCancelReply = () => {
    setReplyingToId(null);
    setReplyText('');
  };

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

  const handleStartEditComment = (commentId: string, content: string) => {
    setEditingCommentId(commentId);
    setEditingCommentContent(content);
  };

  const handleCancelEditComment = () => {
    setEditingCommentId(null);
    setEditingCommentContent('');
  };

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

  const handleCommentClick = (audioFileId: string, timestamp: number | null) => {
    if (timestamp === null) return;
    
    // Select the audio file
    setSelectedAudioFileId(audioFileId);
    
    // Seek the waveform to the timestamp
    const waveform = waveformRefs.current.get(audioFileId);
    if (waveform) {
      waveform.seekTo(timestamp);
    }
  };

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

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

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
      setShowEditModal(true);
    }
  };

  const handleSaveCutEdit = async () => {
    if (!id || !editCutName.trim()) return;
    
    setIsUpdatingCut(true);
    try {
      await updateCut(id, editCutName);
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
        <ActionMenu
          className="ml-1 p-1"
          items={[
            {
              label: 'View Info',
              icon: <InfoIcon />,
              onClick: () => setShowInfoModal(true),
            },
            {
              label: 'Edit Details',
              icon: <EditIcon />,
              onClick: handleOpenEditModal,
              visible: isAdmin,
            },
            {
              label: 'Delete Cut',
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
            accept="audio/*"
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
              Upload File
            </Button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <Tabs
        tabs={[
          { id: 'audio', label: 'Audio', badge: cut.managedFiles?.length || 0 },
          { id: 'files', label: 'Files' },
          { id: 'lyrics', label: 'Lyrics' },
        ]}
        activeTab={activeTab}
        onChange={(tabId) => setActiveTab(tabId as CutTab)}
      />

      {/* Audio Tab Content */}
      <TabPanel id="audio" activeTab={activeTab} className="space-y-6">
        {/* Audio Files */}
        {cut.managedFiles?.length === 0 ? (
          <Card className="text-center py-12">
            <svg className="w-12 h-12 text-muted mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
            </svg>
            <p className="text-muted">No audio files yet</p>
            <p className="text-sm text-muted mt-1">Upload an audio file to get started</p>
          </Card>
        ) : (
          <div className="space-y-4">
            {cut.managedFiles?.map((audio, index) => {
              const audioComments = getCommentsForAudio(audio.id);
              const isSelected = selectedAudioFileId === audio.id;
              const commentMarkers = audioComments
                .filter((c) => c.timestamp !== null)
                .map((c) => ({
                  time: c.timestamp as number,
                  color: '#f59e0b',
                }));

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
                      markers={commentMarkers}
                    />
                  </div>
                </Card>
              );
            })}
          </div>
        )}

        {/* Comments Section */}
        {cut.managedFiles && cut.managedFiles.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Add Comment */}
            <div className="lg:col-span-1">
              <Card>
                <h3 className="font-semibold text-text mb-4">Add Comment</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-muted mb-1.5">
                      Audio File
                    </label>
                    <div className="px-3 py-2 bg-surface-light rounded text-sm">
                      {selectedAudio ? (
                        <span className="text-text">
                          {selectedAudio.name || selectedAudio.originalName}
                        </span>
                      ) : (
                        <span className="text-muted italic">Click on an audio file to select</span>
                      )}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-muted mb-1.5">
                      Timestamp
                    </label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="text"
                        value={formatTime(commentTimestamp)}
                        readOnly
                        className="text-center"
                      />
                      <span className="text-xs text-muted">Click on waveform to set</span>
                    </div>
                  </div>
                  <Input
                    label="Comment"
                    placeholder="Add your feedback..."
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                  />
                  <Button
                    onClick={handleAddComment}
                    isLoading={isAddingComment}
                    disabled={!commentText.trim() || !selectedAudioFileId}
                    className="w-full"
                  >
                    Add Comment
                  </Button>
                </div>
              </Card>
            </div>

            {/* Comments Timeline */}
            <div className="lg:col-span-2">
              <Card>
                <h3 className="font-semibold text-text mb-4">
                  Comments Timeline ({cut.comments?.length || 0})
                </h3>
                {cut.comments?.length === 0 ? (
                  <p className="text-muted text-center py-8">No comments yet</p>
                ) : (
                  <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
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
                        depth={0}
                      />
                    ))}
                  </div>
                )}
              </Card>
            </div>
          </div>
        )}
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
      <Modal
        isOpen={showInfoModal}
        onClose={() => setShowInfoModal(false)}
        title="Cut Information"
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
          <div className="flex justify-end pt-4 border-t border-border">
            <Button variant="ghost" onClick={() => setShowInfoModal(false)}>
              Close
            </Button>
          </div>
        </div>
      </Modal>

      {/* Cut Edit Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        title="Edit Cut"
      >
        <div className="space-y-4">
          <Input
            label="Name"
            placeholder="Enter cut name..."
            value={editCutName}
            onChange={(e) => setEditCutName(e.target.value)}
          />
          <div className="flex justify-end gap-3 pt-4 border-t border-border">
            <Button variant="ghost" onClick={() => setShowEditModal(false)} disabled={isUpdatingCut}>
              Cancel
            </Button>
            <Button onClick={handleSaveCutEdit} isLoading={isUpdatingCut}>
              Save Changes
            </Button>
          </div>
        </div>
      </Modal>

      {/* Cut Delete Confirmation Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Delete Cut"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-muted">
            Are you sure you want to delete{' '}
            <span className="text-text font-medium">{cut.name}</span>?
            This will also delete all audio files, comments, and lyrics associated with this cut.
            This action cannot be undone.
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
      </Modal>
    </div>
  );
}
