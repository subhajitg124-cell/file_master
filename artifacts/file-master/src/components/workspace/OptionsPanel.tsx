import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sliders, RefreshCw, Settings2, Play, Loader2, Sparkles, Video, FileText,
  Scissors, Music, FileArchive, Image, ArrowLeftRight, FileCode, Maximize2,
  MonitorSmartphone, Globe, Lock, Unlock, RotateCw, Trash2, Stamp, Hash,
  AlignJustify, Crop, FlipHorizontal, PenTool, FlipVertical, Eraser,
  Plus, Minus, ChevronDown, ChevronUp, ScanText, Type
} from 'lucide-react';
import { useFileStore } from '@/store/useFileStore';
import { apiClient, apiMock } from '@/lib/api';
import {
  runClientSidePdfMerge, runClientSidePdfCompress, runClientSidePdfSplit,
  runClientSideImagesToPdf, runClientSidePdfRotate, runClientSidePdfDeletePages,
  runClientSidePdfWatermark, runClientSidePdfPageNumbers, runClientSidePdfReorder,
  runClientSidePdfCrop, runClientSidePdfAnnotate, PdfAnnotation
} from '@/lib/processing/pdf/client-pdf';
import {
  compressImage, resizeImage, convertToIco, convertSvgToPng, convertImageFormat,
  getImageDimensions, cropImage, rotateFlipImage, addImageWatermark, removeImageBackground
} from '@/lib/processing/image/client-image';

// ── Shared sub-components ──────────────────────────────────────────────────

const InfoBox: React.FC<{ icon: React.ReactNode; text: string; color?: string }> = ({ icon, text, color = 'bg-muted/40 border-border' }) => (
  <div className={`p-4 rounded-xl border text-sm text-muted-foreground flex items-start gap-3 ${color}`}>
    <span className="shrink-0 mt-0.5">{icon}</span>
    <span className="leading-relaxed">{text}</span>
  </div>
);

const Slider: React.FC<{
  id: string; label: string; value: number; min: number; max: number;
  unit: string; hint?: string; step?: number; onChange: (v: number) => void;
}> = ({ id, label, value, min, max, unit, hint, step = 1, onChange }) => {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label htmlFor={id} className="text-sm font-medium text-foreground">{label}</label>
        <span className="text-sm font-bold text-primary tabular-nums">{value}{unit}</span>
      </div>
      <div className="relative h-6 flex items-center">
        <div className="w-full h-1.5 bg-secondary rounded-full overflow-hidden">
          <div className="h-full rounded-full bg-gradient-to-r from-primary to-violet-400 transition-all duration-150" style={{ width: `${pct}%` }} />
        </div>
        <input id={id} type="range" min={min} max={max} value={value} step={step}
          onChange={(e) => onChange(Number(e.target.value))}
          className="absolute inset-0 w-full opacity-0 cursor-pointer"
        />
        <div
          className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 h-4 w-4 rounded-full bg-white border-2 border-primary shadow-md pointer-events-none transition-all duration-150"
          style={{ left: `${pct}%` }}
        />
      </div>
      {hint && <p className="text-[10px] text-muted-foreground leading-relaxed">{hint}</p>}
    </div>
  );
};

