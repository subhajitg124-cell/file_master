import { useEffect, useRef, useState } from 'react';

export interface PdfMeta {
  thumbnail: string | null;
  pageCount: number;
  loading: boolean;
}

export function usePdfThumbnails(
  rawFiles: File[],
  thumbWidth = 160
): Record<string, PdfMeta> {
  const [results, setResults] = useState<Record<string, PdfMeta>>({});
  const abortRef = useRef<AbortController | null>(null);

  const fileKey = rawFiles.map((f) => `${f.name}:${f.size}`).join('|');

  useEffect(() => {
    if (rawFiles.length === 0) { setResults({}); return; }

    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;

    // initialise loading state immediately
    const initial: Record<string, PdfMeta> = {};
    for (const f of rawFiles) {
      initial[f.name] = { thumbnail: null, pageCount: 0, loading: true };
    }
    setResults(initial);

    (async () => {
      const pdfjsLib = await import('pdfjs-dist');
      pdfjsLib.GlobalWorkerOptions.workerSrc =
        `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

      for (const file of rawFiles) {
        if (ac.signal.aborted) break;
        const isPdf =
          file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
        if (!isPdf) {
          setResults((prev) => ({
            ...prev,
            [file.name]: { thumbnail: null, pageCount: 0, loading: false },
          }));
          continue;
        }

        try {
          const buf = await file.arrayBuffer();
          if (ac.signal.aborted) break;
          const pdf = await pdfjsLib.getDocument({ data: buf }).promise;
          const pageCount = pdf.numPages;
          const page = await pdf.getPage(1);
          const vp0 = page.getViewport({ scale: 1 });
          const scale = thumbWidth / vp0.width;
          const vp = page.getViewport({ scale });

          const canvas = document.createElement('canvas');
          canvas.width = Math.round(vp.width);
          canvas.height = Math.round(vp.height);
          const ctx = canvas.getContext('2d')!;
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          await page.render({ canvasContext: ctx, viewport: vp, canvas }).promise;
          const thumbnail = canvas.toDataURL('image/jpeg', 0.82);

          if (!ac.signal.aborted) {
            setResults((prev) => ({
              ...prev,
              [file.name]: { thumbnail, pageCount, loading: false },
            }));
          }
        } catch {
          if (!ac.signal.aborted) {
            setResults((prev) => ({
              ...prev,
              [file.name]: { thumbnail: null, pageCount: 0, loading: false },
            }));
          }
        }
      }
    })();

    return () => ac.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fileKey, thumbWidth]);

  return results;
}
