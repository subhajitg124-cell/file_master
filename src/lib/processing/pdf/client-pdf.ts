import { wrap } from 'comlink';

function createWorker() {
  return new Worker(new URL('./merge.worker.ts', import.meta.url));
}

export async function runClientSidePdfMerge(files: File[]): Promise<Blob> {
  const worker = createWorker(); const api = wrap<any>(worker);
  const filesData = await Promise.all(files.map(async (f) => ({ name: f.name, buffer: await f.arrayBuffer() })));
  const result = await api.mergePdfs(filesData); worker.terminate();
  return new Blob([result], { type: 'application/pdf' });
}

export async function runClientSidePdfCompress(file: File, quality: number): Promise<Blob> {
  const worker = createWorker(); const api = wrap<any>(worker);
  const result = await api.compressPdf({ name: file.name, buffer: await file.arrayBuffer() }, quality); worker.terminate();
  return new Blob([result], { type: 'application/pdf' });
}

export async function runClientSidePdfSplit(
  file: File, mode: 'all' | 'every' | 'range', splitEvery: number, splitRange: string
): Promise<Blob[]> {
  const worker = createWorker(); const api = wrap<any>(worker);
  const results: Uint8Array[] = await api.splitPdf({ name: file.name, buffer: await file.arrayBuffer() }, mode, splitEvery, splitRange); worker.terminate();
  return results.map((u8) => new Blob([u8 as any], { type: 'application/pdf' }));
}

export async function runClientSideImagesToPdf(files: File[]): Promise<Blob> {
  const worker = createWorker(); const api = wrap<any>(worker);
  const imagesData = await Promise.all(files.map(async (f) => ({ name: f.name, buffer: await f.arrayBuffer(), mimeType: f.type || 'image/png' })));
  const result = await api.imagesToPdf(imagesData); worker.terminate();
  return new Blob([result], { type: 'application/pdf' });
}

export async function runClientSidePdfRotate(
  file: File, rotation: number, mode: 'all' | 'specific' | 'odd' | 'even', pageList: number[]
): Promise<Blob> {
  const worker = createWorker(); const api = wrap<any>(worker);
  const result = await api.rotatePdfPages({ name: file.name, buffer: await file.arrayBuffer() }, rotation, mode, pageList); worker.terminate();
  return new Blob([result], { type: 'application/pdf' });
}

export async function runClientSidePdfDeletePages(file: File, pageList: number[]): Promise<Blob> {
  const worker = createWorker(); const api = wrap<any>(worker);
  const result = await api.deletePdfPages({ name: file.name, buffer: await file.arrayBuffer() }, pageList); worker.terminate();
  return new Blob([result], { type: 'application/pdf' });
}

export async function runClientSidePdfWatermark(
  file: File, text: string, options: { fontSize?: number; opacity?: number; rotation?: number; position?: string; colorHex?: string }
): Promise<Blob> {
  const worker = createWorker(); const api = wrap<any>(worker);
  const result = await api.addPdfWatermark({ name: file.name, buffer: await file.arrayBuffer() }, text, options); worker.terminate();
  return new Blob([result], { type: 'application/pdf' });
}

export async function runClientSidePdfPageNumbers(
  file: File, options: { position?: string; startFrom?: number; fontSize?: number; prefix?: string; suffix?: string; colorHex?: string }
): Promise<Blob> {
  const worker = createWorker(); const api = wrap<any>(worker);
  const result = await api.addPdfPageNumbers({ name: file.name, buffer: await file.arrayBuffer() }, options); worker.terminate();
  return new Blob([result], { type: 'application/pdf' });
}

export async function runClientSidePdfReorder(file: File, newOrder: number[]): Promise<Blob> {
  const worker = createWorker(); const api = wrap<any>(worker);
  const result = await api.reorderPdfPages({ name: file.name, buffer: await file.arrayBuffer() }, newOrder); worker.terminate();
  return new Blob([result], { type: 'application/pdf' });
}

export async function runClientSidePdfCrop(
  file: File, cropX: number, cropY: number, cropWidth: number, cropHeight: number,
  mode: 'all' | 'specific' | 'odd' | 'even', pageList: number[]
): Promise<Blob> {
  const worker = createWorker(); const api = wrap<any>(worker);
  const result = await api.cropPdfPages({ name: file.name, buffer: await file.arrayBuffer() }, cropX, cropY, cropWidth, cropHeight, mode, pageList); worker.terminate();
  return new Blob([result], { type: 'application/pdf' });
}

export interface PdfAnnotation {
  page: number; type: 'text' | 'cover' | 'replace';
  x: number; y: number; width?: number; height?: number;
  text?: string; fontSize?: number; colorHex?: string; fillColorHex?: string;
  bold?: boolean; italic?: boolean; opacity?: number;
}

export async function runClientSidePdfAnnotate(file: File, annotations: PdfAnnotation[]): Promise<Blob> {
  const worker = createWorker(); const api = wrap<any>(worker);
  const result = await api.annotatePdf({ name: file.name, buffer: await file.arrayBuffer() }, annotations); worker.terminate();
  return new Blob([result], { type: 'application/pdf' });
}

