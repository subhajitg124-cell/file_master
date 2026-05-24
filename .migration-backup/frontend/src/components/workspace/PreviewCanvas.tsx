import React from 'react';
import { File, X, ChevronUp, ChevronDown, Image as ImageIcon } from 'lucide-react';
import { useFileStore, FileRecord } from '@/store/useFileStore';

export const PreviewCanvas: React.FC = () => {
  const { files, removeFile, selectedOperation } = useFileStore();

  if (files.length === 0) return null;

  const formatSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  // Reorder helper
  const reorderFiles = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= files.length) return;
    
    const updated = [...files];
    const temp = updated[index];
    updated[index] = updated[newIndex];
    updated[newIndex] = temp;
    
    // Update store state
    useFileStore.setState({ files: updated });
  };

  const getFormatBadgeColor = (type: string) => {
    if (type === 'application/pdf') return 'bg-red-500/15 text-red-500 border-red-500/20';
    if (type.startsWith('image/')) return 'bg-blue-500/15 text-blue-500 border-blue-500/20';
    if (type.startsWith('video/')) return 'bg-violet-500/15 text-violet-500 border-violet-500/20';
    return 'bg-emerald-500/15 text-emerald-500 border-emerald-500/20';
  };

  return (
    <div className="w-full max-w-2xl mx-auto bg-card border border-border rounded-lg p-5 shadow-premium space-y-4">
      <div className="flex items-center justify-between border-b border-border pb-3">
        <h3 className="font-bold text-foreground text-sm uppercase tracking-wider flex items-center space-x-2">
          <span>Files Queue</span>
          <span className="bg-primary/10 text-primary text-xs px-2 py-0.5 rounded-full lowercase font-semibold">
            {files.length} {files.length === 1 ? 'file' : 'files'}
          </span>
        </h3>
      </div>

      <div className="max-h-[300px] overflow-y-auto space-y-2 pr-1 no-scrollbar">
        {files.map((file, index) => {
          const badgeColor = getFormatBadgeColor(file.type);
          
          return (
            <div
              key={file.id}
              className="flex items-center justify-between p-3.5 bg-muted/40 hover:bg-muted/70 rounded-lg border border-border transition-colors group"
            >
              <div className="flex items-center space-x-4 min-w-0 flex-1">
                {/* Preview Thumbnail */}
                {file.previewUrl ? (
                  <div className="h-12 w-12 rounded-md overflow-hidden bg-background border border-border shrink-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img 
                      src={file.previewUrl} 
                      alt={file.name} 
                      className="h-full w-full object-cover" 
                    />
                  </div>
                ) : (
                  <div className="h-12 w-12 rounded-md bg-secondary flex items-center justify-center border border-border shrink-0 text-muted-foreground">
                    <File className="h-6 w-6" />
                  </div>
                )}

                {/* File Details */}
                <div className="min-w-0 flex-1 space-y-0.5">
                  <p className="text-sm font-semibold text-foreground truncate">{file.name}</p>
                  <div className="flex items-center space-x-2">
                    <span className="text-xs text-muted-foreground font-medium">{formatSize(file.size)}</span>
                    <span className="text-[10px] text-muted-foreground">•</span>
                    <span className={`text-[10px] font-semibold border px-1.5 py-0.25 rounded-md ${badgeColor}`}>
                      {file.type.split('/').pop()?.toUpperCase()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Actions & Reordering (for Merges) */}
              <div className="flex items-center space-x-2 shrink-0">
                {selectedOperation === 'merge' && files.length > 1 && (
                  <div className="flex flex-col">
                    <button
                      onClick={() => reorderFiles(index, 'up')}
                      disabled={index === 0}
                      className="p-1 hover:bg-secondary rounded text-muted-foreground hover:text-foreground disabled:opacity-30"
                      aria-label="Move file up"
                    >
                      <ChevronUp className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => reorderFiles(index, 'down')}
                      disabled={index === files.length - 1}
                      className="p-1 hover:bg-secondary rounded text-muted-foreground hover:text-foreground disabled:opacity-30"
                      aria-label="Move file down"
                    >
                      <ChevronDown className="h-4 w-4" />
                    </button>
                  </div>
                )}

                <button
                  onClick={() => removeFile(file.id)}
                  className="p-1.5 hover:bg-red-500/10 text-muted-foreground hover:text-red-500 rounded-lg border border-transparent hover:border-red-500/10 transition-colors"
                  aria-label={`Remove file ${file.name}`}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
export default PreviewCanvas;
