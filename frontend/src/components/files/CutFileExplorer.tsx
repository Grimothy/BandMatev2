import { useState, useEffect } from 'react';
import { ManagedFile } from '../../types';
import { getManagedFiles, deleteManagedFile, updateManagedFile, formatFileSize, shareFile, unshareFile, getPublicShareUrl } from '../../api/files';
import { useAuth } from '../../hooks/useAuth';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Loading } from '../ui/Loading';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { ActionMenu } from '../ui/ActionMenu';
import { AudioPlayer } from '../audio/AudioPlayer';

// Icons
const AudioIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
  </svg>
);

const ZipIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
  </svg>
);

const FileIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
  </svg>
);

const DownloadIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
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

const ShareIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
  </svg>
);

const CopyIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
  </svg>
);

const CheckIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
  </svg>
);

const PlayCircleIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24">
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z" />
  </svg>
);

interface CutFileExplorerProps {
  cutId: string;
  vibeName?: string;
  vibeImage?: string | null;
  projectName?: string;
  projectImage?: string | null;
  onUploadRequest?: () => void;
  onFileChange?: () => void;
}

export function CutFileExplorer({ cutId, vibeName, vibeImage, projectName, projectImage, onUploadRequest, onFileChange }: CutFileExplorerProps) {
  const { canModifyFile } = useAuth();
  const [files, setFiles] = useState<ManagedFile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Audio player
  const [playingFile, setPlayingFile] = useState<ManagedFile | null>(null);
  
  // Edit modal
  const [editingFile, setEditingFile] = useState<ManagedFile | null>(null);
  const [editName, setEditName] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  
  // Delete confirmation
  const [deletingFile, setDeletingFile] = useState<ManagedFile | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Share modal
  const [sharingFile, setSharingFile] = useState<ManagedFile | null>(null);
  const [isSharing, setIsSharing] = useState(false);
  const [copied, setCopied] = useState(false);

  const fetchFiles = async () => {
    setIsLoading(true);
    try {
      const filesData = await getManagedFiles({ cutId });
      setFiles(filesData);
    } catch (error) {
      console.error('Failed to fetch files:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchFiles();
  }, [cutId]);

  const handleDownload = (file: ManagedFile) => {
    const link = document.createElement('a');
    link.href = `/${file.path}`;
    link.download = file.originalName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleEdit = (file: ManagedFile) => {
    setEditingFile(file);
    setEditName(file.name || '');
  };

  const handleSaveEdit = async () => {
    if (!editingFile) return;
    
    setIsUpdating(true);
    try {
      await updateManagedFile(editingFile.id, {
        name: editName || undefined,
      });
      setEditingFile(null);
      fetchFiles();
    } catch (error) {
      console.error('Failed to update file:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingFile) return;
    
    setIsDeleting(true);
    try {
      await deleteManagedFile(deletingFile.id);
      setDeletingFile(null);
      fetchFiles();
      // Notify parent that files changed
      onFileChange?.();
    } catch (error) {
      console.error('Failed to delete file:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleShare = (file: ManagedFile) => {
    setSharingFile(file);
    setCopied(false);
  };

  const handleToggleShare = async () => {
    if (!sharingFile) return;
    
    setIsSharing(true);
    try {
      if (sharingFile.isPublic) {
        const updated = await unshareFile(sharingFile.id);
        setSharingFile(updated);
      } else {
        const updated = await shareFile(sharingFile.id);
        setSharingFile(updated);
      }
      fetchFiles();
    } catch (error) {
      console.error('Failed to toggle share:', error);
    } finally {
      setIsSharing(false);
    }
  };

  const handleCopyLink = async () => {
    if (!sharingFile?.shareToken) return;
    
    const url = getPublicShareUrl(sharingFile.shareToken);
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy link:', error);
    }
  };

  const getFileIcon = (file: ManagedFile) => {
    if (file.type === 'CUT') {
      return <AudioIcon className="w-5 h-5 text-primary flex-shrink-0" />;
    } else if (file.type === 'STEM') {
      return <ZipIcon className="w-5 h-5 text-blue-400 flex-shrink-0" />;
    }
    return <FileIcon className="w-5 h-5 text-muted flex-shrink-0" />;
  };

  if (isLoading) {
    return <Loading className="py-12" />;
  }

  return (
    <div className="space-y-4">
      {files.length === 0 ? (
        <Card className="text-center py-12">
          <svg className="w-12 h-12 text-muted mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
          </svg>
          <p className="text-text font-medium">No files yet</p>
          <p className="text-sm text-muted mt-1">
            Upload files to organize your cut assets
          </p>
          {onUploadRequest && (
            <Button onClick={onUploadRequest} className="mt-4">
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              Upload File
            </Button>
          )}
        </Card>
      ) : (
        <Card className="divide-y divide-border">
          {/* File list header */}
          <div className="flex items-center gap-4 px-4 py-2 text-xs font-medium text-muted uppercase tracking-wide bg-surface/50">
            <div className="flex-1">Name</div>
            <div className="w-20 text-right">Size</div>
            <div className="w-16 text-center">Type</div>
            <div className="w-24 text-right">Actions</div>
          </div>
          
          {/* File rows */}
          {files.map((file) => (
            <div
              key={file.id}
              className={`flex items-center gap-4 px-4 py-3 hover:bg-surface-light transition-colors group ${
                file.type === 'CUT' ? 'cursor-pointer' : ''
              } ${playingFile?.id === file.id ? 'bg-primary/5' : ''}`}
              onClick={() => {
                if (file.type === 'CUT') {
                  setPlayingFile(file);
                }
              }}
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                {file.type === 'CUT' ? (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setPlayingFile(file);
                    }}
                    className={`flex-shrink-0 transition-colors ${
                      playingFile?.id === file.id
                        ? 'text-primary'
                        : 'text-muted hover:text-primary'
                    }`}
                    title="Play"
                  >
                    <PlayCircleIcon className="w-6 h-6" />
                  </button>
                ) : (
                  getFileIcon(file)
                )}
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm text-text truncate" title={file.name || file.originalName}>
                      {file.name || file.originalName}
                    </p>
                    {file.isPublic && (
                      <span className="inline-flex items-center px-1.5 py-0.5 text-xs font-medium rounded bg-green-500/20 text-green-400" title="Publicly shared">
                        <ShareIcon />
                      </span>
                    )}
                  </div>
                  {file.name && (
                    <p className="text-xs text-muted truncate" title={file.originalName}>
                      {file.originalName}
                    </p>
                  )}
                </div>
              </div>
              
              <div className="w-20 text-right text-sm text-muted">
                {formatFileSize(file.fileSize)}
              </div>
              
              <div className="w-16 text-center">
                <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded ${
                  file.type === 'CUT' 
                    ? 'bg-primary/20 text-primary' 
                    : 'bg-blue-500/20 text-blue-400'
                }`}>
                  {file.type}
                </span>
              </div>
              
              <div className="w-24 flex items-center justify-end">
                <ActionMenu
                  items={[
                    {
                      label: 'Download',
                      icon: <DownloadIcon />,
                      onClick: () => handleDownload(file),
                    },
                    {
                      label: file.isPublic ? 'Manage Share' : 'Share',
                      icon: <ShareIcon />,
                      onClick: () => handleShare(file),
                      visible: canModifyFile(file),
                    },
                    {
                      label: 'Edit',
                      icon: <EditIcon />,
                      onClick: () => handleEdit(file),
                      visible: canModifyFile(file),
                    },
                    {
                      label: 'Delete',
                      icon: <DeleteIcon />,
                      onClick: () => setDeletingFile(file),
                      variant: 'danger',
                      visible: canModifyFile(file),
                    },
                  ]}
                />
              </div>
            </div>
          ))}
        </Card>
      )}

      {/* Edit Modal */}
      <Modal
        isOpen={!!editingFile}
        onClose={() => setEditingFile(null)}
        title="Edit File"
      >
        <div className="space-y-4">
          <Input
            label="Name"
            placeholder="Enter a name..."
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
          />
          
          {editingFile && (
            <div>
              <label className="block text-sm font-medium text-muted mb-1.5">
                Original Filename
              </label>
              <p className="text-sm text-text">{editingFile.originalName}</p>
            </div>
          )}
          
          <div className="flex justify-end gap-3 pt-4 border-t border-border">
            <Button variant="ghost" onClick={() => setEditingFile(null)} disabled={isUpdating}>
              Cancel
            </Button>
            <Button onClick={handleSaveEdit} isLoading={isUpdating}>
              Save Changes
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!deletingFile}
        onClose={() => setDeletingFile(null)}
        title="Delete File"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-muted">
            Are you sure you want to delete{' '}
            <span className="text-text font-medium">
              {deletingFile?.name || deletingFile?.originalName}
            </span>
            ? This action cannot be undone.
          </p>
          
          <div className="flex justify-end gap-3 pt-4 border-t border-border">
            <Button variant="ghost" onClick={() => setDeletingFile(null)} disabled={isDeleting}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleDelete} isLoading={isDeleting}>
              Delete
            </Button>
          </div>
        </div>
      </Modal>

      {/* Share Modal */}
      <Modal
        isOpen={!!sharingFile}
        onClose={() => setSharingFile(null)}
        title="Share File"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-muted mb-1">File</label>
            <p className="text-text">{sharingFile?.name || sharingFile?.originalName}</p>
          </div>
          
          <div className="flex items-center justify-between p-4 bg-surface-light rounded-lg">
            <div>
              <p className="text-sm font-medium text-text">Public Sharing</p>
              <p className="text-xs text-muted mt-0.5">
                {sharingFile?.isPublic 
                  ? 'Anyone with the link can access this file'
                  : 'Only project members can access this file'}
              </p>
            </div>
            <Button
              variant={sharingFile?.isPublic ? 'danger' : 'primary'}
              size="sm"
              onClick={handleToggleShare}
              isLoading={isSharing}
            >
              {sharingFile?.isPublic ? 'Make Private' : 'Make Public'}
            </Button>
          </div>
          
          {sharingFile?.isPublic && sharingFile?.shareToken && (
            <div>
              <label className="block text-sm font-medium text-muted mb-1.5">Share Link</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  readOnly
                  value={getPublicShareUrl(sharingFile.shareToken)}
                  className="flex-1 px-3 py-2 bg-surface border border-border rounded-lg text-sm text-text truncate"
                />
                <Button
                  variant="secondary"
                  onClick={handleCopyLink}
                  className="flex-shrink-0"
                >
                  {copied ? <CheckIcon /> : <CopyIcon />}
                  <span className="ml-2">{copied ? 'Copied!' : 'Copy'}</span>
                </Button>
              </div>
            </div>
          )}
          
          <div className="flex justify-end pt-4 border-t border-border">
            <Button variant="ghost" onClick={() => setSharingFile(null)}>
              Close
            </Button>
          </div>
        </div>
      </Modal>

      {/* Audio Player */}
      {playingFile && (
        <div className="mt-6">
          <AudioPlayer
            audioUrl={`/${playingFile.path}`}
            trackName={playingFile.name || playingFile.originalName}
            vibeImage={vibeImage}
            vibeName={vibeName}
            projectName={projectName}
            projectImage={projectImage}
            onClose={() => setPlayingFile(null)}
          />
        </div>
      )}
    </div>
  );
}
