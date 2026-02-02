import { useEffect, useRef, useState, useCallback } from 'react';
import { useMediaSession } from '../../hooks/useMediaSession';

interface AudioPlayerProps {
  audioUrl: string;
  trackName: string;
  vibeImage?: string | null;
  vibeName?: string;
  projectName?: string;
  /** Fallback image if vibeImage is not available */
  projectImage?: string | null;
  onClose?: () => void;
  /** Optional callback for previous track - if provided, shows prev button in OS media controls */
  onPreviousTrack?: () => void;
  /** Optional callback for next track - if provided, shows next button in OS media controls */
  onNextTrack?: () => void;
}

// Icons
const PlayIcon = ({ className = "w-6 h-6" }: { className?: string }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24">
    <path d="M8 5v14l11-7z" />
  </svg>
);

const PauseIcon = ({ className = "w-6 h-6" }: { className?: string }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24">
    <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
  </svg>
);

const SkipBackIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24">
    <path d="M11 18V6l-8.5 6 8.5 6zm.5-6l8.5 6V6l-8.5 6z" />
  </svg>
);

const SkipForwardIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24">
    <path d="M4 18l8.5-6L4 6v12zm9-12v12l8.5-6L13 6z" />
  </svg>
);

const LoopIcon = ({ className = "w-5 h-5", active = false }: { className?: string; active?: boolean }) => (
  <svg className={className} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
    {active && <circle cx="12" cy="12" r="2" fill="currentColor" />}
  </svg>
);

const VolumeHighIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24">
    <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
  </svg>
);

const VolumeLowIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24">
    <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z" />
  </svg>
);

const VolumeMuteIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24">
    <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z" />
  </svg>
);

const CloseIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
  </svg>
);

const MusicNoteIcon = ({ className = "w-8 h-8" }: { className?: string }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24">
    <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
  </svg>
);

