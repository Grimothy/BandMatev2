import { useState, useEffect, useMemo } from 'react';
import { ManagedFile, FileHierarchy } from '../../types';
import { getManagedFiles, getFileHierarchy, deleteManagedFile, updateManagedFile } from '../../api/files';
import { UploadModal } from '../../components/files/UploadModal';
import { AudioPlayer } from '../../components/audio/AudioPlayer';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Loading } from '../../components/ui/Loading';
import { SideSheet, ConfirmationModal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { formatFileSize } from '../../api/files';
import {
  FileTree,
  FilesHighlight,
  FolderItem,
  FolderHeader,
  FolderTrigger,
  FolderContent,
  FileHighlight,
  FileItem,
  FileIcon,
  FileLabel,
  FolderIcon,
  ChevronIcon,
} from '../../components/animate-ui';

// Icons
const FolderClosedIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
  </svg>
);

const FolderOpenIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1M5 19h14a2 2 0 002-2v-5a2 2 0 00-2-2H9a2 2 0 00-2 2v5a2 2 0 01-2 2z" />
  </svg>
);

const ZipIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
  </svg>
);

const PlayCircleIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24">
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z" />
  </svg>
);

interface HierarchyWithFiles extends FileHierarchy {
  vibes: {
    id: string;
    name: string;
    slug: string;
    image: string | null;
    cuts: {
      id: string;
      name: string;
      slug: string;
      files: ManagedFile[];
    }[];
  }[];
}

// Context for currently playing file
interface PlayingContext {
  file: ManagedFile;
  vibeName: string;
  vibeImage: string | null;
  projectName: string;
  projectImage: string | null;
}

