import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Sliders, RefreshCw, Play, Loader2, Sparkles, FileText,
  Scissors, Music, FileArchive, Image, ImageIcon, ArrowLeftRight, FileCode, Maximize2,
  MonitorSmartphone, Globe, Lock, Unlock, RotateCw, Trash2, Stamp, Hash,
  AlignJustify, Crop, FlipHorizontal, PenTool, FlipVertical, Eraser,
  Plus, Minus, ChevronDown, ChevronUp, ScanText, Type, Camera, X,
  ShieldCheck, PenLine, BookOpen, ScanLine, GitCompareArrows,
  BrainCircuit, Languages, FileSpreadsheet, FileCheck2, Settings2
} from 'lucide-react';
import { useFileStore } from '@/store/useFileStore';
import { apiClient, apiMock } from '@/lib/api';
import {
  runClientSidePdfMerge, runClientSidePdfCompress, runClientSidePdfSplit,
  runClientSideImagesToPdf, runClientSidePdfRotate, runClientSidePdfDeletePages,
  runClientSidePdfWatermark, runClientSidePdfPageNumbers, runClientSidePdfReorder,
  runClientSidePdfCrop, runClientSidePdfAnnotate, runClientSidePdfUnlock,
  runClientSidePdfRedact, runClientSidePdfSign, runClientSidePdfFlattenForm,
  runClientSidePdfInsertLinks, runClientSidePdfInsertImages, runClientSidePdfInsertShapes,
  PdfAnnotation, RedactArea, PdfLink, PdfImageInsert, PdfShape,
} from '@/lib/processing/pdf/client-pdf';
import {
  compressImage, resizeImage, convertToIco, convertSvgToPng, convertImageFormat,
  getImageDimensions, cropImage, rotateFlipImage, addImageWatermark, removeImageBackground
} from '@/lib/processing/image/client-image';
import { runClientSideHtmlToZip, runClientSideInlineHtml } from '@/lib/processing/archive/client-archive';

// ── Shared primitives ───────────────────────────────────────────────────────

const InfoBox: React.FC<{ icon: React.ReactNode; text: string; color?: string }> = ({ icon, text, color = 'bg-muted/40 border-border' }) => (
  <div className={`p-4 rounded-xl border text-sm text-muted-foreground flex items-start gap-3 ${color}`}>
    <span className="shrink-0 mt-0.5">{icon}</span>
    <span className="leading-relaxed">{text}</span>
  </div>
);

