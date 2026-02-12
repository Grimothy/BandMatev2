import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { AudioPlayer } from '../../components/audio/AudioPlayer';
import { Loading } from '../../components/ui/Loading';
import { formatFileSize } from '../../api/files';

interface PublicFileInfo {
  id: string;
  name: string | null;
  originalName: string;
  fileSize: number;
  mimeType: string;
  type: 'CUT' | 'STEM';
  duration: number | null;
  createdAt: string;
  cutName?: string;
  vibeName?: string;
  vibeImage?: string | null;
  projectName?: string;
  projectImage?: string | null;
}

// Icons
const MusicNoteIcon = ({ className = "w-16 h-16" }: { className?: string }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24">
    <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
  </svg>
);

const FileIcon = ({ className = "w-16 h-16" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
  </svg>
);

const DownloadIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
  </svg>
);

export function SharedFile() {
  const { shareToken } = useParams<{ shareToken: string }>();
  const [fileInfo, setFileInfo] = useState<PublicFileInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchFileInfo = async () => {
      if (!shareToken) {
        setError('Invalid share link');
        setIsLoading(false);
        return;
      }

      try {
        const response = await fetch(`/api/public/files/${shareToken}/info`);
        if (!response.ok) {
          if (response.status === 404) {
            setError('This file is no longer available or the link has expired.');
          } else {
            setError('Failed to load file information.');
          }
          setIsLoading(false);
          return;
        }

        const data = await response.json();
        setFileInfo(data);
      } catch (err) {
        console.error('Failed to fetch file info:', err);
        setError('Failed to load file information.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchFileInfo();
  }, [shareToken]);

  const handleDownload = () => {
    if (!shareToken) return;
    const link = document.createElement('a');
    link.href = `/api/public/files/${shareToken}`;
    link.download = fileInfo?.originalName || 'download';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const isAudioFile = fileInfo?.type === 'CUT' || fileInfo?.mimeType?.startsWith('audio/');
  const audioUrl = shareToken ? `/api/public/files/${shareToken}` : '';

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loading className="py-12" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-surface flex items-center justify-center">
            <svg className="w-10 h-10 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-text mb-2">File Not Available</h1>
          <p className="text-muted mb-6">{error}</p>
          <Link
            to="/"
            className="inline-flex items-center justify-center px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors"
          >
            Go to Home
          </Link>
        </div>
      </div>
    );
  }

  if (!fileInfo) return null;

  const displayName = fileInfo.name || fileInfo.originalName;
  const artworkImage = fileInfo.vibeImage;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-surface/50 backdrop-blur-sm">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/" className="flex items-center gap-2 text-primary font-bold text-xl">
              <img 
                src="/logo.png" 
                alt="BandMate" 
                className="w-6 h-6 rounded object-contain"
              />
              BandMate
            </Link>
          </div>
          {/* Download button in header - subtle icon */}
          <button
            onClick={handleDownload}
            className="p-2 text-muted hover:text-primary transition-colors rounded-lg hover:bg-surface-light"
            title="Download file"
            aria-label="Download file"
          >
            <DownloadIcon className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto">
        {isAudioFile ? (
          <>
            {/* Mobile Layout - Immersive Player */}
            <div className="md:hidden">
              <div className="flex flex-col items-center px-6 pt-8 pb-6">
                {/* Large Album Art */}
                <div className="w-64 h-64 rounded-2xl overflow-hidden bg-surface-light shadow-2xl mb-8">
                  {artworkImage ? (
                    <img
                      src={`/${artworkImage}`}
                      alt={fileInfo.vibeName || 'Album art'}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <MusicNoteIcon className="w-24 h-24 text-primary/50" />
                    </div>
                  )}
                </div>

                {/* Track Info */}
                <div className="text-center mb-6">
                  <h1 className="text-2xl font-bold text-text mb-2 px-4">{displayName}</h1>
                  {(fileInfo.vibeName || fileInfo.projectName) && (
                    <p className="text-muted text-lg">
                      {fileInfo.vibeName}
                      {fileInfo.vibeName && fileInfo.projectName && ' • '}
                      {fileInfo.projectName}
                    </p>
                  )}
                </div>

                {/* Audio Player */}
                <div className="w-full">
                  <AudioPlayer
                    audioUrl={audioUrl}
                    trackName={displayName}
                    vibeImage={null}
                    vibeName={fileInfo.vibeName}
                    projectName={fileInfo.projectName}
                    projectImage={null}
                    hideMetadata
                  />
                </div>

                {/* File metadata */}
                <div className="mt-6 flex items-center gap-4 text-sm text-muted">
                  <span className="inline-flex items-center px-3 py-1 rounded-full bg-primary/10 text-primary font-medium">
                    {fileInfo.type === 'CUT' ? 'Audio' : 'Stem'}
                  </span>
                  <span>{formatFileSize(fileInfo.fileSize)}</span>
                  <span>•</span>
                  <span>{new Date(fileInfo.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
            </div>

            {/* Desktop Layout - Centered Immersive */}
            <div className="hidden md:flex flex-col items-center px-4 py-12">
              {/* Large Album Art */}
              <div className="w-80 h-80 lg:w-96 lg:h-96 rounded-2xl overflow-hidden bg-surface-light shadow-2xl mb-10">
                {artworkImage ? (
                  <img
                    src={`/${artworkImage}`}
                    alt={fileInfo.vibeName || 'Album art'}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <MusicNoteIcon className="w-32 h-32 lg:w-40 lg:h-40 text-primary/50" />
                  </div>
                )}
              </div>

              {/* Track Info */}
              <div className="text-center mb-8 max-w-xl">
                <h1 className="text-3xl lg:text-4xl font-bold text-text mb-3">{displayName}</h1>
                {(fileInfo.vibeName || fileInfo.projectName) && (
                  <p className="text-muted text-xl">
                    {fileInfo.vibeName}
                    {fileInfo.vibeName && fileInfo.projectName && ' • '}
                    {fileInfo.projectName}
                  </p>
                )}
              </div>

              {/* Audio Player - wider on desktop */}
              <div className="w-full max-w-2xl">
                <AudioPlayer
                  audioUrl={audioUrl}
                  trackName={displayName}
                  vibeImage={null}
                  vibeName={fileInfo.vibeName}
                  projectName={fileInfo.projectName}
                  projectImage={null}
                  hideMetadata
                />
              </div>

              {/* File metadata */}
              <div className="mt-8 flex items-center gap-4 text-sm text-muted">
                <span className="inline-flex items-center px-3 py-1 rounded-full bg-primary/10 text-primary font-medium">
                  {fileInfo.type === 'CUT' ? 'Audio' : 'Stem'}
                </span>
                <span>{formatFileSize(fileInfo.fileSize)}</span>
                <span>•</span>
                <span>{new Date(fileInfo.createdAt).toLocaleDateString()}</span>
              </div>
            </div>
          </>
        ) : (
          // Non-audio files - simple centered download view
          <div className="flex flex-col items-center px-4 py-12">
            {/* File Icon */}
            <div className="w-48 h-48 rounded-2xl bg-surface-light flex items-center justify-center mb-8">
              <FileIcon className="w-24 h-24 text-muted" />
            </div>

            {/* File Info */}
            <div className="text-center max-w-xl mb-6">
              <h1 className="text-3xl font-bold text-text mb-3">{displayName}</h1>

              <div className="flex items-center justify-center gap-3 text-sm">
                <span className="inline-flex items-center px-3 py-1 rounded-full font-medium bg-blue-500/20 text-blue-400">
                  File
                </span>
                <span className="text-muted">{formatFileSize(fileInfo.fileSize)}</span>
                <span className="text-muted">•</span>
                <span className="text-muted">
                  {new Date(fileInfo.createdAt).toLocaleDateString()}
                </span>
              </div>
            </div>

            {/* Download Button */}
            <button
              onClick={handleDownload}
              className="inline-flex items-center gap-2 px-8 py-4 bg-primary text-white rounded-xl hover:bg-primary-hover transition-colors font-medium text-lg"
            >
              <DownloadIcon className="w-6 h-6" />
              Download File
            </button>
          </div>
        )}

        {/* Footer info */}
        <div className="mt-6 text-center text-sm text-muted px-4 pb-8">
          <p>
            This file was shared via{' '}
            <Link to="/" className="text-primary hover:underline">
              BandMate
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
