import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, AlertCircle, Loader2, FileText, Image, Video, FileSpreadsheet, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useFileStore } from '@/store/useFileStore';
import { apiClient, apiMock } from '@/lib/api';
import { detectFileType, getWorkspaceCategory } from '@/lib/file-detection';
import { AutoDetectAnimation } from '@/components/shared/AutoDetectAnimation';

interface UploadZoneProps {
  allowedCategory?: 'pdf' | 'image' | 'video' | 'office' | null;
}

const CATEGORY_META = {
  pdf:    { icon: FileText,       label: 'PDF Suite',     color: 'text-red-400',     bg: 'bg-red-500/10',     border: 'border-red-500/30' },
  image:  { icon: Image,          label: 'Image Lab',     color: 'text-blue-400',    bg: 'bg-blue-500/10',    border: 'border-blue-500/30' },
  video:  { icon: Video,          label: 'Video Studio',  color: 'text-violet-400',  bg: 'bg-violet-500/10',  border: 'border-violet-500/30' },
  office: { icon: FileSpreadsheet,label: 'Office Suite',  color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30' },
};

export const UploadZone: React.FC<UploadZoneProps> = ({ allowedCategory = null }) => {
  const { addFiles, isMockMode, jobId, setJobId, setError, error, setSelectedSection } = useFileStore();
  const [isUploading, setIsUploading] = useState(false);
  const [mismatchError, setMismatchError] = useState<{
    detected: 'pdf' | 'image' | 'video' | 'office' | null;
    fileName: string;
    file: File;
  } | null>(null);
  const [pendingRedirect, setPendingRedirect] = useState<{
    file: File;
    category: 'pdf' | 'image' | 'video' | 'office';
    mime: string;
  } | null>(null);

  const handleRedirectWorkspace = async (targetCat: 'pdf' | 'image' | 'video' | 'office' | null, file: File) => {
    if (!targetCat) return;
    setSelectedSection(targetCat);
    setMismatchError(null);
    useFileStore.setState((state) => ({ rawFiles: [...state.rawFiles, file] }));
    setIsUploading(true); setError(null);
    const activeJobId = jobId || Math.random().toString(36).substring(2, 15);
    setJobId(activeJobId);
    try {
      const uploaded = isMockMode
        ? await apiMock.uploadFiles([file], activeJobId)
        : await apiClient.uploadFiles([file], activeJobId);
      addFiles(uploaded);
    } catch (e: any) { setError(e.message || 'Failed to upload.'); }
    finally { setIsUploading(false); }
  };

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;
    setError(null); setMismatchError(null); setPendingRedirect(null);
    const file = acceptedFiles[0];
    const detection = await detectFileType(file);
    const detectedCat = getWorkspaceCategory(detection.mime, detection.extension);
    if (allowedCategory) {
      if (detectedCat !== allowedCategory) { setMismatchError({ detected: detectedCat, fileName: file.name, file }); return; }
    } else {
      if (detectedCat) { setPendingRedirect({ file, category: detectedCat, mime: detection.mime }); return; }
    }
    useFileStore.getState().addRawFiles(acceptedFiles);
    setIsUploading(true);
    const activeJobId = jobId || Math.random().toString(36).substring(2, 15);
    setJobId(activeJobId);
    try {
      const uploaded = isMockMode
        ? await apiMock.uploadFiles(acceptedFiles, activeJobId)
        : await apiClient.uploadFiles(acceptedFiles, activeJobId);
      addFiles(uploaded);
    } catch (e: any) { setError(e.message || 'Failed to upload.'); }
    finally { setIsUploading(false); }
  }, [addFiles, allowedCategory, isMockMode, jobId, setError, setJobId]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop, maxSize: 100 * 1024 * 1024 });

  const getAcceptLabel = () => {
    if (allowedCategory === 'pdf')    return 'PDF files only · up to 100 MB';
    if (allowedCategory === 'image')  return 'PNG, JPG, WEBP, GIF, SVG images · up to 100 MB';
    if (allowedCategory === 'video')  return 'MP4, WebM video files · up to 100 MB';
    if (allowedCategory === 'office') return 'DOCX, PPTX, XLSX, CSV, MD, HTML · up to 100 MB';
    return 'PDF, PNG, JPG, DOCX, PPTX, XLSX, MP4 and more · up to 100 MB';
  };

  const getHeadline = () => {
    if (isDragActive) return 'Release to upload';
    if (allowedCategory === 'pdf')    return 'Drop your PDF here';
    if (allowedCategory === 'image')  return 'Drop your image here';
    if (allowedCategory === 'video')  return 'Drop your video here';
    if (allowedCategory === 'office') return 'Drop your document here';
    return 'Drop any file to get started';
  };

  const catMeta = allowedCategory ? CATEGORY_META[allowedCategory] : null;
  const CatIcon = catMeta?.icon || Sparkles;

  return (
    <div className="w-full max-w-2xl mx-auto space-y-3">
      <motion.div
        {...(getRootProps() as any)}
        whileHover={{ scale: 1.005 }}
        whileTap={{ scale: 0.998 }}
        className={`
          relative group cursor-pointer rounded-2xl border-2 transition-all duration-300 overflow-hidden
          focus-within:ring-2 focus-within:ring-primary/50 focus-within:ring-offset-2 focus-within:ring-offset-background
          ${isDragActive
            ? 'border-primary bg-primary/5 shadow-glow border-march'
            : 'border-dashed border-border hover:border-primary/50 bg-card hover:bg-muted/30'
          }
        `}
        style={{ minHeight: 200 }}
        role="button" tabIndex={0}
        aria-label={`File upload zone. ${getHeadline()}. ${getAcceptLabel()}`}
      >
        <input {...getInputProps()} />

        {/* Background glow layer on drag */}
        <AnimatePresence>
          {isDragActive && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 pointer-events-none"
              style={{
                background: 'radial-gradient(ellipse at 50% 50%, rgba(99,102,241,0.12) 0%, transparent 70%)',
              }}
            />
          )}
        </AnimatePresence>

        {/* Corner decorations */}
        <div className="absolute top-3 left-3 h-4 w-4 border-t-2 border-l-2 border-border/40 rounded-tl-lg pointer-events-none transition-colors group-hover:border-primary/30" />
        <div className="absolute top-3 right-3 h-4 w-4 border-t-2 border-r-2 border-border/40 rounded-tr-lg pointer-events-none transition-colors group-hover:border-primary/30" />
        <div className="absolute bottom-3 left-3 h-4 w-4 border-b-2 border-l-2 border-border/40 rounded-bl-lg pointer-events-none transition-colors group-hover:border-primary/30" />
        <div className="absolute bottom-3 right-3 h-4 w-4 border-b-2 border-r-2 border-border/40 rounded-br-lg pointer-events-none transition-colors group-hover:border-primary/30" />

        <div className="relative flex flex-col items-center justify-center gap-5 p-10 text-center">
          {isUploading ? (
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center gap-4">
              <div className="relative">
                <div className="h-16 w-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                  <Loader2 className="h-7 w-7 text-primary animate-spin" />
                </div>
              </div>
              <div>
                <p className="font-bold text-foreground">Uploading your file…</p>
                <p className="text-xs text-muted-foreground mt-1">Checking integrity and generating preview</p>
              </div>
            </motion.div>
          ) : (
            <motion.div
              animate={isDragActive ? { scale: 1.05 } : { scale: 1 }}
              transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              className="flex flex-col items-center gap-5"
            >
              {/* Icon */}
              <div className="relative">
                {/* Outer ring */}
                <motion.div
                  animate={isDragActive ? { scale: 1.3, opacity: 0 } : { scale: 1.2, opacity: 0.4 }}
                  transition={{ duration: 0.8, repeat: isDragActive ? 0 : Infinity, repeatType: 'reverse', ease: 'easeInOut' }}
                  className={`absolute inset-0 rounded-2xl ${catMeta ? catMeta.bg : 'bg-primary/8'} pointer-events-none`}
                />
                <motion.div
                  animate={isDragActive ? { y: -4 } : { y: [0, -4, 0] }}
                  transition={isDragActive ? { duration: 0.2 } : { duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
                  className={`relative h-16 w-16 rounded-2xl border flex items-center justify-center shadow-premium
                    ${isDragActive
                      ? 'bg-primary/15 border-primary/40'
                      : catMeta
                        ? `${catMeta.bg} ${catMeta.border}`
                        : 'bg-primary/8 border-primary/20 group-hover:bg-primary/12'
                    }
                  `}
                >
                  {isDragActive
                    ? <Upload className="h-7 w-7 text-primary" />
                    : <CatIcon className={`h-7 w-7 ${catMeta?.color || 'text-primary'}`} />
                  }
                </motion.div>
              </div>

              {/* Text */}
              <div className="space-y-1.5">
                <p className={`text-lg font-bold transition-colors ${isDragActive ? 'text-primary' : 'text-foreground'}`}>
                  {getHeadline()}
                </p>
                <p className="text-sm text-muted-foreground">
                  or{' '}
                  <span className="text-primary font-semibold underline-offset-2 group-hover:underline transition-all">
                    click to browse
                  </span>{' '}
                  your files
                </p>
              </div>

              {/* Accept label pill */}
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-muted/60 border border-border text-xs text-muted-foreground font-medium">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shrink-0" />
                {getAcceptLabel()}
              </div>
            </motion.div>
          )}
        </div>
      </motion.div>

      {/* Auto-detect redirect */}
      {pendingRedirect && (
        <AutoDetectAnimation
          fileName={pendingRedirect.file.name}
          detectedType={pendingRedirect.mime.split('/').pop()?.toUpperCase() || pendingRedirect.category.toUpperCase()}
          targetWorkspace={pendingRedirect.category}
          onConfirm={() => handleRedirectWorkspace(pendingRedirect.category, pendingRedirect.file)}
          onCancel={() => setPendingRedirect(null)}
        />
      )}

      {/* Mismatch error */}
      <AnimatePresence>
        {mismatchError && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            className="flex flex-col gap-3 bg-amber-500/8 border border-amber-500/25 p-4 rounded-xl text-sm">
            <div className="flex items-start gap-2.5 text-amber-500">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-foreground text-sm">Wrong file type</p>
                <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                  <span className="font-mono bg-muted px-1 py-0.5 rounded text-foreground text-[11px]">{mismatchError.fileName}</span> is a{' '}
                  <span className="font-bold uppercase text-amber-500">{mismatchError.detected || 'unknown'}</span> file.
                  This workspace only accepts <span className="font-bold uppercase text-amber-500">{allowedCategory}</span> files.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 pl-6">
              <button
                onClick={() => handleRedirectWorkspace(mismatchError.detected, mismatchError.file)}
                className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold rounded-lg transition-all shadow-sm"
              >
                Open in {mismatchError.detected === 'pdf' ? 'PDF Suite' : mismatchError.detected === 'image' ? 'Image Lab' : mismatchError.detected === 'video' ? 'Video Studio' : 'Office Suite'}
              </button>
              <button onClick={() => setMismatchError(null)} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                Dismiss
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Upload error */}
      <AnimatePresence>
        {error && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="flex items-center gap-2.5 bg-red-500/8 text-red-400 p-3 rounded-xl text-sm font-medium border border-red-500/20">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default UploadZone;
