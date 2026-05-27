import React, { useEffect, useRef, useState } from 'react';
import { File, X, GripVertical, ArrowUpDown } from 'lucide-react';
import { useFileStore } from '@/store/useFileStore';
import { PdfMergeGrid } from './PdfMergeGrid';

// Small component — renders the first page of a PDF as a thumbnail icon
const PdfThumb: React.FC<{ file: File }> = ({ file }) => {
  const [thumb, setThumb] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const pdfjsLib = await import('pdfjs-dist');
        pdfjsLib.GlobalWorkerOptions.workerSrc =
          `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;
        const pdf = await pdfjsLib.getDocument({ data: await file.arrayBuffer() }).promise;
        const page = await pdf.getPage(1);
        const vp0 = page.getViewport({ scale: 1 });
        const scale = 44 / vp0.width;
        const vp = page.getViewport({ scale });
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(vp.width);
        canvas.height = Math.round(vp.height);
        const ctx = canvas.getContext('2d')!;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        await page.render({ canvasContext: ctx, viewport: vp, canvas }).promise;
        if (!cancelled) setThumb(canvas.toDataURL('image/jpeg', 0.8));
      } catch { /* show fallback */ }
    })();
    return () => { cancelled = true; };
  }, [file]);

  return (
    <div className="h-11 w-11 rounded-lg overflow-hidden bg-white border border-border shrink-0 flex items-center justify-center">
      {thumb
        ? <img src={thumb} alt="" className="h-full w-full object-contain" />
        : <File className="h-5 w-5 text-red-400" />}
    </div>
  );
};

export const PreviewCanvas: React.FC = () => {
  const { files, removeFile, selectedOperation, rawFiles } = useFileStore();
  const dragIndexRef = useRef<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  if (files.length === 0) return null;

  const isMergeOp = selectedOperation === 'merge' || (useFileStore.getState().operationOptions.operation === 'merge_docs');

  // Show the thumbnail card grid when merging multiple PDFs
  const allPdf = rawFiles.length > 0 && rawFiles.every(
    (f) => f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf')
  );
  if (isMergeOp && allPdf && files.length > 0) {
    return <PdfMergeGrid />;
  }

  const formatSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const getFormatBadgeColor = (type: string) => {
    if (type === 'application/pdf') return 'bg-red-500/15 text-red-400 border-red-500/25';
    if (type.startsWith('image/')) return 'bg-blue-500/15 text-blue-400 border-blue-500/25';
    if (type.startsWith('video/')) return 'bg-violet-500/15 text-violet-400 border-violet-500/25';
    if (type.includes('word') || type.includes('officedocument')) return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25';
    return 'bg-muted text-muted-foreground border-border';
  };

  const getFormatLabel = (type: string, name: string) => {
    if (type === 'application/pdf') return 'PDF';
    if (type.includes('wordprocessingml') || name.endsWith('.docx')) return 'DOCX';
    if (type.includes('presentationml') || name.endsWith('.pptx')) return 'PPTX';
    if (type.includes('spreadsheetml') || name.endsWith('.xlsx')) return 'XLSX';
    return (type.split('/').pop() || 'FILE').toUpperCase().slice(0, 6);
  };

  const isPdfFile = (type: string, name: string) =>
    type === 'application/pdf' || name.toLowerCase().endsWith('.pdf');

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
      setDragOverIndex(null);
      setIsDragging(false);
      dragIndexRef.current = null;
      return;
    }
    const updated = [...files];
    const [moved] = updated.splice(dragIndex, 1);
    updated.splice(dropIndex, 0, moved);
    useFileStore.setState({ files: updated });
    setDragOverIndex(null);
    setIsDragging(false);
    dragIndexRef.current = null;
  };

  const handleDragEnd = () => {
    setDragOverIndex(null);
    setIsDragging(false);
    dragIndexRef.current = null;
  };

  const moveFile = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= files.length) return;
    const updated = [...files];
    [updated[index], updated[newIndex]] = [updated[newIndex], updated[index]];
    useFileStore.setState({ files: updated });
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-premium">
        <div className="px-5 py-3.5 border-b border-border flex items-center justify-between bg-gradient-to-r from-muted/30 to-transparent">
          <div className="flex items-center gap-2.5">
            <h3 className="text-sm font-bold text-foreground">Files</h3>
            <span className="text-[11px] bg-primary/10 text-primary border border-primary/20 font-semibold px-2 py-0.5 rounded-full">
              {files.length} {files.length === 1 ? 'file' : 'files'}
            </span>
          </div>
          {isMergeOp && files.length > 1 && (
            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <ArrowUpDown className="h-3 w-3" />
              <span>Drag to reorder merge sequence</span>
            </div>
          )}
        </div>

        <div className="p-3 space-y-1.5 max-h-[320px] overflow-y-auto">
          {files.map((file, index) => {
            const badgeColor = getFormatBadgeColor(file.type);
            const isDragTarget = dragOverIndex === index && dragIndexRef.current !== index;
            const isBeingDragged = isDragging && dragIndexRef.current === index;
            const rawFile = rawFiles[index];

            return (
              <div
                key={file.id}
                draggable={isMergeOp && files.length > 1}
                onDragStart={(e) => handleDragStart(e, index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDrop={(e) => handleDrop(e, index)}
                onDragEnd={handleDragEnd}
                className={`flex items-center gap-3 px-3 py-3 rounded-xl border transition-all duration-150 group
                  ${isBeingDragged ? 'opacity-40 scale-[0.98] border-primary/40 bg-primary/5' : ''}
                  ${isDragTarget ? 'border-primary bg-primary/8 shadow-glow scale-[1.01]' : 'border-border bg-muted/30 hover:bg-muted/50'}
                  ${isMergeOp && files.length > 1 ? 'cursor-grab active:cursor-grabbing' : ''}
                `}
              >
                {isMergeOp && files.length > 1 && (
                  <div className="flex flex-col items-center gap-0.5 shrink-0">
                    <span className="h-5 w-5 rounded-full bg-primary/10 border border-primary/20 text-primary text-[10px] font-black flex items-center justify-center">
                      {index + 1}
                    </span>
                    <GripVertical className="h-3.5 w-3.5 text-muted-foreground/50 group-hover:text-muted-foreground transition-colors" />
                  </div>
                )}

                {file.previewUrl ? (
                  <div className="h-11 w-11 rounded-lg overflow-hidden bg-background border border-border shrink-0">
                    <img src={file.previewUrl} alt={file.name} className="h-full w-full object-cover" />
                  </div>
                ) : isPdfFile(file.type, file.name) && rawFile ? (
                  <PdfThumb file={rawFile} />
                ) : (
                  <div className="h-11 w-11 rounded-lg bg-secondary flex items-center justify-center border border-border shrink-0 text-muted-foreground">
                    <File className="h-5 w-5" />
                  </div>
                )}

                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-foreground truncate leading-tight">{file.name}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-muted-foreground">{formatSize(file.size)}</span>
                    <span className={`text-[10px] font-bold border px-1.5 py-0.5 rounded-md ${badgeColor}`}>
                      {getFormatLabel(file.type, file.name)}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  {isMergeOp && files.length > 1 && (
                    <div className="flex flex-col gap-0.5 sm:hidden">
                      <button onClick={() => moveFile(index, 'up')} disabled={index === 0}
                        className="p-1 rounded hover:bg-secondary text-muted-foreground hover:text-foreground disabled:opacity-25 transition-colors"
                        aria-label="Move up">
                        <span className="text-[10px] font-bold">↑</span>
                      </button>
                      <button onClick={() => moveFile(index, 'down')} disabled={index === files.length - 1}
                        className="p-1 rounded hover:bg-secondary text-muted-foreground hover:text-foreground disabled:opacity-25 transition-colors"
                        aria-label="Move down">
                        <span className="text-[10px] font-bold">↓</span>
                      </button>
                    </div>
                  )}
                  <button onClick={() => removeFile(file.id)}
                    className="p-1.5 rounded-lg hover:bg-red-500/10 text-muted-foreground hover:text-red-400 border border-transparent hover:border-red-500/15 transition-all opacity-0 group-hover:opacity-100"
                    aria-label={`Remove ${file.name}`}>
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {isMergeOp && files.length > 1 && (
          <div className="px-5 py-3 border-t border-border bg-muted/20">
            <p className="text-[11px] text-muted-foreground text-center">
              File <span className="text-primary font-bold">#1</span> will be the first page in the merged output
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default PreviewCanvas;