export function FileExplorer() {
  const [hierarchy, setHierarchy] = useState<HierarchyWithFiles[]>([]);
  const [files, setFiles] = useState<ManagedFile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Expanded state - now combined into a single array for FileTree
  const [expandedItems, setExpandedItems] = useState<string[]>([]);
  
  // Upload modal
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [uploadTargetCutId, setUploadTargetCutId] = useState<string | undefined>();
  
  // Edit modal
  const [editingFile, setEditingFile] = useState<ManagedFile | null>(null);
  const [editName, setEditName] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  
  // Delete confirmation
  const [deletingFile, setDeletingFile] = useState<ManagedFile | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Audio player
  const [playingContext, setPlayingContext] = useState<PlayingContext | null>(null);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [filesData, hierarchyData] = await Promise.all([
        getManagedFiles(),
        getFileHierarchy(),
      ]);
      setFiles(filesData);
      
      // Merge files into hierarchy
      const hierarchyWithFiles: HierarchyWithFiles[] = hierarchyData.map(project => ({
        ...project,
        vibes: project.vibes.map(vibe => ({
          ...vibe,
          cuts: vibe.cuts.map(cut => ({
            ...cut,
            files: filesData.filter(f => f.cutId === cut.id),
          })),
        })),
      }));
      
      setHierarchy(hierarchyWithFiles);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Compute all possible IDs for expand/collapse all
  const allFolderIds = useMemo(() => {
    const ids: string[] = [];
    hierarchy.forEach(project => {
      ids.push(`project-${project.id}`);
      project.vibes.forEach(vibe => {
        ids.push(`vibe-${vibe.id}`);
        vibe.cuts.forEach(cut => {
          ids.push(`cut-${cut.id}`);
        });
      });
    });
    return ids;
  }, [hierarchy]);

  const handleUploadToCut = (cutId: string) => {
    setUploadTargetCutId(cutId);
    setIsUploadModalOpen(true);
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
      fetchData();
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
      fetchData();
    } catch (error) {
      console.error('Failed to delete file:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDownload = (file: ManagedFile) => {
    const link = document.createElement('a');
    link.href = `/${file.path}`;
    link.download = file.originalName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePlayFile = (file: ManagedFile, vibeName: string, vibeImage: string | null, projectName: string, projectImage: string | null) => {
    setPlayingContext({
      file,
      vibeName,
      vibeImage,
      projectName,
      projectImage,
    });
  };

  const handleClosePlayer = () => {
    setPlayingContext(null);
  };

  const expandAll = () => {
    setExpandedItems(allFolderIds);
  };

  const collapseAll = () => {
    setExpandedItems([]);
  };

  if (isLoading) {
    return <Loading className="py-12" />;
  }

  const totalFiles = files.length;

  return (
    <div className={`space-y-6 ${playingContext ? 'pb-48' : ''}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-text">File Explorer</h1>
          <p className="text-muted mt-1">
            {totalFiles} file{totalFiles !== 1 ? 's' : ''} across {hierarchy.length} project{hierarchy.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" onClick={expandAll}>
            Expand All
          </Button>
          <Button variant="ghost" onClick={collapseAll}>
            Collapse All
          </Button>
          <Button onClick={() => { setUploadTargetCutId(undefined); setIsUploadModalOpen(true); }}>
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            Upload File
          </Button>
        </div>
      </div>

      {/* Tree View */}
      {hierarchy.length === 0 ? (
        <Card className="text-center py-12">
          <FolderClosedIcon className="w-16 h-16 text-muted mx-auto mb-4" />
          <p className="text-text font-medium">No projects found</p>
          <p className="text-sm text-muted mt-1">
            Create a project, vibe, and cut to start organizing files.
          </p>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <FileTree
            value={expandedItems}
            onValueChange={setExpandedItems}
            highlightClassName="bg-surface-light"
            highlightHover={false}
          >
            <FilesHighlight>
              {hierarchy.map(project => (
                <FolderItem key={project.id} id={`project-${project.id}`}>
                  {/* Project Row */}
                  <FolderHeader>
                    <FileHighlight>
                      <FolderTrigger className="gap-2 p-3 hover:bg-surface-light/50 w-full transition-colors">
                        <ChevronIcon className="text-muted" />
                        <FolderIcon 
                          className="text-yellow-500"
                          openIcon={<FolderOpenIcon className="w-5 h-5" />}
                          closedIcon={<FolderClosedIcon className="w-5 h-5" />}
                        />
                        <FileLabel className="font-medium text-text flex-1 text-left">{project.name}</FileLabel>
                        <span className="text-xs text-muted">
                          {project.vibes.length} vibe{project.vibes.length !== 1 ? 's' : ''}
                        </span>
                      </FolderTrigger>
                    </FileHighlight>
                  </FolderHeader>

                  {/* Vibes */}
                  <FolderContent className="border-t border-border/50">
                    <div className="bg-surface/30">
                      {project.vibes.length === 0 ? (
                        <div className="pl-10 pr-3 py-2 text-sm text-muted italic">
                          No vibes in this project
                        </div>
                      ) : (
                        project.vibes.map(vibe => (
                          <FolderItem key={vibe.id} id={`vibe-${vibe.id}`}>
                            {/* Vibe Row */}
                            <FolderHeader>
                              <FileHighlight>
                                <FolderTrigger className="gap-2 pl-8 pr-3 py-2 hover:bg-surface-light/50 w-full transition-colors">
                                  <ChevronIcon className="text-muted" />
                                  <FolderIcon 
                                    className="text-blue-400"
                                    openIcon={<FolderOpenIcon className="w-5 h-5" />}
                                    closedIcon={<FolderClosedIcon className="w-5 h-5" />}
                                  />
                                  <FileLabel className="text-text flex-1 text-left">{vibe.name}</FileLabel>
                                  <span className="text-xs text-muted">
                                    {vibe.cuts.length} cut{vibe.cuts.length !== 1 ? 's' : ''}
                                  </span>
                                </FolderTrigger>
                              </FileHighlight>
                            </FolderHeader>

                            {/* Cuts */}
                            <FolderContent>
                              <div>
                                {vibe.cuts.length === 0 ? (
                                  <div className="pl-16 pr-3 py-2 text-sm text-muted italic">
                                    No cuts in this vibe
                                  </div>
                                ) : (
                                  vibe.cuts.map(cut => (
                                    <FolderItem key={cut.id} id={`cut-${cut.id}`}>
                                     {/* Cut Row */}
                                     <div className="flex items-center">
                                       <FileHighlight className="flex-1">
                                         <div>
                                           <FolderTrigger className="gap-2 pl-14 pr-3 py-2 hover:bg-surface-light/50 w-full transition-colors">
                                             <ChevronIcon className="text-muted" />
                                             <FolderIcon 
                                               className="text-primary"
                                               openIcon={<FolderOpenIcon className="w-5 h-5" />}
                                               closedIcon={<FolderClosedIcon className="w-5 h-5" />}
                                             />
                                             <FileLabel className="text-text flex-1 text-left">{cut.name}</FileLabel>
                                             <span className="text-xs text-muted">
                                               {cut.files.length} file{cut.files.length !== 1 ? 's' : ''}
                                             </span>
                                           </FolderTrigger>
                                         </div>
                                       </FileHighlight>
                                       <button
                                         onClick={(e) => { e.stopPropagation(); handleUploadToCut(cut.id); }}
                                         className="p-1 text-muted hover:text-primary hover:bg-primary/10 rounded transition-colors mr-3"
                                         title="Upload to this cut"
                                       >
                                         <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                         </svg>
                                       </button>
                                     </div>

                                      {/* Files */}
                                      <FolderContent>
                                        <div className="bg-background/30">
                                          {cut.files.length === 0 ? (
                                            <div className="pl-20 pr-3 py-2 text-sm text-muted italic flex items-center gap-2">
                                              <span>No files yet</span>
                                              <button
                                                onClick={() => handleUploadToCut(cut.id)}
                                                className="text-primary hover:underline"
                                              >
                                                Upload one
                                              </button>
                                            </div>
                                          ) : (
                                            cut.files.map(file => (
                                              <FileHighlight key={file.id}>
                                                <FileItem
                                                  className={`gap-2 pl-20 pr-3 py-2 hover:bg-surface-light/50 group cursor-pointer transition-colors ${
                                                    playingContext?.file.id === file.id ? 'bg-primary/5' : ''
                                                  }`}
                                                  onClick={() => {
                                                    if (file.type === 'CUT') {
                                                      handlePlayFile(file, vibe.name, vibe.image, project.name, project.image);
                                                    }
                                                  }}
                                                >
                                                  {file.type === 'CUT' ? (
                                                    <button
                                                      onClick={(e) => {
                                                        e.stopPropagation();
                                                        handlePlayFile(file, vibe.name, vibe.image, project.name, project.image);
                                                      }}
                                                      className={`flex-shrink-0 transition-colors ${
                                                        playingContext?.file.id === file.id
                                                          ? 'text-primary'
                                                          : 'text-muted hover:text-primary'
                                                      }`}
                                                      title="Play"
                                                    >
                                                      <PlayCircleIcon className="w-5 h-5" />
                                                    </button>
                                                  ) : (
                                                    <FileIcon>
                                                      <ZipIcon className="w-4 h-4 text-blue-400" />
                                                    </FileIcon>
                                                  )}
                                                  <FileLabel className="text-sm text-text flex-1" title={file.originalName}>
                                                    {file.name || file.originalName}
                                                  </FileLabel>
                                                  <span className="text-xs text-muted flex-shrink-0">
                                                    {formatFileSize(file.fileSize)}
                                                  </span>
                                                  <span className={`text-xs px-1.5 py-0.5 rounded flex-shrink-0 ${
                                                    file.type === 'CUT' 
                                                      ? 'bg-primary/20 text-primary' 
                                                      : 'bg-blue-500/20 text-blue-400'
                                                  }`}>
                                                    {file.type}
                                                  </span>
                                                  
                                                  {/* File Actions */}
                                                  <div className="flex items-center gap-1">
                                                    <button
                                                      onClick={(e) => { e.stopPropagation(); handleDownload(file); }}
                                                      className="p-1 text-muted hover:text-primary hover:bg-primary/10 rounded transition-colors"
                                                      title="Download"
                                                    >
                                                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                                      </svg>
                                                    </button>
                                                    <button
                                                      onClick={(e) => { e.stopPropagation(); handleEdit(file); }}
                                                      className="p-1 text-muted hover:text-primary hover:bg-primary/10 rounded transition-colors"
                                                      title="Edit"
                                                    >
                                                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                                      </svg>
                                                    </button>
                                                    <button
                                                      onClick={(e) => { e.stopPropagation(); setDeletingFile(file); }}
                                                      className="p-1 text-muted hover:text-error hover:bg-error/10 rounded transition-colors"
                                                      title="Delete"
                                                    >
                                                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                      </svg>
                                                    </button>
                                                  </div>
                                                </FileItem>
                                              </FileHighlight>
                                            ))
                                          )}
                                        </div>
                                      </FolderContent>
                                    </FolderItem>
                                  ))
                                )}
                              </div>
                            </FolderContent>
                          </FolderItem>
                        ))
                      )}
                    </div>
                  </FolderContent>
                </FolderItem>
              ))}
            </FilesHighlight>
          </FileTree>
        </Card>
      )}

      {/* Upload Modal */}
      <UploadModal
        isOpen={isUploadModalOpen}
        onClose={() => { setIsUploadModalOpen(false); setUploadTargetCutId(undefined); }}
        onSuccess={fetchData}
        hierarchy={hierarchy}
        defaultCutId={uploadTargetCutId}
      />

      {/* Edit File Side Sheet */}
      <SideSheet
        isOpen={!!editingFile}
        onClose={() => setEditingFile(null)}
        title="Edit File"
        description="Update file name and details"
        footer={
          <>
            <Button variant="ghost" onClick={() => setEditingFile(null)} disabled={isUpdating}>
              Cancel
            </Button>
            <Button onClick={handleSaveEdit} isLoading={isUpdating}>
              Save Changes
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label="Name"
            placeholder="Enter a name..."
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
          />
          
          {editingFile?.cut && (
            <div>
              <label className="block text-sm font-medium text-muted mb-1.5">
                Location
              </label>
              <div className="flex items-center gap-2 text-sm flex-wrap">
                <span className="px-2 py-1 bg-surface-light rounded text-muted">
                  {editingFile.cut.vibe.project.name}
                </span>
                <span className="text-muted">/</span>
                <span className="px-2 py-1 bg-surface-light rounded text-muted">
                  {editingFile.cut.vibe.name}
                </span>
                <span className="text-muted">/</span>
                <span className="px-2 py-1 bg-primary/10 rounded text-primary">
                  {editingFile.cut.name}
                </span>
              </div>
            </div>
          )}
        </div>
      </SideSheet>

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={!!deletingFile}
        onClose={() => setDeletingFile(null)}
        title="Delete File"
        description="This action cannot be undone"
      >
        <div className="space-y-4">
          <p className="text-muted">
            Are you sure you want to delete{' '}
            <span className="text-text font-medium">
              {deletingFile?.name || deletingFile?.originalName}
            </span>
            ?
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
      </ConfirmationModal>

      {/* Fixed Audio Player */}
      {playingContext && (
        <div className="fixed bottom-0 left-0 right-0 z-50 p-4 bg-background/80 backdrop-blur-lg border-t border-border">
          <div className="max-w-4xl mx-auto">
            <AudioPlayer
              audioUrl={`/${playingContext.file.path}`}
              trackName={playingContext.file.name || playingContext.file.originalName}
              vibeImage={playingContext.vibeImage}
              vibeName={playingContext.vibeName}
              projectName={playingContext.projectName}
              projectImage={playingContext.projectImage}
              onClose={handleClosePlayer}
            />
          </div>
        </div>
      )}
    </div>
  );
}
