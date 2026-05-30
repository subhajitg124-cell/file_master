import { create } from 'zustand';

export interface FileRecord {
  id: string;
  name: string;
  size: number;
  type: string;
  tempPath?: string;
  tempFilename?: string;
  previewUrl?: string;
}

export interface ProcessingSavings {
  originalSize: number;
  newSize: number;
  percent: number;
}

export type OperationType = 'merge' | 'compress' | 'enhance' | 'edit' | 'convert' | 'split' | 'resize';

interface FileState {
  selectedSection: 'pdf' | 'image' | 'office' | 'video' | null;
  setSelectedSection: (section: 'pdf' | 'image' | 'office' | 'video' | null) => void;
  rawFiles: File[];
  addRawFiles: (files: File[]) => void;
  files: FileRecord[];
  selectedOperation: OperationType | null;
  operationOptions: Record<string, any>;
  isProcessing: boolean;
  progress: number;
  jobId: string | null;
  downloadUrl: string | null;
  error: string | null;
  savings: ProcessingSavings | null;
  ttlRemaining: number | null;
  isMockMode: boolean;
  backendHealthy: boolean;
  backendCapabilities: { libreoffice: boolean; ffmpeg: boolean };
  addFiles: (newFiles: FileRecord[]) => void;
  removeFile: (id: string) => void;
  clearStore: () => void;
  setOperation: (operation: OperationType) => void;
  updateOptions: (options: Record<string, any>) => void;
  setProcessing: (processing: boolean) => void;
  setProgress: (progress: number) => void;
  setJobId: (jobId: string | null) => void;
  setDownloadUrl: (url: string | null) => void;
  setError: (error: string | null) => void;
  setSavings: (savings: ProcessingSavings | null) => void;
  setTtlRemaining: (ttl: number | null) => void;
  editorOpen: boolean;
  editorFile: File | null;
  editorFileType: 'image' | 'pdf' | 'document';
  openEditor: (file: File, fileType: 'image' | 'pdf' | 'document') => void;
  closeEditor: () => void;
  toggleMockMode: () => void;
  setBackendStatus: (healthy: boolean, capabilities: { libreoffice: boolean; ffmpeg: boolean }) => void;
}

