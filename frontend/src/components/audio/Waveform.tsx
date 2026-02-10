import { useEffect, useRef, useState, forwardRef, useImperativeHandle, useCallback } from 'react';
import WaveSurfer from 'wavesurfer.js';
import { CommentMarkerGroup } from '../../types';

interface WaveformProps {
  audioUrl: string;
  onTimeClick?: (time: number) => void;
  onReady?: (duration: number) => void;
  markerGroups?: CommentMarkerGroup[];
  onMarkerClick?: (timestamp: number) => void;
  activeMarkerTimestamp?: number | null;
}

export interface WaveformHandle {
  seekTo: (time: number) => void;
  play: () => void;
  pause: () => void;
  getDuration: () => number;
  getCurrentTime: () => number;
  setVolume: (vol: number) => void;
  getVolume: () => number;
}

// Get user color for avatar background
const getColorFromId = (id: string): string => {
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

export const Waveform = forwardRef<WaveformHandle, WaveformProps>(
  ({ audioUrl, onTimeClick, onReady, markerGroups = [], onMarkerClick, activeMarkerTimestamp }, ref) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const waveformContainerRef = useRef<HTMLDivElement>(null);
    const wavesurferRef = useRef<WaveSurfer | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [volume, setVolume] = useState(() => {
      const saved = localStorage.getItem('waveform-volume');
      return saved ? parseFloat(saved) : 0.5;
    });
    const [isMuted, setIsMuted] = useState(false);
    const [hoveredMarker, setHoveredMarker] = useState<CommentMarkerGroup | null>(null);
    const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
    const isMobile = window.innerWidth < 768;

    useImperativeHandle(ref, () => ({
      seekTo: (time: number) => {
        if (wavesurferRef.current && duration > 0) {
          const progress = Math.min(Math.max(time / duration, 0), 1);
          wavesurferRef.current.seekTo(progress);
          setCurrentTime(time);
        }
      },
      play: () => {
        wavesurferRef.current?.play();
      },
      pause: () => {
        wavesurferRef.current?.pause();
      },
      getDuration: () => duration,
      getCurrentTime: () => wavesurferRef.current?.getCurrentTime() ?? currentTime,
      setVolume: (vol: number) => {
        const clampedVol = Math.min(Math.max(vol, 0), 1);
        setVolume(clampedVol);
        wavesurferRef.current?.setVolume(isMuted ? 0 : clampedVol);
        localStorage.setItem('waveform-volume', clampedVol.toString());
      },
      getVolume: () => volume,
    }));

    useEffect(() => {
      if (!waveformContainerRef.current) return;

      const wavesurfer = WaveSurfer.create({
        container: waveformContainerRef.current,
        waveColor: '#334155',
        progressColor: '#22c55e',
        cursorColor: '#22c55e',
        barWidth: 2,
        barGap: 1,
        barRadius: 2,
        height: 80,
        normalize: true,
        backend: 'WebAudio',
      });

      wavesurfer.load(audioUrl);

      wavesurfer.on('ready', () => {
        const dur = wavesurfer.getDuration();
        console.debug('[Waveform] ready', { duration: dur, src: audioUrl });
        setDuration(dur);
        onReady?.(dur);
      });

      wavesurfer.on('audioprocess', () => {
        setCurrentTime(wavesurfer.getCurrentTime());
      });

      wavesurfer.on('play', () => {
        console.debug('[Waveform] play');
        setIsPlaying(true);
      });
      wavesurfer.on('pause', () => {
        console.debug('[Waveform] pause');
        setIsPlaying(false);
      });
      wavesurfer.on('finish', () => {
        console.debug('[Waveform] finish');
        setIsPlaying(false);
      });

      wavesurfer.on('click', () => {
        const time = wavesurfer.getCurrentTime();
        onTimeClick?.(time);
      });

      wavesurferRef.current = wavesurfer;

      // Set initial volume
      wavesurfer.setVolume(isMuted ? 0 : volume);

      // Handle visibility change to pause on page hide
      const handleVisibilityChange = () => {
        if (document.hidden && wavesurferRef.current?.isPlaying()) {
          console.debug('[Waveform] page hidden — pausing');
          wavesurferRef.current.pause();
        }
      };

      document.addEventListener('visibilitychange', handleVisibilityChange);

      // Handle keyboard shortcuts
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.code === 'Space' && e.target === document.body) {
          e.preventDefault();
          wavesurfer.playPause();
        }
      };

      document.addEventListener('keydown', handleKeyDown);

      return () => {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
        document.removeEventListener('keydown', handleKeyDown);

        // Ensure playback is stopped and resources are released
        try {
          console.debug('[Waveform] unmount: stopping and destroying WaveSurfer', audioUrl);

          if (wavesurfer.isPlaying()) {
            try {
              wavesurfer.pause();
            } catch (err) {
              console.warn('[Waveform] error pausing before destroy', err);
            }
          }

          try {
            // Clear buffer and visuals
            wavesurfer.empty();
          } catch (err) {
            // ignore if not available
          }

          // Attempt to close the underlying AudioContext if present
          try {
            const backend: any = (wavesurfer as any).backend;
            const audioCtx = backend?.getAudioContext ? backend.getAudioContext() : backend?.audioContext;
            if (audioCtx && typeof audioCtx.close === 'function') {
              audioCtx.close().catch((err: any) => {
                console.warn('[Waveform] error closing AudioContext', err);
              });
            }
          } catch (err) {
            console.warn('[Waveform] error during audio context cleanup', err);
          }

          wavesurfer.destroy();
        } catch (err) {
          console.warn('[Waveform] error destroying WaveSurfer', err);
        }
      };
    }, [audioUrl]);

    // Update volume when volume or mute state changes
    useEffect(() => {
      if (wavesurferRef.current) {
        wavesurferRef.current.setVolume(isMuted ? 0 : volume);
      }
    }, [volume, isMuted]);

    const togglePlayPause = () => {
      if (wavesurferRef.current) {
        wavesurferRef.current.playPause();
      }
    };

    const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const newVolume = parseFloat(e.target.value);
      setVolume(newVolume);
      localStorage.setItem('waveform-volume', newVolume.toString());
    };

    const toggleMute = () => {
      setIsMuted(!isMuted);
    };

    const formatTime = (seconds: number) => {
      const mins = Math.floor(seconds / 60);
      const secs = Math.floor(seconds % 60);
      return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const handleMarkerMouseEnter = useCallback((group: CommentMarkerGroup, e: React.MouseEvent) => {
      if (isMobile) return;
      setHoveredMarker(group);
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      setTooltipPosition({
        x: rect.left + rect.width / 2,
        y: rect.top,
      });
    }, [isMobile]);

    const handleMarkerMouseLeave = useCallback(() => {
      setHoveredMarker(null);
    }, []);

    const handleMarkerClick = useCallback((timestamp: number) => {
      // Seek to timestamp
      if (wavesurferRef.current && duration > 0) {
        const progress = Math.min(Math.max(timestamp / duration, 0), 1);
        wavesurferRef.current.seekTo(progress);
        setCurrentTime(timestamp);
      }
      onMarkerClick?.(timestamp);
    }, [duration, onMarkerClick]);

    return (
      <div className="bg-surface border border-border rounded-lg p-4">
        {/* Controls */}
        <div className="flex items-center gap-4 mb-4">
          <button
            onClick={togglePlayPause}
            className="p-3 bg-primary rounded-full text-background hover:bg-primary-hover transition-colors"
            aria-label={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? (
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            )}
          </button>
          <div className="text-sm text-muted">
            <span className="text-text">{formatTime(currentTime)}</span>
            <span className="mx-1">/</span>
            <span>{formatTime(duration)}</span>
          </div>
          <div className="flex items-center gap-2 ml-auto">
            <button
              onClick={toggleMute}
              className="p-2 text-muted hover:text-text transition-colors"
              aria-label={isMuted ? 'Unmute' : 'Mute'}
            >
              {isMuted || volume === 0 ? (
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/>
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
                </svg>
              )}
            </button>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={volume}
              onChange={handleVolumeChange}
              className="w-20 h-2 bg-border rounded-lg appearance-none cursor-pointer slider"
              aria-label="Volume"
            />
          </div>
        </div>

        {/* Waveform with Markers */}
        <div className="relative" ref={containerRef}>
          <div ref={waveformContainerRef} />
          
          {/* Timeline Markers */}
          {duration > 0 && markerGroups.length > 0 && (
            <div className="absolute inset-0 pointer-events-none">
              {/* Marker Lines */}
              {markerGroups.map((group, index) => {
                const position = (group.timestamp / duration) * 100;
                const isActive = activeMarkerTimestamp === group.timestamp;
                
                return (
                  <div
                    key={`line-${index}`}
                    className={`absolute top-0 bottom-8 pointer-events-auto cursor-pointer transition-all ${
                      isActive ? 'w-1 bg-primary z-10' : 'w-0.5 bg-primary/50 hover:w-1 hover:bg-primary'
                    }`}
                    style={{ left: `${position}%` }}
                    onClick={() => handleMarkerClick(group.timestamp)}
                    onMouseEnter={(e) => handleMarkerMouseEnter(group, e)}
                    onMouseLeave={handleMarkerMouseLeave}
                    aria-label={`${group.count} comments at ${formatTime(group.timestamp)}`}
                  >
                    {/* Pulse animation for active marker */}
                    {isActive && (
                      <div className="absolute inset-0 bg-primary animate-pulse" />
                    )}
                  </div>
                );
              })}
              
              {/* Count Badges - positioned below waveform */}
              <div className="absolute left-0 right-0 bottom-0 h-8 pointer-events-none">
                {markerGroups.map((group, index) => {
                  const position = (group.timestamp / duration) * 100;
                  const isActive = activeMarkerTimestamp === group.timestamp;
                  
                  return (
                    <button
                      key={`badge-${index}`}
                      className={`absolute top-0 -translate-x-1/2 pointer-events-auto 
                        flex items-center justify-center rounded-full font-medium text-white
                        transition-all hover:scale-110 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2
                        ${isMobile ? 'min-w-[32px] h-8 text-sm' : 'min-w-[24px] h-6 text-xs'}
                        ${isActive ? 'bg-primary scale-110 ring-2 ring-primary ring-offset-2' : 'bg-primary/80 hover:bg-primary'}`}
                      style={{ left: `${position}%` }}
                      onClick={() => handleMarkerClick(group.timestamp)}
                      onMouseEnter={(e) => handleMarkerMouseEnter(group, e)}
                      onMouseLeave={handleMarkerMouseLeave}
                      aria-label={`View ${group.count} comments at ${formatTime(group.timestamp)}`}
                    >
                      {group.count > 99 ? '99+' : group.count}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Desktop Tooltip */}
        {!isMobile && hoveredMarker && (
          <div
            className="fixed z-50 bg-surface border border-border rounded-lg shadow-xl p-3 min-w-[240px] max-w-[320px] animate-fade-in"
            style={{
              left: tooltipPosition.x,
              top: tooltipPosition.y - 8,
              transform: 'translate(-50%, -100%)',
            }}
          >
            {/* Tooltip Arrow */}
            <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1">
              <div className="w-0 h-0 border-l-[6px] border-r-[6px] border-t-[6px] border-transparent border-t-surface" />
            </div>
            
            {/* Header with user avatars */}
            <div className="flex items-center gap-2 mb-2 pb-2 border-b border-border">
              <div className="flex -space-x-2">
                {hoveredMarker.comments.slice(0, 3).map((comment, idx) => (
                  comment.user.avatarUrl ? (
                    <img
                      key={idx}
                      src={comment.user.avatarUrl}
                      alt={comment.user.name}
                      className="w-6 h-6 rounded-full border-2 border-surface object-cover"
                    />
                  ) : (
                    <div
                      key={idx}
                      className={`w-6 h-6 rounded-full border-2 border-surface flex items-center justify-center text-[10px] text-white font-medium ${getColorFromId(comment.user.id)}`}
                    >
                      {comment.user.name.charAt(0).toUpperCase()}
                    </div>
                  )
                ))}
              </div>
              <span className="text-sm text-muted">
                {hoveredMarker.comments.length > 3 
                  ? `${hoveredMarker.comments.slice(0, 3).map(c => c.user.name.split(' ')[0]).join(', ')} +${hoveredMarker.comments.length - 3} more`
                  : hoveredMarker.comments.map(c => c.user.name.split(' ')[0]).join(', ')
                }
              </span>
            </div>
            
            {/* Comment previews */}
            <div className="space-y-2 mb-2">
              {hoveredMarker.comments.slice(0, 2).map((comment, idx) => (
                <div key={idx} className="text-sm">
                  <span className="font-medium text-text">{comment.user.name.split(' ')[0]}:</span>
                  <span className="text-muted ml-1 line-clamp-2">{comment.content}</span>
                </div>
              ))}
              {hoveredMarker.comments.length > 2 && (
                <div className="text-xs text-muted italic">
                  + {hoveredMarker.comments.length - 2} more comments
                </div>
              )}
            </div>
            
            {/* Timestamp */}
            <div className="text-xs text-muted pt-2 border-t border-border">
              {formatTime(hoveredMarker.timestamp)}
            </div>
          </div>
        )}
      </div>
    );
  }
);

Waveform.displayName = 'Waveform';