const SliderField: React.FC<{
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
          className="absolute inset-0 w-full opacity-0 cursor-pointer" />
        <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 h-4 w-4 rounded-full bg-white border-2 border-primary shadow-md pointer-events-none transition-all duration-150" style={{ left: `${pct}%` }} />
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
            value === opt.value ? 'bg-primary text-primary-foreground border-primary shadow-glow' : 'bg-card text-muted-foreground border-border hover:border-primary/50 hover:text-foreground'
          }`}>{opt.label}</button>
      ))}
    </div>
  </div>
);

const SelectField: React.FC<{
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

const NumInput: React.FC<{
  label: string; value: number; min?: number; max?: number;
  onChange: (v: number) => void; placeholder?: string;
}> = ({ label, value, min = 0, max, onChange, placeholder }) => (
  <div className="space-y-1.5">
    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{label}</label>
    <input type="number" min={min} max={max} value={value || ''} placeholder={placeholder || String(min)}
      onChange={(e) => onChange(Math.max(min, parseInt(e.target.value) || min))}
      className="w-full p-2.5 bg-card border border-border rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/40" />
  </div>
);

const TextField: React.FC<{
  label: string; value: string; placeholder?: string; onChange: (v: string) => void;
  mono?: boolean; hint?: string;
}> = ({ label, value, placeholder, onChange, mono, hint }) => (
  <div className="space-y-1.5">
    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{label}</label>
    <input type="text" placeholder={placeholder} value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`w-full p-2.5 bg-card border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 ${mono ? 'font-mono' : ''}`} />
    {hint && <p className="text-[10px] text-muted-foreground">{hint}</p>}
  </div>
);

const ColorField: React.FC<{ label: string; value: string; onChange: (v: string) => void; swatches?: string[] }> = ({
  label, value, onChange, swatches = ['#000000', '#ffffff', '#888888', '#1a1a8c', '#cc0000']
}) => (
  <div className="space-y-2">
    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{label}</label>
    <div className="flex items-center gap-2 flex-wrap">
      <input type="color" value={value} onChange={(e) => onChange(e.target.value)}
        className="h-9 w-12 rounded-lg border border-border cursor-pointer bg-card p-0.5" />
      {swatches.map(c => (
        <button key={c} onClick={() => onChange(c)} title={c}
          className="h-7 w-7 rounded-lg border-2 transition-all hover:scale-110"
          style={{ backgroundColor: c, borderColor: value === c ? '#6366f1' : 'rgba(255,255,255,0.1)' }} />
      ))}
      <span className="text-xs text-muted-foreground font-mono">{value}</span>
    </div>
  </div>
);

// ── Annotation row ──────────────────────────────────────────────────────────
interface AnnotationRowProps {
  ann: PdfAnnotation & { id: string }; idx: number;
  onChange: (id: string, patch: Partial<PdfAnnotation>) => void; onRemove: (id: string) => void;
}
const AnnotationRow: React.FC<AnnotationRowProps> = ({ ann, idx, onChange, onRemove }) => {
  const [expanded, setExpanded] = useState(idx === 0);
  const typeLabels: Record<string, string> = { text: 'Add Text', cover: 'Cover/Redact Area', replace: 'Replace Text' };
  return (
    <div className="border border-border rounded-xl overflow-hidden">
      <button className="w-full flex items-center justify-between px-3 py-2.5 bg-muted/30 hover:bg-muted/50 transition-colors text-left" onClick={() => setExpanded(!expanded)}>
        <div className="flex items-center gap-2">
          <span className={`h-5 w-5 rounded-full text-[10px] font-bold flex items-center justify-center ${ann.type === 'cover' ? 'bg-destructive/20 text-destructive' : ann.type === 'replace' ? 'bg-amber-500/20 text-amber-400' : 'bg-primary/20 text-primary'}`}>{idx + 1}</span>
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
            <TextField label="Text content" value={ann.text || ''} placeholder="Enter text to add…" onChange={(v) => onChange(ann.id, { text: v })} />
          )}
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Page #</label>
              <input type="number" min={1} value={ann.page} onChange={(e) => onChange(ann.id, { page: Math.max(1, parseInt(e.target.value) || 1) })}
                className="w-full p-2 bg-card border border-border rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/40" />
            </div>
            {(ann.type === 'text' || ann.type === 'replace') && (
              <div className="space-y-1">
                <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Font size</label>
                <input type="number" min={6} max={120} value={ann.fontSize || 12} onChange={(e) => onChange(ann.id, { fontSize: parseInt(e.target.value) || 12 })}
                  className="w-full p-2 bg-card border border-border rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/40" />
              </div>
            )}
          </div>
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Position &amp; Size (points from top-left)</p>
          <div className="grid grid-cols-4 gap-2">
            {([['X', 'x'], ['Y (top)', 'y'], ['Width', 'width'], ['Height', 'height']] as [string, keyof PdfAnnotation][]).map(([lbl, key]) => (
              <div key={key} className="space-y-1">
                <label className="text-[9px] text-muted-foreground">{lbl}</label>
                <input type="number" min={0} value={(ann as any)[key] || 0} onChange={(e) => onChange(ann.id, { [key]: parseInt(e.target.value) || 0 })}
                  className="w-full p-1.5 bg-card border border-border rounded-md text-xs font-mono focus:outline-none focus:ring-1 focus:ring-primary/40" />
              </div>
            ))}
          </div>
          <div className="flex gap-2 items-center flex-wrap">
            {(ann.type === 'text' || ann.type === 'replace') && (
              <ColorField label="Text color" value={ann.colorHex || '#000000'} onChange={(v) => onChange(ann.id, { colorHex: v })} swatches={['#000000', '#1a1a8c', '#cc0000', '#007700', '#888888']} />
            )}
            {(ann.type === 'cover' || ann.type === 'replace') && (
              <div className="flex items-center gap-2 mt-1">
                <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Fill color</label>
                <input type="color" value={ann.fillColorHex || '#ffffff'} onChange={(e) => onChange(ann.id, { fillColorHex: e.target.value })}
                  className="h-7 w-10 rounded border border-border cursor-pointer bg-card p-0.5" />
              </div>
            )}
            {(ann.type === 'text' || ann.type === 'replace') && (
              <>
                <button onClick={() => onChange(ann.id, { bold: !ann.bold })} className={`px-2 py-1 rounded-md text-xs font-bold border transition-all ${ann.bold ? 'bg-primary text-primary-foreground border-primary' : 'bg-card border-border text-muted-foreground hover:border-primary/40'}`}>B</button>
                <button onClick={() => onChange(ann.id, { italic: !ann.italic })} className={`px-2 py-1 rounded-md text-xs italic border transition-all ${ann.italic ? 'bg-primary text-primary-foreground border-primary' : 'bg-card border-border text-muted-foreground hover:border-primary/40'}`}>I</button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// ── Redact area row ─────────────────────────────────────────────────────────
interface RedactRowProps {
  area: RedactArea & { id: string }; idx: number;
  onChange: (id: string, patch: Partial<RedactArea>) => void; onRemove: (id: string) => void;
}
const RedactRow: React.FC<RedactRowProps> = ({ area, idx, onChange, onRemove }) => (
  <div className="border border-border rounded-xl p-3 space-y-3 bg-card/50">
    <div className="flex items-center justify-between">
      <span className="text-xs font-bold text-foreground">Redact Area {idx + 1}</span>
      <button onClick={() => onRemove(area.id)} className="h-6 w-6 rounded-md bg-destructive/10 text-destructive flex items-center justify-center hover:bg-destructive/20 transition-colors">
        <Minus className="h-3 w-3" />
      </button>
    </div>
    <div className="grid grid-cols-2 gap-2">
      <div className="space-y-1">
        <label className="text-[10px] text-muted-foreground">Page #</label>
        <input type="number" min={1} value={area.page} onChange={(e) => onChange(area.id, { page: Math.max(1, parseInt(e.target.value) || 1) })}
          className="w-full p-2 bg-card border border-border rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/40" />
      </div>
      <div className="flex items-center gap-2 pt-5">
        <label className="text-[10px] text-muted-foreground shrink-0">Fill</label>
        <input type="color" value={area.colorHex || '#000000'} onChange={(e) => onChange(area.id, { colorHex: e.target.value })}
          className="h-8 w-12 rounded border border-border cursor-pointer bg-card p-0.5" />
        <div className="flex gap-1.5">
          {['#000000', '#ffffff', '#1a1a8c'].map(c => (
            <button key={c} onClick={() => onChange(area.id, { colorHex: c })}
              className="h-6 w-6 rounded border-2 hover:scale-110 transition-transform"
              style={{ backgroundColor: c, borderColor: area.colorHex === c ? '#6366f1' : 'transparent' }} />
          ))}
        </div>
      </div>
    </div>
    <div className="grid grid-cols-4 gap-2">
      {([['X', 'x'], ['Y (top)', 'y'], ['W', 'width'], ['H', 'height']] as [string, keyof RedactArea][]).map(([lbl, key]) => (
        <div key={key} className="space-y-1">
          <label className="text-[9px] text-muted-foreground">{lbl}</label>
          <input type="number" min={0} value={(area as any)[key] || 0} onChange={(e) => onChange(area.id, { [key]: parseInt(e.target.value) || 0 })}
            className="w-full p-1.5 bg-card border border-border rounded-md text-xs font-mono focus:outline-none focus:ring-1 focus:ring-primary/40" />
        </div>
      ))}
    </div>
  </div>
);

// ── Scan-to-PDF camera panel ─────────────────────────────────────────────────
const ScanToPdfPanel: React.FC<{ onCapture: (file: File) => void }> = ({ onCapture }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [state, setState] = useState<'idle' | 'active' | 'captured' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [capturedUrl, setCapturedUrl] = useState<string | null>(null);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      streamRef.current = stream;
      if (videoRef.current) { videoRef.current.srcObject = stream; await videoRef.current.play(); }
      setState('active');
    } catch (e: any) {
      setErrorMsg(e.message || 'Camera permission denied.');
      setState('error');
    }
  };

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
  }, []);

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const v = videoRef.current;
    const c = canvasRef.current;
    c.width = v.videoWidth; c.height = v.videoHeight;
    c.getContext('2d')!.drawImage(v, 0, 0);
    stopCamera();
    c.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      setCapturedUrl(url);
      setState('captured');
      const file = new File([blob], `scan-${Date.now()}.jpg`, { type: 'image/jpeg' });
      onCapture(file);
    }, 'image/jpeg', 0.93);
  };

  const retake = () => { setCapturedUrl(null); setState('idle'); };

  useEffect(() => () => { stopCamera(); if (capturedUrl) URL.revokeObjectURL(capturedUrl); }, [stopCamera, capturedUrl]);

  return (
    <div className="space-y-4">
      <div className="p-3 rounded-xl bg-primary/5 border border-primary/15 text-xs text-muted-foreground leading-relaxed">
        <Camera className="h-3.5 w-3.5 inline mr-1.5 text-primary" />
        Opens your device camera, captures a photo, and converts it to a PDF — entirely on your device.
      </div>

      <div className="rounded-xl overflow-hidden bg-black border border-border aspect-video relative">
        {state === 'idle' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
            <Camera className="h-10 w-10 text-muted-foreground/40" />
            <p className="text-xs text-muted-foreground">Camera preview will appear here</p>
          </div>
        )}
        {state === 'error' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-4">
            <p className="text-xs text-destructive text-center">{errorMsg}</p>
          </div>
        )}
        {(state === 'active') && <video ref={videoRef} className="w-full h-full object-cover" muted playsInline />}
        {state === 'captured' && capturedUrl && <img src={capturedUrl} className="w-full h-full object-contain" alt="Captured" />}
        <canvas ref={canvasRef} className="hidden" />
        {state === 'active' && (
          <button onClick={capturePhoto}
            className="absolute bottom-3 left-1/2 -translate-x-1/2 h-12 w-12 rounded-full bg-white border-4 border-white/50 shadow-lg hover:scale-110 transition-transform" />
        )}
      </div>

      <div className="flex gap-2">
        {(state === 'idle' || state === 'error') && (
          <button onClick={startCamera}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border border-primary/40 bg-primary/5 text-primary text-xs font-semibold hover:bg-primary/10 transition-all">
            <Camera className="h-4 w-4" /> Open Camera
          </button>
        )}
        {state === 'active' && (
          <button onClick={() => { stopCamera(); setState('idle'); }}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-border bg-card text-muted-foreground text-xs font-semibold hover:bg-muted/40 transition-all">
            <X className="h-4 w-4" /> Cancel
          </button>
        )}
        {state === 'captured' && (
          <>
            <button onClick={retake} className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-border bg-card text-muted-foreground text-xs font-semibold hover:bg-muted/40 transition-all">
              <RotateCw className="h-3.5 w-3.5" /> Retake
            </button>
            <div className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold">
              Photo captured — click Process below
            </div>
          </>
        )}
      </div>
    </div>
  );
};

// ── Main OptionsPanel ────────────────────────────────────────────────────────

export const OptionsPanel: React.FC = () => {
  const {
    files, rawFiles, selectedOperation, operationOptions, updateOptions,
    isMockMode, jobId, setProcessing, setProgress, setDownloadUrl, setSavings,
    setError, isProcessing, addRawFiles, addFiles,
  } = useFileStore();

  const [showAdvanced, setShowAdvanced] = useState(false);
  const [naturalDims, setNaturalDims] = useState<{ width: number; height: number } | null>(null);
  const [annotations, setAnnotations] = useState<Array<PdfAnnotation & { id: string }>>([
    { id: 'ann-0', page: 1, type: 'text', x: 50, y: 100, width: 300, height: 20, text: '', fontSize: 12, colorHex: '#000000', fillColorHex: '#ffffff' }
  ]);
  const [redactAreas, setRedactAreas] = useState<Array<RedactArea & { id: string }>>([
    { id: 'red-0', page: 1, x: 50, y: 100, width: 200, height: 30, colorHex: '#000000' }
  ]);
  const [scannedFile, setScannedFile] = useState<File | null>(null);
  const [pdfLinks, setPdfLinks] = useState<Array<PdfLink & { id: string }>>([
    { id: 'lnk-0', page: 1, x: 60, y: 80, width: 200, height: 20, url: '', borderColorHex: '#1a56db', showHighlight: true, highlightColorHex: '#dbeafe', labelText: '', borderWidth: 1 }
  ]);
  const [pdfInsertImages, setPdfInsertImages] = useState<Array<PdfImageInsert & { id: string; file?: File }>>([
    { id: 'img-0', page: 1, x: 60, y: 60, width: 200, height: 150, mimeType: 'image/png', buffer: new ArrayBuffer(0), opacity: 1.0 }
  ]);
  const [pdfShapes, setPdfShapes] = useState<Array<PdfShape & { id: string }>>([
    { id: 'shp-0', page: 1, type: 'rectangle', x: 60, y: 60, width: 150, height: 80, fillColorHex: '#4f46e5', fillOpacity: 0.15, strokeColorHex: '#4f46e5', strokeWidth: 2 }
  ]);

  const firstFile   = files[0];
  const fileType    = firstFile?.type || '';
  const actionName  = operationOptions.operation || selectedOperation;
  const isImage     = fileType.startsWith('image/') || fileType === 'image/svg+xml';
  const isPdf       = fileType === 'application/pdf';
  const isVideo     = fileType.startsWith('video/');
  const isAudio     = fileType.startsWith('audio/');
  const isScanMode  = actionName === 'scan_to_pdf';

  if (files.length === 0 && !isScanMode) return null;
  if (!selectedOperation) return null;

  // Load natural dimensions
  // eslint-disable-next-line react-hooks/rules-of-hooks
  useEffect(() => {
    if ((selectedOperation === 'resize' || actionName === 'image_crop') && rawFiles[0] && isImage) {
      getImageDimensions(rawFiles[0]).then((d) => {
        setNaturalDims(d);
        if (selectedOperation === 'resize' && !operationOptions.resize_width) updateOptions({ resize_width: d.width, resize_height: d.height });
        if (actionName === 'image_crop' && !operationOptions.crop_width) updateOptions({ crop_x: 0, crop_y: 0, crop_width: d.width, crop_height: d.height });
      }).catch(() => {});
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedOperation, actionName, rawFiles[0]?.name]);

  // ── Helpers ──────────────────────────────────────────────────────────────
  const parsePageList = (input: string): number[] =>
    input.split(/[\s,]+/).map(s => parseInt(s.trim())).filter(n => !isNaN(n) && n > 0);

  const addAnnotation = () => setAnnotations(prev => [
    ...prev,
    { id: `ann-${Date.now()}`, page: 1, type: 'text', x: 50, y: 100 + prev.length * 30, width: 300, height: 20, text: '', fontSize: 12, colorHex: '#000000', fillColorHex: '#ffffff' }
  ]);
  const updateAnnotation = (id: string, patch: Partial<PdfAnnotation>) => setAnnotations(prev => prev.map(a => a.id === id ? { ...a, ...patch } : a));
  const removeAnnotation = (id: string) => setAnnotations(prev => prev.length > 1 ? prev.filter(a => a.id !== id) : prev);

  const addRedactArea = () => setRedactAreas(prev => [
    ...prev,
    { id: `red-${Date.now()}`, page: 1, x: 50, y: 100 + prev.length * 40, width: 200, height: 30, colorHex: '#000000' }
  ]);
  const updateRedactArea = (id: string, patch: Partial<RedactArea>) => setRedactAreas(prev => prev.map(a => a.id === id ? { ...a, ...patch } : a));
  const removeRedactArea = (id: string) => setRedactAreas(prev => prev.length > 1 ? prev.filter(a => a.id !== id) : prev);

  const doSimulate = (outputMime?: string) => {
    apiMock.simulateProcessing(jobId!, selectedOperation, files,
      (p) => setProgress(p),
      (url, savings) => { setDownloadUrl(url); setSavings(savings); setProcessing(false); },
      (err) => { setError(err); setProcessing(false); },
      outputMime
    );
  };

  const applyCompressPreset = (preset: string) => {
    const map: Record<string, { quality: number; resize_pct: number }> = {
      small: { quality: 55, resize_pct: 0.75 }, balanced: { quality: 82, resize_pct: 1.0 },
      high:  { quality: 92, resize_pct: 1.0  }, lossless: { quality: 100, resize_pct: 1.0 },
    };
    if (map[preset]) updateOptions({ compress_preset: preset, ...map[preset] });
    else updateOptions({ compress_preset: 'custom' });
  };

  const applyEnhancePreset = (preset: string) => {
    const map: Record<string, any> = {
      natural: { brightness: 1.05, contrast: 1.05, sharpness: 1.1, denoise: false },
      vivid:   { brightness: 1.1,  contrast: 1.25, sharpness: 1.3, denoise: false },
      sharp:   { brightness: 1.0,  contrast: 1.1,  sharpness: 1.8, denoise: false },
      clean:   { brightness: 1.0,  contrast: 1.0,  sharpness: 1.0, denoise: true },
    };
    if (map[preset]) updateOptions({ enhance_preset: preset, ...map[preset] });
  };

  const handleResizeWidth = (w: number) => {
    if (operationOptions.resize_lock_aspect && naturalDims)
      updateOptions({ resize_width: w, resize_height: Math.round(w * naturalDims.height / naturalDims.width) });
    else updateOptions({ resize_width: w });
  };
  const handleResizeHeight = (h: number) => {
    if (operationOptions.resize_lock_aspect && naturalDims)
      updateOptions({ resize_width: Math.round(h * naturalDims.width / naturalDims.height), resize_height: h });
    else updateOptions({ resize_height: h });
  };

  // ── Process ──────────────────────────────────────────────────────────────
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

      // ── PDF ────────────────────────────────────────────────────────────
      if (isPdf && selectedOperation === 'merge') { prog(20); const blob = await runClientSidePdfMerge(rawFiles); prog(90); setTimeout(() => done(blob), 300); return; }
      if (isPdf && selectedOperation === 'compress') { prog(30); const blob = await runClientSidePdfCompress(rawFiles[0], operationOptions.quality || 80); prog(90); setTimeout(() => done(blob, rawFiles[0].size), 300); return; }
      if (isPdf && selectedOperation === 'split') { prog(20); const blobs = await runClientSidePdfSplit(rawFiles[0], operationOptions.split_mode || 'all', operationOptions.split_every || 1, operationOptions.split_range || '1-1'); prog(90); setTimeout(() => { setProgress(100); setDownloadUrl(URL.createObjectURL(blobs[0])); setSavings(null); setProcessing(false); }, 300); return; }
      if (actionName === 'pdf_rotate') { prog(20); const blob = await runClientSidePdfRotate(rawFiles[0], operationOptions.rotate_deg || 90, operationOptions.rotate_pages_mode || 'all', operationOptions.rotate_pages_list || []); prog(90); setTimeout(() => done(blob, rawFiles[0].size), 300); return; }
      if (actionName === 'pdf_delete') { const pages = parsePageList(operationOptions.delete_pages || ''); if (!pages.length) { setError('Enter at least one page number.'); setProcessing(false); return; } prog(20); const blob = await runClientSidePdfDeletePages(rawFiles[0], pages); prog(90); setTimeout(() => done(blob, rawFiles[0].size), 300); return; }
      if (actionName === 'pdf_watermark') { const text = (operationOptions.watermark_text || 'CONFIDENTIAL').trim(); if (!text) { setError('Enter watermark text.'); setProcessing(false); return; } prog(20); const blob = await runClientSidePdfWatermark(rawFiles[0], text, { fontSize: operationOptions.watermark_size || 52, opacity: (operationOptions.watermark_opacity || 18) / 100, rotation: operationOptions.watermark_rotation ?? -45, position: operationOptions.watermark_position || 'diagonal', colorHex: operationOptions.watermark_color || '#888888' }); prog(90); setTimeout(() => done(blob, rawFiles[0].size), 300); return; }
      if (actionName === 'pdf_page_numbers') { prog(20); const blob = await runClientSidePdfPageNumbers(rawFiles[0], { position: operationOptions.page_num_position || 'bottom-center', startFrom: operationOptions.page_num_start || 1, fontSize: operationOptions.page_num_size || 10, prefix: operationOptions.page_num_prefix || '', suffix: operationOptions.page_num_suffix || '', colorHex: operationOptions.page_num_color || '#555555' }); prog(90); setTimeout(() => done(blob, rawFiles[0].size), 300); return; }
      if (actionName === 'pdf_reorder') { const order = parsePageList(operationOptions.reorder_pages || ''); if (!order.length) { setError('Enter the new page order.'); setProcessing(false); return; } prog(20); const blob = await runClientSidePdfReorder(rawFiles[0], order); prog(90); setTimeout(() => done(blob, rawFiles[0].size), 300); return; }
      if (actionName === 'pdf_crop') { prog(20); const blob = await runClientSidePdfCrop(rawFiles[0], operationOptions.pdf_crop_x || 0, operationOptions.pdf_crop_y || 0, operationOptions.pdf_crop_w || 595, operationOptions.pdf_crop_h || 842, operationOptions.pdf_crop_mode || 'all', parsePageList(operationOptions.pdf_crop_pages || '')); prog(90); setTimeout(() => done(blob, rawFiles[0].size), 300); return; }
      if (actionName === 'pdf_annotate') { const valid = annotations.filter(a => a.type === 'cover' || a.text?.trim()); if (!valid.length) { setError('Add at least one annotation.'); setProcessing(false); return; } prog(20); const blob = await runClientSidePdfAnnotate(rawFiles[0], valid); prog(90); setTimeout(() => done(blob, rawFiles[0].size), 300); return; }
      if (actionName === 'pdf_redact') { prog(20); const blob = await runClientSidePdfRedact(rawFiles[0], redactAreas); prog(90); setTimeout(() => done(blob, rawFiles[0].size), 300); return; }
      if (actionName === 'pdf_sign') { const sig = (operationOptions.signature_text || '').trim(); if (!sig) { setError('Enter your signature text.'); setProcessing(false); return; } prog(20); const blob = await runClientSidePdfSign(rawFiles[0], sig, { page: operationOptions.sign_page, x: operationOptions.sign_x || 60, y: operationOptions.sign_y || 80, fontSize: operationOptions.sign_size || 28, colorHex: operationOptions.sign_color || '#1a1a8c', underline: operationOptions.sign_underline !== false, drawBox: operationOptions.sign_box !== false }); prog(90); setTimeout(() => done(blob, rawFiles[0].size), 300); return; }
      if (actionName === 'pdf_unlock') { const pwd = (operationOptions.unlock_password || '').trim(); if (!pwd) { setError('Enter the PDF password.'); setProcessing(false); return; } prog(20); try { const blob = await runClientSidePdfUnlock(rawFiles[0], pwd); prog(90); setTimeout(() => done(blob, rawFiles[0].size), 300); } catch (e: any) { setError('Incorrect password or PDF is not encrypted.'); setProcessing(false); } return; }
      if (actionName === 'pdf_forms') { prog(20); const blob = await runClientSidePdfFlattenForm(rawFiles[0]); prog(90); setTimeout(() => done(blob, rawFiles[0].size), 300); return; }

      if (actionName === 'pdf_insert_link') {
        const valid = pdfLinks.filter(l => l.url.trim());
        if (!valid.length) { setError('Add at least one link with a URL.'); setProcessing(false); return; }
        prog(20);
        const blob = await runClientSidePdfInsertLinks(rawFiles[0], valid);
        prog(90); setTimeout(() => done(blob, rawFiles[0].size), 300); return;
      }

      if (actionName === 'pdf_insert_image') {
        const valid: PdfImageInsert[] = [];
        for (const item of pdfInsertImages) {
          if (item.file) {
            valid.push({ ...item, buffer: await item.file.arrayBuffer(), mimeType: item.file.type || 'image/png' });
          }
        }
        if (!valid.length) { setError('Pick at least one image to insert.'); setProcessing(false); return; }
        prog(20);
        const blob = await runClientSidePdfInsertImages(rawFiles[0], valid);
        prog(90); setTimeout(() => done(blob, rawFiles[0].size), 300); return;
      }

      if (actionName === 'pdf_insert_shape') {
        prog(20);
        const blob = await runClientSidePdfInsertShapes(rawFiles[0], pdfShapes);
        prog(90); setTimeout(() => done(blob, rawFiles[0].size), 300); return;
      }

      // Scan to PDF
      if (actionName === 'scan_to_pdf') {
        const fileToUse = scannedFile || rawFiles[0];
        if (!fileToUse) { setError('Capture a photo first.'); setProcessing(false); return; }
        prog(20); const blob = await runClientSideImagesToPdf([fileToUse]); prog(90); setTimeout(() => done(blob, fileToUse.size), 300); return;
      }

      // Images → PDF
      if (actionName === 'images_to_pdf') { prog(20); const blob = await runClientSideImagesToPdf(rawFiles.length > 0 ? rawFiles : []); prog(90); setTimeout(() => done(blob), 300); return; }

      // ── Image ──────────────────────────────────────────────────────────
      if (isImage && actionName === 'remove_bg') { prog(5); const blob = await removeImageBackground(rawFiles[0], (operationOptions.remove_bg_format || 'png') as any, operationOptions.remove_bg_fill || undefined, (p) => prog(p)); prog(95); setTimeout(() => done(blob, rawFiles[0].size), 200); return; }
      if (isImage && selectedOperation === 'compress') { prog(20); const q = (operationOptions.quality || 82) / 100; const scale = operationOptions.resize_pct || 1.0; const dims = naturalDims || await getImageDimensions(rawFiles[0]); const blob = await compressImage(rawFiles[0], q, Math.round(dims.width * scale), Math.round(dims.height * scale)); prog(90); setTimeout(() => done(blob, rawFiles[0].size), 250); return; }
      if (isImage && selectedOperation === 'resize') { prog(20); const blob = await resizeImage(rawFiles[0], operationOptions.resize_width || 800, operationOptions.resize_height || 600, (operationOptions.resize_format || 'png') as any, 0.92); prog(90); setTimeout(() => done(blob, rawFiles[0].size), 250); return; }
      if (actionName === 'image_crop') { const dims = naturalDims || await getImageDimensions(rawFiles[0]); const x = Math.max(0, operationOptions.crop_x || 0); const y = Math.max(0, operationOptions.crop_y || 0); const w = Math.min(dims.width - x, operationOptions.crop_width || dims.width); const h = Math.min(dims.height - y, operationOptions.crop_height || dims.height); if (w <= 0 || h <= 0) { setError('Invalid crop dimensions.'); setProcessing(false); return; } prog(20); const blob = await cropImage(rawFiles[0], x, y, w, h); prog(90); setTimeout(() => done(blob, rawFiles[0].size), 250); return; }
      if (actionName === 'image_rotate') { prog(20); const blob = await rotateFlipImage(rawFiles[0], operationOptions.rotate_deg || 90, operationOptions.flip_h || false, operationOptions.flip_v || false); prog(90); setTimeout(() => done(blob, rawFiles[0].size), 250); return; }
      if (actionName === 'image_watermark') { const text = (operationOptions.img_watermark_text || '').trim(); if (!text) { setError('Enter watermark text.'); setProcessing(false); return; } prog(20); const blob = await addImageWatermark(rawFiles[0], text, { fontSize: operationOptions.img_wm_size, color: operationOptions.img_wm_color || '#ffffff', opacity: (operationOptions.img_wm_opacity || 45) / 100, position: operationOptions.img_wm_position || 'diagonal', bold: true, shadow: true, tileRepeat: operationOptions.img_wm_tile || false }); prog(90); setTimeout(() => done(blob, rawFiles[0].size), 250); return; }
      if (isImage && (actionName === 'convert_format' || actionName === 'convert')) { prog(20); const blob = await convertImageFormat(rawFiles[0], (operationOptions.target_format || 'webp') as any, (operationOptions.quality || 92) / 100); prog(90); setTimeout(() => done(blob, rawFiles[0].size), 250); return; }
      if (actionName === 'to_ico') { prog(20); const blob = await convertToIco(rawFiles[0], operationOptions.ico_sizes || [16, 32, 48, 64]); prog(90); setTimeout(() => done(blob, rawFiles[0].size), 250); return; }
      if (actionName === 'svg_to_png') { prog(20); const blob = await convertSvgToPng(rawFiles[0], operationOptions.svg_width || 512, operationOptions.svg_height || 512); prog(90); setTimeout(() => done(blob, rawFiles[0].size), 250); return; }

      // ── HTML → ZIP ─────────────────────────────────────────────────────
      if (actionName === 'html_to_zip') {
        if (!rawFiles.length) { setError('Add at least one HTML file.'); setProcessing(false); return; }
        prog(20);
        const inlineMode = operationOptions.html_zip_inline === true;
        let blob: Blob;
        if (inlineMode) {
          const htmlFile = rawFiles.find(f => f.name.endsWith('.html') || f.name.endsWith('.htm') || f.type === 'text/html') || rawFiles[0];
          const assets = rawFiles.filter(f => f !== htmlFile);
          blob = await runClientSideInlineHtml(htmlFile, assets);
        } else {
          blob = await runClientSideHtmlToZip(rawFiles);
        }
        prog(90);
        setTimeout(() => done(blob, rawFiles.reduce((a, f) => a + f.size, 0)), 300);
        return;
      }

      // ── Backend/mock fallback ──────────────────────────────────────────
      const outputMimeMap: Record<string, string> = {
        pdf_to_docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        pdf_to_pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        pdf_to_excel: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        pdf_to_pdfa: 'application/pdf', pdf_protect: 'application/pdf',
        pdf_ocr: 'application/pdf', pdf_compare: 'application/pdf',
        pdf_summarize: 'text/plain', pdf_translate: 'application/pdf',
        pdf_to_images: 'image/png', docx_to_pdf: 'application/pdf', pptx_to_pdf: 'application/pdf',
        xlsx_to_csv: 'text/csv', csv_to_xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        md_to_html: 'text/html', html_to_md: 'text/markdown',
        html_to_zip: 'application/zip',
        video_to_audio: 'audio/mpeg', video_to_gif: 'image/gif', compress_audio: 'audio/mpeg',
        enhance: fileType,
      };
      doSimulate(outputMimeMap[actionName] || fileType);
    } catch (e: any) {
      setError(e.message || 'Processing failed.');
      setProcessing(false);
    }
  };

  // ── Options renderers ────────────────────────────────────────────────────

  const renderPdfRedactOptions = () => (
    <div className="space-y-4">
      <div className="p-3 rounded-xl bg-destructive/5 border border-destructive/20 text-xs text-muted-foreground leading-relaxed">
        <Eraser className="h-3.5 w-3.5 inline mr-1.5 text-destructive" />
        Draws a solid-filled rectangle over each area, permanently obscuring the content beneath. Client-side — no file upload. Coordinates are points from the top-left (Y downward). A4 = 595 × 842 pt.
      </div>
      <div className="space-y-3">
        {redactAreas.map((area, idx) => (
          <RedactRow key={area.id} area={area} idx={idx} onChange={updateRedactArea} onRemove={removeRedactArea} />
        ))}
      </div>
      <button onClick={addRedactArea}
        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-dashed border-destructive/40 text-destructive text-xs font-semibold hover:bg-destructive/5 transition-all">
        <Plus className="h-4 w-4" /> Add redaction area
      </button>
    </div>
  );

  const renderPdfSignOptions = () => (
    <div className="space-y-5">
      <div className="space-y-1.5">
        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Signature text</label>
        <input type="text" placeholder="e.g. John Smith, J. Smith" value={operationOptions.signature_text || ''}
          onChange={(e) => updateOptions({ signature_text: e.target.value })}
          className="w-full p-2.5 bg-card border border-border rounded-xl text-sm italic focus:outline-none focus:ring-2 focus:ring-primary/40" style={{ fontFamily: 'Georgia, serif' }} />
        {operationOptions.signature_text && (
          <div className="mt-2 p-3 bg-white/5 border border-border rounded-xl text-center">
            <span className="text-xl italic text-primary/80" style={{ fontFamily: 'Georgia, serif' }}>{operationOptions.signature_text}</span>
          </div>
        )}
      </div>
      <div className="grid grid-cols-3 gap-3">
        <NumInput label="Page #" value={operationOptions.sign_page || 1} min={1} onChange={(v) => updateOptions({ sign_page: v })} />
        <NumInput label="X position (pt)" value={operationOptions.sign_x || 60} min={0} onChange={(v) => updateOptions({ sign_x: v })} />
        <NumInput label="Y from top (pt)" value={operationOptions.sign_y || 80} min={0} onChange={(v) => updateOptions({ sign_y: v })} />
      </div>
      <SliderField id="sign-size" label="Signature size" unit="pt" value={operationOptions.sign_size || 28} min={12} max={72} onChange={(v) => updateOptions({ sign_size: v })} />
      <ColorField label="Ink color" value={operationOptions.sign_color || '#1a1a8c'}
        swatches={['#1a1a8c', '#000000', '#006600', '#8B0000', '#4a4a4a']}
        onChange={(v) => updateOptions({ sign_color: v })} />
      <div className="flex gap-3">
        <button onClick={() => updateOptions({ sign_underline: !operationOptions.sign_underline !== false })}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${operationOptions.sign_underline !== false ? 'bg-primary/10 border-primary/30 text-primary' : 'bg-card border-border text-muted-foreground'}`}>
          Underline
        </button>
        <button onClick={() => updateOptions({ sign_box: !operationOptions.sign_box !== false })}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${operationOptions.sign_box !== false ? 'bg-primary/10 border-primary/30 text-primary' : 'bg-card border-border text-muted-foreground'}`}>
          Signature box
        </button>
      </div>
      <InfoBox icon={<PenLine className="h-4 w-4 text-primary" />} text="This adds a visual signature. For legally binding digital signatures, a PKI certificate is required." color="bg-primary/5 border-primary/15" />
    </div>
  );

  const renderPdfUnlockOptions = () => (
    <div className="space-y-5">
      <div className="space-y-1.5">
        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">PDF password</label>
        <input type="password" placeholder="Enter the PDF's password…" value={operationOptions.unlock_password || ''}
          onChange={(e) => updateOptions({ unlock_password: e.target.value })}
          className="w-full p-2.5 bg-card border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" />
      </div>
      <InfoBox icon={<Unlock className="h-4 w-4 text-emerald-400" />} text="Loads the PDF with the password and saves a new copy without password protection. Runs fully client-side." color="bg-emerald-500/5 border-emerald-500/20" />
    </div>
  );

  const renderPdfProtectOptions = () => (
    <div className="space-y-5">
      <div className="space-y-1.5">
        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Open password</label>
        <input type="password" placeholder="Password required to open…" value={operationOptions.protect_user_pwd || ''}
          onChange={(e) => updateOptions({ protect_user_pwd: e.target.value })}
          className="w-full p-2.5 bg-card border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" />
      </div>
      <div className="space-y-1.5">
        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Owner password (restrict editing)</label>
        <input type="password" placeholder="Optional — controls edit/print permissions…" value={operationOptions.protect_owner_pwd || ''}
          onChange={(e) => updateOptions({ protect_owner_pwd: e.target.value })}
          className="w-full p-2.5 bg-card border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" />
      </div>
      <InfoBox icon={<ShieldCheck className="h-4 w-4 text-amber-400" />} text="PDF encryption requires backend processing. Connect the API server to enable this feature." color="bg-amber-500/5 border-amber-500/20" />
    </div>
  );

  const renderPdfOcrOptions = () => (
    <div className="space-y-5">
      <SelectField id="ocr-lang" label="Document language" value={operationOptions.ocr_lang || 'eng'}
        options={[ { value: 'eng', label: 'English' }, { value: 'fra', label: 'French' }, { value: 'deu', label: 'German' }, { value: 'spa', label: 'Spanish' }, { value: 'por', label: 'Portuguese' }, { value: 'ita', label: 'Italian' }, { value: 'zho', label: 'Chinese' }, { value: 'jpn', label: 'Japanese' }, { value: 'ara', label: 'Arabic' } ]}
        onChange={(v) => updateOptions({ ocr_lang: v })} />
      <PresetRow label="Output type" value={operationOptions.ocr_output || 'searchable'}
        onChange={(v) => updateOptions({ ocr_output: v })}
        options={[ { value: 'searchable', label: 'Searchable PDF' }, { value: 'text', label: 'Plain text' }, { value: 'word', label: 'Word document' } ]}
      />
      <InfoBox icon={<ScanLine className="h-4 w-4 text-primary" />} text="OCR requires server-side Tesseract processing. Connect the API server to enable text recognition." />
    </div>
  );

  const renderPdfCompareOptions = () => (
    <div className="space-y-5">
      <InfoBox icon={<GitCompareArrows className="h-4 w-4 text-primary" />} text="Upload two PDF files. The comparison will highlight added, removed, and changed text across both documents." color="bg-primary/5 border-primary/15" />
      <PresetRow label="Comparison mode" value={operationOptions.compare_mode || 'text'}
        onChange={(v) => updateOptions({ compare_mode: v })}
        options={[ { value: 'text', label: 'Text changes' }, { value: 'visual', label: 'Visual diff' }, { value: 'both', label: 'Both' } ]}
      />
      <PresetRow label="Output format" value={operationOptions.compare_output || 'pdf'}
        onChange={(v) => updateOptions({ compare_output: v })}
        options={[ { value: 'pdf', label: 'Marked-up PDF' }, { value: 'html', label: 'HTML report' } ]}
      />
    </div>
  );

  const renderPdfSummarizeOptions = () => (
    <div className="space-y-5">
      <div className="p-4 rounded-xl bg-violet-500/10 border border-violet-500/20">
        <div className="flex items-start gap-3">
          <BrainCircuit className="h-5 w-5 text-violet-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold text-foreground">AI PDF Summarizer</p>
            <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">Reads your PDF content and generates a structured summary. Requires an AI backend connection.</p>
          </div>
        </div>
      </div>
      <PresetRow label="Summary length" value={operationOptions.summary_length || 'medium'}
        onChange={(v) => updateOptions({ summary_length: v })}
        options={[ { value: 'brief', label: 'Brief (1 para)' }, { value: 'medium', label: 'Medium (3–5 pts)' }, { value: 'detailed', label: 'Detailed' } ]}
      />
      <PresetRow label="Output format" value={operationOptions.summary_format || 'bullets'}
        onChange={(v) => updateOptions({ summary_format: v })}
        options={[ { value: 'bullets', label: 'Bullet points' }, { value: 'paragraph', label: 'Paragraphs' }, { value: 'structured', label: 'Sections' } ]}
      />
    </div>
  );

  const renderPdfTranslateOptions = () => (
    <div className="space-y-5">
      <div className="p-4 rounded-xl bg-violet-500/10 border border-violet-500/20">
        <div className="flex items-start gap-3">
          <Languages className="h-5 w-5 text-violet-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold text-foreground">AI PDF Translation</p>
            <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">Translates the full content of your PDF preserving the original layout. Requires an AI backend connection.</p>
          </div>
        </div>
      </div>
      <SelectField id="translate-from" label="From language" value={operationOptions.translate_from || 'auto'}
        options={[ { value: 'auto', label: 'Auto-detect' }, { value: 'en', label: 'English' }, { value: 'fr', label: 'French' }, { value: 'de', label: 'German' }, { value: 'es', label: 'Spanish' }, { value: 'pt', label: 'Portuguese' }, { value: 'zh', label: 'Chinese' }, { value: 'ja', label: 'Japanese' }, { value: 'ar', label: 'Arabic' }, { value: 'hi', label: 'Hindi' } ]}
        onChange={(v) => updateOptions({ translate_from: v })} />
      <SelectField id="translate-to" label="To language" value={operationOptions.translate_to || 'en'}
        options={[ { value: 'en', label: 'English' }, { value: 'fr', label: 'French' }, { value: 'de', label: 'German' }, { value: 'es', label: 'Spanish' }, { value: 'pt', label: 'Portuguese' }, { value: 'zh', label: 'Chinese (Simplified)' }, { value: 'ja', label: 'Japanese' }, { value: 'ar', label: 'Arabic' }, { value: 'hi', label: 'Hindi' }, { value: 'ru', label: 'Russian' }, { value: 'ko', label: 'Korean' } ]}
        onChange={(v) => updateOptions({ translate_to: v })} />
    </div>
  );

  const renderPdfToPdfaOptions = () => (
    <div className="space-y-5">
      <PresetRow label="PDF/A standard" value={operationOptions.pdfa_level || '1b'}
        onChange={(v) => updateOptions({ pdfa_level: v })}
        options={[ { value: '1b', label: 'PDF/A-1b', hint: 'Basic conformance — most compatible' }, { value: '2b', label: 'PDF/A-2b', hint: 'Supports transparency and JPEG2000' }, { value: '3b', label: 'PDF/A-3b', hint: 'Allows file attachments' } ]}
      />
      <InfoBox icon={<FileCheck2 className="h-4 w-4 text-primary" />} text="PDF/A is the ISO standard for long-term archival. It embeds all fonts, removes encryption, and ensures self-containedness." />
    </div>
  );

  const renderPdfFormsOptions = () => (
    <div className="space-y-5">
      <InfoBox icon={<BookOpen className="h-4 w-4 text-emerald-400" />} text="Flattens all interactive form fields into the page content — making the values permanent and the PDF non-editable. Runs client-side." color="bg-emerald-500/5 border-emerald-500/20" />
      <PresetRow label="Action" value={operationOptions.forms_action || 'flatten'}
        onChange={(v) => updateOptions({ forms_action: v })}
        options={[ { value: 'flatten', label: 'Flatten fields', hint: 'Bake current values into page content' } ]}
      />
    </div>
  );

  const renderScanToPdfOptions = () => (
    <ScanToPdfPanel onCapture={(file) => {
      setScannedFile(file);
      useFileStore.getState().addRawFiles([file]);
    }} />
  );

  const renderRemoveBgOptions = () => (
    <div className="space-y-5">
      <div className="p-4 rounded-xl bg-gradient-to-br from-blue-500/10 to-cyan-500/5 border border-blue-500/20">
        <div className="flex items-start gap-3">
          <div className="h-9 w-9 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shrink-0">
            <Eraser className="h-4 w-4 text-blue-400" />
          </div>
          <div>
            <p className="text-sm font-bold text-foreground">AI Background Removal</p>
            <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">ML model (~15 MB) downloads on first use and runs entirely in your browser. No upload needed.</p>
          </div>
        </div>
      </div>
      <PresetRow label="Output format" value={operationOptions.remove_bg_format || 'png'}
        onChange={(v) => updateOptions({ remove_bg_format: v, remove_bg_fill: v === 'png' ? undefined : operationOptions.remove_bg_fill })}
        options={[ { value: 'png', label: 'PNG (transparent)' }, { value: 'jpeg', label: 'JPEG + fill' }, { value: 'webp', label: 'WEBP + fill' } ]}
      />
      {(operationOptions.remove_bg_format === 'jpeg' || operationOptions.remove_bg_format === 'webp') && (
        <ColorField label="Background fill color" value={operationOptions.remove_bg_fill || '#ffffff'}
          swatches={['#ffffff', '#000000', '#f3f4f6', '#dbeafe', '#fef3c7']}
          onChange={(v) => updateOptions({ remove_bg_fill: v })} />
      )}
    </div>
  );

  const renderPdfCropOptions = () => (
    <div className="space-y-5">
      <div className="p-3 rounded-xl bg-amber-500/5 border border-amber-500/20 text-xs text-amber-400 leading-relaxed">
        PDF coordinates start from the <strong>bottom-left</strong> corner in points (1 pt ≈ 0.353 mm). A4 = 595 × 842 pts, US Letter = 612 × 792 pts.
      </div>
      <div className="grid grid-cols-2 gap-3">
        <NumInput label="X (left offset, pt)" value={operationOptions.pdf_crop_x || 0} min={0} onChange={(v) => updateOptions({ pdf_crop_x: v })} />
        <NumInput label="Y (bottom offset, pt)" value={operationOptions.pdf_crop_y || 0} min={0} onChange={(v) => updateOptions({ pdf_crop_y: v })} />
        <NumInput label="Crop width (pt)" value={operationOptions.pdf_crop_w || 595} min={1} onChange={(v) => updateOptions({ pdf_crop_w: v })} />
        <NumInput label="Crop height (pt)" value={operationOptions.pdf_crop_h || 842} min={1} onChange={(v) => updateOptions({ pdf_crop_h: v })} />
      </div>
      <PresetRow label="Common sizes" value=""
        onChange={(v) => { const [w, h] = (v as string).split('x').map(Number); updateOptions({ pdf_crop_x: 0, pdf_crop_y: 0, pdf_crop_w: w, pdf_crop_h: h }); }}
        options={[ { value: '595x842', label: 'A4' }, { value: '612x792', label: 'US Letter' }, { value: '420x595', label: 'A5' }, { value: '297x420', label: 'A6' } ]}
      />
      <PresetRow label="Apply to" value={operationOptions.pdf_crop_mode || 'all'}
        onChange={(v) => updateOptions({ pdf_crop_mode: v })}
        options={[ { value: 'all', label: 'All pages' }, { value: 'odd', label: 'Odd pages' }, { value: 'even', label: 'Even pages' }, { value: 'specific', label: 'Specific' } ]}
      />
      {operationOptions.pdf_crop_mode === 'specific' && (
        <TextField label="Page numbers" value={operationOptions.pdf_crop_pages || ''} placeholder="e.g. 1, 3, 5-7"
          onChange={(v) => updateOptions({ pdf_crop_pages: v })} mono hint="Comma-separated pages or ranges" />
      )}
    </div>
  );

  const renderPdfAnnotateOptions = () => (
    <div className="space-y-4">
      <div className="p-3 rounded-xl bg-primary/5 border border-primary/15 text-xs text-muted-foreground leading-relaxed">
        Coordinates are in <strong className="text-foreground">points from the top-left corner</strong> (Y increases downward). A4 = 595 × 842 pt.
      </div>
      <div className="space-y-3">
        {annotations.map((ann, idx) => <AnnotationRow key={ann.id} ann={ann} idx={idx} onChange={updateAnnotation} onRemove={removeAnnotation} />)}
      </div>
      <button onClick={addAnnotation} className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-dashed border-primary/40 text-primary text-xs font-semibold hover:bg-primary/5 transition-all">
        <Plus className="h-4 w-4" /> Add annotation
      </button>
    </div>
  );

  const renderPdfRotateOptions = () => (
    <div className="space-y-5">
      <PresetRow label="Rotation amount" value={operationOptions.rotate_deg || 90}
        onChange={(v) => updateOptions({ rotate_deg: v })}
        options={[ { value: 90, label: '90° CW' }, { value: 180, label: '180°' }, { value: 270, label: '90° CCW' } ]} />
      <PresetRow label="Apply to pages" value={operationOptions.rotate_pages_mode || 'all'}
        onChange={(v) => updateOptions({ rotate_pages_mode: v })}
        options={[ { value: 'all', label: 'All pages' }, { value: 'odd', label: 'Odd' }, { value: 'even', label: 'Even' }, { value: 'specific', label: 'Specific' } ]} />
      {operationOptions.rotate_pages_mode === 'specific' && (
        <TextField label="Page numbers" value={operationOptions.rotate_pages_input || ''} placeholder="e.g. 1, 3, 5-7" mono
          onChange={(v) => updateOptions({ rotate_pages_input: v, rotate_pages_list: parsePageList(v) })} />
      )}
    </div>
  );

  const renderPdfDeleteOptions = () => (
    <div className="space-y-5">
      <TextField label="Pages to delete" value={operationOptions.delete_pages || ''} placeholder="e.g. 1, 3, 5-8" mono
        hint="Comma-separated page numbers or ranges. Remaining pages keep their order."
        onChange={(v) => updateOptions({ delete_pages: v })} />
      <InfoBox icon={<Trash2 className="h-4 w-4 text-destructive" />} text="Specified pages will be permanently removed from the output PDF." color="bg-destructive/5 border-destructive/15" />
    </div>
  );

  const renderPdfWatermarkOptions = () => (
    <div className="space-y-5">
      <TextField label="Watermark text" value={operationOptions.watermark_text || ''} placeholder="e.g. CONFIDENTIAL, DRAFT, © 2025" onChange={(v) => updateOptions({ watermark_text: v })} />
      <PresetRow label="Position" value={operationOptions.watermark_position || 'diagonal'}
        onChange={(v) => updateOptions({ watermark_position: v })}
        options={[ { value: 'diagonal', label: 'Diagonal' }, { value: 'center', label: 'Center' }, { value: 'bottom', label: 'Footer' }, { value: 'top', label: 'Header' } ]} />
      <SliderField id="wm-size" label="Font size" unit="pt" value={operationOptions.watermark_size || 52} min={16} max={120} onChange={(v) => updateOptions({ watermark_size: v })} />
      <SliderField id="wm-opacity" label="Opacity" unit="%" value={operationOptions.watermark_opacity || 18} min={5} max={80} onChange={(v) => updateOptions({ watermark_opacity: v })} hint="Lower = more transparent." />
      <ColorField label="Text color" value={operationOptions.watermark_color || '#888888'}
        swatches={['#888888', '#000000', '#cc0000', '#1a1a8c', '#007700']}
        onChange={(v) => updateOptions({ watermark_color: v })} />
    </div>
  );

  const renderPdfPageNumbersOptions = () => (
    <div className="space-y-5">
      <PresetRow label="Position" value={operationOptions.page_num_position || 'bottom-center'}
        onChange={(v) => updateOptions({ page_num_position: v })}
        options={[ { value: 'bottom-center', label: 'Bottom center' }, { value: 'bottom-right', label: 'Bottom right' }, { value: 'bottom-left', label: 'Bottom left' }, { value: 'top-center', label: 'Top center' } ]} />
      <div className="grid grid-cols-3 gap-3">
        <NumInput label="Start from" value={operationOptions.page_num_start || 1} min={0} onChange={(v) => updateOptions({ page_num_start: v })} />
        <TextField label="Prefix" value={operationOptions.page_num_prefix || ''} placeholder="Page " onChange={(v) => updateOptions({ page_num_prefix: v })} />
        <TextField label="Suffix" value={operationOptions.page_num_suffix || ''} placeholder=" / N" onChange={(v) => updateOptions({ page_num_suffix: v })} />
      </div>
      <div className="p-3 bg-muted/30 rounded-xl border border-border text-xs text-muted-foreground">
        Preview: <span className="font-mono text-foreground">{operationOptions.page_num_prefix || ''}{operationOptions.page_num_start || 1}{operationOptions.page_num_suffix || ''}</span>
      </div>
    </div>
  );

  const renderPdfReorderOptions = () => (
    <div className="space-y-5">
      <TextField label="New page order" value={operationOptions.reorder_pages || ''} placeholder="e.g. 3, 1, 2, 4, 5" mono
        hint="Enter all page numbers in the desired order. Pages not listed will be omitted."
        onChange={(v) => updateOptions({ reorder_pages: v })} />
    </div>
  );

  const renderImageCropOptions = () => (
    <div className="space-y-5">
      {naturalDims && <div className="text-xs text-muted-foreground bg-muted/40 border border-border rounded-xl px-3 py-2">Original: <strong className="text-foreground">{naturalDims.width} × {naturalDims.height}px</strong></div>}
      <PresetRow label="Aspect ratio" value=""
        onChange={(v) => { if (!naturalDims) return; const [rw, rh] = (v as string).split(':').map(Number); const maxW = naturalDims.width, maxH = naturalDims.height; let w = maxW, h = Math.round(maxW * rh / rw); if (h > maxH) { h = maxH; w = Math.round(maxH * rw / rh); } updateOptions({ crop_x: Math.round((maxW - w) / 2), crop_y: Math.round((maxH - h) / 2), crop_width: w, crop_height: h }); }}
        options={[ { value: '1:1', label: '1:1' }, { value: '16:9', label: '16:9' }, { value: '4:3', label: '4:3' }, { value: '3:2', label: '3:2' }, { value: '2:3', label: '2:3' } ]} />
      <div className="grid grid-cols-2 gap-3">
        <NumInput label="X offset (px)" value={operationOptions.crop_x || 0} min={0} max={naturalDims?.width} onChange={(v) => updateOptions({ crop_x: v })} />
        <NumInput label="Y offset (px)" value={operationOptions.crop_y || 0} min={0} max={naturalDims?.height} onChange={(v) => updateOptions({ crop_y: v })} />
        <NumInput label="Width (px)" value={operationOptions.crop_width || naturalDims?.width || 800} min={1} max={naturalDims?.width} onChange={(v) => updateOptions({ crop_width: v })} />
        <NumInput label="Height (px)" value={operationOptions.crop_height || naturalDims?.height || 600} min={1} max={naturalDims?.height} onChange={(v) => updateOptions({ crop_height: v })} />
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
      <TextField label="Watermark text" value={operationOptions.img_watermark_text || ''} placeholder="© 2025 My Brand, CONFIDENTIAL" onChange={(v) => updateOptions({ img_watermark_text: v })} />
      <PresetRow label="Position" value={operationOptions.img_wm_position || 'diagonal'}
        onChange={(v) => updateOptions({ img_wm_position: v })}
        options={[ { value: 'diagonal', label: 'Diagonal' }, { value: 'center', label: 'Center' }, { value: 'bottom-right', label: 'Bottom right' }, { value: 'bottom-left', label: 'Bottom left' }, { value: 'bottom-center', label: 'Bottom center' }, { value: 'top-right', label: 'Top right' } ]} />
      <SliderField id="img-wm-opacity" label="Opacity" unit="%" value={operationOptions.img_wm_opacity || 45} min={5} max={100}
        onChange={(v) => updateOptions({ img_wm_opacity: v })} hint="Lower = more transparent." />
      <ColorField label="Text color" value={operationOptions.img_wm_color || '#ffffff'}
        swatches={['#ffffff', '#000000', '#888888', '#cc0000', '#1a1a8c']}
        onChange={(v) => updateOptions({ img_wm_color: v })} />
      <button onClick={() => updateOptions({ img_wm_tile: !operationOptions.img_wm_tile })}
        className={`flex items-center gap-2 text-xs font-semibold px-3 py-2 rounded-xl border transition-all w-full ${operationOptions.img_wm_tile ? 'bg-primary/10 border-primary/30 text-primary' : 'bg-card border-border text-muted-foreground hover:border-primary/30'}`}>
        <PenTool className="h-3.5 w-3.5" />
        {operationOptions.img_wm_tile ? 'Tiled repeat: ON' : 'Tiled repeat: OFF (single stamp)'}
      </button>
    </div>
  );

  const renderCompressOptions = () => {
    if (isImage) return (
      <div className="space-y-6">
        <PresetRow label="Quality preset" value={operationOptions.compress_preset || 'balanced'}
          onChange={(v) => applyCompressPreset(v as string)}
          options={[ { value: 'small', label: 'Small' }, { value: 'balanced', label: 'Balanced' }, { value: 'high', label: 'High' }, { value: 'lossless', label: 'Lossless' }, { value: 'custom', label: 'Custom' } ]} />
        <SliderField id="quality-s" label="Output Quality" unit="%" value={operationOptions.quality || 82} min={10} max={100} onChange={(v) => updateOptions({ quality: v, compress_preset: 'custom' })} hint="Higher = better quality, larger file." />
        <SliderField id="scale-s" label="Resize Scale" unit="%" value={Math.round((operationOptions.resize_pct || 1.0) * 100)} min={10} max={100} onChange={(v) => updateOptions({ resize_pct: v / 100, compress_preset: 'custom' })} hint="Scale down before compressing for extra savings." />
        <InfoBox icon={<FileArchive className="h-4 w-4 text-primary" />} text="Runs entirely in your browser — no upload required." color="bg-primary/5 border-primary/15" />
      </div>
    );
    if (isVideo && actionName !== 'compress_audio') return (
      <div className="space-y-5">
        <PresetRow label="Quality preset"
          value={operationOptions.crf <= 20 ? 'high' : operationOptions.crf <= 26 ? 'balanced' : 'small'}
          onChange={(v) => { const m: any = { high: 20, balanced: 26, small: 32 }; if (m[v as string]) updateOptions({ crf: m[v as string] }); }}
          options={[ { value: 'high', label: 'High quality' }, { value: 'balanced', label: 'Balanced' }, { value: 'small', label: 'Compact' } ]} />
        <SliderField id="crf-s" label="CRF" unit="" value={operationOptions.crf || 28} min={18} max={35} onChange={(v) => updateOptions({ crf: v })} hint="Lower = higher quality, larger file." />
        {showAdvanced && <SelectField id="preset-s" label="Encoder Speed" value={operationOptions.preset || 'medium'}
          options={[ { value: 'ultrafast', label: 'Ultrafast' }, { value: 'fast', label: 'Fast' }, { value: 'medium', label: 'Medium' }, { value: 'slow', label: 'Slow' } ]}
          onChange={(v) => updateOptions({ preset: v })} />}
      </div>
    );
    if (isAudio || actionName === 'compress_audio') return (
      <div className="space-y-5">
        <SelectField id="bitrate-s" label="Target Bitrate" value={operationOptions.audio_bitrate || 128}
          options={[ { value: 64, label: '64 kbps — Smallest' }, { value: 96, label: '96 kbps' }, { value: 128, label: '128 kbps — Balanced' }, { value: 192, label: '192 kbps — High' }, { value: 320, label: '320 kbps — Near lossless' } ]}
          onChange={(v) => updateOptions({ audio_bitrate: parseInt(v) })} />
        <SelectField id="audio-fmt" label="Output Format" value={operationOptions.audio_format || 'mp3'}
          options={[ { value: 'mp3', label: 'MP3 — Universal' }, { value: 'aac', label: 'AAC — Smaller' }, { value: 'ogg', label: 'OGG — Open-source' } ]}
          onChange={(v) => updateOptions({ audio_format: v })} />
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
          options={[ { value: 'natural', label: 'Natural' }, { value: 'vivid', label: 'Vivid' }, { value: 'sharp', label: 'Ultra Sharp' }, { value: 'clean', label: 'Denoise' }, { value: 'custom', label: 'Custom' } ]} />
        {(['brightness', 'contrast', 'sharpness'] as const).map((k) => (
          <SliderField key={k} id={`${k}-s`} label={k.charAt(0).toUpperCase() + k.slice(1)} unit="x"
            value={operationOptions[k] || 1.0} min={0.5} max={k === 'sharpness' ? 3.0 : 2.0} step={0.05}
            onChange={(v) => updateOptions({ [k]: v, enhance_preset: 'custom' })} />
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
        options={[ { value: 'all', label: 'Every page' }, { value: 'every', label: 'Every N pages' }, { value: 'range', label: 'Page range' } ]} />
      {operationOptions.split_mode === 'every' && <NumInput label="Pages per chunk" value={operationOptions.split_every || 1} min={1} onChange={(v) => updateOptions({ split_every: v })} />}
      {operationOptions.split_mode === 'range' && <TextField label="Page ranges" value={operationOptions.split_range || ''} placeholder="e.g. 1-3, 5, 7-10" mono hint="Comma-separated pages or ranges" onChange={(v) => updateOptions({ split_range: v })} />}
      <InfoBox icon={<Scissors className="h-4 w-4 text-primary" />} text="Runs entirely in your browser — no upload required." color="bg-primary/5 border-primary/15" />
    </div>
  );

  const renderResizeOptions = () => (
    <div className="space-y-5">
      {naturalDims && <div className="text-xs text-muted-foreground bg-muted/40 border border-border rounded-xl px-3 py-2 flex justify-between"><span>Original: <strong className="text-foreground">{naturalDims.width} × {naturalDims.height}px</strong></span><span>{(rawFiles[0]?.size / 1024).toFixed(0)} KB</span></div>}
      <PresetRow label="Common sizes" value=""
        onChange={(v) => { const [w, h] = (v as string).split('x').map(Number); updateOptions({ resize_width: w, resize_height: h, resize_lock_aspect: false }); }}
        options={[ { value: '1920x1080', label: '1080p' }, { value: '1280x720', label: '720p' }, { value: '800x600', label: '800×600' }, { value: '512x512', label: '512²' }, { value: '256x256', label: '256²' } ]} />
      <div className="grid grid-cols-2 gap-3">
        <NumInput label="Width (px)" value={operationOptions.resize_width || 800} min={1} max={8000} onChange={handleResizeWidth} />
        <NumInput label="Height (px)" value={operationOptions.resize_height || 600} min={1} max={8000} onChange={handleResizeHeight} />
      </div>
      <button onClick={() => updateOptions({ resize_lock_aspect: !operationOptions.resize_lock_aspect })}
        className={`flex items-center gap-2 text-xs font-semibold px-3 py-2 rounded-xl border transition-all ${operationOptions.resize_lock_aspect ? 'bg-primary/10 border-primary/30 text-primary' : 'bg-card border-border text-muted-foreground hover:border-primary/30'}`}>
        {operationOptions.resize_lock_aspect ? <Lock className="h-3.5 w-3.5" /> : <Unlock className="h-3.5 w-3.5" />}
        {operationOptions.resize_lock_aspect ? 'Aspect ratio locked' : 'Lock aspect ratio'}
      </button>
      <SelectField id="resize-fmt" label="Output Format" value={operationOptions.resize_format || 'png'}
        options={[ { value: 'png', label: 'PNG — Lossless' }, { value: 'jpeg', label: 'JPEG — Smaller' }, { value: 'webp', label: 'WEBP — Modern' } ]}
        onChange={(v) => updateOptions({ resize_format: v })} />
    </div>
  );

  const renderConvertOptions = () => {
    if (actionName === 'images_to_pdf') return <InfoBox icon={<Image className="h-4 w-4 text-primary" />} text={`${files.length} image${files.length !== 1 ? 's' : ''} will be packed into a PDF in upload order.`} color="bg-primary/5 border-primary/15" />;
    if (actionName === 'to_ico') {
      const sel: number[] = operationOptions.ico_sizes || [16, 32, 48, 64];
      return (
        <div className="space-y-5">
          <div className="space-y-2">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Include sizes</span>
            <div className="flex gap-2 flex-wrap">
              {[16, 24, 32, 48, 64, 128, 256].map((s) => (
                <button key={s} onClick={() => { const cur = operationOptions.ico_sizes || [16, 32, 48, 64]; const next = cur.includes(s) ? cur.filter((x: number) => x !== s) : [...cur, s].sort((a: number, b: number) => a - b); if (next.length) updateOptions({ ico_sizes: next }); }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${sel.includes(s) ? 'bg-primary text-primary-foreground border-primary' : 'bg-card text-muted-foreground border-border hover:border-primary/40'}`}>{s}px</button>
              ))}
            </div>
          </div>
        </div>
      );
    }
    if (actionName === 'svg_to_png') return (
      <div className="space-y-5">
        <PresetRow label="Resolution" value={`${operationOptions.svg_width || 512}x${operationOptions.svg_height || 512}`}
          onChange={(v) => { const [w, h] = (v as string).split('x').map(Number); updateOptions({ svg_width: w, svg_height: h }); }}
          options={[ { value: '256x256', label: '256²' }, { value: '512x512', label: '512²' }, { value: '1024x1024', label: '1024²' }, { value: '1920x1080', label: '1080p' } ]} />
        <div className="grid grid-cols-2 gap-3">
          <NumInput label="Width (px)" value={operationOptions.svg_width || 512} min={1} max={4096} onChange={(v) => updateOptions({ svg_width: v })} />
          <NumInput label="Height (px)" value={operationOptions.svg_height || 512} min={1} max={4096} onChange={(v) => updateOptions({ svg_height: v })} />
        </div>
      </div>
    );
    if (isImage && (actionName === 'convert_format' || actionName === 'convert')) return (
      <div className="space-y-5">
        <PresetRow label="Target format" value={operationOptions.target_format || 'webp'}
          onChange={(v) => updateOptions({ target_format: v })}
          options={[ { value: 'webp', label: 'WEBP' }, { value: 'png', label: 'PNG' }, { value: 'jpeg', label: 'JPEG' } ]} />
        <SliderField id="fmt-quality" label="Quality" unit="%" value={operationOptions.quality || 92} min={10} max={100} onChange={(v) => updateOptions({ quality: v })} hint="Only applies to JPEG and WEBP." />
      </div>
    );
    if (actionName === 'pdf_to_excel') return (
      <div className="space-y-4">
        <InfoBox icon={<FileSpreadsheet className="h-4 w-4 text-primary" />} text="Extracts all table data and structured content from the PDF into an Excel spreadsheet (.xlsx). Requires backend processing." />
        <PresetRow label="Extraction mode" value={operationOptions.excel_mode || 'tables'}
          onChange={(v) => updateOptions({ excel_mode: v })}
          options={[ { value: 'tables', label: 'Tables only' }, { value: 'all', label: 'All content' } ]} />
      </div>
    );
    if (actionName === 'pdf_to_pdfa') return renderPdfToPdfaOptions();
    if (actionName === 'pdf_translate') return renderPdfTranslateOptions();
    const msgs: Record<string, string> = {
      pdf_to_docx: 'PDF will be parsed into an editable DOCX.', pdf_to_pptx: 'Each PDF page becomes a slide in PPTX.',
      docx_to_pdf: 'Word document rendered into paginated PDF.', pptx_to_pdf: 'Each PowerPoint slide becomes a PDF page.',
      xlsx_to_csv: 'Spreadsheet cells exported as CSV rows.', csv_to_xlsx: 'CSV imported into Excel workbook.',
      md_to_html: 'Markdown compiled into styled HTML.', html_to_md: 'HTML converted into clean Markdown.',
    };
    if (actionName === 'html_to_zip') return (
      <div className="space-y-4">
        <div className="p-3 rounded-xl bg-primary/5 border border-primary/15 text-xs text-muted-foreground leading-relaxed">
          <FileArchive className="h-3.5 w-3.5 inline mr-1.5 text-primary" />
          Packages your HTML file and all companion assets (CSS, JS, images, fonts) into a single portable ZIP. Pick all files at once via the tool card. Runs entirely client-side — nothing leaves your browser.
        </div>
        <div className="space-y-3">
          <div className="p-3 rounded-xl bg-card border border-border">
            <p className="text-xs font-semibold text-foreground mb-1">Files queued for ZIP</p>
            {rawFiles.length === 0
              ? <p className="text-xs text-muted-foreground italic">No files loaded yet.</p>
              : rawFiles.map(f => (
                  <div key={f.name} className="flex items-center gap-2 py-1">
                    <FileCode className="h-3 w-3 text-primary shrink-0" />
                    <span className="text-xs font-mono text-foreground truncate">{f.name}</span>
                    <span className="text-[10px] text-muted-foreground ml-auto shrink-0">{(f.size / 1024).toFixed(1)} KB</span>
                  </div>
                ))
            }
          </div>
          <button
            onClick={() => updateOptions({ html_zip_inline: !operationOptions.html_zip_inline })}
            className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border transition-all text-xs font-semibold ${operationOptions.html_zip_inline ? 'bg-primary/10 border-primary/30 text-primary' : 'bg-card border-border text-muted-foreground hover:border-primary/30'}`}
          >
            <span>Inline assets mode</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${operationOptions.html_zip_inline ? 'bg-primary/20 border-primary/40 text-primary' : 'bg-muted border-border text-muted-foreground'}`}>
              {operationOptions.html_zip_inline ? 'ON' : 'OFF'}
            </span>
          </button>
          {operationOptions.html_zip_inline && (
            <div className="p-3 rounded-xl bg-amber-500/5 border border-amber-500/20 text-xs text-amber-400 leading-relaxed">
              In inline mode, CSS/JS/image references in the HTML file are replaced with base64 data URIs and the result is zipped as a single self-contained file.
            </div>
          )}
        </div>
      </div>
    );
    if (msgs[actionName]) return <InfoBox icon={<ArrowLeftRight className="h-4 w-4 text-primary" />} text={msgs[actionName]} />;
    if (actionName === 'pdf_to_images') return (
      <SelectField id="dpi-sel" label="Output Resolution" value={operationOptions.dpi || 150}
        options={[ { value: 72, label: '72 DPI — Screen' }, { value: 150, label: '150 DPI — Standard' }, { value: 300, label: '300 DPI — Print' } ]}
        onChange={(v) => updateOptions({ dpi: parseInt(v) })} />
    );
    if (actionName === 'video_to_audio') return <SelectField id="audio-fmt-ex" label="Audio Format" value={operationOptions.audio_format || 'mp3'} options={[ { value: 'mp3', label: 'MP3' }, { value: 'aac', label: 'AAC' }, { value: 'wav', label: 'WAV' } ]} onChange={(v) => updateOptions({ audio_format: v })} />;
    if (actionName === 'video_to_gif') return (
      <div className="space-y-5">
        <div className="grid grid-cols-2 gap-3">
          <NumInput label="Start (s)" value={operationOptions.start_time || 0} min={0} onChange={(v) => updateOptions({ start_time: v })} />
          <NumInput label="End (s)" value={operationOptions.end_time || 5} min={1} onChange={(v) => updateOptions({ end_time: v })} />
        </div>
        <SliderField id="gif-fps" label="Frame Rate" unit=" fps" value={operationOptions.gif_fps || 10} min={5} max={30} onChange={(v) => updateOptions({ gif_fps: v })} />
      </div>
    );
    return <InfoBox icon={<RefreshCw className="h-4 w-4 text-primary" />} text="Convert file to the selected destination format." />;
  };

  // ── Insert Link options ────────────────────────────────────────────────────
  const renderPdfInsertLinkOptions = () => {
    const addLink = () => setPdfLinks(prev => [...prev, {
      id: `lnk-${Date.now()}`, page: 1, x: 60, y: 80 + prev.length * 30, width: 200, height: 20,
      url: '', borderColorHex: '#1a56db', showHighlight: true, highlightColorHex: '#dbeafe', labelText: '', borderWidth: 1,
    }]);
    const updateLink = (id: string, patch: Partial<PdfLink>) => setPdfLinks(prev => prev.map(l => l.id === id ? { ...l, ...patch } : l));
    const removeLink = (id: string) => setPdfLinks(prev => prev.length > 1 ? prev.filter(l => l.id !== id) : prev);

    return (
      <div className="space-y-4">
        <div className="p-3 rounded-xl bg-primary/5 border border-primary/15 text-xs text-muted-foreground leading-relaxed">
          <Globe className="h-3.5 w-3.5 inline mr-1.5 text-primary" />
          Adds a clickable hyperlink annotation on any area of the page. The area is highlighted and the URL opens when clicked in any PDF reader. Coordinates in points from top-left. A4 = 595 × 842 pt.
        </div>
        <div className="space-y-3">
          {pdfLinks.map((link, idx) => (
            <div key={link.id} className="border border-border rounded-xl p-3 space-y-3 bg-card/50">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-foreground">Link {idx + 1}</span>
                <button onClick={() => removeLink(link.id)} className="h-6 w-6 rounded-md bg-destructive/10 text-destructive flex items-center justify-center hover:bg-destructive/20 transition-colors">
                  <Minus className="h-3 w-3" />
                </button>
              </div>
              <TextField label="URL" value={link.url} placeholder="https://example.com" mono
                onChange={(v) => updateLink(link.id, { url: v })} />
              <TextField label="Label text (shown inside box, optional)" value={link.labelText || ''} placeholder="Click here"
                onChange={(v) => updateLink(link.id, { labelText: v })} />
              <div className="grid grid-cols-2 gap-2">
                <NumInput label="Page #" value={link.page} min={1} onChange={(v) => updateLink(link.id, { page: v })} />
                <div className="space-y-1">
                  <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Border width</label>
                  <input type="number" min={0} max={4} value={link.borderWidth ?? 1}
                    onChange={(e) => updateLink(link.id, { borderWidth: parseInt(e.target.value) || 0 })}
                    className="w-full p-2 bg-card border border-border rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/40" />
                </div>
              </div>
              <div className="grid grid-cols-4 gap-2">
                {([['X', 'x'], ['Y (top)', 'y'], ['W', 'width'], ['H', 'height']] as [string, keyof PdfLink][]).map(([lbl, key]) => (
                  <div key={key} className="space-y-1">
                    <label className="text-[9px] text-muted-foreground">{lbl}</label>
                    <input type="number" min={0} value={(link as any)[key] || 0}
                      onChange={(e) => updateLink(link.id, { [key]: parseInt(e.target.value) || 0 })}
                      className="w-full p-1.5 bg-card border border-border rounded-md text-xs font-mono focus:outline-none focus:ring-1 focus:ring-primary/40" />
                  </div>
                ))}
              </div>
              <div className="flex gap-4 flex-wrap items-center">
                <div className="flex items-center gap-2">
                  <label className="text-[10px] text-muted-foreground font-semibold">Border color</label>
                  <input type="color" value={link.borderColorHex || '#1a56db'}
                    onChange={(e) => updateLink(link.id, { borderColorHex: e.target.value })}
                    className="h-7 w-10 rounded border border-border cursor-pointer bg-card p-0.5" />
                </div>
                <button onClick={() => updateLink(link.id, { showHighlight: !link.showHighlight })}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${link.showHighlight ? 'bg-primary/10 border-primary/30 text-primary' : 'bg-card border-border text-muted-foreground'}`}>
                  Highlight fill: {link.showHighlight ? 'ON' : 'OFF'}
                </button>
                {link.showHighlight && (
                  <div className="flex items-center gap-2">
                    <label className="text-[10px] text-muted-foreground font-semibold">Fill color</label>
                    <input type="color" value={link.highlightColorHex || '#dbeafe'}
                      onChange={(e) => updateLink(link.id, { highlightColorHex: e.target.value })}
                      className="h-7 w-10 rounded border border-border cursor-pointer bg-card p-0.5" />
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
        <button onClick={addLink} className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-dashed border-primary/40 text-primary text-xs font-semibold hover:bg-primary/5 transition-all">
          <Plus className="h-4 w-4" /> Add another link
        </button>
      </div>
    );
  };

  // ── Insert Image options ────────────────────────────────────────────────────
  const renderPdfInsertImageOptions = () => {
    const addImgEntry = () => setPdfInsertImages(prev => [...prev, {
      id: `img-${Date.now()}`, page: 1, x: 60, y: 60 + prev.length * 160,
      width: 200, height: 150, mimeType: 'image/png', buffer: new ArrayBuffer(0), opacity: 1.0,
    }]);
    const updateImgEntry = (id: string, patch: any) => setPdfInsertImages(prev => prev.map(i => i.id === id ? { ...i, ...patch } : i));
    const removeImgEntry = (id: string) => setPdfInsertImages(prev => prev.length > 1 ? prev.filter(i => i.id !== id) : prev);

    const pickFile = (id: string) => {
      const input = document.createElement('input');
      input.type = 'file'; input.accept = 'image/png,image/jpeg,image/jpg';
      input.onchange = (e) => {
        const f = (e.target as HTMLInputElement).files?.[0];
        if (f) updateImgEntry(id, { file: f, mimeType: f.type });
      };
      input.click();
    };

    return (
      <div className="space-y-4">
        <div className="p-3 rounded-xl bg-primary/5 border border-primary/15 text-xs text-muted-foreground leading-relaxed">
          <ImageIcon className="h-3.5 w-3.5 inline mr-1.5 text-primary" />
          Pick a PNG or JPEG and place it at exact coordinates on any page. Runs entirely client-side — images are embedded directly into the PDF.
        </div>
        <div className="space-y-3">
          {pdfInsertImages.map((img, idx) => (
            <div key={img.id} className="border border-border rounded-xl p-3 space-y-3 bg-card/50">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-foreground">Image {idx + 1}</span>
                <button onClick={() => removeImgEntry(img.id)} className="h-6 w-6 rounded-md bg-destructive/10 text-destructive flex items-center justify-center hover:bg-destructive/20 transition-colors">
                  <Minus className="h-3 w-3" />
                </button>
              </div>
              <button onClick={() => pickFile(img.id)}
                className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 border-dashed text-xs font-semibold transition-all ${(img as any).file ? 'border-emerald-500/40 bg-emerald-500/5 text-emerald-400' : 'border-primary/30 bg-primary/5 text-primary hover:bg-primary/10'}`}>
                <ImageIcon className="h-4 w-4" />
                {(img as any).file ? `✓ ${((img as any).file as File).name}` : 'Choose image (PNG / JPEG)'}
              </button>
              <div className="grid grid-cols-2 gap-2">
                <NumInput label="Page #" value={img.page} min={1} onChange={(v) => updateImgEntry(img.id, { page: v })} />
                <div />
              </div>
              <div className="grid grid-cols-4 gap-2">
                {([['X', 'x'], ['Y (top)', 'y'], ['W', 'width'], ['H', 'height']] as [string, string][]).map(([lbl, key]) => (
                  <div key={key} className="space-y-1">
                    <label className="text-[9px] text-muted-foreground">{lbl}</label>
                    <input type="number" min={0} value={(img as any)[key] || 0}
                      onChange={(e) => updateImgEntry(img.id, { [key]: parseInt(e.target.value) || 0 })}
                      className="w-full p-1.5 bg-card border border-border rounded-md text-xs font-mono focus:outline-none focus:ring-1 focus:ring-primary/40" />
                  </div>
                ))}
              </div>
              <SliderField id={`img-op-${img.id}`} label="Opacity" unit="%" value={Math.round((img.opacity ?? 1) * 100)} min={10} max={100}
                onChange={(v) => updateImgEntry(img.id, { opacity: v / 100 })} />
              <div className="flex items-center gap-3">
                <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Border width</label>
                <input type="number" min={0} max={10} value={img.borderWidth ?? 0}
                  onChange={(e) => updateImgEntry(img.id, { borderWidth: parseInt(e.target.value) || 0 })}
                  className="w-20 p-1.5 bg-card border border-border rounded-lg text-xs font-mono focus:outline-none focus:ring-1 focus:ring-primary/40" />
                {(img.borderWidth ?? 0) > 0 && (
                  <input type="color" value={img.borderColorHex || '#000000'}
                    onChange={(e) => updateImgEntry(img.id, { borderColorHex: e.target.value })}
                    className="h-7 w-10 rounded border border-border cursor-pointer bg-card p-0.5" />
                )}
              </div>
            </div>
          ))}
        </div>
        <button onClick={addImgEntry} className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-dashed border-primary/40 text-primary text-xs font-semibold hover:bg-primary/5 transition-all">
          <Plus className="h-4 w-4" /> Add another image
        </button>
      </div>
    );
  };

  // ── Draw Shapes options ──────────────────────────────────────────────────────
  const renderPdfInsertShapeOptions = () => {
    const shapeTypeLabels: Record<string, string> = { rectangle: 'Rectangle', ellipse: 'Ellipse / Circle', line: 'Line', arrow: 'Arrow' };
    const isLineLike = (t: string) => t === 'line' || t === 'arrow';

    const addShape = () => setPdfShapes(prev => [...prev, {
      id: `shp-${Date.now()}`, page: 1, type: 'rectangle',
      x: 60, y: 60 + prev.length * 100, width: 150, height: 80,
      fillColorHex: '#4f46e5', fillOpacity: 0.15, strokeColorHex: '#4f46e5', strokeWidth: 2,
    }]);
    const updateShape = (id: string, patch: Partial<PdfShape>) => setPdfShapes(prev => prev.map(s => s.id === id ? { ...s, ...patch } : s));
    const removeShape = (id: string) => setPdfShapes(prev => prev.length > 1 ? prev.filter(s => s.id !== id) : prev);

    return (
      <div className="space-y-4">
        <div className="p-3 rounded-xl bg-primary/5 border border-primary/15 text-xs text-muted-foreground leading-relaxed">
          <PenTool className="h-3.5 w-3.5 inline mr-1.5 text-primary" />
          Draw filled or stroked shapes on any page. Coordinates are points from the top-left (Y downward). A4 = 595 × 842 pt.
        </div>
        <div className="space-y-3">
          {pdfShapes.map((shape, idx) => {
            const lineMode = isLineLike(shape.type);
            return (
              <div key={shape.id} className="border border-border rounded-xl p-3 space-y-3 bg-card/50">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-foreground">Shape {idx + 1}</span>
                  <button onClick={() => removeShape(shape.id)} className="h-6 w-6 rounded-md bg-destructive/10 text-destructive flex items-center justify-center hover:bg-destructive/20 transition-colors">
                    <Minus className="h-3 w-3" />
                  </button>
                </div>
                <div className="grid grid-cols-4 gap-1.5">
                  {(['rectangle', 'ellipse', 'line', 'arrow'] as const).map((t) => (
                    <button key={t} onClick={() => updateShape(shape.id, { type: t })}
                      className={`py-1.5 rounded-lg text-[10px] font-semibold border transition-all ${shape.type === t ? 'bg-primary text-primary-foreground border-primary' : 'bg-card border-border text-muted-foreground hover:border-primary/40'}`}>
                      {shapeTypeLabels[t]}
                    </button>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <NumInput label="Page #" value={shape.page} min={1} onChange={(v) => updateShape(shape.id, { page: v })} />
                  <NumInput label="Stroke width" value={shape.strokeWidth ?? 2} min={1} max={20} onChange={(v) => updateShape(shape.id, { strokeWidth: v })} />
                </div>
                {lineMode ? (
                  <div className="grid grid-cols-4 gap-2">
                    {([['X1', 'x'], ['Y1', 'y'], ['X2', 'x2'], ['Y2', 'y2']] as [string, keyof PdfShape][]).map(([lbl, key]) => (
                      <div key={key} className="space-y-1">
                        <label className="text-[9px] text-muted-foreground">{lbl}</label>
                        <input type="number" min={0} value={(shape as any)[key] || 0}
                          onChange={(e) => updateShape(shape.id, { [key]: parseInt(e.target.value) || 0 })}
                          className="w-full p-1.5 bg-card border border-border rounded-md text-xs font-mono focus:outline-none focus:ring-1 focus:ring-primary/40" />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="grid grid-cols-4 gap-2">
                    {([['X', 'x'], ['Y (top)', 'y'], ['W', 'width'], ['H', 'height']] as [string, keyof PdfShape][]).map(([lbl, key]) => (
                      <div key={key} className="space-y-1">
                        <label className="text-[9px] text-muted-foreground">{lbl}</label>
                        <input type="number" min={0} value={(shape as any)[key] || 0}
                          onChange={(e) => updateShape(shape.id, { [key]: parseInt(e.target.value) || 0 })}
                          className="w-full p-1.5 bg-card border border-border rounded-md text-xs font-mono focus:outline-none focus:ring-1 focus:ring-primary/40" />
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex gap-4 flex-wrap items-start">
                  <div className="space-y-1">
                    <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Stroke color</label>
                    <input type="color" value={shape.strokeColorHex || '#4f46e5'}
                      onChange={(e) => updateShape(shape.id, { strokeColorHex: e.target.value })}
                      className="h-8 w-12 rounded border border-border cursor-pointer bg-card p-0.5 block" />
                  </div>
                  {!lineMode && (
                    <>
                      <div className="space-y-1">
                        <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Fill color</label>
                        <input type="color" value={shape.fillColorHex || '#4f46e5'}
                          onChange={(e) => updateShape(shape.id, { fillColorHex: e.target.value })}
                          className="h-8 w-12 rounded border border-border cursor-pointer bg-card p-0.5 block" />
                      </div>
                      <button onClick={() => updateShape(shape.id, { noFill: !shape.noFill })}
                        className={`mt-5 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${shape.noFill ? 'bg-card border-border text-muted-foreground' : 'bg-primary/10 border-primary/30 text-primary'}`}>
                        {shape.noFill ? 'Fill: OFF' : 'Fill: ON'}
                      </button>
                      {!shape.noFill && (
                        <div className="space-y-1">
                          <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Fill opacity %</label>
                          <input type="number" min={5} max={100} value={Math.round((shape.fillOpacity ?? 0.15) * 100)}
                            onChange={(e) => updateShape(shape.id, { fillOpacity: (parseInt(e.target.value) || 15) / 100 })}
                            className="w-20 p-1.5 bg-card border border-border rounded-lg text-xs font-mono focus:outline-none focus:ring-1 focus:ring-primary/40" />
                        </div>
                      )}
                    </>
                  )}
                </div>
                {!lineMode && (
                  <TextField label="Label text inside shape (optional)" value={shape.labelText || ''} placeholder="e.g. Note, Action required"
                    onChange={(v) => updateShape(shape.id, { labelText: v })} />
                )}
              </div>
            );
          })}
        </div>
        <button onClick={addShape} className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-dashed border-primary/40 text-primary text-xs font-semibold hover:bg-primary/5 transition-all">
          <Plus className="h-4 w-4" /> Add another shape
        </button>
      </div>
    );
  };

  const renderEditOptions = () => {
    switch (actionName) {
      case 'pdf_crop':         return renderPdfCropOptions();
      case 'pdf_annotate':     return renderPdfAnnotateOptions();
      case 'pdf_redact':       return renderPdfRedactOptions();
      case 'pdf_sign':         return renderPdfSignOptions();
      case 'pdf_unlock':       return renderPdfUnlockOptions();
      case 'pdf_protect':      return renderPdfProtectOptions();
      case 'pdf_rotate':       return renderPdfRotateOptions();
      case 'pdf_delete':       return renderPdfDeleteOptions();
      case 'pdf_watermark':    return renderPdfWatermarkOptions();
      case 'pdf_page_numbers': return renderPdfPageNumbersOptions();
      case 'pdf_reorder':      return renderPdfReorderOptions();
      case 'pdf_forms':        return renderPdfFormsOptions();
      case 'pdf_ocr':          return renderPdfOcrOptions();
      case 'pdf_compare':      return renderPdfCompareOptions();
      case 'pdf_summarize':    return renderPdfSummarizeOptions();
      case 'scan_to_pdf':      return renderScanToPdfOptions();
      case 'remove_bg':        return renderRemoveBgOptions();
      case 'image_crop':       return renderImageCropOptions();
      case 'image_rotate':       return renderImageRotateOptions();
      case 'image_watermark':    return renderImageWatermarkOptions();
      case 'pdf_insert_link':    return renderPdfInsertLinkOptions();
      case 'pdf_insert_image':   return renderPdfInsertImageOptions();
      case 'pdf_insert_shape':   return renderPdfInsertShapeOptions();
      case 'trim':             return (
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-3">
            <NumInput label="Start (seconds)" value={operationOptions.start_time || 0} min={0} onChange={(v) => updateOptions({ start_time: v })} />
            <NumInput label="End (seconds)" value={operationOptions.end_time || 10} min={1} onChange={(v) => updateOptions({ end_time: v })} />
          </div>
        </div>
      );
      case 'docx_cleanup':     return <InfoBox icon={<Sliders className="h-4 w-4 text-primary" />} text="Clears duplicate blank paragraphs, aligns margins, and normalizes font weights." />;
      default: return null;
    }
  };

  const renderOptions = () => {
    if (isScanMode) return renderScanToPdfOptions();
    switch (selectedOperation) {
      case 'compress': return renderCompressOptions();
      case 'enhance':  return renderEnhanceOptions();
      case 'convert':  return renderConvertOptions();
      case 'edit':     return renderEditOptions();
      case 'split':    return renderSplitOptions();
      case 'resize':   return renderResizeOptions();
      case 'merge':    return <InfoBox icon={<FileText className="h-4 w-4 text-primary" />} text="Files will be merged in upload order. Drag to reorder before processing." color="bg-primary/5 border-primary/15" />;
      default: return null;
    }
  };

  const actionLabels: Record<string, string> = {
    pdf_crop: 'Crop Pages', pdf_annotate: 'Edit PDF', pdf_redact: 'Redact PDF',
    pdf_sign: 'Sign PDF', pdf_unlock: 'Unlock PDF', pdf_protect: 'Protect PDF',
    pdf_rotate: 'Rotate Pages', pdf_delete: 'Delete Pages', pdf_watermark: 'Add Watermark',
    pdf_page_numbers: 'Add Page Numbers', pdf_reorder: 'Reorder Pages',
    pdf_forms: 'PDF Forms', pdf_ocr: 'OCR PDF', pdf_compare: 'Compare PDFs',
    pdf_summarize: 'AI Summarize', pdf_translate: 'Translate PDF',
    pdf_to_excel: 'PDF → Excel', pdf_to_pdfa: 'PDF to PDF/A', scan_to_pdf: 'Scan to PDF',
    pdf_insert_link: 'Insert Link', pdf_insert_image: 'Insert Image', pdf_insert_shape: 'Draw Shapes',
    html_to_zip: 'HTML → ZIP',
    remove_bg: 'Remove Background', image_crop: 'Crop Image', image_rotate: 'Rotate & Flip', image_watermark: 'Add Watermark',
  };
  const operationLabels: Record<string, string> = {
    compress: 'Compress', enhance: 'Enhance', convert: 'Convert', resize: 'Resize', edit: 'Edit', split: 'Split PDF', merge: 'Merge PDFs',
  };
  const panelTitle = actionLabels[actionName] || operationLabels[selectedOperation] || 'Operation';

  const fileCount = isScanMode ? (scannedFile ? 1 : 0) : files.length;

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
              : <><Play className="h-4 w-4 fill-current" /><span>Process {fileCount > 1 ? `${fileCount} files` : 'file'}</span></>
            }
          </button>
        </div>
      </div>
    </motion.div>
  );
};

export default OptionsPanel;
