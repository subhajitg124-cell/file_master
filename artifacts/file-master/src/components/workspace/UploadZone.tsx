import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, AlertCircle, Loader2 } from 'lucide-react';
import { useFileStore } from '@/store/useFileStore';
import { apiClient, apiMock } from '@/lib/api';
import { detectFileType, getWorkspaceCategory } from '@/lib/file-detection';
import { AutoDetectAnimation } from '@/components/shared/AutoDetectAnimation';

interface UploadZoneProps {
  allowedCategory?: 'pdf' | 'image' | 'video' | 'office' | null;
}

export const UploadZone: React.FC<UploadZoneProps> = ({ allowedCategory = null }) => {
  const {
    addFiles,
    isMockMode,
    jobId,
    setJobId,
    setError,
    error,
    setSelectedSection
  } = useFileStore();

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
    setIsUploading(true);
    setError(null);
    const activeJobId = jobId || Math.random().toString(36).substring(2, 15);
    setJobId(activeJobId);
    try {
      let uploadedRecords = [];
      if (isMockMode) {
        uploadedRecords = await apiMock.uploadFiles([file], activeJobId);
      } else {
        uploadedRecords = await apiClient.uploadFiles([file], activeJobId);
      }
      addFiles(uploadedRecords);
    } catch (e: any) {
      console.error(e);
      setError(e.message || 'Failed to upload files. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;
    setError(null);
    setMismatchError(null);
    setPendingRedirect(null);
    const file = acceptedFiles[0];
    const detection = await detectFileType(file);
    const detectedCat = getWorkspaceCategory(detection.mime, detection.extension);
    if (allowedCategory) {
      if (detectedCat !== allowedCategory) {
        setMismatchError({ detected: detectedCat, fileName: file.name, file });
        return;
      }
    } else {
      if (detectedCat) {
        setPendingRedirect({ file, category: detectedCat, mime: detection.mime });
        return;
      }
    }
    useFileStore.getState().addRawFiles(acceptedFiles);
    setIsUploading(true);
    const activeJobId = jobId || Math.random().toString(36).substring(2, 15);
    setJobId(activeJobId);
    try {
      let uploadedRecords = [];
      if (isMockMode) {
        uploadedRecords = await apiMock.uploadFiles(acceptedFiles, activeJobId);
      } else {
        uploadedRecords = await apiClient.uploadFiles(acceptedFiles, activeJobId);
      }
      addFiles(uploadedRecords);
    } catch (e: any) {
      console.error(e);
      setError(e.message || 'Failed to upload files. Please try again.');
    } finally {
      setIsUploading(false);
    }
  }, [addFiles, allowedCategory, isMockMode, jobId, setError, setJobId]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    maxSize: 100 * 1024 * 1024,
  });

  const getAcceptLabel = () => {
    if (allowedCategory === 'pdf') return 'PDF documents only';
    if (allowedCategory === 'image') return 'PNG, JPG, JPEG, WEBP images only';
    if (allowedCategory === 'video') return 'MP4 videos only';
    if (allowedCategory === 'office') return 'DOCX, PPTX, XLSX, MD documents only';
    return 'Supports PDF, PNG, JPG, WEBP, DOCX, PPTX, XLSX, MP4 up to 100MB';
  };

  const getPromptText = () => {
    if (isDragActive) return 'Drop it here!';
    if (allowedCategory === 'pdf') return 'Drag & drop PDF files here';
    if (allowedCategory === 'image') return 'Drag & drop images here';
    if (allowedCategory === 'video') return 'Drag & drop MP4 video files here';
    if (allowedCategory === 'office') return 'Drag & drop documents here';
    return 'Drag & drop any file here to start';
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div
        {...getRootProps()}
        className={`relative group flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-10 cursor-pointer transition-all duration-300 ${
          isDragActive
            ? 'border-primary bg-accent/40 shadow-premium scale-[1.01]'
            : 'border-border bg-card hover:border-primary/50 hover:bg-muted/50'
        } focus-within:ring-2 focus-within:ring-primary focus-within:ring-offset-2`}
        role="button"
        tabIndex={0}
        aria-label={`File upload zone. ${getPromptText()}. ${getAcceptLabel()}`}
      >
        <input {...getInputProps()} />
        {isUploading ? (
          <div className="flex flex-col items-center justify-center space-y-4">
            <Loader2 className="h-10 w-10 text-primary animate-spin" />
            <div className="text-center">
              <p className="font-semibold text-lg">Uploading files...</p>
              <p className="text-sm text-muted-foreground">Checking file integrity & generating previews</p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center space-y-4 text-center">
            <div className={`p-4 rounded-full transition-transform duration-300 group-hover:scale-110 ${
              isDragActive ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'
            }`}>
              <Upload className="h-8 w-8" />
            </div>
            <div>
              <p className="text-lg font-semibold">{getPromptText()}</p>
              <p className="text-sm text-muted-foreground mt-1">
                or <span className="text-primary font-medium group-hover:underline">browse your device</span>
              </p>
            </div>
            <p className="text-xs text-muted-foreground">{getAcceptLabel()}</p>
          </div>
        )}
      </div>

      {pendingRedirect && (
        <AutoDetectAnimation
          fileName={pendingRedirect.file.name}
          detectedType={pendingRedirect.mime.split('/').pop()?.toUpperCase() || pendingRedirect.category.toUpperCase()}
          targetWorkspace={pendingRedirect.category}
          onConfirm={() => handleRedirectWorkspace(pendingRedirect.category, pendingRedirect.file)}
          onCancel={() => setPendingRedirect(null)}
        />
      )}

      {mismatchError && (
        <div className="flex flex-col space-y-3 bg-yellow-500/10 border border-yellow-500/20 p-4 rounded-lg mt-4 text-sm font-medium">
          <div className="flex items-start space-x-2 text-yellow-600 dark:text-yellow-400">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-foreground">File Format Mismatch</p>
              <p className="text-xs mt-0.5 leading-relaxed">
                You uploaded <span className="font-mono bg-yellow-500/20 px-1 rounded text-foreground">{mismatchError.fileName}</span>, which appears to be a{' '}
                <span className="font-bold uppercase">{mismatchError.detected || 'unknown'}</span> format file. This workspace only accepts{' '}
                <span className="font-bold uppercase">{allowedCategory}</span> files.
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-3 pl-6">
            <button
              onClick={() => handleRedirectWorkspace(mismatchError.detected, mismatchError.file)}
              className="px-3 py-1.5 bg-yellow-500 text-black text-xs font-bold rounded-lg hover:bg-yellow-600 transition-all shadow-sm"
            >
              Redirect to {mismatchError.detected === 'pdf' ? 'PDF Suite' : mismatchError.detected === 'image' ? 'Image Lab' : mismatchError.detected === 'video' ? 'Video Studio' : 'Office Suite'}
            </button>
            <button onClick={() => setMismatchError(null)} className="text-xs text-muted-foreground hover:text-foreground">
              Dismiss
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className="flex items-center space-x-2 bg-red-500/10 text-red-500 dark:text-red-400 p-3 rounded-lg mt-4 text-sm font-medium border border-red-500/20">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
};

export default UploadZone;
