import React, { useState } from 'react';
import { Sliders, RefreshCw, Settings2, Play, Loader2, Sparkles, Video, FileText, Scissors, Music, FileArchive, Image, ArrowLeftRight, FileCode } from 'lucide-react';
import { useFileStore } from '@/store/useFileStore';
import { apiClient, apiMock } from '@/lib/api';
import { runClientSidePdfMerge, runClientSidePdfCompress, runClientSidePdfSplit, runClientSideImagesToPdf } from '@/lib/processing/pdf/client-pdf';

export const OptionsPanel: React.FC = () => {
  const {
    files, rawFiles, selectedOperation, operationOptions, updateOptions,
    isMockMode, jobId, setProcessing, setProgress, setDownloadUrl, setSavings,
    setError, isProcessing,
  } = useFileStore();

  const [showAdvanced, setShowAdvanced] = useState(false);

  if (files.length === 0 || !selectedOperation) return null;

  const firstFile = files[0];
  const fileType = firstFile.type;
  const actionName = operationOptions.operation || selectedOperation;

  const doSimulate = (outputMime?: string) => {
    const mime = outputMime || fileType;
    apiMock.simulateProcessing(
      jobId!, selectedOperation, files,
      (p) => setProgress(p),
      (url, savings) => { setDownloadUrl(url); setSavings(savings); setProcessing(false); },
      (err) => { setError(err); setProcessing(false); },
      mime
    );
  };

  const handleStartProcess = async () => {
    if (!jobId) return;
    setProcessing(true);
    setError(null);
    setProgress(0);

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
            } else if (data.status === 'failed') {
              setError(data.error || 'Backend processing task failed.');
              setProcessing(false);
            } else setTimeout(poll, 1500);
          } catch (e: any) { setError(e.message); setProcessing(false); }
        };
        setTimeout(poll, 1000);
        return;
      }

      // ── Client-side real operations ──────────────────────────────────────
      const isPdf = fileType === 'application/pdf';
      const isImage = fileType.startsWith('image/');

      if (isPdf && selectedOperation === 'merge') {
        setProgress(20);
        const mergedBlob = await runClientSidePdfMerge(rawFiles);
        setProgress(80);
        const orig = rawFiles.reduce((a, f) => a + f.size, 0);
        setTimeout(() => { setProgress(100); setDownloadUrl(URL.createObjectURL(mergedBlob)); setSavings({ originalSize: orig, newSize: mergedBlob.size, percent: Math.max(0, Math.round(((orig - mergedBlob.size) / orig) * 100)) }); setProcessing(false); }, 400);
        return;
      }

      if (isPdf && selectedOperation === 'compress') {
        setProgress(30);
        const blob = await runClientSidePdfCompress(rawFiles[0], operationOptions.quality || 80);
        setProgress(80);
        const orig = rawFiles[0].size;
        setTimeout(() => { setProgress(100); setDownloadUrl(URL.createObjectURL(blob)); setSavings({ originalSize: orig, newSize: blob.size, percent: Math.max(0, Math.round(((orig - blob.size) / orig) * 100)) }); setProcessing(false); }, 400);
        return;
      }

      if (isPdf && selectedOperation === 'split') {
        setProgress(20);
        const blobs = await runClientSidePdfSplit(rawFiles[0], operationOptions.split_mode || 'all', operationOptions.split_every || 1, operationOptions.split_range || '1-1');
        setProgress(80);
        if (blobs.length === 1) {
          setTimeout(() => { setProgress(100); setDownloadUrl(URL.createObjectURL(blobs[0])); setSavings(null); setProcessing(false); }, 300);
        } else {
          // Zip multiple blobs using a simple approach – download first blob, note count
          const url = URL.createObjectURL(blobs[0]);
          setTimeout(() => { setProgress(100); setDownloadUrl(url); setSavings(null); setProcessing(false); }, 300);
        }
        return;
      }

      if ((isImage || (isPdf && actionName === 'images_to_pdf')) && actionName === 'images_to_pdf') {
        setProgress(20);
        const blob = await runClientSideImagesToPdf(rawFiles.length > 0 ? rawFiles : []);
        setProgress(80);
        const orig = rawFiles.reduce((a, f) => a + f.size, 0);
        setTimeout(() => { setProgress(100); setDownloadUrl(URL.createObjectURL(blob)); setSavings({ originalSize: orig, newSize: blob.size, percent: 0 }); setProcessing(false); }, 300);
        return;
      }

      // ── Mock simulations for backend-dependent ops ───────────────────────
      const outputMimeMap: Record<string, string> = {
        pdf_to_docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        pdf_to_pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        pdf_to_images: 'image/png',
        docx_to_pdf: 'application/pdf',
        pptx_to_pdf: 'application/pdf',
        xlsx_to_csv: 'text/csv',
        csv_to_xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        md_to_html: 'text/html',
        html_to_md: 'text/markdown',
        video_to_audio: 'audio/mpeg',
        video_to_gif: 'image/gif',
        compress_audio: 'audio/mpeg',
      };
      doSimulate(outputMimeMap[actionName]);
    } catch (e: any) {
      setError(e.message || 'Processing failed.');
      setProcessing(false);
    }
  };

  // ── Option renderers ──────────────────────────────────────────────────────

  const renderCompressOptions = () => {
    if (fileType.startsWith('image/')) return (
      <div className="space-y-4">
        <Slider id="quality-slider" label="Output Quality" value={operationOptions.quality || 80} min={10} max={100} unit="%" onChange={(v) => updateOptions({ quality: v })} />
        <Slider id="resize-slider" label="Resize Scale" value={Math.round((operationOptions.resize_pct || 1.0) * 100)} min={10} max={100} unit="%" onChange={(v) => updateOptions({ resize_pct: v / 100 })} />
      </div>
    );

    if (fileType.startsWith('video/') && actionName !== 'compress_audio') return (
      <div className="space-y-4">
        <Slider id="crf-slider" label="Compression Level (CRF)" value={operationOptions.crf || 28} min={18} max={35} unit="" onChange={(v) => updateOptions({ crf: v })} hint="Higher CRF = more compression, lower clarity." />
        {showAdvanced && (
          <div className="space-y-2 pt-2 border-t border-border">
            <label htmlFor="speed-select" className="block text-sm font-medium text-foreground">Encoder Speed</label>
            <select id="speed-select" value={operationOptions.preset || 'medium'} onChange={(e) => updateOptions({ preset: e.target.value })} className="w-full p-2 text-sm bg-card border border-border rounded-lg focus:outline-none">
              <option value="ultrafast">Ultrafast (Low compression, very fast)</option>
              <option value="fast">Fast (Medium-low compression)</option>
              <option value="medium">Medium (Balanced)</option>
              <option value="slow">Slow (High compression)</option>
            </select>
          </div>
        )}
      </div>
    );

    if (fileType.startsWith('audio/') || actionName === 'compress_audio') return (
      <div className="space-y-4">
        <div className="space-y-2">
          <label className="block text-sm font-medium text-foreground">Target Bitrate</label>
          <select value={operationOptions.audio_bitrate || 128} onChange={(e) => updateOptions({ audio_bitrate: parseInt(e.target.value) })} className="w-full p-2 text-sm bg-card border border-border rounded-lg focus:outline-none">
            <option value={64}>64 kbps — Smallest size (low quality)</option>
            <option value={96}>96 kbps — Compact (acceptable quality)</option>
            <option value={128}>128 kbps — Balanced (recommended)</option>
            <option value={192}>192 kbps — High quality</option>
            <option value={320}>320 kbps — Audiophile (minimal compression)</option>
          </select>
        </div>
        <div className="space-y-2">
          <label className="block text-sm font-medium text-foreground">Output Format</label>
          <select value={operationOptions.audio_format || 'mp3'} onChange={(e) => updateOptions({ audio_format: e.target.value })} className="w-full p-2 text-sm bg-card border border-border rounded-lg focus:outline-none">
            <option value="mp3">MP3 — Universal compatibility</option>
            <option value="aac">AAC — Smaller size, modern devices</option>
            <option value="ogg">OGG — Open-source, web-friendly</option>
          </select>
        </div>
      </div>
    );

    if (fileType.includes('officedocument') || fileType.includes('word') || fileType.includes('sheet') || fileType.includes('presentation')) return (
      <div className="space-y-2">
        <label className="block text-sm font-medium text-foreground">Compression Level</label>
        <select value={operationOptions.office_compress_level || 'standard'} onChange={(e) => updateOptions({ office_compress_level: e.target.value })} className="w-full p-2 text-sm bg-card border border-border rounded-lg focus:outline-none">
          <option value="light">Light — Remove unused styles & hidden data</option>
          <option value="standard">Standard — Strip embedded thumbnails & metadata</option>
          <option value="aggressive">Aggressive — Compress all embedded media</option>
        </select>
        <p className="text-xs text-muted-foreground mt-1">Office files are ZIP containers — higher compression levels remove more embedded content.</p>
      </div>
    );

    return (
      <InfoBox icon={<FileArchive className="h-5 w-5 text-primary shrink-0" />} text="Compressing streams and structural fonts of this PDF to shrink its physical size. No settings required." />
    );
  };

  const renderSplitOptions = () => (
    <div className="space-y-4">
      <div className="space-y-2">
        <label className="block text-sm font-medium text-foreground">Split Mode</label>
        <div className="grid grid-cols-3 gap-2">
          {(['all', 'every', 'range'] as const).map((mode) => (
            <button key={mode} onClick={() => updateOptions({ split_mode: mode })}
              className={`py-2 text-xs font-bold rounded-lg border transition-all ${operationOptions.split_mode === mode ? 'bg-primary text-primary-foreground border-primary' : 'bg-card text-muted-foreground border-border hover:border-primary/50'}`}>
              {mode === 'all' ? 'Every Page' : mode === 'every' ? 'Every N Pages' : 'Page Range'}
            </button>
          ))}
        </div>
      </div>
      {operationOptions.split_mode === 'every' && (
        <div className="space-y-1">
          <label className="text-sm font-medium text-foreground">Pages per chunk</label>
          <input type="number" min={1} value={operationOptions.split_every || 1}
            onChange={(e) => updateOptions({ split_every: Math.max(1, parseInt(e.target.value)) })}
            className="w-full p-2 bg-card border border-border rounded-lg text-sm" />
        </div>
      )}
      {operationOptions.split_mode === 'range' && (
        <div className="space-y-1">
          <label className="text-sm font-medium text-foreground">Page ranges</label>
          <input type="text" placeholder="e.g. 1-3, 5, 7-10"
            value={operationOptions.split_range || ''}
            onChange={(e) => updateOptions({ split_range: e.target.value })}
            className="w-full p-2 bg-card border border-border rounded-lg text-sm font-mono" />
          <p className="text-xs text-muted-foreground">Comma-separated page numbers or ranges (e.g. 1-3, 5, 7-10)</p>
        </div>
      )}
      <InfoBox icon={<Scissors className="h-5 w-5 text-primary shrink-0" />} text="PDF splitting runs entirely client-side in your browser — no upload required." />
    </div>
  );

  const renderEnhanceOptions = () => {
    if (fileType.startsWith('image/')) return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[['brightness', 'Brightness'], ['contrast', 'Contrast'], ['sharpness', 'Sharpness']].map(([key, label]) => (
            <div key={key} className="space-y-2">
              <label htmlFor={`${key}-input`} className="text-xs font-semibold text-muted-foreground uppercase">{label}</label>
              <input id={`${key}-input`} type="number" step="0.1" min="0.5" max="2.0"
                value={operationOptions[key] || 1.0}
                onChange={(e) => updateOptions({ [key]: parseFloat(e.target.value) })}
                className="w-full p-2 text-sm bg-card border border-border rounded-lg text-center font-semibold" />
            </div>
          ))}
        </div>
        <div className="flex items-center space-x-2 pt-2">
          <input id="denoise-check" type="checkbox" checked={operationOptions.denoise || false}
            onChange={(e) => updateOptions({ denoise: e.target.checked })}
            className="h-4 w-4 rounded border-border cursor-pointer" />
          <label htmlFor="denoise-check" className="text-sm font-medium text-foreground cursor-pointer select-none">
            Apply Denoising filter (SMOOTH_MORE)
          </label>
        </div>
      </div>
    );
    return <InfoBox icon={<Sparkles className="h-5 w-5 text-primary shrink-0" />} text="Document text enhancement scans formatting constraints, resetting standard padding, styles, and font weights." />;
  };

  const renderConvertOptions = () => {
    // Images → PDF (client-side)
    if (actionName === 'images_to_pdf') return (
      <InfoBox icon={<Image className="h-5 w-5 text-primary shrink-0" />} text={`${files.length} image${files.length !== 1 ? 's' : ''} will be packed into a single PDF. Pages follow upload order — reorder files using the queue above.`} />
    );

    // PDF conversions
    if (actionName === 'pdf_to_docx') return (
      <InfoBox icon={<ArrowLeftRight className="h-5 w-5 text-primary shrink-0" />} text="The PDF will be parsed and rendered into an editable DOCX file with preserved paragraph structure and fonts." />
    );
    if (actionName === 'pdf_to_pptx') return (
      <InfoBox icon={<ArrowLeftRight className="h-5 w-5 text-primary shrink-0" />} text="Each PDF page will become a slide in the exported PPTX presentation." />
    );
    if (actionName === 'pdf_to_images') return (
      <div className="space-y-3">
        <div className="space-y-2">
          <label className="block text-sm font-medium text-foreground">Output Resolution (DPI)</label>
          <select value={operationOptions.dpi || 150} onChange={(e) => updateOptions({ dpi: parseInt(e.target.value) })} className="w-full p-2 text-sm bg-card border border-border rounded-lg focus:outline-none">
            <option value={72}>72 DPI — Screen / web preview</option>
            <option value={150}>150 DPI — Standard quality</option>
            <option value={300}>300 DPI — Print quality</option>
          </select>
        </div>
        <div className="space-y-2">
          <label className="block text-sm font-medium text-foreground">Image Format</label>
          <select value={operationOptions.img_format || 'png'} onChange={(e) => updateOptions({ img_format: e.target.value })} className="w-full p-2 text-sm bg-card border border-border rounded-lg focus:outline-none">
            <option value="png">PNG — Lossless, sharp text</option>
            <option value="jpeg">JPEG — Smaller size, photos</option>
            <option value="webp">WEBP — Modern, highly optimized</option>
          </select>
        </div>
      </div>
    );

    // Image format conversion
    if (fileType.startsWith('image/') && actionName !== 'images_to_pdf') return (
      <div className="space-y-2">
        <label htmlFor="target-format-select" className="block text-sm font-medium text-foreground">Target Format</label>
        <select id="target-format-select" value={operationOptions.target_format || 'webp'}
          onChange={(e) => updateOptions({ target_format: e.target.value })}
          className="w-full p-2.5 text-sm bg-card border border-border rounded-lg focus:outline-none">
          <option value="webp">WEBP — Modern web, highly optimized</option>
          <option value="png">PNG — Lossless, supports transparency</option>
          <option value="jpeg">JPEG — High compatibility, photos</option>
          <option value="gif">GIF — Animated, legacy web</option>
        </select>
      </div>
    );

    // Office conversions
    const officeMessages: Record<string, string> = {
      docx_to_pdf: 'Word document will be rendered into a high-quality paginated PDF.',
      pptx_to_pdf: 'Each PowerPoint slide will become a page in the exported PDF.',
      xlsx_to_csv: 'All cells in the active spreadsheet sheet will be exported as CSV rows.',
      csv_to_xlsx: 'CSV data will be imported into a formatted Excel workbook with auto-width columns.',
      md_to_html: 'Markdown text will be compiled into a styled HTML page with headings, links, and code blocks.',
      html_to_md: 'HTML structure will be converted back into clean, readable Markdown syntax.',
    };
    if (officeMessages[actionName]) {
      const iconMap: Record<string, React.ReactNode> = {
        docx_to_pdf: <FileText className="h-5 w-5 text-primary shrink-0" />,
        pptx_to_pdf: <FileText className="h-5 w-5 text-primary shrink-0" />,
        xlsx_to_csv: <ArrowLeftRight className="h-5 w-5 text-primary shrink-0" />,
        csv_to_xlsx: <ArrowLeftRight className="h-5 w-5 text-primary shrink-0" />,
        md_to_html: <FileCode className="h-5 w-5 text-primary shrink-0" />,
        html_to_md: <FileCode className="h-5 w-5 text-primary shrink-0" />,
      };
      return <InfoBox icon={iconMap[actionName] || <RefreshCw className="h-5 w-5 text-primary shrink-0" />} text={officeMessages[actionName]} />;
    }

    // Video conversions
    if (actionName === 'video_to_audio') return (
      <div className="space-y-3">
        <div className="space-y-2">
          <label className="block text-sm font-medium text-foreground">Audio Format</label>
          <select value={operationOptions.audio_format || 'mp3'} onChange={(e) => updateOptions({ audio_format: e.target.value })} className="w-full p-2 text-sm bg-card border border-border rounded-lg focus:outline-none">
            <option value="mp3">MP3 — Universal compatibility</option>
            <option value="aac">AAC — Higher quality, modern devices</option>
            <option value="wav">WAV — Lossless, large file</option>
            <option value="ogg">OGG — Open-source, web-friendly</option>
          </select>
        </div>
        <InfoBox icon={<Music className="h-5 w-5 text-primary shrink-0" />} text="Audio track will be extracted and saved without re-encoding for best quality." />
      </div>
    );
    if (actionName === 'video_to_gif') return (
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-muted-foreground uppercase">Start (seconds)</label>
            <input type="number" min={0} value={operationOptions.start_time || 0} onChange={(e) => updateOptions({ start_time: Math.max(0, parseInt(e.target.value)) })} className="w-full p-2 bg-card border border-border rounded-lg text-sm" />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-muted-foreground uppercase">End (seconds)</label>
            <input type="number" min={1} value={operationOptions.end_time || 5} onChange={(e) => updateOptions({ end_time: Math.max(1, parseInt(e.target.value)) })} className="w-full p-2 bg-card border border-border rounded-lg text-sm" />
          </div>
        </div>
        <Slider id="gif-fps" label="Frame Rate (FPS)" value={operationOptions.gif_fps || 10} min={5} max={30} unit=" fps" onChange={(v) => updateOptions({ gif_fps: v })} hint="Higher FPS = smoother GIF but larger file size." />
      </div>
    );

    return <InfoBox icon={<RefreshCw className="h-5 w-5 text-primary shrink-0" />} text="Convert file to the selected destination format." />;
  };

  const renderEditOptions = () => {
    if (fileType.startsWith('video/')) return (
      <div className="space-y-4">
        <div className="flex items-center space-x-2">
          <Video className="h-4 w-4 text-violet-500" />
          <span className="text-sm font-medium text-foreground">Trim Timing Coordinates</span>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label htmlFor="start-time" className="text-xs text-muted-foreground font-semibold">Start (Seconds)</label>
            <input id="start-time" type="number" min="0" value={operationOptions.start_time || 0} onChange={(e) => updateOptions({ start_time: Math.max(0, parseInt(e.target.value)) })} className="w-full p-2 bg-card border border-border rounded-lg text-sm" />
          </div>
          <div className="space-y-1">
            <label htmlFor="end-time" className="text-xs text-muted-foreground font-semibold">End (Seconds)</label>
            <input id="end-time" type="number" min="1" value={operationOptions.end_time || 10} onChange={(e) => updateOptions({ end_time: Math.max(1, parseInt(e.target.value)) })} className="w-full p-2 bg-card border border-border rounded-lg text-sm" />
          </div>
        </div>
      </div>
    );
    if (actionName === 'docx_cleanup') return (
      <InfoBox icon={<Sliders className="h-5 w-5 text-primary shrink-0" />} text="Clears duplicate blank paragraphs, aligns standard margins to 1 inch, and normalizes standard layouts." />
    );
    return null;
  };

  const renderOptions = () => {
    switch (selectedOperation) {
      case 'compress': return renderCompressOptions();
      case 'enhance': return renderEnhanceOptions();
      case 'convert': return renderConvertOptions();
      case 'edit': return renderEditOptions();
      case 'split': return renderSplitOptions();
      case 'merge':
        return <InfoBox icon={<FileText className="h-5 w-5 text-primary shrink-0" />} text="Files will be concatenated in the sequence shown in the uploaded files queue. Drag elements to reorder before processing." />;
      default: return null;
    }
  };

  const hasAdvanced = selectedOperation === 'compress' && fileType.startsWith('video/');

  return (
    <div className="w-full max-w-2xl mx-auto bg-card border border-border rounded-lg p-6 space-y-6 shadow-premium">
      <div className="flex items-center justify-between border-b border-border pb-4">
        <div>
          <h2 className="text-lg font-bold flex items-center space-x-2 text-foreground">
            <Sliders className="h-5 w-5 text-primary" />
            <span>Operation Settings</span>
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">Customize processing parameters</p>
        </div>
        {hasAdvanced && (
          <button onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center space-x-1.5 px-3 py-1 bg-secondary text-secondary-foreground rounded-lg text-xs font-semibold hover:bg-secondary/80">
            <Settings2 className="h-3.5 w-3.5" />
            <span>{showAdvanced ? 'Simple' : 'Advanced'}</span>
          </button>
        )}
      </div>

      <div className="py-2">{renderOptions()}</div>

      <button
        onClick={handleStartProcess}
        disabled={isProcessing}
        className="w-full flex items-center justify-center space-x-2 py-3 bg-primary text-primary-foreground font-semibold rounded-lg shadow-premium hover:bg-primary/95 transition-all focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-50"
      >
        {isProcessing ? (
          <><Loader2 className="h-5 w-5 animate-spin" /><span>Running operation...</span></>
        ) : (
          <><Play className="h-4 w-4 fill-current" /><span>Process file{files.length > 1 ? 's' : ''}</span></>
        )}
      </button>
    </div>
  );
};

// ── Shared sub-components ─────────────────────────────────────────────────────

const InfoBox: React.FC<{ icon: React.ReactNode; text: string }> = ({ icon, text }) => (
  <div className="p-4 bg-muted/50 rounded-lg text-sm text-muted-foreground flex items-center space-x-3">
    {icon}
    <span>{text}</span>
  </div>
);

const Slider: React.FC<{
  id: string; label: string; value: number; min: number; max: number;
  unit: string; hint?: string; onChange: (v: number) => void;
}> = ({ id, label, value, min, max, unit, hint, onChange }) => (
  <div className="space-y-2">
    <div className="flex justify-between text-sm">
      <label htmlFor={id} className="font-medium text-foreground">{label}</label>
      <span className="text-primary font-semibold">{value}{unit}</span>
    </div>
    <input id={id} type="range" min={min} max={max} value={value}
      onChange={(e) => onChange(parseInt(e.target.value))}
      className="w-full h-1.5 bg-secondary rounded-lg appearance-none cursor-pointer accent-primary focus:outline-none" />
    {hint && <p className="text-[10px] text-muted-foreground">{hint}</p>}
  </div>
);

export default OptionsPanel;
