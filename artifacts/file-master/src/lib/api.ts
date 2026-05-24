import { FileRecord, ProcessingSavings } from '@/store/useFileStore';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';

export interface HealthCheckResult {
  healthy: boolean;
  capabilities: {
    libreoffice: boolean;
    ffmpeg: boolean;
  };
}

export const apiClient = {
  async checkHealth(): Promise<HealthCheckResult> {
    try {
      const res = await fetch(`${BACKEND_URL}/api/v1/health`, {
        signal: AbortSignal.timeout(3000),
      });
      if (!res.ok) throw new Error('Health check status not ok');
      const data = await res.json();
      return {
        healthy: data.status === 'healthy' || data.status === 'degraded',
        capabilities: {
          libreoffice: data.services.libreoffice_headless === 'available',
          ffmpeg: data.services.ffmpeg === 'available',
        }
      };
    } catch (e) {
      console.warn('Backend connection failed, using mock mode fallbacks:', e);
      return {
        healthy: false,
        capabilities: { libreoffice: false, ffmpeg: false }
      };
    }
  },

  async uploadFiles(files: File[], jobId: string): Promise<FileRecord[]> {
    const formData = new FormData();
    formData.append('job_id', jobId);
    files.forEach((f) => formData.append('files', f));
    const res = await fetch(`${BACKEND_URL}/api/v1/upload`, {
      method: 'POST',
      body: formData,
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error((errData as any).detail || 'File upload failed.');
    }
    const data = await res.json();
    return data.files.map((file: any) => ({
      id: file.temp_filename,
      name: file.filename,
      size: file.size_bytes,
      type: file.mime_type,
      tempPath: file.temp_path,
      tempFilename: file.temp_filename,
      previewUrl: file.preview_url ? `${BACKEND_URL}${file.preview_url}` : undefined
    }));
  },

  async startProcessing(jobId: string, operation: string, options: Record<string, any>): Promise<void> {
    const res = await fetch(`${BACKEND_URL}/api/v1/process?job_id=${jobId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ operation, options }),
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error((errData as any).detail || 'Processing execution failed.');
    }
  },

  async pollStatus(jobId: string) {
    const res = await fetch(`${BACKEND_URL}/api/v1/status/${jobId}`);
    if (!res.ok) throw new Error('Failed to retrieve job status.');
    return await res.json();
  },

  getDownloadUrl(jobId: string): string {
    return `${BACKEND_URL}/api/v1/download/${jobId}`;
  }
};

const createMockPreviewPlaceholder = (file: File): string => {
  const extension = file.name.split('.').pop()?.toUpperCase() || 'FILE';
  const safeName = file.name.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="300" height="300">
      <rect width="100%" height="100%" fill="#f8fafc" />
      <rect x="30" y="30" width="240" height="90" rx="20" fill="#0ea5e9" />
      <text x="150" y="80" text-anchor="middle" dominant-baseline="middle" font-family="Inter,Arial,sans-serif" font-size="32" fill="#ffffff">${extension}</text>
      <text x="150" y="220" text-anchor="middle" dominant-baseline="middle" font-family="Inter,Arial,sans-serif" font-size="16" fill="#475569">${safeName}</text>
    </svg>
  `.trim();

  const encoded = window.btoa(unescape(encodeURIComponent(svg)));
  return `data:image/svg+xml;base64,${encoded}`;
};

export const apiMock = {
  async uploadFiles(files: File[], _jobId: string): Promise<FileRecord[]> {
    await new Promise((resolve) => setTimeout(resolve, 800));
    return files.map((file) => {
      const ext = file.name.split('.').pop() || '';
      let detectedType = file.type;
      if (ext === 'docx') detectedType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
      if (ext === 'xlsx') detectedType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      if (ext === 'pptx') detectedType = 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
      const previewUrl = detectedType.startsWith('image/')
        ? URL.createObjectURL(file)
        : createMockPreviewPlaceholder(file);
      return {
        id: Math.random().toString(36).substring(7),
        name: file.name,
        size: file.size,
        type: detectedType,
        previewUrl
      };
    });
  },

  simulateProcessing(
    _jobId: string,
    operation: string,
    files: FileRecord[],
    onProgress: (p: number) => void,
    onSuccess: (downloadUrl: string, savings: ProcessingSavings | null) => void,
    onFailure: (err: string) => void,
    outputMime?: string
  ) {
    let currentProgress = 0;
    const isSlowOp = (operation === 'compress' && files[0]?.type.startsWith('video/')) || operation === 'split';
    const interval = setInterval(() => {
      const step = isSlowOp ? 5 : 10;
      currentProgress += step;
      if (currentProgress >= 100) {
        clearInterval(interval);
        onProgress(100);
        const originalTotalSize = files.reduce((acc, f) => acc + f.size, 0);
        let ratio = 0.85;
        if (operation === 'compress') ratio = 0.42;
        if (operation === 'enhance') ratio = 1.05;
        if (outputMime && outputMime !== files[0]?.type) ratio = 0.9;
        const newSize = Math.round(originalTotalSize * ratio);
        const percent = Math.round(((originalTotalSize - newSize) / originalTotalSize) * 100);
        const resolvedMime = outputMime || files[0]?.type || 'application/octet-stream';
        const mockBlob = new Blob(['Simulated File Master Output'], { type: resolvedMime });
        const mockUrl = URL.createObjectURL(mockBlob);
        onSuccess(mockUrl, { originalSize: originalTotalSize, newSize, percent });
      } else {
        onProgress(currentProgress);
      }
    }, 180);
    return () => clearInterval(interval);
  }
};
