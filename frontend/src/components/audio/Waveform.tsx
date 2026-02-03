import { useEffect, useRef, useState, forwardRef, useImperativeHandle } from 'react';
import WaveSurfer from 'wavesurfer.js';

interface WaveformProps {
  audioUrl: string;
  onTimeClick?: (time: number) => void;
  onReady?: (duration: number) => void;
  markers?: Array<{ time: number; color?: string }>;
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

export const Waveform = forwardRef<WaveformHandle, WaveformProps>(
  ({ audioUrl, onTimeClick, onReady, markers = [] }, ref) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const wavesurferRef = useRef<WaveSurfer | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [volume, setVolume] = useState(() => {
      const saved = localStorage.getItem('waveform-volume');
      return saved ? parseFloat(saved) : 0.5;
    });
    const [isMuted, setIsMuted] = useState(false);

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
      if (!containerRef.current) return;

      const wavesurfer = WaveSurfer.create({
        container: containerRef.current,
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

        {/* Waveform */}
        <div className="relative">
          <div ref={containerRef} />
          
          {/* Markers */}
          {markers.map((marker, index) => (
            <div
              key={index}
              className="absolute top-0 bottom-0 w-0.5"
              style={{
                left: `${(marker.time / duration) * 100}%`,
                backgroundColor: marker.color || '#f59e0b',
              }}
            >
              <div
                className="w-3 h-3 -ml-1 rounded-full"
                style={{ backgroundColor: marker.color || '#f59e0b' }}
              />
            </div>
          ))}
        </div>
      </div>
    );
  }
);

Waveform.displayName = 'Waveform';