export function AudioPlayer({
  audioUrl,
  trackName,
  vibeImage,
  vibeName,
  projectName,
  projectImage,
  onClose,
  onPreviousTrack,
  onNextTrack,
}: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const progressRef = useRef<HTMLInputElement>(null);
  
  // Use vibeImage if available, otherwise fall back to projectImage
  const artworkImage = vibeImage || projectImage;
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLooping, setIsLooping] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(() => {
    const saved = localStorage.getItem('audio-player-volume');
    return saved ? parseFloat(saved) : 0.7;
  });
  const [isMuted, setIsMuted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Format time as m:ss
  const formatTime = useCallback((seconds: number) => {
    if (!isFinite(seconds) || seconds < 0) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }, []);

  // Update progress bar background to show played portion
  const updateProgressBackground = useCallback(() => {
    if (progressRef.current && duration > 0) {
      const percent = (currentTime / duration) * 100;
      progressRef.current.style.background = `linear-gradient(to right, hsl(var(--player-progress)) ${percent}%, hsl(var(--player-progress-bg)) ${percent}%)`;
    }
  }, [currentTime, duration]);

  useEffect(() => {
    updateProgressBackground();
  }, [updateProgressBackground]);

  // Audio event handlers
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleLoadedMetadata = () => {
      setDuration(audio.duration);
      setIsLoading(false);
    };

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleEnded = () => {
      if (!isLooping) {
        setIsPlaying(false);
        setCurrentTime(0);
      }
    };

    const handleCanPlay = () => setIsLoading(false);
    const handleWaiting = () => setIsLoading(true);

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('canplay', handleCanPlay);
    audio.addEventListener('waiting', handleWaiting);

    // Set initial volume
    audio.volume = isMuted ? 0 : volume;
    audio.loop = isLooping;

    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('canplay', handleCanPlay);
      audio.removeEventListener('waiting', handleWaiting);
    };
  }, [isLooping, isMuted, volume]);

  // Update audio volume when volume/mute changes
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted]);

  // Update loop state
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.loop = isLooping;
    }
  }, [isLooping]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      switch (e.code) {
        case 'Space':
          e.preventDefault();
          togglePlayPause();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          skipBackward();
          break;
        case 'ArrowRight':
          e.preventDefault();
          skipForward();
          break;
        case 'KeyM':
          e.preventDefault();
          toggleMute();
          break;
        case 'KeyL':
          e.preventDefault();
          toggleLoop();
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const togglePlayPause = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
    }
  };

  const skipBackward = () => {
    if (audioRef.current) {
      audioRef.current.currentTime = Math.max(0, audioRef.current.currentTime - 10);
    }
  };

  const skipForward = () => {
    if (audioRef.current) {
      audioRef.current.currentTime = Math.min(duration, audioRef.current.currentTime + 10);
    }
  };

  const toggleLoop = () => {
    setIsLooping(!isLooping);
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
  };

  const handleProgressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = parseFloat(e.target.value);
    setCurrentTime(newTime);
    if (audioRef.current) {
      audioRef.current.currentTime = newTime;
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    localStorage.setItem('audio-player-volume', newVolume.toString());
    if (newVolume > 0 && isMuted) {
      setIsMuted(false);
    }
  };

  // Media Session API integration for lock screen controls
  useMediaSession({
    metadata: {
      title: trackName,
      artist: vibeName,
      album: projectName,
      artwork: artworkImage ? `${window.location.origin}/${artworkImage}` : undefined,
    },
    handlers: {
      onPlay: () => audioRef.current?.play(),
      onPause: () => audioRef.current?.pause(),
      onPreviousTrack,
      onNextTrack,
      onSeekBackward: skipBackward,
      onSeekForward: skipForward,
    },
    isPlaying,
    positionState: {
      duration,
      position: currentTime,
      playbackRate: 1.0,
    },
  });

  const VolumeIcon = isMuted || volume === 0 ? VolumeMuteIcon : volume < 0.5 ? VolumeLowIcon : VolumeHighIcon;

  return (
    <div className="bg-[hsl(var(--player-bg))] border border-border rounded-xl p-4 shadow-lg">
      {/* Hidden audio element */}
      <audio ref={audioRef} src={audioUrl} preload="metadata" />

      {/* Main layout - responsive */}
      <div className="flex flex-col md:flex-row gap-4">
        {/* Album art / Vibe image */}
        <div className="flex-shrink-0 mx-auto md:mx-0">
          <div className="w-24 h-24 md:w-20 md:h-20 rounded-lg overflow-hidden bg-surface-light flex items-center justify-center">
            {artworkImage ? (
              <img
                src={`/${artworkImage}`}
                alt={vibeName || projectName || 'Album art'}
                className="w-full h-full object-cover"
              />
            ) : (
              <MusicNoteIcon className="w-10 h-10 text-muted" />
            )}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 flex flex-col justify-center">
          {/* Track info */}
          <div className="text-center md:text-left mb-3">
            <h3 className="font-semibold text-[hsl(var(--player-text))] truncate text-lg">
              {trackName}
            </h3>
            {(vibeName || projectName) && (
              <p className="text-sm text-[hsl(var(--player-muted))] truncate">
                {vibeName}
                {vibeName && projectName && ' \u2022 '}
                {projectName}
              </p>
            )}
          </div>

          {/* Progress bar */}
          <div className="flex items-center gap-3 mb-3">
            <span className="text-xs text-[hsl(var(--player-muted))] w-10 text-right tabular-nums">
              {formatTime(currentTime)}
            </span>
            <input
              ref={progressRef}
              type="range"
              min="0"
              max={duration || 100}
              step="0.1"
              value={currentTime}
              onChange={handleProgressChange}
              className="flex-1 h-1 player-progress"
              aria-label="Seek"
            />
            <span className="text-xs text-[hsl(var(--player-muted))] w-10 tabular-nums">
              {formatTime(duration)}
            </span>
          </div>

          {/* Controls */}
          <div className="flex items-center justify-center md:justify-between gap-2">
            {/* Left controls */}
            <div className="flex items-center gap-1">
              <button
                onClick={toggleLoop}
                className={`p-2 rounded-full transition-colors ${
                  isLooping
                    ? 'text-[hsl(var(--player-button))] bg-[hsl(var(--player-button))]/10'
                    : 'text-[hsl(var(--player-muted))] hover:text-[hsl(var(--player-text))]'
                }`}
                aria-label={isLooping ? 'Disable loop' : 'Enable loop'}
                title="Loop (L)"
              >
                <LoopIcon className="w-5 h-5" active={isLooping} />
              </button>
            </div>

            {/* Center controls */}
            <div className="flex items-center gap-1">
              <button
                onClick={skipBackward}
                className="p-2 text-[hsl(var(--player-muted))] hover:text-[hsl(var(--player-text))] transition-colors rounded-full"
                aria-label="Skip back 10 seconds"
                title="Skip back 10s"
              >
                <SkipBackIcon className="w-6 h-6" />
              </button>

              <button
                onClick={togglePlayPause}
                disabled={isLoading}
                className="p-3 bg-[hsl(var(--player-button))] hover:bg-[hsl(var(--player-button-hover))] text-white rounded-full transition-colors disabled:opacity-50"
                aria-label={isPlaying ? 'Pause' : 'Play'}
              >
                {isLoading ? (
                  <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : isPlaying ? (
                  <PauseIcon className="w-6 h-6" />
                ) : (
                  <PlayIcon className="w-6 h-6" />
                )}
              </button>

              <button
                onClick={skipForward}
                className="p-2 text-[hsl(var(--player-muted))] hover:text-[hsl(var(--player-text))] transition-colors rounded-full"
                aria-label="Skip forward 10 seconds"
                title="Skip forward 10s"
              >
                <SkipForwardIcon className="w-6 h-6" />
              </button>
            </div>

            {/* Right controls - Volume */}
            <div className="flex items-center gap-2">
              <button
                onClick={toggleMute}
                className="p-2 text-[hsl(var(--player-muted))] hover:text-[hsl(var(--player-text))] transition-colors rounded-full"
                aria-label={isMuted ? 'Unmute' : 'Mute'}
                title="Mute (M)"
              >
                <VolumeIcon className="w-5 h-5" />
              </button>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={volume}
                onChange={handleVolumeChange}
                className="w-16 md:w-20 player-volume hidden sm:block"
                aria-label="Volume"
              />
            </div>
          </div>
        </div>

        {/* Close button */}
        {onClose && (
          <button
            onClick={onClose}
            className="absolute top-2 right-2 md:static p-2 text-[hsl(var(--player-muted))] hover:text-[hsl(var(--player-text))] transition-colors rounded-full"
            aria-label="Close player"
          >
            <CloseIcon className="w-5 h-5" />
          </button>
        )}
      </div>
    </div>
  );
}

AudioPlayer.displayName = 'AudioPlayer';
