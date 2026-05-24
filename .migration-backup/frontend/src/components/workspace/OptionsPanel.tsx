import React, { useState } from 'react';
import { Sliders, RefreshCw, Settings2, Play, Loader2, Sparkles, Video, FileText } from 'lucide-react';
import { useFileStore } from '@/store/useFileStore';
import { apiClient, apiMock } from '@/lib/api';
import { runClientSidePdfMerge, runClientSidePdfCompress } from '@/lib/processing/pdf/client-pdf';

export const OptionsPanel: React.FC = () => {
  const {
    files,
    rawFiles,
    selectedOperation,
    operationOptions,
    updateOptions,
    isMockMode,
    jobId,
    setProcessing,
    setProgress,
    setDownloadUrl,
    setSavings,
    setError,
    isProcessing,
  } = useFileStore();

  const [showAdvanced, setShowAdvanced] = useState(false);

  if (files.length === 0 || !selectedOperation) return null;

  const firstFile = files[0];
  const fileType = firstFile.type;

  const handleStartProcess = async () => {
    if (!jobId) return;
    
    setProcessing(true);
    setError(null);
    setProgress(0);

    try {
      if (isMockMode) {
        const isPdf = files[0]?.type === 'application/pdf';
        
        if (isPdf && selectedOperation === 'merge') {
          setProgress(20);
          try {
            const mergedBlob = await runClientSidePdfMerge(rawFiles);
            setProgress(60);
            
            const originalSize = rawFiles.reduce((acc, f) => acc + f.size, 0);
            const newSize = mergedBlob.size;
            const percent = Math.max(0, Math.round(((originalSize - newSize) / originalSize) * 100));
            
            const downloadUrl = URL.createObjectURL(mergedBlob);
            
            setTimeout(() => {
              setProgress(100);
              setDownloadUrl(downloadUrl);
              setSavings({ originalSize, newSize, percent });
              setProcessing(false);
            }, 500);
          } catch (err: any) {
            setError(err.message || 'Client-side PDF merging failed.');
            setProcessing(false);
          }
        } else if (isPdf && selectedOperation === 'compress') {
          setProgress(30);
          try {
            const compressedBlob = await runClientSidePdfCompress(rawFiles[0], operationOptions.quality || 80);
            setProgress(70);
            
            const originalSize = rawFiles[0].size;
            const newSize = compressedBlob.size;
            const percent = Math.max(0, Math.round(((originalSize - newSize) / originalSize) * 100));
            
            const downloadUrl = URL.createObjectURL(compressedBlob);
            
            setTimeout(() => {
              setProgress(100);
              setDownloadUrl(downloadUrl);
              setSavings({ originalSize, newSize, percent });
              setProcessing(false);
            }, 500);
          } catch (err: any) {
            setError(err.message || 'Client-side PDF compression failed.');
            setProcessing(false);
          }
        } else {
          apiMock.simulateProcessing(
            jobId,
            selectedOperation,
            files,
            (progress) => setProgress(progress),
            (downloadUrl, savings) => {
              setDownloadUrl(downloadUrl);
              setSavings(savings);
              setProcessing(false);
            },
            (err) => {
              setError(err);
              setProcessing(false);
            }
          );
        }
      } else {
        // Start live backend processing
        await apiClient.startProcessing(jobId, selectedOperation, operationOptions);
        
        // Status polling loop
        const checkStatus = async () => {
          try {
            const data = await apiClient.pollStatus(jobId);
            setProgress(data.progress);

            if (data.status === 'done') {
              setDownloadUrl(apiClient.getDownloadUrl(jobId));
              if (data.metadata) {
                setSavings({
                  originalSize: data.metadata.input_size_bytes || 0,
                  newSize: data.metadata.output_size_bytes || 0,
                  percent: data.metadata.savings_percent || 0
                });
              }
              setProcessing(false);
            } else if (data.status === 'failed') {
              setError(data.error || 'Backend processing task failed.');
              setProcessing(false);
            } else {
              // Wait 1.5s and poll again
              setTimeout(checkStatus, 1500);
            }
          } catch (e: any) {
            setError(e.message || 'Status polling error.');
            setProcessing(false);
          }
        };
        setTimeout(checkStatus, 1000);
      }
    } catch (e: any) {
      setError(e.message || 'Failed to start processing.');
      setProcessing(false);
    }
  };

  const renderCompressOptions = () => {
    if (fileType.startsWith('image/')) {
      return (
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <label htmlFor="quality-slider" className="font-medium text-foreground">Output Quality</label>
              <span className="text-primary font-semibold">{operationOptions.quality || 80}%</span>
            </div>
            <input
              id="quality-slider"
              type="range"
              min="10"
              max="100"
              value={operationOptions.quality || 80}
              onChange={(e) => updateOptions({ quality: parseInt(e.target.value) })}
              className="w-full h-1.5 bg-secondary rounded-lg appearance-none cursor-pointer accent-primary focus:outline-none"
            />
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <label htmlFor="resize-slider" className="font-medium text-foreground">Resize Scale</label>
              <span className="text-primary font-semibold">{Math.round((operationOptions.resize_pct || 1.0) * 100)}%</span>
            </div>
            <input
              id="resize-slider"
              type="range"
              min="10"
              max="100"
              value={Math.round((operationOptions.resize_pct || 1.0) * 100)}
              onChange={(e) => updateOptions({ resize_pct: parseFloat(e.target.value) / 100 })}
              className="w-full h-1.5 bg-secondary rounded-lg appearance-none cursor-pointer accent-primary focus:outline-none"
            />
          </div>
        </div>
      );
    }

    if (fileType.startsWith('video/')) {
      return (
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <label htmlFor="crf-slider" className="font-medium text-foreground">Compression Level (CRF)</label>
              <span className="text-primary font-semibold">CRF {operationOptions.crf || 28}</span>
            </div>
            <input
              id="crf-slider"
              type="range"
              min="18"
              max="35"
              value={operationOptions.crf || 28}
              onChange={(e) => updateOptions({ crf: parseInt(e.target.value) })}
              className="w-full h-1.5 bg-secondary rounded-lg appearance-none cursor-pointer accent-primary focus:outline-none"
            />
            <p className="text-[10px] text-muted-foreground">Higher CRF increases compression but lowers video clarity.</p>
          </div>

          {showAdvanced && (
            <div className="space-y-2 pt-2 border-t border-border">
              <label htmlFor="speed-select" className="block text-sm font-medium text-foreground">Encoder Speed Presets</label>
              <select
                id="speed-select"
                value={operationOptions.preset || 'medium'}
                onChange={(e) => updateOptions({ preset: e.target.value })}
                className="w-full p-2 text-sm bg-card border border-border rounded-lg focus:outline-none"
              >
                <option value="ultrafast">Ultrafast (Low compression, very fast)</option>
                <option value="fast">Fast (Medium-low compression, fast)</option>
                <option value="medium">Medium (Balanced)</option>
                <option value="slow">Slow (High compression, slow execution)</option>
              </select>
            </div>
          )}
        </div>
      );
    }

    return (
      <div className="p-4 bg-muted/50 rounded-lg text-sm text-muted-foreground flex items-center space-x-3">
        <FileText className="h-5 w-5 text-primary shrink-0" />
        <span>We will compress streams and structural fonts of this PDF to shrink its physical size. No settings required.</span>
      </div>
    );
  };

  const renderEnhanceOptions = () => {
    if (fileType.startsWith('image/')) {
      return (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label htmlFor="brightness-input" className="text-xs font-semibold text-muted-foreground uppercase">Brightness</label>
              <input
                id="brightness-input"
                type="number"
                step="0.1"
                min="0.5"
                max="2.0"
                value={operationOptions.brightness || 1.0}
                onChange={(e) => updateOptions({ brightness: parseFloat(e.target.value) })}
                className="w-full p-2 text-sm bg-card border border-border rounded-lg text-center font-semibold"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="contrast-input" className="text-xs font-semibold text-muted-foreground uppercase">Contrast</label>
              <input
                id="contrast-input"
                type="number"
                step="0.1"
                min="0.5"
                max="2.0"
                value={operationOptions.contrast || 1.0}
                onChange={(e) => updateOptions({ contrast: parseFloat(e.target.value) })}
                className="w-full p-2 text-sm bg-card border border-border rounded-lg text-center font-semibold"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="sharpness-input" className="text-xs font-semibold text-muted-foreground uppercase">Sharpness</label>
              <input
                id="sharpness-input"
                type="number"
                step="0.1"
                min="0.5"
                max="2.0"
                value={operationOptions.sharpness || 1.0}
                onChange={(e) => updateOptions({ sharpness: parseFloat(e.target.value) })}
                className="w-full p-2 text-sm bg-card border border-border rounded-lg text-center font-semibold"
              />
            </div>
          </div>

          <div className="flex items-center space-x-2 pt-2">
            <input
              id="denoise-check"
              type="checkbox"
              checked={operationOptions.denoise || false}
              onChange={(e) => updateOptions({ denoise: e.target.checked })}
              className="h-4 w-4 rounded border-border text-primary focus:ring-primary cursor-pointer"
            />
            <label htmlFor="denoise-check" className="text-sm font-medium text-foreground cursor-pointer select-none">
              Apply Denoising filter (SMOOTH_MORE)
            </label>
          </div>
        </div>
      );
    }

    return (
      <div className="p-4 bg-muted/50 rounded-lg text-sm text-muted-foreground flex items-center space-x-3">
        <Sparkles className="h-5 w-5 text-primary shrink-0" />
        <span>Document text enhancement scans formatting constraints, resetting standard padding, styles, and font weights.</span>
      </div>
    );
  };

  const renderConvertOptions = () => {
    if (fileType.startsWith('image/')) {
      return (
        <div className="space-y-2">
          <label htmlFor="target-format-select" className="block text-sm font-medium text-foreground">Target Image Format</label>
          <select
            id="target-format-select"
            value={operationOptions.target_format || 'webp'}
            onChange={(e) => updateOptions({ target_format: e.target.value })}
            className="w-full p-2.5 text-sm bg-card border border-border rounded-lg focus:outline-none"
          >
            <option value="webp">WEBP (Modern web format, highly optimized)</option>
            <option value="png">PNG (Lossless, transparency support)</option>
            <option value="jpeg">JPEG (High compatibility, photo friendly)</option>
          </select>
        </div>
      );
    }

    // Office formats
    let msg = '';
    if (operationOptions.operation === 'docx_to_pdf' || operationOptions.operation === 'pptx_to_pdf') {
      msg = 'This document will be converted to a high-quality PDF page layout.';
    } else if (operationOptions.operation === 'xlsx_to_csv') {
      msg = 'All cells in the active sheet of this Excel file will be parsed and saved to a standard CSV.';
    } else if (operationOptions.operation === 'md_to_html') {
      msg = 'This Markdown text will compile structures to an HTML page with basic CSS styling.';
    } else {
      msg = 'Convert file contents to the destination format.';
    }

    return (
      <div className="p-4 bg-muted/50 rounded-lg text-sm text-muted-foreground flex items-center space-x-3">
        <RefreshCw className="h-5 w-5 text-primary shrink-0 animate-spin-slow" />
        <span>{msg}</span>
      </div>
    );
  };

  const renderEditOptions = () => {
    if (fileType.startsWith('video/')) {
      return (
        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <Video className="h-4 w-4 text-violet-500" />
            <span className="text-sm font-medium text-foreground">Trim Timing Coordinates</span>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label htmlFor="start-time" className="text-xs text-muted-foreground font-semibold">Start (Seconds)</label>
              <input
                id="start-time"
                type="number"
                min="0"
                value={operationOptions.start_time || 0}
                onChange={(e) => updateOptions({ start_time: Math.max(0, parseInt(e.target.value)) })}
                className="w-full p-2 bg-card border border-border rounded-lg text-sm"
              />
            </div>
            <div className="space-y-1">
              <label htmlFor="end-time" className="text-xs text-muted-foreground font-semibold">End (Seconds)</label>
              <input
                id="end-time"
                type="number"
                min="1"
                value={operationOptions.end_time || 10}
                onChange={(e) => updateOptions({ end_time: Math.max(1, parseInt(e.target.value)) })}
                className="w-full p-2 bg-card border border-border rounded-lg text-sm"
              />
            </div>
          </div>
        </div>
      );
    }

    if (operationOptions.operation === 'docx_cleanup') {
      return (
        <div className="p-4 bg-muted/50 rounded-lg text-sm text-muted-foreground flex items-center space-x-3">
          <Sliders className="h-5 w-5 text-primary shrink-0" />
          <span>This task clears duplicate blank paragraphs, aligns standard margins to 1 inch, and normalizes standard layouts.</span>
        </div>
      );
    }

    return null;
  };

  const renderOptions = () => {
    switch (selectedOperation) {
      case 'compress':
        return renderCompressOptions();
      case 'enhance':
        return renderEnhanceOptions();
      case 'convert':
        return renderConvertOptions();
      case 'edit':
        return renderEditOptions();
      case 'merge':
        return (
          <div className="p-4 bg-muted/50 rounded-lg text-sm text-muted-foreground flex items-center space-x-3">
            <FileText className="h-5 w-5 text-primary shrink-0" />
            <span>Files will be concatenated in the sequence shown in the uploaded files queue. Drag elements to rearrange or click process.</span>
          </div>
        );
      default:
        return null;
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
          <p className="text-xs text-muted-foreground mt-0.5">Customize your processing params</p>
        </div>

        {hasAdvanced && (
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center space-x-1.5 px-3 py-1 bg-secondary text-secondary-foreground rounded-lg text-xs font-semibold hover:bg-secondary/80"
          >
            <Settings2 className="h-3.5 w-3.5" />
            <span>{showAdvanced ? 'Simple' : 'Advanced'}</span>
          </button>
        )}
      </div>

      {/* Render Options */}
      <div className="py-2">{renderOptions()}</div>

      {/* CTA Button */}
      <button
        onClick={handleStartProcess}
        disabled={isProcessing}
        className="w-full flex items-center justify-center space-x-2 py-3 bg-primary text-primary-foreground font-semibold rounded-lg shadow-premium hover:bg-primary/95 transition-all focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-50"
      >
        {isProcessing ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>Running operations...</span>
          </>
        ) : (
          <>
            <Play className="h-4 w-4 fill-current" />
            <span>Process files</span>
          </>
        )}
      </button>
    </div>
  );
};
export default OptionsPanel;
