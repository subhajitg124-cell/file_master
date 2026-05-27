import React, { useEffect, useState } from 'react';
import { Download, CheckCircle, Copy, Check, RotateCcw, AlertTriangle } from 'lucide-react';
import { useFileStore } from '@/store/useFileStore';

export const DownloadHub: React.FC = () => {
  const { downloadUrl, savings, clearStore, ttlRemaining, setTtlRemaining } = useFileStore();
  const [copied, setCopied] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);

  useEffect(() => {
    if (ttlRemaining !== null) setCountdown(Math.round(ttlRemaining));
  }, [ttlRemaining]);

  useEffect(() => {
    if (countdown === null || countdown <= 0) return;
    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev && prev > 1) return prev - 1;
        clearInterval(interval);
        setTtlRemaining(0);
        return 0;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [countdown, setTtlRemaining]);

  if (!downloadUrl) return null;

  const handleDownload = () => {
    const a = document.createElement('a');
    a.href = downloadUrl;
    a.download = '';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTtlRemaining(300);
    setCountdown(300);
  };

  const handleCopyLink = () => {
    const fullUrl = `${window.location.origin}${downloadUrl}`;
    navigator.clipboard.writeText(fullUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const linkExpired = countdown !== null && countdown <= 0;

  return (
    <div className="w-full max-w-md mx-auto bg-card border border-border rounded-lg p-6 shadow-premium space-y-6 text-center">
      {linkExpired ? (
        <div className="space-y-4">
          <div className="mx-auto h-16 w-16 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center border border-red-500/20">
            <AlertTriangle className="h-8 w-8" />
          </div>
          <div className="space-y-1">
            <h2 className="text-xl font-bold text-foreground">Download link expired</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              For security and confidentiality, temporary files are permanently wiped from our server memory after expiration.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-5">
          <div className="mx-auto h-16 w-16 bg-emerald-500/10 text-emerald-500 rounded-full flex items-center justify-center border border-emerald-500/20 animate-pulse">
            <CheckCircle className="h-10 w-10 fill-current bg-card rounded-full" />
          </div>
          <div className="space-y-1">
            <h2 className="text-xl font-bold text-foreground">File processed successfully!</h2>
            <p className="text-xs text-muted-foreground">Ready to export to your device</p>
          </div>
          {savings && savings.percent > 0 && (
            <div className="grid grid-cols-3 gap-2 p-3.5 bg-muted/40 border border-border rounded-lg text-sm">
              <div className="text-left space-y-0.5">
                <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider block">Before</span>
                <span className="font-bold text-foreground">{formatSize(savings.originalSize)}</span>
              </div>
              <div className="text-center space-y-0.5 border-x border-border">
                <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider block">After</span>
                <span className="font-bold text-foreground">{formatSize(savings.newSize)}</span>
              </div>
              <div className="text-right space-y-0.5">
                <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider block">Savings</span>
                <span className="font-bold text-emerald-500">-{savings.percent}%</span>
              </div>
            </div>
          )}
          {countdown !== null && (
            <div className="inline-flex items-center space-x-2 px-3 py-1 bg-yellow-500/15 border border-yellow-500/20 rounded-full text-xs font-semibold text-yellow-600 dark:text-yellow-400">
              <span className="h-2 w-2 rounded-full bg-yellow-500 animate-ping" />
              <span>Link expires in {formatTime(countdown)}</span>
            </div>
          )}
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={handleDownload}
              className="flex-1 flex items-center justify-center space-x-2 py-3 bg-primary text-primary-foreground font-semibold rounded-lg hover:bg-primary/95 transition-all shadow-premium"
            >
              <Download className="h-4 w-4" />
              <span>Download now</span>
            </button>
            <button
              onClick={handleCopyLink}
              className="flex items-center justify-center space-x-2 py-3 px-4 bg-secondary text-secondary-foreground font-semibold rounded-lg hover:bg-secondary/80 transition-all border border-border"
              aria-label="Copy download link"
            >
              {copied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
              <span>{copied ? 'Copied' : 'Share link'}</span>
            </button>
          </div>
        </div>
      )}
      <button
        onClick={clearStore}
        className="w-full flex items-center justify-center space-x-2 py-2.5 bg-card hover:bg-muted border border-border text-muted-foreground hover:text-foreground font-semibold rounded-lg transition-colors text-sm"
      >
        <RotateCcw className="h-4 w-4" />
        <span>Process another file</span>
      </button>
    </div>
  );
};

export default DownloadHub;
