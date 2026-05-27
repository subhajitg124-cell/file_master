import React, { useEffect, useRef, useState } from 'react';
import { Loader2, ChevronDown, ChevronUp, Eye } from 'lucide-react';

interface Props {
  url: string;
  maxPages?: number;
}

export const PdfResultPreview: React.FC<Props> = ({ url, maxPages = 8 }) => {
  const [pages, setPages] = useState<string[]>([]);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const cancelRef = useRef(false);

  useEffect(() => {
    if (!url) return;
    cancelRef.current = false;
    setLoading(true);
    setPages([]);
    setTotalPages(0);

    (async () => {
      try {
        const pdfjsLib = await import('pdfjs-dist');
        pdfjsLib.GlobalWorkerOptions.workerSrc =
          `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;
        const pdf = await pdfjsLib.getDocument(url).promise;
        if (cancelRef.current) return;
        setTotalPages(pdf.numPages);
        const limit = expanded ? pdf.numPages : Math.min(maxPages, pdf.numPages);
        const rendered: string[] = [];
        for (let i = 1; i <= limit; i++) {
          if (cancelRef.current) break;
          const page = await pdf.getPage(i);
          const vp0 = page.getViewport({ scale: 1 });
          const scale = 180 / vp0.width;
          const vp = page.getViewport({ scale });
          const canvas = document.createElement('canvas');
          canvas.width = Math.round(vp.width);
          canvas.height = Math.round(vp.height);
          const ctx = canvas.getContext('2d')!;
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          await page.render({ canvasContext: ctx, viewport: vp, canvas }).promise;
          rendered.push(canvas.toDataURL('image/jpeg', 0.82));
          if (!cancelRef.current) setPages([...rendered]);
        }
      } catch {
        // preview is optional — silently skip
      } finally {
        if (!cancelRef.current) setLoading(false);
      }
    })();

    return () => { cancelRef.current = true; };
  }, [url, expanded, maxPages]);

  if (loading && pages.length === 0) {
    return (
      <div className="flex items-center gap-2 py-3 text-muted-foreground text-xs">
        <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" />
        Rendering page preview…
      </div>
    );
  }
  if (pages.length === 0) return null;

  return (
    <div className="space-y-2.5">
      <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
        <Eye className="h-3 w-3" />
        Preview — {totalPages} {totalPages === 1 ? 'page' : 'pages'}
      </div>
      <div className="grid grid-cols-3 gap-2">
        {pages.map((src, i) => (
          <div key={i} className="relative rounded-lg overflow-hidden border border-border bg-white shadow-sm" style={{ aspectRatio: '3/4' }}>
            <img src={src} alt={`Page ${i + 1}`} className="w-full h-full object-contain" />
            <span className="absolute bottom-1.5 right-1.5 text-[9px] font-bold bg-black/50 text-white px-1.5 py-0.5 rounded-full leading-none">
              {i + 1}
            </span>
          </div>
        ))}
      </div>
      {totalPages > maxPages && (
        <button
          onClick={() => setExpanded((e) => !e)}
          className="w-full flex items-center justify-center gap-1.5 py-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-muted/40"
        >
          {expanded
            ? <><ChevronUp className="h-3.5 w-3.5" /> Show fewer pages</>
            : <><ChevronDown className="h-3.5 w-3.5" /> Show all {totalPages} pages</>}
        </button>
      )}
    </div>
  );
};

export default PdfResultPreview;