const PresetRow: React.FC<{
  label: string;
  options: { value: string | number; label: string; hint?: string }[];
  value: string | number;
  onChange: (v: string | number) => void;
}> = ({ label, options, value, onChange }) => (
  <div className="space-y-2">
    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{label}</span>
    <div className="flex gap-2 flex-wrap">
      {options.map((opt) => (
        <button key={opt.value} onClick={() => onChange(opt.value)} title={opt.hint}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all duration-150 ${
            value === opt.value
              ? 'bg-primary text-primary-foreground border-primary shadow-glow'
              : 'bg-card text-muted-foreground border-border hover:border-primary/50 hover:text-foreground'
          }`}>
          {opt.label}
        </button>
      ))}
    </div>
  </div>
);

const Select: React.FC<{
  id: string; label: string; value: string | number;
  options: { value: string | number; label: string }[];
  onChange: (v: string) => void;
}> = ({ id, label, value, options, onChange }) => (
  <div className="space-y-2">
    <label htmlFor={id} className="text-sm font-medium text-foreground block">{label}</label>
    <select id={id} value={value} onChange={(e) => onChange(e.target.value)}
      className="w-full p-2.5 text-sm bg-card border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all appearance-none cursor-pointer">
      {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  </div>
);

const NumberInput: React.FC<{
  label: string; value: number; min?: number; max?: number;
  onChange: (v: number) => void; placeholder?: string;
}> = ({ label, value, min = 0, max, onChange, placeholder }) => (
  <div className="space-y-1.5">
    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{label}</label>
    <input type="number" min={min} max={max} value={value || ''} placeholder={placeholder || String(min)}
      onChange={(e) => onChange(Math.max(min, parseInt(e.target.value) || min))}
      className="w-full p-2.5 bg-card border border-border rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/40"
    />
  </div>
);

// ── Annotation row component for PDF editor ────────────────────────────────
interface AnnotationRowProps {
  ann: PdfAnnotation & { id: string };
  idx: number;
  onChange: (id: string, patch: Partial<PdfAnnotation>) => void;
  onRemove: (id: string) => void;
}
const AnnotationRow: React.FC<AnnotationRowProps> = ({ ann, idx, onChange, onRemove }) => {
  const [expanded, setExpanded] = useState(idx === 0);
  const typeLabels: Record<string, string> = { text: 'Add Text', cover: 'Cover/Redact Area', replace: 'Replace Text' };
  return (
    <div className="border border-border rounded-xl overflow-hidden">
      <button className="w-full flex items-center justify-between px-3 py-2.5 bg-muted/30 hover:bg-muted/50 transition-colors text-left"
        onClick={() => setExpanded(!expanded)}>
        <div className="flex items-center gap-2">
          <span className={`h-5 w-5 rounded-full text-[10px] font-bold flex items-center justify-center ${
            ann.type === 'cover' ? 'bg-destructive/20 text-destructive' :
            ann.type === 'replace' ? 'bg-amber-500/20 text-amber-400' :
            'bg-primary/20 text-primary'
          }`}>{idx + 1}</span>
          <span className="text-xs font-semibold text-foreground">{typeLabels[ann.type]}</span>
          {ann.text && <span className="text-[10px] text-muted-foreground truncate max-w-[120px]">"{ann.text}"</span>}
        </div>
        <div className="flex items-center gap-2">
          {expanded ? <ChevronUp className="h-3 w-3 text-muted-foreground" /> : <ChevronDown className="h-3 w-3 text-muted-foreground" />}
          <button onClick={(e) => { e.stopPropagation(); onRemove(ann.id); }}
            className="h-5 w-5 rounded-md bg-destructive/10 text-destructive flex items-center justify-center hover:bg-destructive/20 transition-colors">
            <Minus className="h-3 w-3" />
          </button>
        </div>
      </button>
      {expanded && (
        <div className="p-3 space-y-3 bg-card/50">
          <div className="grid grid-cols-3 gap-2">
            {(['text', 'cover', 'replace'] as const).map(t => (
              <button key={t} onClick={() => onChange(ann.id, { type: t })}
                className={`py-1.5 rounded-lg text-[11px] font-semibold border transition-all ${ann.type === t ? 'bg-primary text-primary-foreground border-primary' : 'bg-card border-border text-muted-foreground hover:border-primary/40'}`}>
                {typeLabels[t]}
              </button>
            ))}
          </div>
          {(ann.type === 'text' || ann.type === 'replace') && (
            <div className="space-y-1">
              <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Text content</label>
              <input type="text" placeholder="Enter text to add…" value={ann.text || ''}
                onChange={(e) => onChange(ann.id, { text: e.target.value })}
                className="w-full p-2 bg-card border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" />
            </div>
          )}
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Page #</label>
              <input type="number" min={1} value={ann.page}
                onChange={(e) => onChange(ann.id, { page: Math.max(1, parseInt(e.target.value) || 1) })}
                className="w-full p-2 bg-card border border-border rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/40" />
            </div>
            {(ann.type === 'text' || ann.type === 'replace') && (
              <div className="space-y-1">
                <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Font size</label>
                <input type="number" min={6} max={120} value={ann.fontSize || 12}
                  onChange={(e) => onChange(ann.id, { fontSize: parseInt(e.target.value) || 12 })}
                  className="w-full p-2 bg-card border border-border rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/40" />
              </div>
            )}
          </div>
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Position &amp; Size (points from top-left)</p>
          <div className="grid grid-cols-4 gap-2">
            {([['X', 'x'], ['Y (top)', 'y'], ['Width', 'width'], ['Height', 'height']] as [string, keyof PdfAnnotation][]).map(([lbl, key]) => (
              <div key={key} className="space-y-1">
                <label className="text-[9px] text-muted-foreground">{lbl}</label>
                <input type="number" min={0} value={(ann as any)[key] || 0}
                  onChange={(e) => onChange(ann.id, { [key]: parseInt(e.target.value) || 0 })}
                  className="w-full p-1.5 bg-card border border-border rounded-md text-xs font-mono focus:outline-none focus:ring-1 focus:ring-primary/40" />
              </div>
            ))}
          </div>
          <div className="flex gap-2 items-center flex-wrap">
            {(ann.type === 'text' || ann.type === 'replace') && (
              <div className="flex items-center gap-2">
                <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Text color</label>
                <input type="color" value={ann.colorHex || '#000000'}
                  onChange={(e) => onChange(ann.id, { colorHex: e.target.value })}
                  className="h-7 w-10 rounded border border-border cursor-pointer bg-card p-0.5" />
              </div>
            )}
            {(ann.type === 'cover' || ann.type === 'replace') && (
              <div className="flex items-center gap-2">
                <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Fill color</label>
                <input type="color" value={ann.fillColorHex || '#ffffff'}
                  onChange={(e) => onChange(ann.id, { fillColorHex: e.target.value })}
                  className="h-7 w-10 rounded border border-border cursor-pointer bg-card p-0.5" />
              </div>
            )}
            {(ann.type === 'text' || ann.type === 'replace') && (
              <>
                <button onClick={() => onChange(ann.id, { bold: !ann.bold })}
                  className={`px-2 py-1 rounded-md text-xs font-bold border transition-all ${ann.bold ? 'bg-primary text-primary-foreground border-primary' : 'bg-card border-border text-muted-foreground hover:border-primary/40'}`}>
                  B
                </button>
                <button onClick={() => onChange(ann.id, { italic: !ann.italic })}
                  className={`px-2 py-1 rounded-md text-xs italic border transition-all ${ann.italic ? 'bg-primary text-primary-foreground border-primary' : 'bg-card border-border text-muted-foreground hover:border-primary/40'}`}>
                  I
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// ── Main component ─────────────────────────────────────────────────────────

export const OptionsPanel: React.FC = () => {
  const {
    files, rawFiles, selectedOperation, operationOptions, updateOptions,
    isMockMode, jobId, setProcessing, setProgress, setDownloadUrl, setSavings,
    setError, isProcessing,
  } = useFileStore();

  const [showAdvanced, setShowAdvanced] = useState(false);
  const [naturalDims, setNaturalDims] = useState<{ width: number; height: number } | null>(null);
  const [annotations, setAnnotations] = useState<Array<PdfAnnotation & { id: string }>>([
    { id: 'ann-0', page: 1, type: 'text', x: 50, y: 100, width: 300, height: 20, text: '', fontSize: 12, colorHex: '#000000', fillColorHex: '#ffffff' }
  ]);

  const firstFile = files[0];
  const fileType  = firstFile?.type || '';
  const actionName = operationOptions.operation || selectedOperation;
  const isImage   = fileType.startsWith('image/') || fileType === 'image/svg+xml';
  const isPdf     = fileType === 'application/pdf';
  const isVideo   = fileType.startsWith('video/');
  const isAudio   = fileType.startsWith('audio/');

  if (files.length === 0 || !selectedOperation) return null;

  // Load natural image dimensions for resize/crop tools
  // eslint-disable-next-line react-hooks/rules-of-hooks
  useEffect(() => {
    if ((selectedOperation === 'resize' || actionName === 'image_crop') && rawFiles[0] && isImage) {
      getImageDimensions(rawFiles[0]).then((d) => {
        setNaturalDims(d);
        if (selectedOperation === 'resize' && !operationOptions.resize_width) {
          updateOptions({ resize_width: d.width, resize_height: d.height });
        }
        if (actionName === 'image_crop' && !operationOptions.crop_width) {
          updateOptions({ crop_x: 0, crop_y: 0, crop_width: d.width, crop_height: d.height });
        }
      }).catch(() => {});
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedOperation, actionName, rawFiles[0]?.name]);

  // ── Annotation helpers ───────────────────────────────────────────────────
  const addAnnotation = () => setAnnotations(prev => [
    ...prev,
    { id: `ann-${Date.now()}`, page: 1, type: 'text', x: 50, y: 100 + prev.length * 30, width: 300, height: 20, text: '', fontSize: 12, colorHex: '#000000', fillColorHex: '#ffffff' }
  ]);

  const updateAnnotation = (id: string, patch: Partial<PdfAnnotation>) =>
    setAnnotations(prev => prev.map(a => a.id === id ? { ...a, ...patch } : a));

  const removeAnnotation = (id: string) =>
    setAnnotations(prev => prev.length > 1 ? prev.filter(a => a.id !== id) : prev);

  // ── Compress presets ─────────────────────────────────────────────────────
  const applyCompressPreset = (preset: string) => {
    const map: Record<string, { quality: number; resize_pct: number }> = {
      small:    { quality: 55, resize_pct: 0.75 },
      balanced: { quality: 82, resize_pct: 1.0 },
      high:     { quality: 92, resize_pct: 1.0 },
      lossless: { quality: 100, resize_pct: 1.0 },
    };
    if (map[preset]) updateOptions({ compress_preset: preset, ...map[preset] });
    else updateOptions({ compress_preset: 'custom' });
  };

  // ── Enhance presets ──────────────────────────────────────────────────────
  const applyEnhancePreset = (preset: string) => {
    const map: Record<string, any> = {
      natural: { brightness: 1.05, contrast: 1.05, sharpness: 1.1, denoise: false },
      vivid:   { brightness: 1.1,  contrast: 1.25, sharpness: 1.3, denoise: false },
      sharp:   { brightness: 1.0,  contrast: 1.1,  sharpness: 1.8, denoise: false },
      clean:   { brightness: 1.0,  contrast: 1.0,  sharpness: 1.0, denoise: true },
    };
    if (map[preset]) updateOptions({ enhance_preset: preset, ...map[preset] });
  };

  // ── Resize aspect-lock helper ────────────────────────────────────────────
  const handleResizeWidth = (w: number) => {
    if (operationOptions.resize_lock_aspect && naturalDims) {
      updateOptions({ resize_width: w, resize_height: Math.round(w * naturalDims.height / naturalDims.width) });
    } else {
      updateOptions({ resize_width: w });
    }
  };
  const handleResizeHeight = (h: number) => {
    if (operationOptions.resize_lock_aspect && naturalDims) {
      updateOptions({ resize_width: Math.round(h * naturalDims.width / naturalDims.height), resize_height: h });
    } else {
      updateOptions({ resize_height: h });
    }
  };

  // ── Process handler ──────────────────────────────────────────────────────
  const doSimulate = (outputMime?: string) => {
    apiMock.simulateProcessing(
      jobId!, selectedOperation, files,
      (p) => setProgress(p),
      (url, savings) => { setDownloadUrl(url); setSavings(savings); setProcessing(false); },
      (err) => { setError(err); setProcessing(false); },
      outputMime
    );
  };

  const parsePageList = (input: string): number[] =>
    input.split(/[\s,]+/).map(s => parseInt(s.trim())).filter(n => !isNaN(n) && n > 0);

  const handleStartProcess = async () => {
    if (!jobId) return;
    setProcessing(true); setError(null); setProgress(0);
    try {
      if (!isMockMode) {
        await apiClient.startProcessing(jobId, selectedOperation, operationOptions);
        const poll = async () => {
          try {
            const data = await apiClient.pollStatus(jobId);
            setProgress(data.progress);
            if (data.status === 'done') {
              setDownloadUrl(apiClient.getDownloadUrl(jobId));
              if (data.metadata) setSavings({ originalSize: data.metadata.input_size_bytes || 0, newSize: data.metadata.output_size_bytes || 0, percent: data.metadata.savings_percent || 0 });
              setProcessing(false);
            } else if (data.status === 'failed') { setError(data.error || 'Backend failed.'); setProcessing(false); }
            else setTimeout(poll, 1500);
          } catch (e: any) { setError(e.message); setProcessing(false); }
        };
        setTimeout(poll, 1000); return;
      }

      const prog = (p: number) => setProgress(p);
      const done = (blob: Blob, origSize?: number) => {
        const orig = origSize || rawFiles.reduce((a, f) => a + f.size, 0);
        setProgress(100);
        setDownloadUrl(URL.createObjectURL(blob));
        setSavings({ originalSize: orig, newSize: blob.size, percent: Math.max(0, Math.round(((orig - blob.size) / orig) * 100)) });
        setProcessing(false);
      };

      // ── PDF operations ─────────────────────────────────────────────────
      if (isPdf && selectedOperation === 'merge') {
        prog(20); const blob = await runClientSidePdfMerge(rawFiles); prog(90);
        setTimeout(() => done(blob), 300); return;
      }
      if (isPdf && selectedOperation === 'compress') {
        prog(30); const blob = await runClientSidePdfCompress(rawFiles[0], operationOptions.quality || 80); prog(90);
        setTimeout(() => done(blob, rawFiles[0].size), 300); return;
      }
      if (isPdf && selectedOperation === 'split') {
        prog(20); const blobs = await runClientSidePdfSplit(rawFiles[0], operationOptions.split_mode || 'all', operationOptions.split_every || 1, operationOptions.split_range || '1-1'); prog(90);
        setTimeout(() => { setProgress(100); setDownloadUrl(URL.createObjectURL(blobs[0])); setSavings(null); setProcessing(false); }, 300); return;
      }
      if (actionName === 'pdf_rotate') {
        prog(20); const blob = await runClientSidePdfRotate(rawFiles[0], operationOptions.rotate_deg || 90, operationOptions.rotate_pages_mode || 'all', operationOptions.rotate_pages_list || []); prog(90);
        setTimeout(() => done(blob, rawFiles[0].size), 300); return;
      }
      if (actionName === 'pdf_delete') {
        const pages = parsePageList(operationOptions.delete_pages || '');
        if (!pages.length) { setError('Enter at least one page number to delete.'); setProcessing(false); return; }
        prog(20); const blob = await runClientSidePdfDeletePages(rawFiles[0], pages); prog(90);
        setTimeout(() => done(blob, rawFiles[0].size), 300); return;
      }
      if (actionName === 'pdf_watermark') {
        const text = (operationOptions.watermark_text || 'CONFIDENTIAL').trim();
        if (!text) { setError('Enter watermark text.'); setProcessing(false); return; }
        prog(20);
        const blob = await runClientSidePdfWatermark(rawFiles[0], text, {
          fontSize: operationOptions.watermark_size || 52,
          opacity: (operationOptions.watermark_opacity || 18) / 100,
          rotation: operationOptions.watermark_rotation ?? -45,
          position: operationOptions.watermark_position || 'diagonal',
          colorHex: operationOptions.watermark_color || '#888888',
        }); prog(90);
        setTimeout(() => done(blob, rawFiles[0].size), 300); return;
      }
      if (actionName === 'pdf_page_numbers') {
        prog(20);
        const blob = await runClientSidePdfPageNumbers(rawFiles[0], {
          position: operationOptions.page_num_position || 'bottom-center',
          startFrom: operationOptions.page_num_start || 1,
          fontSize: operationOptions.page_num_size || 10,
          prefix: operationOptions.page_num_prefix || '',
          suffix: operationOptions.page_num_suffix || '',
          colorHex: operationOptions.page_num_color || '#555555',
        }); prog(90);
        setTimeout(() => done(blob, rawFiles[0].size), 300); return;
      }
      if (actionName === 'pdf_reorder') {
        const order = parsePageList(operationOptions.reorder_pages || '');
        if (!order.length) { setError('Enter the new page order (e.g. 3, 1, 2).'); setProcessing(false); return; }
        prog(20); const blob = await runClientSidePdfReorder(rawFiles[0], order); prog(90);
        setTimeout(() => done(blob, rawFiles[0].size), 300); return;
      }
      if (actionName === 'pdf_crop') {
        prog(20);
        const blob = await runClientSidePdfCrop(
          rawFiles[0],
          operationOptions.pdf_crop_x || 0,
          operationOptions.pdf_crop_y || 0,
          operationOptions.pdf_crop_w || 595,
          operationOptions.pdf_crop_h || 842,
          operationOptions.pdf_crop_mode || 'all',
          parsePageList(operationOptions.pdf_crop_pages || '')
        ); prog(90);
        setTimeout(() => done(blob, rawFiles[0].size), 300); return;
      }
      if (actionName === 'pdf_annotate') {
        const validAnnotations = annotations.filter(a => a.type === 'cover' || a.text?.trim());
        if (!validAnnotations.length) { setError('Add at least one annotation with text or a cover area.'); setProcessing(false); return; }
        prog(20); const blob = await runClientSidePdfAnnotate(rawFiles[0], validAnnotations); prog(90);
        setTimeout(() => done(blob, rawFiles[0].size), 300); return;
      }

      // ── Images → PDF ───────────────────────────────────────────────────
      if (actionName === 'images_to_pdf') {
        prog(20); const blob = await runClientSideImagesToPdf(rawFiles.length > 0 ? rawFiles : []); prog(90);
        setTimeout(() => done(blob), 300); return;
      }

      // ── Image operations ───────────────────────────────────────────────
      if (isImage && actionName === 'remove_bg') {
        prog(5);
        const format = (operationOptions.remove_bg_format || 'png') as 'png' | 'jpeg' | 'webp';
        const bgFill = operationOptions.remove_bg_fill || undefined;
        const blob = await removeImageBackground(rawFiles[0], format, bgFill, (p) => prog(p)); prog(95);
        setTimeout(() => done(blob, rawFiles[0].size), 200); return;
      }
      if (isImage && selectedOperation === 'compress') {
        prog(20);
        const q = (operationOptions.quality || 82) / 100;
        const scale = operationOptions.resize_pct || 1.0;
        const dims = naturalDims || await getImageDimensions(rawFiles[0]);
        const blob = await compressImage(rawFiles[0], q, Math.round(dims.width * scale), Math.round(dims.height * scale)); prog(90);
        setTimeout(() => done(blob, rawFiles[0].size), 250); return;
      }
      if (isImage && selectedOperation === 'resize') {
        prog(20);
        const blob = await resizeImage(rawFiles[0], operationOptions.resize_width || 800, operationOptions.resize_height || 600, (operationOptions.resize_format || 'png') as any, 0.92); prog(90);
        setTimeout(() => done(blob, rawFiles[0].size), 250); return;
      }
      if (actionName === 'image_crop') {
        const dims = naturalDims || await getImageDimensions(rawFiles[0]);
        const x = Math.max(0, operationOptions.crop_x || 0);
        const y = Math.max(0, operationOptions.crop_y || 0);
        const w = Math.min(dims.width - x, operationOptions.crop_width || dims.width);
        const h = Math.min(dims.height - y, operationOptions.crop_height || dims.height);
        if (w <= 0 || h <= 0) { setError('Invalid crop dimensions.'); setProcessing(false); return; }
        prog(20); const blob = await cropImage(rawFiles[0], x, y, w, h); prog(90);
        setTimeout(() => done(blob, rawFiles[0].size), 250); return;
      }
      if (actionName === 'image_rotate') {
        prog(20);
        const blob = await rotateFlipImage(rawFiles[0], operationOptions.rotate_deg || 90, operationOptions.flip_h || false, operationOptions.flip_v || false); prog(90);
        setTimeout(() => done(blob, rawFiles[0].size), 250); return;
      }
      if (actionName === 'image_watermark') {
        const text = (operationOptions.img_watermark_text || '').trim();
        if (!text) { setError('Enter watermark text.'); setProcessing(false); return; }
        prog(20);
        const blob = await addImageWatermark(rawFiles[0], text, {
          fontSize: operationOptions.img_wm_size,
          color: operationOptions.img_wm_color || '#ffffff',
          opacity: (operationOptions.img_wm_opacity || 45) / 100,
          position: operationOptions.img_wm_position || 'diagonal',
          bold: true, shadow: true,
          tileRepeat: operationOptions.img_wm_tile || false,
        }); prog(90);
        setTimeout(() => done(blob, rawFiles[0].size), 250); return;
      }
      if (isImage && actionName === 'convert_format') {
        prog(20); const blob = await convertImageFormat(rawFiles[0], (operationOptions.target_format || 'webp') as any, (operationOptions.quality || 92) / 100); prog(90);
        setTimeout(() => done(blob, rawFiles[0].size), 250); return;
      }
      if (actionName === 'to_ico') {
        prog(20); const blob = await convertToIco(rawFiles[0], operationOptions.ico_sizes || [16, 32, 48, 64]); prog(90);
        setTimeout(() => done(blob, rawFiles[0].size), 250); return;
      }
      if (actionName === 'svg_to_png') {
        prog(20); const blob = await convertSvgToPng(rawFiles[0], operationOptions.svg_width || 512, operationOptions.svg_height || 512); prog(90);
        setTimeout(() => done(blob, rawFiles[0].size), 250); return;
      }

      // ── Mock simulations ───────────────────────────────────────────────
      const outputMimeMap: Record<string, string> = {
        pdf_to_docx:   'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        pdf_to_pptx:   'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        pdf_to_images: 'image/png',
        docx_to_pdf: 'application/pdf', pptx_to_pdf: 'application/pdf',
        xlsx_to_csv: 'text/csv', csv_to_xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        md_to_html: 'text/html', html_to_md: 'text/markdown',
        video_to_audio: 'audio/mpeg', video_to_gif: 'image/gif', compress_audio: 'audio/mpeg',
        enhance: fileType,
      };
      doSimulate(outputMimeMap[actionName] || fileType);

    } catch (e: any) {
      setError(e.message || 'Processing failed.');
      setProcessing(false);
    }
  };

  // ── Option renderers ──────────────────────────────────────────────────────

  const renderRemoveBgOptions = () => (
    <div className="space-y-5">
      <div className="p-4 rounded-xl bg-gradient-to-br from-blue-500/10 to-cyan-500/5 border border-blue-500/20">
        <div className="flex items-start gap-3">
          <div className="h-9 w-9 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shrink-0">
            <Eraser className="h-4 w-4 text-blue-400" />
          </div>
          <div>
            <p className="text-sm font-bold text-foreground">AI Background Removal</p>
            <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">Uses a machine-learning model running entirely in your browser. On first use, the model (~15 MB) downloads automatically. No upload required.</p>
          </div>
        </div>
      </div>
      <PresetRow label="Output format" value={operationOptions.remove_bg_format || 'png'}
        onChange={(v) => updateOptions({ remove_bg_format: v, remove_bg_fill: v === 'png' ? undefined : operationOptions.remove_bg_fill })}
        options={[
          { value: 'png', label: 'PNG (transparent)', hint: 'Preserves alpha channel — best for logos and cutouts' },
          { value: 'jpeg', label: 'JPEG + fill', hint: 'Flat background color — smaller file size' },
          { value: 'webp', label: 'WEBP + fill', hint: 'Modern format with optional background' },
        ]}
      />
      {(operationOptions.remove_bg_format === 'jpeg' || operationOptions.remove_bg_format === 'webp') && (
        <div className="space-y-2">
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Background fill color</label>
          <div className="flex items-center gap-3">
            <input type="color" value={operationOptions.remove_bg_fill || '#ffffff'}
              onChange={(e) => updateOptions({ remove_bg_fill: e.target.value })}
              className="h-9 w-14 rounded-lg border border-border cursor-pointer bg-card p-0.5" />
            <div className="flex gap-2">
              {['#ffffff', '#000000', '#f3f4f6', '#dbeafe', '#fef3c7'].map(c => (
                <button key={c} onClick={() => updateOptions({ remove_bg_fill: c })}
                  className="h-7 w-7 rounded-lg border-2 transition-all"
                  style={{ backgroundColor: c, borderColor: operationOptions.remove_bg_fill === c ? '#6366f1' : 'transparent' }} />
              ))}
            </div>
            <span className="text-xs text-muted-foreground font-mono">{operationOptions.remove_bg_fill || '#ffffff'}</span>
          </div>
        </div>
      )}
      <div className="text-xs text-muted-foreground p-3 bg-muted/30 rounded-xl border border-border leading-relaxed">
        <strong className="text-foreground">Tip:</strong> Works best on photos with distinct subjects (people, products, animals). Complex backgrounds with similar colors to the subject may have imperfect edges.
      </div>
    </div>
  );

  const renderPdfCropOptions = () => (
    <div className="space-y-5">
      <div className="p-3 rounded-xl bg-amber-500/5 border border-amber-500/20 text-xs text-amber-400 leading-relaxed">
        PDF coordinates start from the <strong>bottom-left</strong> corner in points (1 pt ≈ 0.353 mm). A standard A4 page is 595 × 842 pts, US Letter is 612 × 792 pts.
      </div>
      <div className="grid grid-cols-2 gap-3">
        <NumberInput label="X (left offset, pt)" value={operationOptions.pdf_crop_x || 0} min={0}
          onChange={(v) => updateOptions({ pdf_crop_x: v })} />
        <NumberInput label="Y (bottom offset, pt)" value={operationOptions.pdf_crop_y || 0} min={0}
          onChange={(v) => updateOptions({ pdf_crop_y: v })} />
        <NumberInput label="Crop width (pt)" value={operationOptions.pdf_crop_w || 595} min={1}
          onChange={(v) => updateOptions({ pdf_crop_w: v })} />
        <NumberInput label="Crop height (pt)" value={operationOptions.pdf_crop_h || 842} min={1}
          onChange={(v) => updateOptions({ pdf_crop_h: v })} />
      </div>
      <PresetRow label="Common page sizes (crop to)" value=""
        onChange={(v) => { const [w, h] = (v as string).split('x').map(Number); updateOptions({ pdf_crop_x: 0, pdf_crop_y: 0, pdf_crop_w: w, pdf_crop_h: h }); }}
        options={[
          { value: '595x842', label: 'A4' }, { value: '612x792', label: 'US Letter' },
          { value: '420x595', label: 'A5' }, { value: '297x420', label: 'A6' },
        ]}
      />
      <PresetRow label="Apply to pages" value={operationOptions.pdf_crop_mode || 'all'}
        onChange={(v) => updateOptions({ pdf_crop_mode: v })}
        options={[ { value: 'all', label: 'All pages' }, { value: 'odd', label: 'Odd pages' }, { value: 'even', label: 'Even pages' }, { value: 'specific', label: 'Specific pages' } ]}
      />
      {operationOptions.pdf_crop_mode === 'specific' && (
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Page numbers</label>
          <input type="text" placeholder="e.g. 1, 3, 5-7"
            value={operationOptions.pdf_crop_pages || ''}
            onChange={(e) => updateOptions({ pdf_crop_pages: e.target.value })}
            className="w-full p-2.5 bg-card border border-border rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
        </div>
      )}
      <InfoBox icon={<Crop className="h-4 w-4 text-primary" />} text="Sets the CropBox on each page — the area outside is hidden but not permanently deleted. Runs client-side." color="bg-primary/5 border-primary/15" />
    </div>
  );

  const renderPdfAnnotateOptions = () => (
    <div className="space-y-4">
      <div className="p-3 rounded-xl bg-primary/5 border border-primary/15 text-xs text-muted-foreground leading-relaxed">
        Add text, cover/redact areas, or replace content on any page. Coordinates are in <strong className="text-foreground">points from the top-left corner</strong> (Y increases downward). A4 = 595 × 842 pt.
      </div>
      <div className="space-y-3">
        {annotations.map((ann, idx) => (
          <AnnotationRow key={ann.id} ann={ann} idx={idx} onChange={updateAnnotation} onRemove={removeAnnotation} />
        ))}
      </div>
      <button onClick={addAnnotation}
        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-dashed border-primary/40 text-primary text-xs font-semibold hover:bg-primary/5 hover:border-primary/60 transition-all">
        <Plus className="h-4 w-4" /> Add annotation
      </button>
      <div className="grid grid-cols-3 gap-2 text-[10px]">
        <div className="p-2 rounded-lg bg-primary/5 border border-primary/15 text-center">
          <Type className="h-3.5 w-3.5 mx-auto mb-1 text-primary" />
          <span className="text-foreground font-semibold block">Add Text</span>
          <span className="text-muted-foreground">Overlay new text on the page</span>
        </div>
        <div className="p-2 rounded-lg bg-destructive/5 border border-destructive/15 text-center">
          <Eraser className="h-3.5 w-3.5 mx-auto mb-1 text-destructive" />
          <span className="text-foreground font-semibold block">Cover/Redact</span>
          <span className="text-muted-foreground">Block out existing content</span>
        </div>
        <div className="p-2 rounded-lg bg-amber-500/5 border border-amber-500/15 text-center">
          <ScanText className="h-3.5 w-3.5 mx-auto mb-1 text-amber-400" />
          <span className="text-foreground font-semibold block">Replace Text</span>
          <span className="text-muted-foreground">Cover + write new text</span>
        </div>
      </div>
    </div>
  );

  const renderCompressOptions = () => {
    if (isImage) return (
      <div className="space-y-6">
        <PresetRow label="Quality preset" value={operationOptions.compress_preset || 'balanced'}
          onChange={(v) => applyCompressPreset(v as string)}
          options={[
            { value: 'small', label: 'Small', hint: '55% quality, 75% scale' },
            { value: 'balanced', label: 'Balanced', hint: '82% quality — recommended' },
            { value: 'high', label: 'High', hint: '92% quality — near lossless' },
            { value: 'lossless', label: 'Lossless', hint: 'No compression (PNG only)' },
            { value: 'custom', label: 'Custom', hint: 'Adjust manually below' },
          ]}
        />
        <Slider id="quality-s" label="Output Quality" unit="%" value={operationOptions.quality || 82} min={10} max={100}
          onChange={(v) => updateOptions({ quality: v, compress_preset: 'custom' })}
          hint="Higher = better quality, larger file. PNG is always lossless."
        />
        <Slider id="scale-s" label="Resize Scale" unit="%" value={Math.round((operationOptions.resize_pct || 1.0) * 100)} min={10} max={100}
          onChange={(v) => updateOptions({ resize_pct: v / 100, compress_preset: 'custom' })}
          hint="Scale down before compressing for extra savings."
        />
        <InfoBox icon={<FileArchive className="h-4 w-4 text-primary" />} text="Runs entirely in your browser — no upload required." color="bg-primary/5 border-primary/15" />
      </div>
    );
    if (isVideo && actionName !== 'compress_audio') return (
      <div className="space-y-5">
        <PresetRow label="Quality preset"
          value={operationOptions.crf <= 20 ? 'high' : operationOptions.crf <= 26 ? 'balanced' : 'small'}
          onChange={(v) => { const m: any = { high: 20, balanced: 26, small: 32 }; if (m[v as string]) updateOptions({ crf: m[v as string] }); }}
          options={[ { value: 'high', label: 'High quality', hint: 'CRF 20' }, { value: 'balanced', label: 'Balanced', hint: 'CRF 26' }, { value: 'small', label: 'Compact', hint: 'CRF 32' } ]}
        />
        <Slider id="crf-s" label="CRF" unit="" value={operationOptions.crf || 28} min={18} max={35}
          onChange={(v) => updateOptions({ crf: v })} hint="Lower = higher quality, larger file." />
        {showAdvanced && <Select id="preset-s" label="Encoder Speed" value={operationOptions.preset || 'medium'}
          options={[ { value: 'ultrafast', label: 'Ultrafast' }, { value: 'fast', label: 'Fast' }, { value: 'medium', label: 'Medium' }, { value: 'slow', label: 'Slow' } ]}
          onChange={(v) => updateOptions({ preset: v })} />}
      </div>
    );
    if (isAudio || actionName === 'compress_audio') return (
      <div className="space-y-5">
        <PresetRow label="Quality preset"
          value={operationOptions.audio_bitrate <= 96 ? 'low' : operationOptions.audio_bitrate <= 128 ? 'balanced' : 'high'}
          onChange={(v) => { const m: any = { low: 64, balanced: 128, high: 192 }; if (m[v as string]) updateOptions({ audio_bitrate: m[v as string] }); }}
          options={[ { value: 'low', label: 'Low', hint: '64–96 kbps' }, { value: 'balanced', label: 'Balanced', hint: '128 kbps' }, { value: 'high', label: 'High', hint: '192+ kbps' } ]}
        />
        <Select id="bitrate-s" label="Target Bitrate" value={operationOptions.audio_bitrate || 128}
          options={[ { value: 64, label: '64 kbps — Smallest' }, { value: 96, label: '96 kbps — Compact' }, { value: 128, label: '128 kbps — Balanced' }, { value: 192, label: '192 kbps — High' }, { value: 320, label: '320 kbps — Near lossless' } ]}
          onChange={(v) => updateOptions({ audio_bitrate: parseInt(v) })}
        />
        <Select id="audio-fmt" label="Output Format" value={operationOptions.audio_format || 'mp3'}
          options={[ { value: 'mp3', label: 'MP3 — Universal' }, { value: 'aac', label: 'AAC — Smaller, modern' }, { value: 'ogg', label: 'OGG — Open-source' } ]}
          onChange={(v) => updateOptions({ audio_format: v })}
        />
      </div>
    );
    if (fileType.includes('officedocument') || fileType.includes('word') || fileType.includes('sheet') || fileType.includes('presentation')) return (
      <div className="space-y-4">
        <PresetRow label="Compression level" value={operationOptions.office_compress_level || 'standard'}
          onChange={(v) => updateOptions({ office_compress_level: v })}
          options={[ { value: 'light', label: 'Light' }, { value: 'standard', label: 'Standard' }, { value: 'aggressive', label: 'Aggressive' } ]}
        />
        <InfoBox icon={<FileArchive className="h-4 w-4 text-primary" />} text="Office files are ZIP containers — higher levels strip more embedded content." />
      </div>
    );
    return <InfoBox icon={<FileArchive className="h-4 w-4 text-primary" />} text="PDF streams, fonts, and embedded objects will be re-compressed to shrink physical file size." color="bg-primary/5 border-primary/15" />;
  };

  const renderEnhanceOptions = () => {
    if (!isImage) return <InfoBox icon={<Sparkles className="h-4 w-4 text-primary" />} text="Document enhancement normalizes formatting and standardizes font weights." />;
    return (
      <div className="space-y-5">
        <PresetRow label="Enhancement preset" value={operationOptions.enhance_preset || 'custom'}
          onChange={(v) => { if (v !== 'custom') applyEnhancePreset(v as string); else updateOptions({ enhance_preset: 'custom' }); }}
          options={[ { value: 'natural', label: 'Natural' }, { value: 'vivid', label: 'Vivid' }, { value: 'sharp', label: 'Ultra Sharp' }, { value: 'clean', label: 'Denoise' }, { value: 'custom', label: 'Custom' } ]}
        />
        {(['brightness', 'contrast', 'sharpness'] as const).map((k) => (
          <Slider key={k} id={`${k}-s`} label={k.charAt(0).toUpperCase() + k.slice(1)} unit="x"
            value={operationOptions[k] || 1.0} min={0.5} max={k === 'sharpness' ? 3.0 : 2.0} step={0.05}
            onChange={(v) => updateOptions({ [k]: v, enhance_preset: 'custom' })}
          />
        ))}
        <div className="flex items-center gap-3 cursor-pointer select-none" onClick={() => updateOptions({ denoise: !operationOptions.denoise, enhance_preset: 'custom' })}>
          <div className={`h-5 w-5 rounded border-2 flex items-center justify-center transition-all ${operationOptions.denoise ? 'bg-primary border-primary' : 'border-border bg-card'}`}>
            {operationOptions.denoise && <svg className="h-3 w-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" /></svg>}
          </div>
          <span className="text-sm font-medium text-foreground">Apply denoising filter</span>
        </div>
      </div>
    );
  };

  const renderSplitOptions = () => (
    <div className="space-y-5">
      <PresetRow label="Split mode" value={operationOptions.split_mode || 'all'}
        onChange={(v) => updateOptions({ split_mode: v })}
        options={[ { value: 'all', label: 'Every page' }, { value: 'every', label: 'Every N pages' }, { value: 'range', label: 'Page range' } ]}
      />
      {operationOptions.split_mode === 'every' && (
        <NumberInput label="Pages per chunk" value={operationOptions.split_every || 1} min={1} onChange={(v) => updateOptions({ split_every: v })} />
      )}
      {operationOptions.split_mode === 'range' && (
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Page ranges</label>
          <input type="text" placeholder="e.g. 1-3, 5, 7-10" value={operationOptions.split_range || ''}
            onChange={(e) => updateOptions({ split_range: e.target.value })}
            className="w-full p-2.5 bg-card border border-border rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/40" />
          <p className="text-[10px] text-muted-foreground">Comma-separated pages or ranges</p>
        </div>
      )}
      <InfoBox icon={<Scissors className="h-4 w-4 text-primary" />} text="Runs entirely in your browser — no upload required." color="bg-primary/5 border-primary/15" />
    </div>
  );

  const renderResizeOptions = () => (
    <div className="space-y-5">
      {naturalDims && (
        <div className="text-xs text-muted-foreground bg-muted/40 border border-border rounded-xl px-3 py-2 flex justify-between">
          <span>Original: <strong className="text-foreground">{naturalDims.width} × {naturalDims.height}px</strong></span>
          <span>{(rawFiles[0]?.size / 1024).toFixed(0)} KB</span>
        </div>
      )}
      <PresetRow label="Common sizes" value=""
        onChange={(v) => { const [w, h] = (v as string).split('x').map(Number); updateOptions({ resize_width: w, resize_height: h, resize_lock_aspect: false }); }}
        options={[ { value: '1920x1080', label: '1080p' }, { value: '1280x720', label: '720p' }, { value: '800x600', label: '800×600' }, { value: '512x512', label: '512²' }, { value: '256x256', label: '256²' } ]}
      />
      <div className="grid grid-cols-2 gap-3">
        <NumberInput label="Width (px)" value={operationOptions.resize_width || 800} min={1} max={8000} onChange={handleResizeWidth} />
        <NumberInput label="Height (px)" value={operationOptions.resize_height || 600} min={1} max={8000} onChange={handleResizeHeight} />
      </div>
      <button onClick={() => updateOptions({ resize_lock_aspect: !operationOptions.resize_lock_aspect })}
        className={`flex items-center gap-2 text-xs font-semibold px-3 py-2 rounded-xl border transition-all ${operationOptions.resize_lock_aspect ? 'bg-primary/10 border-primary/30 text-primary' : 'bg-card border-border text-muted-foreground hover:border-primary/30'}`}>
        {operationOptions.resize_lock_aspect ? <Lock className="h-3.5 w-3.5" /> : <Unlock className="h-3.5 w-3.5" />}
        {operationOptions.resize_lock_aspect ? 'Aspect ratio locked' : 'Lock aspect ratio'}
      </button>
      <Select id="resize-fmt" label="Output Format" value={operationOptions.resize_format || 'png'}
        options={[ { value: 'png', label: 'PNG — Lossless' }, { value: 'jpeg', label: 'JPEG — Smaller' }, { value: 'webp', label: 'WEBP — Modern' } ]}
        onChange={(v) => updateOptions({ resize_format: v })} />
    </div>
  );

  const renderPdfRotateOptions = () => (
    <div className="space-y-5">
      <PresetRow label="Rotation amount" value={operationOptions.rotate_deg || 90}
        onChange={(v) => updateOptions({ rotate_deg: v })}
        options={[ { value: 90, label: '90° clockwise' }, { value: 180, label: '180°' }, { value: 270, label: '90° counter-CW' } ]}
      />
      <PresetRow label="Apply to pages" value={operationOptions.rotate_pages_mode || 'all'}
        onChange={(v) => updateOptions({ rotate_pages_mode: v })}
        options={[ { value: 'all', label: 'All pages' }, { value: 'odd', label: 'Odd pages' }, { value: 'even', label: 'Even pages' }, { value: 'specific', label: 'Specific pages' } ]}
      />
      {operationOptions.rotate_pages_mode === 'specific' && (
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Page numbers</label>
          <input type="text" placeholder="e.g. 1, 3, 5-7" value={operationOptions.rotate_pages_input || ''}
            onChange={(e) => updateOptions({ rotate_pages_input: e.target.value, rotate_pages_list: parsePageList(e.target.value) })}
            className="w-full p-2.5 bg-card border border-border rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/40" />
        </div>
      )}
      <InfoBox icon={<RotateCw className="h-4 w-4 text-primary" />} text="Page rotation is applied non-destructively. Runs client-side." color="bg-primary/5 border-primary/15" />
    </div>
  );

  const renderPdfDeleteOptions = () => (
    <div className="space-y-5">
      <div className="space-y-1.5">
        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Pages to delete</label>
        <input type="text" placeholder="e.g. 1, 3, 5-8" value={operationOptions.delete_pages || ''}
          onChange={(e) => updateOptions({ delete_pages: e.target.value })}
          className="w-full p-2.5 bg-card border border-border rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/40" />
        <p className="text-[10px] text-muted-foreground">Comma-separated page numbers or ranges. Remaining pages keep their order.</p>
      </div>
      <InfoBox icon={<Trash2 className="h-4 w-4 text-destructive" />} text="Specified pages will be permanently removed from the output PDF." color="bg-destructive/5 border-destructive/15" />
    </div>
  );

  const renderPdfWatermarkOptions = () => (
    <div className="space-y-5">
      <div className="space-y-1.5">
        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Watermark text</label>
        <input type="text" placeholder="e.g. CONFIDENTIAL, DRAFT, © 2025" value={operationOptions.watermark_text || ''}
          onChange={(e) => updateOptions({ watermark_text: e.target.value })}
          className="w-full p-2.5 bg-card border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" />
      </div>
      <PresetRow label="Position" value={operationOptions.watermark_position || 'diagonal'}
        onChange={(v) => updateOptions({ watermark_position: v })}
        options={[ { value: 'diagonal', label: 'Diagonal' }, { value: 'center', label: 'Center' }, { value: 'bottom', label: 'Footer' }, { value: 'top', label: 'Header' } ]}
      />
      <Slider id="wm-size" label="Font Size" unit="pt" value={operationOptions.watermark_size || 52} min={16} max={120} onChange={(v) => updateOptions({ watermark_size: v })} />
      <Slider id="wm-opacity" label="Opacity" unit="%" value={operationOptions.watermark_opacity || 18} min={5} max={80} onChange={(v) => updateOptions({ watermark_opacity: v })} hint="Lower opacity = more transparent." />
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Text color</label>
          <div className="flex items-center gap-2">
            <input type="color" value={operationOptions.watermark_color || '#888888'}
              onChange={(e) => updateOptions({ watermark_color: e.target.value })}
              className="h-9 w-12 rounded-lg border border-border cursor-pointer bg-card p-0.5" />
            <span className="text-xs text-muted-foreground font-mono">{operationOptions.watermark_color || '#888888'}</span>
          </div>
        </div>
        {operationOptions.watermark_position === 'diagonal' && (
          <NumberInput label="Rotation (°)" value={operationOptions.watermark_rotation ?? -45} min={-90} max={90} onChange={(v) => updateOptions({ watermark_rotation: v })} />
        )}
      </div>
    </div>
  );

  const renderPdfPageNumbersOptions = () => (
    <div className="space-y-5">
      <PresetRow label="Position" value={operationOptions.page_num_position || 'bottom-center'}
        onChange={(v) => updateOptions({ page_num_position: v })}
        options={[ { value: 'bottom-center', label: 'Bottom center' }, { value: 'bottom-right', label: 'Bottom right' }, { value: 'bottom-left', label: 'Bottom left' }, { value: 'top-center', label: 'Top center' } ]}
      />
      <div className="grid grid-cols-3 gap-3">
        <NumberInput label="Start from" value={operationOptions.page_num_start || 1} min={0} onChange={(v) => updateOptions({ page_num_start: v })} />
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Prefix</label>
          <input type="text" placeholder="Page " value={operationOptions.page_num_prefix || ''}
            onChange={(e) => updateOptions({ page_num_prefix: e.target.value })}
            className="w-full p-2.5 bg-card border border-border rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/40" />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Suffix</label>
          <input type="text" placeholder=" of N" value={operationOptions.page_num_suffix || ''}
            onChange={(e) => updateOptions({ page_num_suffix: e.target.value })}
            className="w-full p-2.5 bg-card border border-border rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/40" />
        </div>
      </div>
      <div className="p-3 bg-muted/30 rounded-xl border border-border text-xs text-muted-foreground">
        Preview: <span className="font-mono text-foreground">{operationOptions.page_num_prefix || ''}{operationOptions.page_num_start || 1}{operationOptions.page_num_suffix || ''}</span>
      </div>
    </div>
  );

  const renderPdfReorderOptions = () => (
    <div className="space-y-5">
      <div className="space-y-1.5">
        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">New page order</label>
        <input type="text" placeholder="e.g. 3, 1, 2, 4, 5" value={operationOptions.reorder_pages || ''}
          onChange={(e) => updateOptions({ reorder_pages: e.target.value })}
          className="w-full p-2.5 bg-card border border-border rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/40" />
        <p className="text-[10px] text-muted-foreground">Enter all page numbers in the desired order. Pages not listed will be omitted.</p>
      </div>
    </div>
  );

  const renderImageCropOptions = () => (
    <div className="space-y-5">
      {naturalDims && (
        <div className="text-xs text-muted-foreground bg-muted/40 border border-border rounded-xl px-3 py-2">
          Original: <strong className="text-foreground">{naturalDims.width} × {naturalDims.height}px</strong>
        </div>
      )}
      <PresetRow label="Aspect ratio preset" value=""
        onChange={(v) => {
          if (!naturalDims) return;
          const [rw, rh] = (v as string).split(':').map(Number);
          const maxW = naturalDims.width; const maxH = naturalDims.height;
          let w = maxW, h = Math.round(maxW * rh / rw);
          if (h > maxH) { h = maxH; w = Math.round(maxH * rw / rh); }
          updateOptions({ crop_x: Math.round((maxW - w) / 2), crop_y: Math.round((maxH - h) / 2), crop_width: w, crop_height: h });
        }}
        options={[ { value: '1:1', label: '1:1 Square' }, { value: '16:9', label: '16:9' }, { value: '4:3', label: '4:3' }, { value: '3:2', label: '3:2' }, { value: '2:3', label: '2:3 Portrait' } ]}
      />
      <div className="grid grid-cols-2 gap-3">
        <NumberInput label="X offset (px)" value={operationOptions.crop_x || 0} min={0} max={naturalDims?.width} onChange={(v) => updateOptions({ crop_x: v })} />
        <NumberInput label="Y offset (px)" value={operationOptions.crop_y || 0} min={0} max={naturalDims?.height} onChange={(v) => updateOptions({ crop_y: v })} />
        <NumberInput label="Crop width (px)" value={operationOptions.crop_width || naturalDims?.width || 800} min={1} max={naturalDims?.width} onChange={(v) => updateOptions({ crop_width: v })} />
        <NumberInput label="Crop height (px)" value={operationOptions.crop_height || naturalDims?.height || 600} min={1} max={naturalDims?.height} onChange={(v) => updateOptions({ crop_height: v })} />
      </div>
    </div>
  );

  const renderImageRotateOptions = () => (
    <div className="space-y-5">
      <div className="space-y-2">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Rotation</span>
        <div className="flex gap-2 flex-wrap">
          {[{ deg: 90, label: '90° CW' }, { deg: 180, label: '180°' }, { deg: 270, label: '90° CCW' }].map(({ deg, label }) => (
            <button key={deg} onClick={() => updateOptions({ rotate_deg: deg })}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-semibold transition-all ${operationOptions.rotate_deg === deg ? 'bg-primary text-primary-foreground border-primary' : 'bg-card border-border text-muted-foreground hover:border-primary/40'}`}>
              <RotateCw className={`h-3.5 w-3.5 ${deg === 270 ? 'scale-x-[-1]' : ''}`} />{label}
            </button>
          ))}
        </div>
      </div>
      <div className="space-y-2">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Flip</span>
        <div className="flex gap-2">
          <button onClick={() => updateOptions({ flip_h: !operationOptions.flip_h })}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-semibold transition-all ${operationOptions.flip_h ? 'bg-primary text-primary-foreground border-primary' : 'bg-card border-border text-muted-foreground hover:border-primary/40'}`}>
            <FlipHorizontal className="h-3.5 w-3.5" /> Flip Horizontal
          </button>
          <button onClick={() => updateOptions({ flip_v: !operationOptions.flip_v })}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-semibold transition-all ${operationOptions.flip_v ? 'bg-primary text-primary-foreground border-primary' : 'bg-card border-border text-muted-foreground hover:border-primary/40'}`}>
            <FlipVertical className="h-3.5 w-3.5" /> Flip Vertical
          </button>
        </div>
      </div>
    </div>
  );

  const renderImageWatermarkOptions = () => (
    <div className="space-y-5">
      <div className="space-y-1.5">
        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Watermark text</label>
        <input type="text" placeholder="e.g. © 2025 My Brand, CONFIDENTIAL" value={operationOptions.img_watermark_text || ''}
          onChange={(e) => updateOptions({ img_watermark_text: e.target.value })}
          className="w-full p-2.5 bg-card border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" />
      </div>
      <PresetRow label="Position" value={operationOptions.img_wm_position || 'diagonal'}
        onChange={(v) => updateOptions({ img_wm_position: v })}
        options={[ { value: 'diagonal', label: 'Diagonal' }, { value: 'center', label: 'Center' }, { value: 'bottom-right', label: 'Bottom right' }, { value: 'bottom-left', label: 'Bottom left' }, { value: 'bottom-center', label: 'Bottom center' }, { value: 'top-right', label: 'Top right' } ]}
      />
      <Slider id="img-wm-opacity" label="Opacity" unit="%" value={operationOptions.img_wm_opacity || 45} min={5} max={100}
        onChange={(v) => updateOptions({ img_wm_opacity: v })} hint="Lower = more transparent." />
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Text color</label>
          <div className="flex items-center gap-2">
            <input type="color" value={operationOptions.img_wm_color || '#ffffff'}
              onChange={(e) => updateOptions({ img_wm_color: e.target.value })}
              className="h-9 w-12 rounded-lg border border-border cursor-pointer bg-card p-0.5" />
            <span className="text-xs text-muted-foreground font-mono">{operationOptions.img_wm_color || '#ffffff'}</span>
          </div>
        </div>
        <NumberInput label="Font size (px)" value={operationOptions.img_wm_size || 0} min={0} max={300} placeholder="Auto" onChange={(v) => updateOptions({ img_wm_size: v || undefined })} />
      </div>
      <button onClick={() => updateOptions({ img_wm_tile: !operationOptions.img_wm_tile })}
        className={`flex items-center gap-2 text-xs font-semibold px-3 py-2 rounded-xl border transition-all w-full ${operationOptions.img_wm_tile ? 'bg-primary/10 border-primary/30 text-primary' : 'bg-card border-border text-muted-foreground hover:border-primary/30'}`}>
        <PenTool className="h-3.5 w-3.5" />
        {operationOptions.img_wm_tile ? 'Tiled repeat: ON' : 'Tiled repeat: OFF (single stamp)'}
      </button>
    </div>
  );

  const renderConvertOptions = () => {
    if (actionName === 'images_to_pdf') return <InfoBox icon={<Image className="h-4 w-4 text-primary" />} text={`${files.length} image${files.length !== 1 ? 's' : ''} will be packed into a PDF in upload order.`} color="bg-primary/5 border-primary/15" />;
    if (actionName === 'to_ico') {
      const sel: number[] = operationOptions.ico_sizes || [16, 32, 48, 64];
      const toggle = (s: number) => { const cur = operationOptions.ico_sizes || [16, 32, 48, 64]; const next = cur.includes(s) ? cur.filter((x: number) => x !== s) : [...cur, s].sort((a: number, b: number) => a - b); if (next.length) updateOptions({ ico_sizes: next }); };
      return (
        <div className="space-y-5">
          <div className="space-y-2">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Include sizes</span>
            <div className="flex gap-2 flex-wrap">
              {[16, 24, 32, 48, 64, 128, 256].map((s) => (
                <button key={s} onClick={() => toggle(s)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${sel.includes(s) ? 'bg-primary text-primary-foreground border-primary' : 'bg-card text-muted-foreground border-border hover:border-primary/40'}`}>
                  {s}px
                </button>
              ))}
            </div>
          </div>
        </div>
      );
    }
    if (actionName === 'svg_to_png') return (
      <div className="space-y-5">
        <PresetRow label="Output resolution" value={`${operationOptions.svg_width || 512}x${operationOptions.svg_height || 512}`}
          onChange={(v) => { const [w, h] = (v as string).split('x').map(Number); updateOptions({ svg_width: w, svg_height: h }); }}
          options={[ { value: '256x256', label: '256²' }, { value: '512x512', label: '512²' }, { value: '1024x1024', label: '1024²' }, { value: '1920x1080', label: '1080p' } ]}
        />
        <div className="grid grid-cols-2 gap-3">
          <NumberInput label="Width (px)" value={operationOptions.svg_width || 512} min={1} max={4096} onChange={(v) => updateOptions({ svg_width: v })} />
          <NumberInput label="Height (px)" value={operationOptions.svg_height || 512} min={1} max={4096} onChange={(v) => updateOptions({ svg_height: v })} />
        </div>
      </div>
    );
    if (isImage && (actionName === 'convert_format' || actionName === 'convert')) return (
      <div className="space-y-5">
        <PresetRow label="Target format" value={operationOptions.target_format || 'webp'}
          onChange={(v) => updateOptions({ target_format: v })}
          options={[ { value: 'webp', label: 'WEBP' }, { value: 'png', label: 'PNG' }, { value: 'jpeg', label: 'JPEG' } ]}
        />
        <Slider id="fmt-quality" label="Output Quality" unit="%" value={operationOptions.quality || 92} min={10} max={100}
          onChange={(v) => updateOptions({ quality: v })} hint="Only applies to JPEG and WEBP." />
      </div>
    );
    const msgs: Record<string, string> = {
      pdf_to_docx: 'PDF will be parsed into an editable DOCX.', pdf_to_pptx: 'Each PDF page becomes a slide in the exported PPTX.',
      docx_to_pdf: 'Word document rendered into a high-quality paginated PDF.', pptx_to_pdf: 'Each PowerPoint slide becomes a PDF page.',
      xlsx_to_csv: 'Spreadsheet cells exported as comma-separated rows.', csv_to_xlsx: 'CSV imported into a formatted Excel workbook.',
      md_to_html: 'Markdown compiled into a styled HTML page.', html_to_md: 'HTML structure converted into clean Markdown.',
    };
    if (msgs[actionName]) return <InfoBox icon={<ArrowLeftRight className="h-4 w-4 text-primary" />} text={msgs[actionName]} />;
    if (actionName === 'pdf_to_images') return (
      <div className="space-y-4">
        <Select id="dpi-sel" label="Output Resolution" value={operationOptions.dpi || 150}
          options={[ { value: 72, label: '72 DPI — Screen' }, { value: 150, label: '150 DPI — Standard' }, { value: 300, label: '300 DPI — Print' } ]}
          onChange={(v) => updateOptions({ dpi: parseInt(v) })} />
      </div>
    );
    if (actionName === 'video_to_audio') return (
      <Select id="audio-fmt-ex" label="Audio Format" value={operationOptions.audio_format || 'mp3'}
        options={[ { value: 'mp3', label: 'MP3 — Universal' }, { value: 'aac', label: 'AAC — Higher quality' }, { value: 'wav', label: 'WAV — Lossless' } ]}
        onChange={(v) => updateOptions({ audio_format: v })} />
    );
    if (actionName === 'video_to_gif') return (
      <div className="space-y-5">
        <div className="grid grid-cols-2 gap-3">
          <NumberInput label="Start (seconds)" value={operationOptions.start_time || 0} min={0} onChange={(v) => updateOptions({ start_time: v })} />
          <NumberInput label="End (seconds)" value={operationOptions.end_time || 5} min={1} onChange={(v) => updateOptions({ end_time: v })} />
        </div>
        <Slider id="gif-fps" label="Frame Rate" unit=" fps" value={operationOptions.gif_fps || 10} min={5} max={30} onChange={(v) => updateOptions({ gif_fps: v })} />
      </div>
    );
    return <InfoBox icon={<RefreshCw className="h-4 w-4 text-primary" />} text="Convert file to the selected destination format." />;
  };

  const renderEditOptions = () => {
    if (actionName === 'pdf_crop')         return renderPdfCropOptions();
    if (actionName === 'pdf_annotate')     return renderPdfAnnotateOptions();
    if (actionName === 'pdf_rotate')       return renderPdfRotateOptions();
    if (actionName === 'pdf_delete')       return renderPdfDeleteOptions();
    if (actionName === 'pdf_watermark')    return renderPdfWatermarkOptions();
    if (actionName === 'pdf_page_numbers') return renderPdfPageNumbersOptions();
    if (actionName === 'pdf_reorder')      return renderPdfReorderOptions();
    if (actionName === 'remove_bg')        return renderRemoveBgOptions();
    if (actionName === 'image_crop')       return renderImageCropOptions();
    if (actionName === 'image_rotate')     return renderImageRotateOptions();
    if (actionName === 'image_watermark')  return renderImageWatermarkOptions();
    if (actionName === 'trim' && isVideo) return (
      <div className="space-y-5">
        <div className="grid grid-cols-2 gap-3">
          <NumberInput label="Start (seconds)" value={operationOptions.start_time || 0} min={0} onChange={(v) => updateOptions({ start_time: v })} />
          <NumberInput label="End (seconds)" value={operationOptions.end_time || 10} min={1} onChange={(v) => updateOptions({ end_time: v })} />
        </div>
      </div>
    );
    if (actionName === 'docx_cleanup') return <InfoBox icon={<Sliders className="h-4 w-4 text-primary" />} text="Clears duplicate blank paragraphs, aligns margins, and normalizes font weights." />;
    return null;
  };

  const renderOptions = () => {
    switch (selectedOperation) {
      case 'compress': return renderCompressOptions();
      case 'enhance':  return renderEnhanceOptions();
      case 'convert':  return renderConvertOptions();
      case 'edit':     return renderEditOptions();
      case 'split':    return renderSplitOptions();
      case 'resize':   return renderResizeOptions();
      case 'merge':    return <InfoBox icon={<FileText className="h-4 w-4 text-primary" />} text="Files will be merged in upload order." color="bg-primary/5 border-primary/15" />;
      default: return null;
    }
  };

  const actionLabels: Record<string, string> = {
    pdf_crop: 'Crop PDF Pages', pdf_annotate: 'Edit PDF',
    pdf_rotate: 'Rotate Pages', pdf_delete: 'Delete Pages', pdf_watermark: 'Add Watermark',
    pdf_page_numbers: 'Add Page Numbers', pdf_reorder: 'Reorder Pages',
    remove_bg: 'Remove Background', image_crop: 'Crop Image', image_rotate: 'Rotate & Flip', image_watermark: 'Add Watermark',
  };
  const operationLabels: Record<string, string> = {
    compress: 'Compress', enhance: 'Enhance', convert: 'Convert', resize: 'Resize', edit: 'Edit', split: 'Split PDF', merge: 'Merge PDFs',
  };

  const panelTitle = actionLabels[actionName] || operationLabels[selectedOperation] || 'Operation';

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className="w-full max-w-2xl mx-auto">
      <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-premium">
        <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-gradient-to-r from-primary/5 to-transparent">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
              <Sliders className="h-[18px] w-[18px] text-primary" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-foreground">{panelTitle} Settings</h2>
              <p className="text-[11px] text-muted-foreground">Configure processing parameters</p>
            </div>
          </div>
          {selectedOperation === 'compress' && isVideo && (
            <button onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex items-center gap-1.5 px-2.5 py-1 bg-secondary border border-border text-secondary-foreground rounded-lg text-xs font-semibold hover:bg-muted transition-all">
              <Settings2 className="h-3 w-3" />{showAdvanced ? 'Simple' : 'Advanced'}
            </button>
          )}
        </div>
        <div className="px-6 py-5">{renderOptions()}</div>
        <div className="px-6 pb-6">
          <button onClick={handleStartProcess} disabled={isProcessing}
            className="w-full relative overflow-hidden flex items-center justify-center gap-2.5 py-3.5 rounded-xl font-bold text-sm transition-all focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-60 disabled:cursor-not-allowed"
            style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: 'white' }}>
            <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full hover:translate-x-full transition-transform duration-700" />
            {isProcessing
              ? <><Loader2 className="h-4 w-4 animate-spin" /><span>Processing…</span></>
              : <><Play className="h-4 w-4 fill-current" /><span>Process {files.length > 1 ? `${files.length} files` : 'file'}</span></>
            }
          </button>
        </div>
      </div>
    </motion.div>
  );
};

export default OptionsPanel;
