import React, { useRef, useState } from 'react';
import { X, GripVertical, FileText, Loader2 } from 'lucide-react';
import { useFileStore, FileRecord } from '@/store/useFileStore';
import { usePdfThumbnails } from '@/hooks/usePdfThumbnails';

export const PdfMergeGrid: React.FC = () => {
  const { files, rawFiles, removeFile } = useFileStore();
  const thumbnails = usePdfThumbnails(rawFiles);

  const dragIndexRef = useRef<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const formatSize = (bytes: number) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const handleDragStart = (e: React.DragEvent, index: number) => {
    dragIndexRef.current = index;
    setIsDragging(true);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverIndex(index);
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    const dragIndex = dragIndexRef.current;
    if (dragIndex === null || dragIndex === dropIndex) {
      cleanup(); return;
    }
    const updated = [...files];
    const [moved] = updated.splice(dragIndex, 1);
    updated.splice(dropIndex, 0, moved);
    useFileStore.setState({ files: updated });
    cleanup();
  };

  const cleanup = () => {
    setDragOverIndex(null);
    setIsDragging(false);
    dragIndexRef.current = null;
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-premium">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-border flex items-center justify-between bg-gradient-to-r from-muted/30 to-transparent">
          <div className="flex items-center gap-2.5">
            <h3 className="text-sm font-bold text-foreground">Files</h3>
            <span className="text-[11px] bg-primary/10 text-primary border border-primary/20 font-semibold px-2 py-0.5 rounded-full">
              {files.length} {files.length === 1 ? 'file' : 'files'}
            </span>
          </div>
          {files.length > 1 && (
            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <GripVertical className="h-3 w-3" />
              <span>Drag cards to reorder</span>
            </div>
          )}
        </div>

        {/* Grid */}
        <div className="p-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[420px] overflow-y-auto">
            {files.map((file: FileRecord, index: number) => {
              const meta = thumbnails[file.name];
              const isDragTarget = dragOverIndex === index && dragIndexRef.current !== index;
              const isBeingDragged = isDragging && dragIndexRef.current === index;

              return (
                <div
                  key={file.id}
                  draggable={files.length > 1}
                  onDragStart={(e) => handleDragStart(e, index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDrop={(e) => handleDrop(e, index)}
                  onDragEnd={cleanup}
                  className={`relative group rounded-xl border overflow-hidden transition-all duration-150 select-none
                    ${files.length > 1 ? 'cursor-grab active:cursor-grabbing' : ''}
                    ${isBeingDragged ? 'opacity-40 scale-95 border-primary/40' : ''}
                    ${isDragTarget ? 'border-primary shadow-glow scale-[1.03] ring-2 ring-primary/30' : 'border-border hover:border-primary/40'}
                  `}
                >
                  {/* Sequence badge */}
                  <div className="absolute top-2 left-2 z-10 h-6 w-6 rounded-full bg-primary text-primary-foreground text-[11px] font-black flex items-center justify-center shadow-md">
                    {index + 1}
                  </div>

                  {/* Remove button */}
                  <button
                    onClick={() => removeFile(file.id)}
                    className="absolute top-2 right-2 z-10 h-6 w-6 rounded-full bg-background/80 backdrop-blur-sm text-muted-foreground hover:text-red-400 hover:bg-red-500/10 border border-border hover:border-red-500/20 flex items-center justify-center transition-all opacity-0 group-hover:opacity-100"
                    aria-label={`Remove ${file.name}`}
                  >
                    <X className="h-3 w-3" />
                  </button>

                  {/* Thumbnail area */}
                  <div className="aspect-[3/4] bg-muted/40 flex items-center justify-center overflow-hidden">
                    {meta?.loading ? (
                      <div className="flex flex-col items-center gap-2 text-muted-foreground/50">
                        <Loader2 className="h-6 w-6 animate-spin" />
                        <span className="text-[10px]">Loading…</span>
                      </div>
                    ) : meta?.thumbnail ? (
                      <img
                        src={meta.thumbnail}
                        alt={`Page 1 of ${file.name}`}
                        className="w-full h-full object-contain bg-white"
                        draggable={false}
                      />
                    ) : (
                      <div className="flex flex-col items-center gap-2 text-muted-foreground/40">
                        <FileText className="h-10 w-10" />
                        <span className="text-[10px] font-semibold uppercase tracking-wider">PDF</span>
                      </div>
                    )}
                  </div>

                  {/* Footer */}
                  <div className="px-2.5 py-2 bg-card border-t border-border">
                    <p className="text-[11px] font-semibold text-foreground truncate leading-tight" title={file.name}>
                      {file.name}
                    </p>
                    <div className="flex items-center justify-between mt-0.5">
                      <span className="text-[10px] text-muted-foreground">{formatSize(file.size)}</span>
                      {meta && !meta.loading && meta.pageCount > 0 && (
                        <span className="text-[10px] text-muted-foreground">
                          {meta.pageCount} {meta.pageCount === 1 ? 'page' : 'pages'}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer hint */}
        {files.length > 1 && (
          <div className="px-5 py-3 border-t border-border bg-muted/20">
            <p className="text-[11px] text-muted-foreground text-center">
              Card <span className="text-primary font-bold">#1</span> will be the first pages in the merged PDF
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default PdfMergeGrid;