// ── New operations ─────────────────────────────────────────────────────────

export async function runClientSidePdfUnlock(file: File, password: string): Promise<Blob> {
  const worker = createWorker(); const api = wrap<any>(worker);
  const result = await api.unlockPdf({ name: file.name, buffer: await file.arrayBuffer() }, password); worker.terminate();
  return new Blob([result], { type: 'application/pdf' });
}

export interface RedactArea {
  page: number; x: number; y: number; width: number; height: number; colorHex?: string;
}

export async function runClientSidePdfRedact(file: File, areas: RedactArea[]): Promise<Blob> {
  const worker = createWorker(); const api = wrap<any>(worker);
  const result = await api.redactPdfAreas({ name: file.name, buffer: await file.arrayBuffer() }, areas); worker.terminate();
  return new Blob([result], { type: 'application/pdf' });
}

export async function runClientSidePdfSign(
  file: File, signatureText: string,
  options: { page?: number; x?: number; y?: number; fontSize?: number; colorHex?: string; underline?: boolean; drawBox?: boolean }
): Promise<Blob> {
  const worker = createWorker(); const api = wrap<any>(worker);
  const result = await api.signPdfVisual({ name: file.name, buffer: await file.arrayBuffer() }, signatureText, options); worker.terminate();
  return new Blob([result], { type: 'application/pdf' });
}

export async function runClientSidePdfFlattenForm(file: File): Promise<Blob> {
  const worker = createWorker(); const api = wrap<any>(worker);
  const result = await api.flattenPdfForm({ name: file.name, buffer: await file.arrayBuffer() }); worker.terminate();
  return new Blob([result], { type: 'application/pdf' });
}

// ── Insert link / image / shape ─────────────────────────────────────────────

export interface PdfLink {
  page: number; x: number; y: number; width: number; height: number;
  url: string; borderWidth?: number; borderColorHex?: string;
  showHighlight?: boolean; highlightColorHex?: string;
  labelText?: string; fontSize?: number;
}

export async function runClientSidePdfInsertLinks(file: File, links: PdfLink[]): Promise<Blob> {
  const worker = createWorker(); const api = wrap<any>(worker);
  const result = await api.insertPdfLinks({ name: file.name, buffer: await file.arrayBuffer() }, links);
  worker.terminate();
  return new Blob([result], { type: 'application/pdf' });
}

export interface PdfImageInsert {
  page: number; x: number; y: number; width: number; height: number;
  mimeType: string; buffer: ArrayBuffer; opacity?: number;
  borderColorHex?: string; borderWidth?: number;
}

export async function runClientSidePdfInsertImages(file: File, images: PdfImageInsert[]): Promise<Blob> {
  const worker = createWorker(); const api = wrap<any>(worker);
  const result = await api.insertPdfImages({ name: file.name, buffer: await file.arrayBuffer() }, images);
  worker.terminate();
  return new Blob([result], { type: 'application/pdf' });
}

export interface PdfShape {
  page: number; type: 'rectangle' | 'ellipse' | 'line' | 'arrow';
  x: number; y: number;
  width?: number; height?: number;
  x2?: number; y2?: number;
  fillColorHex?: string; fillOpacity?: number; noFill?: boolean;
  strokeColorHex?: string; strokeWidth?: number;
  labelText?: string; fontSize?: number; labelColorHex?: string;
}

export async function runClientSidePdfInsertShapes(file: File, shapes: PdfShape[]): Promise<Blob> {
  const worker = createWorker(); const api = wrap<any>(worker);
  const result = await api.insertPdfShapes({ name: file.name, buffer: await file.arrayBuffer() }, shapes);
  worker.terminate();
  return new Blob([result], { type: 'application/pdf' });
}

// ── PDF → Images (uses pdfjs-dist, returns a ZIP blob) ─────────────────────
export async function runClientSidePdfToImages(file: File, dpi = 150): Promise<Blob> {
  const pdfjsLib = await import('pdfjs-dist');
  pdfjsLib.GlobalWorkerOptions.workerSrc =
    `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;
  const JSZip = (await import('jszip')).default;
  const pdf = await pdfjsLib.getDocument({ data: await file.arrayBuffer() }).promise;
  const scale = dpi / 72;
  const zip = new JSZip();
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const vp = page.getViewport({ scale });
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(vp.width);
    canvas.height = Math.round(vp.height);
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    await page.render({ canvasContext: ctx, viewport: vp, canvas }).promise;
    const blob = await new Promise<Blob>((res, rej) =>
      canvas.toBlob(b => b ? res(b) : rej(new Error('Canvas toBlob failed')), 'image/png')
    );
    zip.file(`page-${String(i).padStart(3, '0')}.png`, await blob.arrayBuffer());
  }
  return zip.generateAsync({ type: 'blob', mimeType: 'application/zip' });
}
