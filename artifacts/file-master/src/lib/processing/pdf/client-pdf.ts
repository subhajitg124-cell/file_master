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

// ── PDF Editor operations ───────────────────────────────────────────────────

export async function runClientSidePdfRotate(
  file: File,
  rotation: number,
  mode: 'all' | 'specific' | 'odd' | 'even',
  pageList: number[]
): Promise<Blob> {
  const worker = createWorker();
  const api = wrap<any>(worker);
  const fileData = { name: file.name, buffer: await file.arrayBuffer() };
  const result: Uint8Array = await api.rotatePdfPages(fileData, rotation, mode, pageList);
  worker.terminate();
  return new Blob([result], { type: 'application/pdf' });
}

export async function runClientSidePdfDeletePages(
  file: File,
  pageList: number[]
): Promise<Blob> {
  const worker = createWorker();
  const api = wrap<any>(worker);
  const fileData = { name: file.name, buffer: await file.arrayBuffer() };
  const result: Uint8Array = await api.deletePdfPages(fileData, pageList);
  worker.terminate();
  return new Blob([result], { type: 'application/pdf' });
}

export async function runClientSidePdfWatermark(
  file: File,
  text: string,
  options: { fontSize?: number; opacity?: number; rotation?: number; position?: string; colorHex?: string }
): Promise<Blob> {
  const worker = createWorker();
  const api = wrap<any>(worker);
  const fileData = { name: file.name, buffer: await file.arrayBuffer() };
  const result: Uint8Array = await api.addPdfWatermark(fileData, text, options);
  worker.terminate();
  return new Blob([result], { type: 'application/pdf' });
}

export async function runClientSidePdfPageNumbers(
  file: File,
  options: { position?: string; startFrom?: number; fontSize?: number; prefix?: string; suffix?: string; colorHex?: string }
): Promise<Blob> {
  const worker = createWorker();
  const api = wrap<any>(worker);
  const fileData = { name: file.name, buffer: await file.arrayBuffer() };
  const result: Uint8Array = await api.addPdfPageNumbers(fileData, options);
  worker.terminate();
  return new Blob([result], { type: 'application/pdf' });
}

export async function runClientSidePdfReorder(
  file: File,
  newOrder: number[]
): Promise<Blob> {
  const worker = createWorker();
  const api = wrap<any>(worker);
  const fileData = { name: file.name, buffer: await file.arrayBuffer() };
  const result: Uint8Array = await api.reorderPdfPages(fileData, newOrder);
  worker.terminate();
  return new Blob([result], { type: 'application/pdf' });
}

export async function runClientSidePdfCrop(
  file: File,
  cropX: number,
  cropY: number,
  cropWidth: number,
  cropHeight: number,
  mode: 'all' | 'specific' | 'odd' | 'even',
  pageList: number[]
): Promise<Blob> {
  const worker = createWorker();
  const api = wrap<any>(worker);
  const fileData = { name: file.name, buffer: await file.arrayBuffer() };
  const result: Uint8Array = await api.cropPdfPages(fileData, cropX, cropY, cropWidth, cropHeight, mode, pageList);
  worker.terminate();
  return new Blob([result], { type: 'application/pdf' });
}

export interface PdfAnnotation {
  page: number;
  type: 'text' | 'cover' | 'replace';
  x: number;
  y: number;
  width?: number;
  height?: number;
  text?: string;
  fontSize?: number;
  colorHex?: string;
  fillColorHex?: string;
  bold?: boolean;
  italic?: boolean;
  opacity?: number;
}

export async function runClientSidePdfAnnotate(
  file: File,
  annotations: PdfAnnotation[]
): Promise<Blob> {
  const worker = createWorker();
  const api = wrap<any>(worker);
  const fileData = { name: file.name, buffer: await file.arrayBuffer() };
  const result: Uint8Array = await api.annotatePdf(fileData, annotations);
  worker.terminate();
  return new Blob([result], { type: 'application/pdf' });
}
