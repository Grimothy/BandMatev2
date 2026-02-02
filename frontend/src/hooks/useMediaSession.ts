import { useEffect } from 'react';

export interface MediaSessionMetadata {
  title: string;
  artist?: string;
  album?: string;
  artwork?: string; // URL to artwork image
}

export interface MediaSessionHandlers {
  onPlay?: () => void;
  onPause?: () => void;
  onPreviousTrack?: () => void;
  onNextTrack?: () => void;
  onSeekBackward?: () => void;
  onSeekForward?: () => void;
}

export interface MediaSessionPositionState {
  duration: number;      // Total duration in seconds
  position: number;      // Current position in seconds
  playbackRate?: number; // Default 1.0
}

export interface UseMediaSessionOptions {
  metadata: MediaSessionMetadata;
  handlers: MediaSessionHandlers;
  isPlaying: boolean;
  positionState?: MediaSessionPositionState;
}

/**
 * Custom hook for integrating with the Media Session API.
 * Enables lock screen controls, album art display, and playback info
 * on mobile devices and desktop OS media controls.
 * 
 * @example
 * ```tsx
 * useMediaSession({
 *   metadata: {
 *     title: 'My Track',
 *     artist: 'Artist Name',
 *     album: 'Album Name',
 *     artwork: 'https://example.com/album-art.jpg',
 *   },
 *   handlers: {
 *     onPlay: () => audioRef.current?.play(),
 *     onPause: () => audioRef.current?.pause(),
 *     onPreviousTrack: handlePrevious,
 *     onNextTrack: handleNext,
 *   },
 *   isPlaying: true,
 *   positionState: {
 *     duration: 180,
 *     position: 45,
 *   },
 * });
 * ```
 */
export function useMediaSession({
  metadata,
  handlers,
  isPlaying,
  positionState,
}: UseMediaSessionOptions): void {
  // Feature detection
  const isSupported = typeof navigator !== 'undefined' && 'mediaSession' in navigator;

  // Update metadata when it changes
  useEffect(() => {
    if (!isSupported) return;

    // Detect image type from URL extension
    const getImageType = (url: string): string => {
      const extension = url.split('.').pop()?.toLowerCase();
      switch (extension) {
        case 'jpg':
        case 'jpeg':
          return 'image/jpeg';
        case 'png':
          return 'image/png';
        case 'webp':
          return 'image/webp';
        case 'gif':
          return 'image/gif';
        default:
          return 'image/jpeg'; // Default to JPEG for unknown
      }
    };

    const artworkArray: MediaImage[] = metadata.artwork
      ? [
          // Provide multiple sizes - browser/OS will pick the best one
          { src: metadata.artwork, sizes: '96x96', type: getImageType(metadata.artwork) },
          { src: metadata.artwork, sizes: '128x128', type: getImageType(metadata.artwork) },
          { src: metadata.artwork, sizes: '192x192', type: getImageType(metadata.artwork) },
          { src: metadata.artwork, sizes: '256x256', type: getImageType(metadata.artwork) },
          { src: metadata.artwork, sizes: '384x384', type: getImageType(metadata.artwork) },
          { src: metadata.artwork, sizes: '512x512', type: getImageType(metadata.artwork) },
        ]
      : [];

    navigator.mediaSession.metadata = new MediaMetadata({
      title: metadata.title,
      artist: metadata.artist || '',
      album: metadata.album || '',
      artwork: artworkArray,
    });
  }, [isSupported, metadata.title, metadata.artist, metadata.album, metadata.artwork]);

  // Update playback state
  useEffect(() => {
    if (!isSupported) return;
    navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';
  }, [isSupported, isPlaying]);

  // Update position state (for lock screen progress bar)
  useEffect(() => {
    if (!isSupported || !positionState) return;
    
    // Only update if we have valid duration
    if (positionState.duration > 0 && isFinite(positionState.duration)) {
      try {
        navigator.mediaSession.setPositionState({
          duration: positionState.duration,
          position: Math.min(positionState.position, positionState.duration),
          playbackRate: positionState.playbackRate ?? 1.0,
        });
      } catch {
        // Some browsers don't support setPositionState
        console.warn('Media Session setPositionState is not supported.');
      }
    }
  }, [isSupported, positionState?.duration, positionState?.position, positionState?.playbackRate]);

  // Register action handlers
  useEffect(() => {
    if (!isSupported) return;

    const actionHandlers: [MediaSessionAction, MediaSessionActionHandler | null][] = [
      ['play', handlers.onPlay || null],
      ['pause', handlers.onPause || null],
      ['previoustrack', handlers.onPreviousTrack || null],
      ['nexttrack', handlers.onNextTrack || null],
      ['seekbackward', handlers.onSeekBackward || null],
      ['seekforward', handlers.onSeekForward || null],
    ];

    // Set handlers
    for (const [action, handler] of actionHandlers) {
      try {
        navigator.mediaSession.setActionHandler(action, handler);
      } catch {
        console.warn(`Media Session action "${action}" is not supported.`);
      }
    }

    // Cleanup - unregister all handlers on unmount
    return () => {
      for (const [action] of actionHandlers) {
        try {
          navigator.mediaSession.setActionHandler(action, null);
        } catch {
          // Ignore errors during cleanup
        }
      }
    };
  }, [
    isSupported,
    handlers.onPlay,
    handlers.onPause,
    handlers.onPreviousTrack,
    handlers.onNextTrack,
    handlers.onSeekBackward,
    handlers.onSeekForward,
  ]);
}
