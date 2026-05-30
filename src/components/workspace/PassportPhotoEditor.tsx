import React, { useEffect, useMemo, useState } from 'react';
import { Search, Check, Camera, ArrowRight } from 'lucide-react';
import { useFileStore } from '@/store/useFileStore';

const sizePresets = [
  { label: 'Greece (Passport Visa)', width: 472, height: 708 },
  { label: 'Hong Kong (Passport Visa)', width: 472, height: 590 },
  { label: 'Hungary (Passport)', width: 413, height: 531 },
  { label: 'India (Passport 3.5x3.5 cm)', width: 413, height: 413 },
  { label: 'India (Passport 5x5 cm)', width: 600, height: 600 },
  { label: 'India (Passport 3.5x4.5 cm)', width: 413, height: 531 },
  { label: 'India (Visa)', width: 600, height: 600 },
];

export const PassportPhotoEditor: React.FC = () => {
  const { rawFiles, operationOptions, updateOptions } = useFileStore();
  const imageFile = rawFiles.find((file) => file.type.startsWith('image/'));
  const [searchQuery, setSearchQuery] = useState('');
  const [customWidth, setCustomWidth] = useState<number>(operationOptions.resize_width || operationOptions.width || 200);
  const [customHeight, setCustomHeight] = useState<number>(operationOptions.resize_height || operationOptions.height || 230);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setCustomWidth(operationOptions.resize_width || operationOptions.width || 200);
    setCustomHeight(operationOptions.resize_height || operationOptions.height || 230);
  }, [operationOptions.resize_width, operationOptions.resize_height, operationOptions.width, operationOptions.height]);

  const previewUrl = useMemo(() => {
    if (!imageFile) return null;
    return URL.createObjectURL(imageFile);
  }, [imageFile]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const filteredPresets = sizePresets.filter((preset) =>
    preset.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
    `${preset.width}x${preset.height}`.includes(searchQuery)
  );

  const applyPreset = (width: number, height: number) => {
    updateOptions({
      operation: 'resize',
      resizeType: 'dimensions',
      width,
      height,
      resize_width: width,
      resize_height: height,
      resize_lock_aspect: false,
      resize_format: 'jpeg',
    });
    setCustomWidth(width);
    setCustomHeight(height);
    setSaved(true);
  };

  const applyCustomSize = () => {
    updateOptions({
      operation: 'resize',
      resizeType: 'dimensions',
      width: customWidth,
      height: customHeight,
      resize_width: customWidth,
      resize_height: customHeight,
      resize_lock_aspect: false,
      resize_format: 'jpeg',
    });
    setSaved(true);
  };

  const targetWidth = operationOptions.resize_width || operationOptions.width || customWidth;
  const targetHeight = operationOptions.resize_height || operationOptions.height || customHeight;

  if (!imageFile) return null;

  return (
    <section className="rounded-3xl border border-border bg-card p-4 shadow-sm">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.28em] text-muted-foreground">Passport photo editor</p>
          <h2 className="text-xl font-black">Passport size preview</h2>
        </div>
        <button
          onClick={applyCustomSize}
          className="inline-flex items-center gap-2 rounded-2xl bg-primary px-4 py-2 text-sm font-black text-primary-foreground hover:bg-primary/90 transition"
        >
          <Check className="h-4 w-4" />
          Done
        </button>
      </div>

      <div className="grid gap-4 xl:grid-cols-[340px_1fr]">
        <div className="space-y-4">
          <div className="rounded-3xl border border-border bg-background p-4">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Custom size</p>
                <p className="text-sm font-bold text-foreground">Set passport dimensions</p>
              </div>
              <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-[11px] font-semibold text-emerald-600">Target</span>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="space-y-2 text-sm text-foreground">
                <span>Width</span>
                <input
                  type="number"
                  value={customWidth}
                  onChange={(event) => setCustomWidth(Math.max(1, Number(event.target.value) || 1))}
                  className="w-full rounded-2xl border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </label>
              <label className="space-y-2 text-sm text-foreground">
                <span>Height</span>
                <input
                  type="number"
                  value={customHeight}
                  onChange={(event) => setCustomHeight(Math.max(1, Number(event.target.value) || 1))}
                  className="w-full rounded-2xl border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </label>
            </div>
            <div className="mt-4 rounded-2xl border border-border bg-card p-4">
              <div className="mb-3 flex items-center justify-between text-xs uppercase tracking-[0.2em] text-muted-foreground">
                <span>Search size</span>
                <span>{filteredPresets.length} presets</span>
              </div>
              <div className="flex items-center gap-2 rounded-2xl border border-border bg-background px-3 py-2">
                <Search className="h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search size"
                  className="w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
                />
              </div>
              <div className="mt-4 space-y-2 max-h-[320px] overflow-y-auto pr-2">
                {filteredPresets.map((preset) => (
                  <button
                    key={`${preset.width}x${preset.height}`}
                    onClick={() => applyPreset(preset.width, preset.height)}
                    className="w-full rounded-2xl border border-border bg-card p-3 text-left transition hover:border-primary/50 hover:bg-primary/5"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-semibold text-foreground">{preset.label}</span>
                      <span className="text-xs text-muted-foreground">{preset.width}×{preset.height}px</span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">Tap to apply passport size</p>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {saved && (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-500/10 p-3 text-sm text-emerald-700">
              Passport size applied successfully.
            </div>
          )}
        </div>

        <div className="rounded-3xl border border-border bg-background p-4">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Preview window</p>
              <p className="text-sm font-bold text-foreground">Passport frame</p>
            </div>
            <span className="rounded-full bg-muted/70 px-3 py-1 text-[11px] font-semibold text-muted-foreground">{targetWidth}×{targetHeight}px</span>
          </div>
          <div className="relative overflow-hidden rounded-[2rem] border-2 border-dashed border-primary/30 bg-white p-4">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(0,0,0,0.04),_transparent_32%)] pointer-events-none" />
            <div className="h-[420px] w-full overflow-hidden rounded-[1.5rem] bg-[#f9fafb] border border-border/70 flex items-center justify-center">
              {previewUrl ? (
                <img src={previewUrl} alt="Passport preview" className="h-full w-auto max-w-full object-contain" />
              ) : (
                <div className="flex h-full w-full flex-col items-center justify-center gap-3 text-center text-sm text-muted-foreground px-4">
                  <Camera className="h-8 w-8" />
                  <p className="font-semibold text-foreground">Upload a photo to preview passport crop</p>
                  <p className="text-xs">The preview updates automatically when you change size.</p>
                </div>
              )}
            </div>
            <div className="pointer-events-none absolute inset-0 rounded-[1.5rem] border-4 border-primary/20" />
          </div>
        </div>
      </div>
    </section>
  );
};

export default PassportPhotoEditor;
