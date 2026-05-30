import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { m as motion } from 'framer-motion';
import {
  Download, FlipHorizontal, FlipVertical, Image as ImageIcon, RotateCcw,
  RotateCw, Scissors, Sliders, Sparkles, Type, Undo2
} from 'lucide-react';
import { useFileStore } from '@/store/useFileStore';

type OutputFormat = 'png' | 'jpeg' | 'webp';

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const loadBitmap = (file: File) => new Promise<HTMLImageElement>((resolve, reject) => {
  const img = new Image();
  const url = URL.createObjectURL(file);
  img.onload = () => {
    URL.revokeObjectURL(url);
    resolve(img);
  };
  img.onerror = () => {
    URL.revokeObjectURL(url);
    reject(new Error('Unable to load image.'));
  };
  img.src = url;
});

const formatBytes = (bytes: number) => {
  if (!bytes) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const index = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, index)).toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
};

const RangeField: React.FC<{
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  suffix?: string;
  onChange: (value: number) => void;
}> = ({ label, value, min, max, step = 1, suffix = '', onChange }) => (
  <label className="space-y-2">
    <span className="flex items-center justify-between text-xs font-semibold text-muted-foreground">
      <span>{label}</span>
      <span className="text-foreground tabular-nums">{value}{suffix}</span>
    </span>
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(event) => onChange(Number(event.target.value))}
      className="w-full accent-primary"
    />
  </label>
);

