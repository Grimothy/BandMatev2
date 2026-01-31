import { useState, useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import { AudioFile, AudioLyrics, LyricsLine } from '../../types';
import { getLyrics, updateLyrics } from '../../api/cuts';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Loading } from '../ui/Loading';

// Helper to format time as MM:SS
function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export interface LyricsEditorHandle {
  getCurrentTime: () => number;
}

interface LyricsEditorProps {
  cutId: string;
  audioFiles: AudioFile[];
  onSeek?: (audioFileId: string, timestamp: number) => void;
  getCurrentTime?: () => number;
}

export const LyricsEditor = forwardRef<LyricsEditorHandle, LyricsEditorProps>(
  ({ cutId, audioFiles, onSeek, getCurrentTime }, ref) => {
    const [allLyrics, setAllLyrics] = useState<AudioLyrics[]>([]);
    const [selectedAudioId, setSelectedAudioId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [hasChanges, setHasChanges] = useState(false);
    const [editingLineIndex, setEditingLineIndex] = useState<number | null>(null);
    const [newLineText, setNewLineText] = useState('');
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    useImperativeHandle(ref, () => ({
      getCurrentTime: () => getCurrentTime?.() ?? 0,
    }));

    // Fetch lyrics on mount
    useEffect(() => {
      const fetchLyrics = async () => {
        try {
          const data = await getLyrics(cutId);
          setAllLyrics(data);
        } catch (error) {
          console.error('Failed to fetch lyrics:', error);
        } finally {
          setIsLoading(false);
        }
      };
      fetchLyrics();
    }, [cutId]);

    // Auto-select first audio file
    useEffect(() => {
      if (!selectedAudioId && audioFiles.length > 0) {
        setSelectedAudioId(audioFiles[0].id);
      }
    }, [audioFiles, selectedAudioId]);

    // Get current audio's lyrics
    const currentLyrics = allLyrics.find((l) => l.audioFileId === selectedAudioId);
    const lines = currentLyrics?.lines ?? [];

    // Get selected audio file info
    const selectedAudio = audioFiles.find((a) => a.id === selectedAudioId);

    const handleSave = async () => {
      setIsSaving(true);
      try {
        await updateLyrics(cutId, allLyrics);
        setHasChanges(false);
      } catch (error) {
        console.error('Failed to save lyrics:', error);
      } finally {
        setIsSaving(false);
      }
    };

    const updateCurrentLyrics = (newLines: LyricsLine[]) => {
      if (!selectedAudioId) return;

      setAllLyrics((prev) => {
        const existing = prev.find((l) => l.audioFileId === selectedAudioId);
        if (existing) {
          return prev.map((l) =>
            l.audioFileId === selectedAudioId ? { ...l, lines: newLines } : l
          );
        } else {
          return [...prev, { audioFileId: selectedAudioId, lines: newLines }];
        }
      });
      setHasChanges(true);
    };

    const handleAddLine = () => {
      if (!newLineText.trim()) return;

      const currentTime = getCurrentTime?.() ?? 0;
      const newLine: LyricsLine = {
        timestamp: currentTime,
        text: newLineText.trim(),
      };

      // Insert in sorted order by timestamp
      const newLines = [...lines, newLine].sort((a, b) => a.timestamp - b.timestamp);
      updateCurrentLyrics(newLines);
      setNewLineText('');
      textareaRef.current?.focus();
    };

    const handleUpdateLine = (index: number, updates: Partial<LyricsLine>) => {
      const newLines = lines.map((line, i) =>
        i === index ? { ...line, ...updates } : line
      );
      // Re-sort if timestamp changed
      if (updates.timestamp !== undefined) {
        newLines.sort((a, b) => a.timestamp - b.timestamp);
      }
      updateCurrentLyrics(newLines);
      setEditingLineIndex(null);
    };

    const handleDeleteLine = (index: number) => {
      const newLines = lines.filter((_, i) => i !== index);
      updateCurrentLyrics(newLines);
    };

    const handleTimestampClick = (line: LyricsLine) => {
      if (selectedAudioId && onSeek) {
        onSeek(selectedAudioId, line.timestamp);
      }
    };

    const handleInsertTimestamp = () => {
      const currentTime = getCurrentTime?.() ?? 0;
      const timeStr = `[${formatTime(currentTime)}] `;
      setNewLineText((prev) => timeStr + prev);
      textareaRef.current?.focus();
    };

    const handleSetLineTimestamp = (index: number) => {
      const currentTime = getCurrentTime?.() ?? 0;
      handleUpdateLine(index, { timestamp: currentTime });
    };

    if (isLoading) {
      return <Loading className="py-12" />;
    }

    if (audioFiles.length === 0) {
      return (
        <Card className="text-center py-12">
          <svg className="w-12 h-12 text-muted mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
          </svg>
          <p className="text-text font-medium">No Audio Files</p>
          <p className="text-sm text-muted mt-1">
            Upload an audio file first to add lyrics
          </p>
        </Card>
      );
    }

    return (
      <div className="space-y-4">
        {/* Header with audio selector and save button */}
        <Card>
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <label className="text-sm font-medium text-muted">Audio File:</label>
              <select
                value={selectedAudioId || ''}
                onChange={(e) => setSelectedAudioId(e.target.value)}
                className="px-3 py-2 bg-background border border-border rounded text-text text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                {audioFiles.map((audio, index) => (
                  <option key={audio.id} value={audio.id}>
                    #{index + 1} - {audio.name || audio.originalName}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2">
              {hasChanges && (
                <span className="text-xs text-warning">Unsaved changes</span>
              )}
              <Button
                onClick={handleSave}
                disabled={!hasChanges}
                isLoading={isSaving}
                size="sm"
              >
                Save Lyrics
              </Button>
            </div>
          </div>
        </Card>

        {/* Lyrics lines */}
        <Card>
          <h3 className="font-semibold text-text mb-4">
            Lyrics for {selectedAudio?.name || selectedAudio?.originalName || 'selected audio'}
          </h3>

          {lines.length === 0 ? (
            <p className="text-muted text-center py-6">
              No lyrics yet. Add your first line below.
            </p>
          ) : (
            <div className="space-y-2 mb-4 max-h-80 overflow-y-auto">
              {lines.map((line, index) => (
                <div
                  key={`${line.timestamp}-${index}`}
                  className="flex items-start gap-2 p-2 rounded hover:bg-surface-light group"
                >
                  {/* Timestamp button */}
                  <button
                    onClick={() => handleTimestampClick(line)}
                    className="flex-shrink-0 px-2 py-1 bg-primary/20 text-primary text-xs font-mono rounded hover:bg-primary/30 transition-colors"
                    title="Click to seek to this time"
                  >
                    {formatTime(line.timestamp)}
                  </button>

                  {/* Lyrics text */}
                  {editingLineIndex === index ? (
                    <input
                      type="text"
                      value={line.text}
                      onChange={(e) => handleUpdateLine(index, { text: e.target.value })}
                      onBlur={() => setEditingLineIndex(null)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') setEditingLineIndex(null);
                        if (e.key === 'Escape') setEditingLineIndex(null);
                      }}
                      className="flex-1 px-2 py-1 bg-background border border-border rounded text-text text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                      autoFocus
                    />
                  ) : (
                    <span
                      className="flex-1 text-text text-sm cursor-pointer hover:text-primary"
                      onClick={() => setEditingLineIndex(index)}
                      title="Click to edit"
                    >
                      {line.text}
                    </span>
                  )}

                  {/* Actions */}
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleSetLineTimestamp(index)}
                      className="p-1 text-muted hover:text-primary hover:bg-primary/10 rounded transition-colors"
                      title="Set to current time"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleDeleteLine(index)}
                      className="p-1 text-muted hover:text-error hover:bg-error/10 rounded transition-colors"
                      title="Delete line"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Add new line */}
          <div className="border-t border-border pt-4">
            <div className="flex items-start gap-2">
              <button
                onClick={handleInsertTimestamp}
                className="flex-shrink-0 px-2 py-2 bg-surface-light text-muted hover:text-primary hover:bg-primary/10 rounded transition-colors"
                title="Insert current timestamp"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </button>
              <textarea
                ref={textareaRef}
                value={newLineText}
                onChange={(e) => setNewLineText(e.target.value)}
                placeholder="Enter lyrics line..."
                className="flex-1 px-3 py-2 bg-background border border-border rounded text-text text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
                rows={2}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleAddLine();
                  }
                }}
              />
              <Button
                onClick={handleAddLine}
                disabled={!newLineText.trim()}
                size="sm"
              >
                Add
              </Button>
            </div>
            <p className="text-xs text-muted mt-2">
              Press Enter to add line. The current audio playback time will be used as the timestamp.
            </p>
          </div>
        </Card>

        {/* Help text */}
        <Card className="bg-surface/50">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="text-sm text-muted">
              <p className="font-medium text-text mb-1">Tips:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Click on a timestamp to seek the audio to that position</li>
                <li>Click the clock icon to insert the current playback time</li>
                <li>Click on lyrics text to edit it</li>
                <li>Use the clock button on each line to update its timestamp to the current time</li>
              </ul>
            </div>
          </div>
        </Card>
      </div>
    );
  }
);

LyricsEditor.displayName = 'LyricsEditor';
