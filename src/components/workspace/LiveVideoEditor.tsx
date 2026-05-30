import React, { useEffect, useMemo, useRef, useState } from 'react';
import { m as motion } from 'framer-motion';
import {
  Download, Gauge, Loader2, Pause, Play, RotateCcw, Scissors,
  Volume2, VolumeX
} from 'lucide-react';
import { useFileStore } from '@/store/useFileStore';

type Quality = 'small' | 'balanced' | 'high';

const formatTime = (seconds: number) => {
  if (!Number.isFinite(seconds)) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

const formatBytes = (bytes: number) => {
  if (!bytes) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const index = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, index)).toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
};

const getRecorderMime = () => {
  const options = [
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp8,opus',
    'video/webm',
  ];
  return options.find((mime) => MediaRecorder.isTypeSupported(mime)) || '';
};

export const LiveVideoEditor: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const previewUrlRef = useRef<string | null>(null);
  const {
    rawFiles, files, setDownloadUrl, setSavings, setProgress, setProcessing, updateOptions
  } = useFileStore();
  const sourceFile = rawFiles.find((file) => file.type.startsWith('video/')) || rawFiles[0];
  const uploadedFile = files[0];
  const [previewUrl, setPreviewUrl] = useState('');
  const [duration, setDuration] = useState(0);
  const [start, setStart] = useState(0);
  const [end, setEnd] = useState(10);
  const [muted, setMuted] = useState(false);
  const [quality, setQuality] = useState<Quality>('balanced');
  const [compressionTarget, setCompressionTarget] = useState(45);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState('');

  const bitrate = useMemo(() => {
    const base = quality === 'small' ? 2_000_000 : quality === 'high' ? 8_000_000 : 4_500_000;
    return Math.round(base * (1 - Math.min(compressionTarget, 85) / 115));
  }, [compressionTarget, quality]);

  useEffect(() => {
    setError('');
    if (!sourceFile || !sourceFile.type.startsWith('video/')) return;
    const url = URL.createObjectURL(sourceFile);
    previewUrlRef.current = url;
    setPreviewUrl(url);
    return () => {
      URL.revokeObjectURL(url);
      previewUrlRef.current = null;
    };
  }, [sourceFile]);

  useEffect(() => {
    if (!duration) return;
    setEnd((current) => Math.min(duration, current || Math.min(10, duration)));
  }, [duration]);

  if (!sourceFile || !sourceFile.type.startsWith('video/')) return null;

  const safeStart = Math.min(start, Math.max(0, end - 0.25));
  const safeEnd = Math.max(end, safeStart + 0.25);
  const clipLength = Math.max(0.25, safeEnd - safeStart);

  const togglePreview = async () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      if (video.currentTime < safeStart || video.currentTime >= safeEnd) video.currentTime = safeStart;
      await video.play();
      setIsPlaying(true);
    } else {
      video.pause();
      setIsPlaying(false);
    }
  };

  const exportClip = async () => {
    const video = videoRef.current as (HTMLVideoElement & { captureStream?: () => MediaStream; mozCaptureStream?: () => MediaStream }) | null;
    if (!video) return;
    const capture = video.captureStream || video.mozCaptureStream;
    const mimeType = getRecorderMime();
    if (!capture || !mimeType) {
      setError('This browser cannot export edited video locally. Try Chrome or Edge, or use backend processing.');
      return;
    }

    setError('');
    setIsExporting(true);
    setProcessing(true);
    setProgress(0);

    try {
      video.pause();
      video.muted = muted;
      video.currentTime = safeStart;
      await new Promise<void>((resolve) => {
        const done = () => {
          video.removeEventListener('seeked', done);
          resolve();
        };
        video.addEventListener('seeked', done);
      });

      const stream = capture.call(video);
      if (muted) stream.getAudioTracks().forEach((track) => stream.removeTrack(track));
      const chunks: Blob[] = [];
      const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: bitrate });

      await new Promise<void>((resolve, reject) => {
        const stop = () => {
          if (recorder.state !== 'inactive') recorder.stop();
        };
        const onTime = () => {
          const pct = Math.round(((video.currentTime - safeStart) / clipLength) * 100);
          setProgress(Math.max(0, Math.min(98, pct)));
          if (video.currentTime >= safeEnd) stop();
        };

        recorder.ondataavailable = (event) => {
          if (event.data.size > 0) chunks.push(event.data);
        };
        recorder.onerror = () => reject(new Error('Video export failed.'));
        recorder.onstop = () => {
          video.removeEventListener('timeupdate', onTime);
          video.pause();
          resolve();
        };

        video.addEventListener('timeupdate', onTime);
        recorder.start(250);
        video.play().catch(reject);
        window.setTimeout(stop, (clipLength + 0.75) * 1000);
      });

      const blob = new Blob(chunks, { type: 'video/webm' });
      const url = URL.createObjectURL(blob);
      setDownloadUrl(url);
      setSavings({
        originalSize: sourceFile.size,
        newSize: blob.size,
        percent: Math.round(((sourceFile.size - blob.size) / sourceFile.size) * 100),
      });
      updateOptions({
        operation: 'live_video_editor',
        output_format: 'webm',
        start_time: safeStart,
        end_time: safeEnd,
        muted,
        quality,
        compression_target: compressionTarget,
        video_bitrate: bitrate,
      });
      setProgress(100);
    } catch (err: any) {
      setError(err.message || 'Video export failed.');
    } finally {
      setProcessing(false);
      setIsExporting(false);
      setIsPlaying(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full max-w-6xl mx-auto rounded-2xl border border-border bg-card shadow-premium overflow-hidden"
    >
      <div className="flex flex-col lg:flex-row min-h-[600px]">
        <div className="flex-1 bg-black border-b lg:border-b-0 lg:border-r border-border p-3 sm:p-4">
          <div className="rounded-xl overflow-hidden bg-black border border-white/10 min-h-[360px] flex items-center justify-center">
            <video
              ref={videoRef}
              src={previewUrl}
              controls
              playsInline
              className="max-h-[62vh] w-full bg-black"
              onLoadedMetadata={(event) => {
                const nextDuration = event.currentTarget.duration || 0;
                setDuration(nextDuration);
                setEnd(Math.min(10, nextDuration || 10));
              }}
              onPause={() => setIsPlaying(false)}
              onPlay={() => setIsPlaying(true)}
              onTimeUpdate={(event) => {
                if (event.currentTarget.currentTime >= safeEnd) {
                  event.currentTarget.pause();
                  event.currentTarget.currentTime = safeStart;
                }
              }}
            />
          </div>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-300">
            <span className="truncate">{uploadedFile?.name || sourceFile.name}</span>
            <span>{formatTime(duration)} · {formatBytes(sourceFile.size)}</span>
          </div>
        </div>

        <aside className="w-full lg:w-[360px] p-4 sm:p-5 space-y-5">
          <div>
            <h2 className="text-sm font-black text-foreground">Realtime Video Editor</h2>
            <p className="text-[11px] text-muted-foreground">Trim and export a browser-rendered WebM clip.</p>
          </div>

          <section className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
              <Scissors className="h-3.5 w-3.5" /> Trim
            </div>
            <div className="grid grid-cols-2 gap-2">
              <label className="space-y-1.5">
                <span className="text-xs font-semibold text-muted-foreground">Start</span>
                <input type="number" min={0} max={duration} step={0.1} value={Number(safeStart.toFixed(1))}
                  onChange={(e) => setStart(Math.max(0, Math.min(Number(e.target.value), safeEnd - 0.25)))}
                  className="w-full rounded-xl border border-border bg-card px-3 py-2 text-sm" />
              </label>
              <label className="space-y-1.5">
                <span className="text-xs font-semibold text-muted-foreground">End</span>
                <input type="number" min={0.25} max={duration || 9999} step={0.1} value={Number(safeEnd.toFixed(1))}
                  onChange={(e) => setEnd(Math.min(duration || 9999, Math.max(Number(e.target.value), safeStart + 0.25)))}
                  className="w-full rounded-xl border border-border bg-card px-3 py-2 text-sm" />
              </label>
            </div>
            <input type="range" min={0} max={Math.max(duration, 1)} step={0.1} value={safeStart}
              onChange={(e) => setStart(Math.min(Number(e.target.value), safeEnd - 0.25))}
              className="w-full accent-primary" />
            <input type="range" min={0} max={Math.max(duration, 1)} step={0.1} value={safeEnd}
              onChange={(e) => setEnd(Math.max(Number(e.target.value), safeStart + 0.25))}
              className="w-full accent-primary" />
            <div className="rounded-xl border border-border bg-muted/35 px-3 py-2 text-xs text-muted-foreground">
              Clip length: <span className="font-bold text-foreground">{formatTime(clipLength)}</span>
            </div>
          </section>

          <section className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
              <Gauge className="h-3.5 w-3.5" /> Export Quality
            </div>
            <div className="grid grid-cols-3 gap-2">
              {(['small', 'balanced', 'high'] as Quality[]).map((item) => (
                <button key={item} onClick={() => {
                  setQuality(item);
                  if (item === 'small') setCompressionTarget(70);
                  if (item === 'balanced') setCompressionTarget(45);
                  if (item === 'high') setCompressionTarget(20);
                }}
                  className={`rounded-xl border py-2 text-xs font-bold capitalize ${quality === item ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-card text-muted-foreground hover:text-foreground'}`}>
                  {item}
                </button>
              ))}
            </div>
            <label className="space-y-2 block">
              <span className="flex items-center justify-between text-xs font-semibold text-muted-foreground">
                <span>Compress target</span>
                <span className="text-foreground tabular-nums">{compressionTarget}%</span>
              </span>
              <input
                type="range"
                min={0}
                max={85}
                value={compressionTarget}
                onChange={(event) => setCompressionTarget(Number(event.target.value))}
                className="w-full accent-primary"
              />
            </label>
            <div className="rounded-xl border border-border bg-muted/35 px-3 py-2 text-[11px] text-muted-foreground">
              Higher compression means a smaller WebM, with more visible quality loss. Target bitrate: <span className="font-bold text-foreground">{(bitrate / 1_000_000).toFixed(1)} Mbps</span>.
            </div>
            <button onClick={() => setMuted((value) => !value)}
              className={`w-full flex items-center justify-center gap-2 rounded-xl border py-2 text-xs font-bold ${muted ? 'border-amber-400/40 bg-amber-400/10 text-amber-400' : 'border-border text-muted-foreground'}`}>
              {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
              {muted ? 'Audio muted' : 'Keep audio'}
            </button>
          </section>

          {error && (
            <div className="rounded-xl border border-red-500/25 bg-red-500/8 p-3 text-xs font-semibold text-red-400">
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-2">
            <button onClick={togglePreview}
              className="flex items-center justify-center gap-2 rounded-xl border border-border bg-card py-3 text-sm font-bold text-foreground hover:bg-muted">
              {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              Preview
            </button>
            <button onClick={() => {
              setStart(0);
              setEnd(Math.min(10, duration || 10));
              setMuted(false);
              setQuality('balanced');
              setCompressionTarget(45);
            }}
              className="flex items-center justify-center gap-2 rounded-xl border border-border bg-card py-3 text-sm font-bold text-foreground hover:bg-muted">
              <RotateCcw className="h-4 w-4" />
              Reset
            </button>
          </div>

          <button
            onClick={exportClip}
            disabled={isExporting || !duration}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-primary py-3.5 text-sm font-black text-primary-foreground hover:opacity-95 disabled:opacity-50"
          >
            {isExporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            Export WebM Clip
          </button>
        </aside>
      </div>
    </motion.div>
  );
};

export default LiveVideoEditor;