export const LiveImageEditor: React.FC = () => {
  const {
    rawFiles, files, selectedOperation, setDownloadUrl, setSavings, setProgress, setProcessing, updateOptions
  } = useFileStore();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [sourceImage, setSourceImage] = useState<HTMLImageElement | null>(null);
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [saturation, setSaturation] = useState(100);
  const [blur, setBlur] = useState(0);
  const [rotate, setRotate] = useState(0);
  const [flipH, setFlipH] = useState(false);
  const [flipV, setFlipV] = useState(false);
  const [crop, setCrop] = useState({ left: 0, top: 0, right: 0, bottom: 0 });
  const [watermark, setWatermark] = useState('');
  const [watermarkSize, setWatermarkSize] = useState(6);
  const [format, setFormat] = useState<OutputFormat>('png');
  const [quality, setQuality] = useState(92);
  const [compressionTarget, setCompressionTarget] = useState(25);
  const [outputScale, setOutputScale] = useState(100);
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState('');

  const sourceFile = rawFiles.find((file) => file.type.startsWith('image/')) || rawFiles[0];
  const uploadedFile = files[0];
  const isReady = Boolean(sourceFile && sourceImage);

  useEffect(() => {
    let cancelled = false;
    setError('');
    setSourceImage(null);
    if (!sourceFile || !sourceFile.type.startsWith('image/')) return;

    loadBitmap(sourceFile)
      .then((img) => {
        if (!cancelled) setSourceImage(img);
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err.message);
      });

    return () => {
      cancelled = true;
    };
  }, [sourceFile]);

  const cropPixels = useMemo(() => {
    if (!sourceImage) return null;
    const sx = Math.round(sourceImage.naturalWidth * crop.left / 100);
    const sy = Math.round(sourceImage.naturalHeight * crop.top / 100);
    const ex = Math.round(sourceImage.naturalWidth * (100 - crop.right) / 100);
    const ey = Math.round(sourceImage.naturalHeight * (100 - crop.bottom) / 100);
    return {
      sx,
      sy,
      sw: Math.max(1, ex - sx),
      sh: Math.max(1, ey - sy),
    };
  }, [crop, sourceImage]);

  const drawToCanvas = useCallback((canvas: HTMLCanvasElement, exportSize: boolean) => {
    if (!sourceImage || !cropPixels) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rotated = rotate === 90 || rotate === 270;
    const scaleForExport = exportSize ? outputScale / 100 : 1;
    const outputWidth = Math.max(1, Math.round((rotated ? cropPixels.sh : cropPixels.sw) * scaleForExport));
    const outputHeight = Math.max(1, Math.round((rotated ? cropPixels.sw : cropPixels.sh) * scaleForExport));
    const previewScale = exportSize ? 1 : Math.min(1, 980 / Math.max(outputWidth, outputHeight));

    canvas.width = Math.max(1, Math.round(outputWidth * previewScale));
    canvas.height = Math.max(1, Math.round(outputHeight * previewScale));
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.scale(previewScale, previewScale);
    ctx.translate(outputWidth / 2, outputHeight / 2);
    ctx.rotate((rotate * Math.PI) / 180);
    ctx.scale(flipH ? -1 : 1, flipV ? -1 : 1);
    ctx.filter = `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%) blur(${blur}px)`;
    ctx.drawImage(
      sourceImage,
      cropPixels.sx,
      cropPixels.sy,
      cropPixels.sw,
      cropPixels.sh,
      -cropPixels.sw * scaleForExport / 2,
      -cropPixels.sh * scaleForExport / 2,
      cropPixels.sw * scaleForExport,
      cropPixels.sh * scaleForExport
    );
    ctx.restore();

    if (watermark.trim()) {
      const fontSize = Math.max(14, Math.round(Math.min(canvas.width, canvas.height) * watermarkSize / 100));
      ctx.save();
      ctx.font = `800 ${fontSize}px Inter, Arial, sans-serif`;
      ctx.fillStyle = 'rgba(255,255,255,0.72)';
      ctx.strokeStyle = 'rgba(0,0,0,0.45)';
      ctx.lineWidth = Math.max(2, fontSize * 0.08);
      ctx.textBaseline = 'bottom';
      const x = canvas.width - 24;
      const y = canvas.height - 20;
      ctx.textAlign = 'right';
      ctx.strokeText(watermark, x, y);
      ctx.fillText(watermark, x, y);
      ctx.restore();
    }
  }, [blur, brightness, contrast, cropPixels, flipH, flipV, outputScale, rotate, saturation, sourceImage, watermark, watermarkSize]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !sourceImage) return;
    drawToCanvas(canvas, false);
  }, [drawToCanvas, sourceImage]);

  const resetEditor = () => {
    setBrightness(100);
    setContrast(100);
    setSaturation(100);
    setBlur(0);
    setRotate(0);
    setFlipH(false);
    setFlipV(false);
    setCrop({ left: 0, top: 0, right: 0, bottom: 0 });
    setWatermark('');
    setWatermarkSize(6);
    setFormat('png');
    setQuality(92);
    setCompressionTarget(25);
    setOutputScale(100);
  };

  const applyCompressionTarget = (target: number) => {
    setCompressionTarget(target);
    if (target <= 10) {
      setFormat('png');
      setQuality(96);
      setOutputScale(100);
      return;
    }
    setFormat('webp');
    setQuality(clamp(96 - target * 0.72, 34, 92));
    setOutputScale(clamp(108 - target * 0.58, 55, 100));
  };

  useEffect(() => {
    if (selectedOperation === 'compress') applyCompressionTarget(45);
  }, [selectedOperation]);

  const exportImage = async () => {
    if (!sourceFile || !sourceImage) return;
    setIsExporting(true);
    setProcessing(true);
    setProgress(20);
    try {
      const canvas = document.createElement('canvas');
      drawToCanvas(canvas, true);
      const mime = `image/${format}`;
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          (result) => result ? resolve(result) : reject(new Error('Export failed.')),
          mime,
          format === 'png' ? undefined : quality / 100
        );
      });
      const url = URL.createObjectURL(blob);
      setProgress(100);
      setDownloadUrl(url);
      setSavings({
        originalSize: sourceFile.size,
        newSize: blob.size,
        percent: Math.round(((sourceFile.size - blob.size) / sourceFile.size) * 100),
      });
      updateOptions({
        operation: 'live_image_editor',
        output_format: format,
        quality,
        compression_target: compressionTarget,
        output_scale: outputScale,
        brightness: brightness / 100,
        contrast: contrast / 100,
        saturation: saturation / 100,
        rotate,
        flipH,
        flipV,
      });
    } catch (err: any) {
      setError(err.message || 'Export failed.');
    } finally {
      setProcessing(false);
      setIsExporting(false);
    }
  };

  if (!sourceFile || !sourceFile.type.startsWith('image/')) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full max-w-6xl mx-auto rounded-2xl border border-border bg-card shadow-premium overflow-hidden"
    >
      <div className="flex flex-col lg:flex-row min-h-[620px]">
        <div className="flex-1 bg-muted/20 border-b lg:border-b-0 lg:border-r border-border p-3 sm:p-4">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="h-10 w-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shrink-0">
                <ImageIcon className="h-5 w-5 text-blue-400" />
              </div>
              <div className="min-w-0">
                <h2 className="text-sm font-black text-foreground">Live Image Editor</h2>
                <p className="text-xs text-muted-foreground truncate">{uploadedFile?.name || sourceFile.name}</p>
              </div>
            </div>
            <div className="text-[11px] text-muted-foreground">
              {sourceImage ? `${sourceImage.naturalWidth} x ${sourceImage.naturalHeight}` : 'Loading'} · {formatBytes(sourceFile.size)}
            </div>
          </div>

          <div className="min-h-[420px] rounded-xl border border-border bg-background/70 overflow-auto flex items-center justify-center p-3">
            {error ? (
              <p className="text-sm text-red-400">{error}</p>
            ) : !isReady ? (
              <div className="flex flex-col items-center gap-3 text-muted-foreground">
                <Sparkles className="h-8 w-8 animate-pulse text-primary" />
                <p className="text-sm font-semibold">Preparing editor...</p>
              </div>
            ) : (
              <canvas ref={canvasRef} className="max-w-full rounded-lg shadow-premium bg-white" />
            )}
          </div>
        </div>

        <aside className="w-full lg:w-[360px] p-4 sm:p-5 space-y-5 overflow-y-auto">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-black text-foreground">Realtime Controls</p>
              <p className="text-[11px] text-muted-foreground">Changes update instantly on the canvas.</p>
            </div>
            <button onClick={resetEditor} className="h-9 w-9 rounded-xl border border-border bg-card hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground">
              <Undo2 className="h-4 w-4" />
            </button>
          </div>

          <section className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
              <Sliders className="h-3.5 w-3.5" /> Tune
            </div>
            <RangeField label="Brightness" value={brightness} min={40} max={180} suffix="%" onChange={setBrightness} />
            <RangeField label="Contrast" value={contrast} min={40} max={180} suffix="%" onChange={setContrast} />
            <RangeField label="Saturation" value={saturation} min={0} max={220} suffix="%" onChange={setSaturation} />
            <RangeField label="Soft blur" value={blur} min={0} max={8} step={0.5} suffix="px" onChange={setBlur} />
          </section>

          <section className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
              <RotateCw className="h-3.5 w-3.5" /> Transform
            </div>
            <div className="grid grid-cols-4 gap-2">
              {[0, 90, 180, 270].map((deg) => (
                <button key={deg} onClick={() => setRotate(deg)}
                  className={`rounded-xl border py-2 text-xs font-bold ${rotate === deg ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-card text-muted-foreground hover:text-foreground'}`}>
                  {deg}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => setFlipH((v) => !v)}
                className={`flex items-center justify-center gap-2 rounded-xl border py-2 text-xs font-bold ${flipH ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground'}`}>
                <FlipHorizontal className="h-4 w-4" /> Flip X
              </button>
              <button onClick={() => setFlipV((v) => !v)}
                className={`flex items-center justify-center gap-2 rounded-xl border py-2 text-xs font-bold ${flipV ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground'}`}>
                <FlipVertical className="h-4 w-4" /> Flip Y
              </button>
            </div>
          </section>

          <section className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
              <Scissors className="h-3.5 w-3.5" /> Crop Edges
            </div>
            <RangeField label="Left" value={crop.left} min={0} max={45} suffix="%" onChange={(v) => setCrop((c) => ({ ...c, left: clamp(v, 0, 100 - c.right - 5) }))} />
            <RangeField label="Top" value={crop.top} min={0} max={45} suffix="%" onChange={(v) => setCrop((c) => ({ ...c, top: clamp(v, 0, 100 - c.bottom - 5) }))} />
            <RangeField label="Right" value={crop.right} min={0} max={45} suffix="%" onChange={(v) => setCrop((c) => ({ ...c, right: clamp(v, 0, 100 - c.left - 5) }))} />
            <RangeField label="Bottom" value={crop.bottom} min={0} max={45} suffix="%" onChange={(v) => setCrop((c) => ({ ...c, bottom: clamp(v, 0, 100 - c.top - 5) }))} />
          </section>

          <section className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
              <Type className="h-3.5 w-3.5" /> Watermark
            </div>
            <input
              value={watermark}
              onChange={(event) => setWatermark(event.target.value)}
              placeholder="Optional text"
              className="w-full rounded-xl border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
            <RangeField label="Text size" value={watermarkSize} min={3} max={16} suffix="%" onChange={setWatermarkSize} />
          </section>

          <section className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
              <Download className="h-3.5 w-3.5" /> Export
            </div>
            <div className="grid grid-cols-3 gap-2">
              {(['png', 'jpeg', 'webp'] as OutputFormat[]).map((item) => (
                <button key={item} onClick={() => setFormat(item)}
                  className={`rounded-xl border py-2 text-xs font-bold uppercase ${format === item ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-card text-muted-foreground hover:text-foreground'}`}>
                  {item}
                </button>
              ))}
            </div>
            {format !== 'png' && (
              <RangeField label="Quality" value={quality} min={30} max={100} suffix="%" onChange={setQuality} />
            )}
            <RangeField
              label="Compress target"
              value={compressionTarget}
              min={0}
              max={85}
              suffix="%"
              onChange={applyCompressionTarget}
            />
            <div className="rounded-xl border border-border bg-muted/35 px-3 py-2 text-[11px] text-muted-foreground">
              A higher target makes a smaller file by lowering quality and, when useful, image dimensions. Current export scale: <span className="font-bold text-foreground">{outputScale}%</span>.
            </div>
            <button
              onClick={exportImage}
              disabled={!isReady || isExporting}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-black text-primary-foreground hover:opacity-95 disabled:opacity-50"
            >
              {isExporting ? <RotateCcw className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              Export Edited Image
            </button>
          </section>
        </aside>
      </div>
    </motion.div>
  );
};

export default LiveImageEditor;
