import { FileRecord, ProcessingSavings } from '@/store/useFileStore';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';

export interface HealthCheckResult {
  healthy: boolean;
  capabilities: {
    libreoffice: boolean;
    ffmpeg: boolean;
  };
}

export const apiClient = {
  /**
   * Health status check
   */
  async checkHealth(): Promise<HealthCheckResult> {
    try {
      const res = await fetch(`${BACKEND_URL}/api/v1/health`, {
        signal: AbortSignal.timeout(3000), // 3s timeout
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

  /**
   * Uploads files
   */
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
      throw new Error(errData.detail || 'File upload failed.');
    }

    const data = await res.json();
    
    // Map backend response back to our store record structure
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

  /**
   * Triggers processing
   */
  async startProcessing(jobId: string, operation: string, options: Record<string, any>): Promise<void> {
    const res = await fetch(`${BACKEND_URL}/api/v1/process?job_id=${jobId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        operation,
        options,
      }),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.detail || 'Processing execution failed.');
    }
  },

  /**
   * Polls job progress status
   */
  async pollStatus(jobId: string) {
    const res = await fetch(`${BACKEND_URL}/api/v1/status/${jobId}`);
    if (!res.ok) throw new Error('Failed to retrieve job status.');
    return await res.json();
  },

  /**
   * Returns absolute download url
   */
  getDownloadUrl(jobId: string): string {
    return `${BACKEND_URL}/api/v1/download/${jobId}`;
  }
};

/**
 * Self-contained local simulator.
 * Emulates uploading, processing delays, progress indicators, and compression savings metrics.
 */
export const apiMock = {
  async uploadFiles(files: File[], jobId: string): Promise<FileRecord[]> {
    await new Promise((resolve) => setTimeout(resolve, 800)); // Sim upload latency
    
    return files.map((file) => {
      // Simulate file check
      const ext = file.name.split('.').pop() || '';
      let detectedType = file.type;
      
      // Edge-case mock magic-byte replacements
      if (ext === 'docx') detectedType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
      if (ext === 'xlsx') detectedType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      if (ext === 'pptx') detectedType = 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
      
      return {
        id: Math.random().toString(36).substring(7),
        name: file.name,
        size: file.size,
        type: detectedType,
        previewUrl: detectedType.startsWith('image/') ? URL.createObjectURL(file) : undefined
      };
    });
  },

  simulateProcessing(
    jobId: string, 
    operation: string, 
    files: FileRecord[],
    onProgress: (p: number) => void,
    onSuccess: (downloadUrl: string, savings: ProcessingSavings | null) => void,
    onFailure: (err: string) => void
  ) {
    let currentProgress = 0;
    
    const interval = setInterval(() => {
      // Slower processing speed for videos/large files
      const step = operation === 'compress' && files[0]?.type.startsWith('video/') ? 5 : 12;
      currentProgress += step;
      
      if (currentProgress >= 100) {
        clearInterval(interval);
        onProgress(100);

        // Compute simulated file sizes
        const originalTotalSize = files.reduce((acc, f) => acc + f.size, 0);
        let ratio = 0.85; // 15% savings standard
        if (operation === 'compress') ratio = 0.42; // 58% savings
        if (operation === 'enhance') ratio = 1.05;  // Enhancing adds minor headers
        
        const newSize = Math.round(originalTotalSize * ratio);
        const percent = Math.round(((originalTotalSize - newSize) / originalTotalSize) * 100);

        const mockBlob = new Blob(["Simulated File Master Output"], { type: files[0]?.type || "application/octet-stream" });
        const mockUrl = URL.createObjectURL(mockBlob);

        onSuccess(mockUrl, {
          originalSize: originalTotalSize,
          newSize,
          percent: percent
        });
      } else {
        onProgress(currentProgress);
      }
    }, 200);

    return () => clearInterval(interval);
  }
};
