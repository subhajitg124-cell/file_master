import { create } from 'zustand';

export interface FileRecord {
  id: string;
  name: string;
  size: number;
  type: string;          // MIME type
  tempPath?: string;     // Server path
  tempFilename?: string; // Server file identifier
  previewUrl?: string;   // Image thumbnail endpoint
}

export interface ProcessingSavings {
  originalSize: number;
  newSize: number;
  percent: number;
}

export type OperationType = 'merge' | 'compress' | 'enhance' | 'edit' | 'convert';

interface FileState {
  // Navigation Section
  selectedSection: 'pdf' | 'image' | 'office' | 'video' | null;
  setSelectedSection: (section: 'pdf' | 'image' | 'office' | 'video' | null) => void;

  // Raw browser File handles for client-side processing
  rawFiles: File[];
  addRawFiles: (files: File[]) => void;

  // File Queue
  files: FileRecord[];
  
  // Processing States
  selectedOperation: OperationType | null;
  operationOptions: Record<string, any>;
  isProcessing: boolean;
  progress: number;
  jobId: string | null;
  downloadUrl: string | null;
  error: string | null;
  savings: ProcessingSavings | null;
  ttlRemaining: number | null;
  
  // Environment Settings & Health
  isMockMode: boolean;
  backendHealthy: boolean;
  backendCapabilities: {
    libreoffice: boolean;
    ffmpeg: boolean;
  };

  // Actions
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
  toggleMockMode: () => void;
  setBackendStatus: (healthy: boolean, capabilities: { libreoffice: boolean; ffmpeg: boolean }) => void;
}

export const useFileStore = create<FileState>((set) => ({
  selectedSection: null,
  setSelectedSection: (section) => set(() => {
    if (typeof window !== 'undefined') {
      if (section) {
        localStorage.setItem('file-master-last-workspace', section);
      } else {
        localStorage.removeItem('file-master-last-workspace');
      }
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
  
  isMockMode: false, // Default: connect to actual backend, falls back dynamically
  backendHealthy: true,
  backendCapabilities: {
    libreoffice: false,
    ffmpeg: false
  },

  addFiles: (newFiles) => set((state) => {
    // If files are added, check if we need to auto-suggest an operation
    const updatedFiles = [...state.files, ...newFiles];
    
    // Auto-detect a default operation based on the first file type
    let suggestedOp: OperationType | null = state.selectedOperation;
    let suggestedOptions: Record<string, any> = { ...state.operationOptions };

    if (!state.selectedOperation && updatedFiles.length > 0) {
      const type = updatedFiles[0].type;
      if (type === 'application/pdf') {
        suggestedOp = updatedFiles.length > 1 ? 'merge' : 'compress';
        suggestedOptions = { operation: suggestedOp };
      } else if (type.startsWith('image/')) {
        suggestedOp = 'compress';
        suggestedOptions = { operation: 'compress', quality: 80, resize_pct: 1.0 };
      } else if (type.startsWith('video/')) {
        suggestedOp = 'compress';
        suggestedOptions = { operation: 'compress', crf: 28, preset: 'medium' };
      } else if (type.includes('word') || type.includes('officedocument')) {
        suggestedOp = 'convert';
        suggestedOptions = { operation: 'docx_to_pdf' };
      }
    }

    return { 
      files: updatedFiles,
      selectedOperation: suggestedOp,
      operationOptions: suggestedOptions
    };
  }),

  removeFile: (id) => set((state) => ({
    files: state.files.filter((f) => f.id !== id)
  })),

  clearStore: () => set({
    selectedSection: null,
    rawFiles: [],
    files: [],
    selectedOperation: null,
    operationOptions: {},
    isProcessing: false,
    progress: 0,
    jobId: null,
    downloadUrl: null,
    error: null,
    savings: null,
    ttlRemaining: null
  }),

  setOperation: (operation) => set((state) => {
    // Set operation and set up sensible default options
    const firstFileType = state.files[0]?.type || '';
    let defaults: Record<string, any> = {};

    if (operation === 'compress') {
      if (firstFileType.startsWith('image/')) {
        defaults = { quality: 80, resize_pct: 1.0 };
      } else if (firstFileType.startsWith('video/')) {
        defaults = { crf: 28, preset: 'medium' };
      } else {
        defaults = {};
      }
    } else if (operation === 'enhance') {
      if (firstFileType.startsWith('image/')) {
        defaults = { brightness: 1.0, contrast: 1.0, sharpness: 1.0, denoise: false };
      }
    } else if (operation === 'convert') {
      if (firstFileType === 'application/pdf') {
        defaults = { target_format: 'png' };
      } else if (firstFileType.startsWith('image/')) {
        defaults = { target_format: 'webp' };
      } else if (firstFileType.includes('wordprocessing') || firstFileType.endsWith('docx')) {
        defaults = { operation: 'docx_to_pdf' };
      } else if (firstFileType.includes('presentation') || firstFileType.endsWith('pptx')) {
        defaults = { operation: 'pptx_to_pdf' };
      } else if (firstFileType.includes('spreadsheet') || firstFileType.endsWith('xlsx')) {
        defaults = { operation: 'xlsx_to_csv' };
      } else if (firstFileType === 'text/markdown' || firstFileType.endsWith('md')) {
        defaults = { operation: 'md_to_html' };
      }
    } else if (operation === 'edit') {
      if (firstFileType.startsWith('video/')) {
        defaults = { start_time: 0, end_time: 10 };
      } else if (firstFileType.includes('word') || firstFileType.endsWith('docx')) {
        defaults = { operation: 'docx_cleanup' };
      }
    }

    return {
      selectedOperation: operation,
      operationOptions: { ...defaults, operation }
    };
  }),

  updateOptions: (options) => set((state) => ({
    operationOptions: { ...state.operationOptions, ...options }
  })),

  setProcessing: (isProcessing) => set({ isProcessing }),
  setProgress: (progress) => set({ progress }),
  setJobId: (jobId) => set({ jobId }),
  setDownloadUrl: (downloadUrl) => set({ downloadUrl }),
  setError: (error) => set({ error }),
  setSavings: (savings) => set({ savings }),
  setTtlRemaining: (ttlRemaining) => set({ ttlRemaining }),
  toggleMockMode: () => set((state) => ({ isMockMode: !state.isMockMode })),
  setBackendStatus: (backendHealthy, backendCapabilities) => set({ backendHealthy, backendCapabilities })
}));
