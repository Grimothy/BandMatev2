import { useState, useRef, useCallback } from 'react';
import { SideSheet } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { FileHierarchy } from '../../types';
import { uploadCut, uploadStem } from '../../api/files';

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  hierarchy: FileHierarchy[];
  defaultVibeId?: string;
  defaultCutId?: string;
}

type FileType = 'CUT' | 'STEM' | null;

export function UploadModal({
  isOpen,
  onClose,
  onSuccess,
  hierarchy,
  defaultVibeId,
  defaultCutId,
}: UploadModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [fileType, setFileType] = useState<FileType>(null);
  const [name, setName] = useState('');
  const [projectId, setProjectId] = useState<string>('');
  const [vibeId, setVibeId] = useState<string>(defaultVibeId || '');
  const [cutId, setCutId] = useState<string>(defaultCutId || '');
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  // Get vibes for selected project
  const selectedProject = hierarchy.find(p => p.id === projectId);
  const vibes = selectedProject?.vibes || [];
  
  // Get cuts for selected vibe
  const selectedVibe = vibes.find(v => v.id === vibeId);
  const cuts = selectedVibe?.cuts || [];

  const detectFileType = (fileName: string): FileType => {
    const ext = fileName.toLowerCase().split('.').pop();
    if (ext === 'zip') return 'STEM';
    const audioExtensions = ['mp3', 'wav', 'ogg', 'flac', 'aac', 'm4a'];
    if (audioExtensions.includes(ext || '')) return 'CUT';
    return null;
  };

  const handleFileSelect = (selectedFile: File) => {
    const detectedType = detectFileType(selectedFile.name);
    if (!detectedType) {
      setError('Invalid file type. Please select an audio file (MP3, WAV, etc.) or a ZIP file for stems.');
      return;
    }
    setFile(selectedFile);
    setFileType(detectedType);
    setError(null);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      handleFileSelect(selectedFile);
    }
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      handleFileSelect(droppedFile);
    }
  }, []);

  const handleSubmit = async () => {
    if (!file || !cutId) {
      setError('Please select a file and a cut.');
      return;
    }

    setIsUploading(true);
    setError(null);

    try {
      const options = {
        name: name.trim() || undefined,
      };

      if (fileType === 'CUT') {
        await uploadCut(cutId, file, options);
      } else {
        await uploadStem(cutId, file, options);
      }

      // Reset form
      setFile(null);
      setFileType(null);
      setName('');
      if (!defaultVibeId) setVibeId('');
      if (!defaultCutId) setCutId('');
      
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to upload file');
    } finally {
      setIsUploading(false);
    }
  };

  const handleClose = () => {
    if (!isUploading) {
      setFile(null);
      setFileType(null);
      setName('');
      setError(null);
      if (!defaultVibeId) setVibeId('');
      if (!defaultCutId) setCutId('');
      onClose();
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  return (
    <SideSheet 
      isOpen={isOpen} 
      onClose={handleClose} 
      title="Upload File" 
      description="Upload audio files or stem packages to your project"
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={handleClose} disabled={isUploading}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            isLoading={isUploading}
            disabled={!file || !cutId}
          >
            Upload {fileType === 'STEM' ? 'Stem' : 'Cut'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {/* Error Message */}
        {error && (
          <div className="p-3 bg-error/10 border border-error/30 rounded-lg text-error text-sm">
            {error}
          </div>
        )}

        {/* Drop Zone */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
            isDragOver
              ? 'border-primary bg-primary/10'
              : file
              ? 'border-primary/50 bg-primary/5'
              : 'border-border hover:border-muted'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="audio/*,.zip"
            onChange={handleFileChange}
            className="hidden"
          />
          
          {file ? (
            <div className="space-y-2">
              <div className="flex items-center justify-center gap-2">
                {fileType === 'CUT' ? (
                  <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                    <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                    </svg>
                  </div>
                ) : (
                  <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                    <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                    </svg>
                  </div>
                )}
                <div className="text-left">
                  <p className="font-medium text-text">{file.name}</p>
                  <p className="text-sm text-muted">
                    {formatFileSize(file.size)} • {fileType === 'CUT' ? 'Audio File' : 'Stem Package'}
                  </p>
                </div>
              </div>
              <p className="text-xs text-muted">Click or drop to replace</p>
            </div>
          ) : (
            <>
              <svg className="w-12 h-12 text-muted mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              <p className="text-text font-medium">Drop a file here or click to browse</p>
              <p className="text-sm text-muted mt-1">
                Audio files (MP3, WAV, etc.) for cuts • ZIP files for stems
              </p>
            </>
          )}
        </div>

        {/* Name Input */}
        <Input
          label="Name (optional, recommended)"
          placeholder="e.g., Final Mix, Guitar Stems..."
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        {/* Hierarchy Selectors */}
        <div className="grid grid-cols-1 gap-4">
          {/* Project Selector */}
          <div>
            <label className="block text-sm font-medium text-muted mb-1.5">
              Project
            </label>
            <select
              value={projectId}
              onChange={(e) => {
                setProjectId(e.target.value);
                setVibeId('');
                setCutId('');
              }}
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            >
              <option value="">Select a project...</option>
              {hierarchy.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          </div>

          {/* Vibe Selector */}
          <div>
            <label className="block text-sm font-medium text-muted mb-1.5">
              Vibe <span className="text-error">*</span>
            </label>
            <select
              value={vibeId}
              onChange={(e) => {
                setVibeId(e.target.value);
                setCutId('');
              }}
              disabled={!projectId && !defaultVibeId}
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <option value="">Select a vibe...</option>
              {vibes.map((vibe) => (
                <option key={vibe.id} value={vibe.id}>
                  {vibe.name}
                </option>
              ))}
            </select>
          </div>

          {/* Cut Selector */}
          <div>
            <label className="block text-sm font-medium text-muted mb-1.5">
              Cut <span className="text-error">*</span>
            </label>
            <select
              value={cutId}
              onChange={(e) => setCutId(e.target.value)}
              disabled={!vibeId}
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <option value="">Select a cut...</option>
              {cuts.map((cut) => (
                <option key={cut.id} value={cut.id}>
                  {cut.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
    </SideSheet>
  );
}