export const useFileStore = create<FileState>((set) => ({
  selectedSection: null,
  setSelectedSection: (section) => set(() => {
    if (typeof window !== 'undefined') {
      if (section) localStorage.setItem('file-nova-last-workspace', section);
      else localStorage.removeItem('file-nova-last-workspace');
    }
    return { selectedSection: section };
  }),
  rawFiles: [],
  addRawFiles: (newRaw) => set((state) => ({ rawFiles: [...state.rawFiles, ...newRaw] })),
  files: [],
  selectedOperation: null,
  operationOptions: {},
  isProcessing: false,
  progress: 0,
  jobId: null,
  downloadUrl: null,
  error: null,
  savings: null,
  ttlRemaining: null,
  isMockMode: false,
  backendHealthy: true,
  backendCapabilities: { libreoffice: false, ffmpeg: false },
  addFiles: (newFiles) => set((state) => {
    const updatedFiles = [...state.files, ...newFiles];
    let suggestedOp: OperationType | null = state.selectedOperation;
    let suggestedOptions: Record<string, any> = { ...state.operationOptions };
    if (!state.selectedOperation && updatedFiles.length > 0) {
      const type = updatedFiles[0].type;
      if (type === 'application/pdf') {
        suggestedOp = updatedFiles.length > 1 ? 'merge' : 'compress';
        suggestedOptions = { operation: suggestedOp };
      } else if (type.startsWith('image/')) {
        suggestedOp = 'compress';
        suggestedOptions = { operation: 'compress', quality: 82, resize_pct: 1.0 };
      } else if (type === 'image/svg+xml') {
        suggestedOp = 'convert';
        suggestedOptions = { operation: 'svg_to_png' };
      } else if (type.startsWith('video/')) {
        suggestedOp = 'compress';
        suggestedOptions = { operation: 'compress', crf: 28, preset: 'medium' };
      } else if (type.startsWith('audio/')) {
        suggestedOp = 'compress';
        suggestedOptions = { operation: 'compress', audio_bitrate: 128 };
      } else if (type.includes('word') || type.includes('officedocument')) {
        suggestedOp = 'convert';
        suggestedOptions = { operation: 'docx_to_pdf' };
      } else if (type === 'text/csv' || type.endsWith('csv')) {
        suggestedOp = 'convert';
        suggestedOptions = { operation: 'csv_to_xlsx' };
      } else if (type === 'text/html') {
        suggestedOp = 'convert';
        suggestedOptions = { operation: 'html_to_md' };
      }
    }
    return { files: updatedFiles, selectedOperation: suggestedOp, operationOptions: suggestedOptions };
  }),
  removeFile: (id) => set((state) => ({ files: state.files.filter((f) => f.id !== id) })),
  clearStore: () => set({
    selectedSection: null, rawFiles: [], files: [], selectedOperation: null,
    operationOptions: {}, isProcessing: false, progress: 0, jobId: null,
    downloadUrl: null, error: null, savings: null, ttlRemaining: null
  }),
  setOperation: (operation) => set((state) => {
    const firstFileType = state.files[0]?.type || '';
    let defaults: Record<string, any> = {};
    if (operation === 'compress') {
      if (firstFileType.startsWith('image/')) defaults = { quality: 82, resize_pct: 1.0, compress_preset: 'balanced' };
      else if (firstFileType.startsWith('video/')) defaults = { crf: 28, preset: 'medium' };
      else if (firstFileType.startsWith('audio/')) defaults = { audio_bitrate: 128, audio_format: 'mp3' };
      else if (firstFileType.includes('officedocument') || firstFileType.includes('word') || firstFileType.includes('sheet') || firstFileType.includes('presentation')) {
        defaults = { office_compress_level: 'standard' };
      }
    } else if (operation === 'split') {
      defaults = { split_mode: 'all', split_every: 1, split_range: '1-1' };
    } else if (operation === 'enhance') {
      if (firstFileType.startsWith('image/')) defaults = { brightness: 1.0, contrast: 1.0, sharpness: 1.2, denoise: false, enhance_preset: 'custom' };
    } else if (operation === 'resize') {
      defaults = { resize_width: 800, resize_height: 600, resize_lock_aspect: true, resize_format: 'png' };
    } else if (operation === 'convert') {
      if (firstFileType === 'application/pdf') defaults = { operation: 'pdf_to_docx' };
      else if (firstFileType === 'image/svg+xml') defaults = { operation: 'svg_to_png', svg_width: 512, svg_height: 512 };
      else if (firstFileType.startsWith('image/')) defaults = { target_format: 'webp', operation: 'convert_format' };
      else if (firstFileType.includes('wordprocessing') || firstFileType.endsWith('docx')) defaults = { operation: 'docx_to_pdf' };
      else if (firstFileType.includes('presentation') || firstFileType.endsWith('pptx')) defaults = { operation: 'pptx_to_pdf' };
      else if (firstFileType.includes('spreadsheet') || firstFileType.endsWith('xlsx')) defaults = { operation: 'xlsx_to_csv' };
      else if (firstFileType === 'text/csv') defaults = { operation: 'csv_to_xlsx' };
      else if (firstFileType === 'text/markdown') defaults = { operation: 'md_to_html' };
      else if (firstFileType === 'text/html') defaults = { operation: 'html_to_md' };
    } else if (operation === 'edit') {
      if (firstFileType.startsWith('video/')) defaults = { start_time: 0, end_time: 10 };
      else if (firstFileType.includes('word') || firstFileType.endsWith('docx')) defaults = { operation: 'docx_cleanup' };
    }
    return { selectedOperation: operation, operationOptions: { ...defaults, operation } };
  }),
  updateOptions: (options) => set((state) => ({ operationOptions: { ...state.operationOptions, ...options } })),
  setProcessing: (isProcessing) => set({ isProcessing }),
  setProgress: (progress) => set({ progress }),
  setJobId: (jobId) => set({ jobId }),
  setDownloadUrl: (downloadUrl) => set({ downloadUrl }),
  setError: (error) => set({ error }),
  setSavings: (savings) => set({ savings }),
  setTtlRemaining: (ttlRemaining) => set({ ttlRemaining }),
  editorOpen: false,
  editorFile: null,
  editorFileType: 'image',
  openEditor: (file, fileType) => set({ editorOpen: true, editorFile: file, editorFileType: fileType }),
  closeEditor: () => set({ editorOpen: false, editorFile: null }),
  toggleMockMode: () => set((state) => ({ isMockMode: !state.isMockMode })),
  setBackendStatus: (backendHealthy, backendCapabilities) => set({ backendHealthy, backendCapabilities })
}));
