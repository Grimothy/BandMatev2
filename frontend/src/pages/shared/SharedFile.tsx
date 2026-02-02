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
            <span className="text-muted text-sm">Shared File</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-surface border border-border rounded-xl overflow-hidden">
          {/* File Header */}
          <div className="p-6 border-b border-border">
            <div className="flex flex-col md:flex-row gap-6">
              {/* Image/Icon */}
              <div className="flex-shrink-0 mx-auto md:mx-0">
                <div className="w-32 h-32 rounded-xl overflow-hidden bg-surface-light flex items-center justify-center">
                  {fileInfo.vibeImage ? (
                    <img
                      src={`/${fileInfo.vibeImage}`}
                      alt={fileInfo.vibeName || 'Album art'}
                      className="w-full h-full object-cover"
                    />
                  ) : isAudioFile ? (
                    <MusicNoteIcon className="w-16 h-16 text-primary" />
                  ) : (
                    <FileIcon className="w-16 h-16 text-muted" />
                  )}
                </div>
              </div>

              {/* File Info */}
              <div className="flex-1 text-center md:text-left">
                <h1 className="text-2xl font-bold text-text mb-2">{displayName}</h1>
                
                {(fileInfo.vibeName || fileInfo.projectName) && (
                  <p className="text-muted mb-4">
                    {fileInfo.vibeName}
                    {fileInfo.vibeName && fileInfo.projectName && ' \u2022 '}
                    {fileInfo.projectName}
                  </p>
                )}

                <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 text-sm">
                  <span className={`inline-flex items-center px-2 py-1 rounded font-medium ${
                    fileInfo.type === 'CUT'
                      ? 'bg-primary/20 text-primary'
                      : 'bg-blue-500/20 text-blue-400'
                  }`}>
                    {fileInfo.type === 'CUT' ? 'Audio' : 'Stem'}
                  </span>
                  <span className="text-muted">{formatFileSize(fileInfo.fileSize)}</span>
                  <span className="text-muted">
                    Shared {new Date(fileInfo.createdAt).toLocaleDateString()}
                  </span>
                </div>

                {/* Download Button */}
                <button
                  onClick={handleDownload}
                  className="mt-6 inline-flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors font-medium"
                >
                  <DownloadIcon />
                  Download File
                </button>
              </div>
            </div>
          </div>

          {/* Audio Player (for audio files) */}
          {isAudioFile && (
            <div className="p-6">
              <AudioPlayer
                audioUrl={audioUrl}
                trackName={displayName}
                vibeImage={fileInfo.vibeImage}
                vibeName={fileInfo.vibeName}
                projectName={fileInfo.projectName}
                projectImage={fileInfo.projectImage}
              />
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="mt-6 text-center text-sm text-muted">
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
