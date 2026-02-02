import { useState, useRef, useCallback } from 'react';
import { SideSheet } from '../ui/Modal';
import { Button } from '../ui/Button';

interface ImageUploadSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onUpload: (file: File) => Promise<void>;
  title?: string;
  description?: string;
  currentImage?: string | null;
}

export function ImageUploadSheet({
  isOpen,
  onClose,
  onUpload,
  title = 'Upload Image',
  description = 'Upload a cover image',
  currentImage,
}: ImageUploadSheetProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const validateFile = (selectedFile: File): boolean => {
    // Check file type
    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!validTypes.includes(selectedFile.type)) {
      setError('Invalid file type. Please select a JPEG, PNG, GIF, or WebP image.');
      return false;
    }

    // Check file size (max 5MB)
    const maxSize = 5 * 1024 * 1024;
    if (selectedFile.size > maxSize) {
      setError('File too large. Maximum size is 5MB.');
      return false;
    }

    return true;
  };

  const handleFileSelect = (selectedFile: File) => {
    if (!validateFile(selectedFile)) {
      return;
    }

    setFile(selectedFile);
    setError(null);

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreview(reader.result as string);
    };
    reader.readAsDataURL(selectedFile);
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
    if (!file) {
      setError('Please select an image.');
      return;
    }

    setIsUploading(true);
    setError(null);

    try {
      await onUpload(file);
      handleClose();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to upload image');
    } finally {
      setIsUploading(false);
    }
  };

  const handleClose = () => {
    if (!isUploading) {
      setFile(null);
      setPreview(null);
      setError(null);
      onClose();
    }
  };

  const handleRemoveFile = () => {
    setFile(null);
    setPreview(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
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
      title={title}
      description={description}
      footer={
        <>
          <Button variant="ghost" onClick={handleClose} disabled={isUploading}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            isLoading={isUploading}
            disabled={!file}
          >
            Upload Image
          </Button>
        </>
      }
    >
      <div className="space-y-6">
        {/* Error Message */}
        {error && (
          <div className="p-3 bg-error/10 border border-error/30 rounded-lg text-error text-sm">
            {error}
          </div>
        )}

        {/* Current Image */}
        {currentImage && !preview && (
          <div>
            <label className="block text-sm font-medium text-muted mb-2">
              Current Image
            </label>
            <div className="relative w-full aspect-video rounded-lg overflow-hidden bg-surface-light">
              <img
                src={`/${currentImage}`}
                alt="Current"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                <span className="text-white/80 text-sm">Will be replaced</span>
              </div>
            </div>
          </div>
        )}

        {/* Drop Zone / Preview */}
        <div>
          <label className="block text-sm font-medium text-muted mb-2">
            {currentImage ? 'New Image' : 'Image'}
          </label>
          
          {preview ? (
            <div className="relative">
              <div className="w-full aspect-video rounded-lg overflow-hidden bg-surface-light">
                <img
                  src={preview}
                  alt="Preview"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="mt-3 flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-8 h-8 rounded bg-primary/20 flex items-center justify-center flex-shrink-0">
                    <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm text-text truncate">{file?.name}</p>
                    <p className="text-xs text-muted">{file && formatFileSize(file.size)}</p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleRemoveFile}
                  className="text-muted hover:text-error"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </Button>
              </div>
            </div>
          ) : (
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                isDragOver
                  ? 'border-primary bg-primary/10'
                  : 'border-border hover:border-muted'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/gif,image/webp"
                onChange={handleFileChange}
                className="hidden"
              />
              
              <div className="w-16 h-16 rounded-full bg-surface-light mx-auto mb-4 flex items-center justify-center">
                <svg className="w-8 h-8 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <p className="text-text font-medium">Drop an image here or click to browse</p>
              <p className="text-sm text-muted mt-1">
                JPEG, PNG, GIF, or WebP • Max 5MB
              </p>
            </div>
          )}
        </div>

        {/* Tips */}
        <div className="p-4 bg-surface-light rounded-lg">
          <h4 className="text-sm font-medium text-text mb-2">Tips for best results</h4>
          <ul className="text-xs text-muted space-y-1">
            <li className="flex items-start gap-2">
              <span className="text-primary">•</span>
              Use a landscape image (16:9 or similar aspect ratio)
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary">•</span>
              Minimum recommended size: 800x450 pixels
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary">•</span>
              Keep important content centered for best display
            </li>
          </ul>
        </div>
      </div>
    </SideSheet>
  );
}
