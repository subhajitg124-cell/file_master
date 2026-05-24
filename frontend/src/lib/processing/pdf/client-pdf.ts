import { wrap } from 'comlink';

/**
 * Executes PDF merging in a dedicated client-side Web Worker
 */
export async function runClientSidePdfMerge(files: File[]): Promise<Blob> {
  const worker = new Worker(new URL('./merge.worker.ts', import.meta.url));
  const api = wrap<any>(worker);
  
  // Read files into array buffers to transfer to the worker thread safely
  const filesData = await Promise.all(
    files.map(async (f) => ({
      name: f.name,
      buffer: await f.arrayBuffer()
    }))
  );
  
  const mergedUint8 = await api.mergePdfs(filesData);
  worker.terminate();
  
  return new Blob([mergedUint8], { type: 'application/pdf' });
}

/**
 * Executes PDF compression in a dedicated client-side Web Worker
 */
export async function runClientSidePdfCompress(file: File, quality: number): Promise<Blob> {
  const worker = new Worker(new URL('./merge.worker.ts', import.meta.url));
  const api = wrap<any>(worker);
  
  const fileData = {
    name: file.name,
    buffer: await file.arrayBuffer()
  };
  
  const compressedUint8 = await api.compressPdf(fileData, quality);
  worker.terminate();
  
  return new Blob([compressedUint8], { type: 'application/pdf' });
}
