import { wrap } from 'comlink';

function createWorker() {
  return new Worker(new URL('./merge.worker.ts', import.meta.url));
}

export async function runClientSidePdfMerge(files: File[]): Promise<Blob> {
  const worker = createWorker();
  const api = wrap<any>(worker);
  const filesData = await Promise.all(
    files.map(async (f) => ({ name: f.name, buffer: await f.arrayBuffer() }))
  );
  const mergedUint8 = await api.mergePdfs(filesData);
  worker.terminate();
  return new Blob([mergedUint8], { type: 'application/pdf' });
}

export async function runClientSidePdfCompress(file: File, quality: number): Promise<Blob> {
  const worker = createWorker();
  const api = wrap<any>(worker);
  const fileData = { name: file.name, buffer: await file.arrayBuffer() };
  const compressedUint8 = await api.compressPdf(fileData, quality);
  worker.terminate();
  return new Blob([compressedUint8], { type: 'application/pdf' });
}

export async function runClientSidePdfSplit(
  file: File,
  mode: 'all' | 'every' | 'range',
  splitEvery: number,
  splitRange: string
): Promise<Blob[]> {
  const worker = createWorker();
  const api = wrap<any>(worker);
  const fileData = { name: file.name, buffer: await file.arrayBuffer() };
  const results: Uint8Array[] = await api.splitPdf(fileData, mode, splitEvery, splitRange);
  worker.terminate();
  return results.map((u8) => new Blob([u8], { type: 'application/pdf' }));
}

export async function runClientSideImagesToPdf(files: File[]): Promise<Blob> {
  const worker = createWorker();
  const api = wrap<any>(worker);
  const imagesData = await Promise.all(
    files.map(async (f) => ({
      name: f.name,
      buffer: await f.arrayBuffer(),
      mimeType: f.type || 'image/png',
    }))
  );
  const pdfUint8 = await api.imagesToPdf(imagesData);
  worker.terminate();
  return new Blob([pdfUint8], { type: 'application/pdf' });
}
