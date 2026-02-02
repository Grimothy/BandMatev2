import { useAuth } from '../../hooks/useAuth';
import { formatFileSize } from '../../api/files';

export function StorageDisplay() {
  const { storage } = useAuth();

  if (!storage) return null;

  return (
    <div className="border-t border-border p-4 mt-auto">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-muted uppercase tracking-wider">
          Storage
        </span>
        <span className="text-xs text-text font-medium">
          {formatFileSize(storage.totalUsed)}
        </span>
      </div>

      {/* Breakdown by type */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs">
          <span className="flex items-center gap-2 text-muted">
            <span className="w-2 h-2 rounded-full bg-primary" />
            Audio
          </span>
          <span className="text-muted">{formatFileSize(storage.byType.CUT)}</span>
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="flex items-center gap-2 text-muted">
            <span className="w-2 h-2 rounded-full bg-blue-400" />
            Stems
          </span>
          <span className="text-muted">{formatFileSize(storage.byType.STEM)}</span>
        </div>
      </div>

      {/* File count */}
      <p className="text-xs text-muted mt-2 pt-2 border-t border-border/50">
        {storage.fileCount} file{storage.fileCount !== 1 ? 's' : ''} uploaded
      </p>
    </div>
  );
}
