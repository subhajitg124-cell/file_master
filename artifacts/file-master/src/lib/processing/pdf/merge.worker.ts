import { PDFDocument } from 'pdf-lib';
import { expose } from 'comlink';

async function mergePdfs(filesData: { name: string; buffer: ArrayBuffer }[]): Promise<Uint8Array> {
  const mergedPdf = await PDFDocument.create();
  for (const fileData of filesData) {
    const pdf = await PDFDocument.load(fileData.buffer);
    const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
    copiedPages.forEach((page) => mergedPdf.addPage(page));
  }
  return await mergedPdf.save();
}

async function compressPdf(fileData: { name: string; buffer: ArrayBuffer }, quality: number): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.load(fileData.buffer);
  pdfDoc.setTitle('');
  pdfDoc.setAuthor('');
  pdfDoc.setSubject('');
  pdfDoc.setCreator('');
  pdfDoc.setProducer('');
  return await pdfDoc.save({ useObjectStreams: quality < 80 });
}

async function splitPdf(
  fileData: { name: string; buffer: ArrayBuffer },
  mode: 'all' | 'every' | 'range',
  splitEvery: number,
  splitRange: string
): Promise<Uint8Array[]> {
  const srcPdf = await PDFDocument.load(fileData.buffer);
  const totalPages = srcPdf.getPageCount();
  const chunks: number[][] = [];

  if (mode === 'all') {
    for (let i = 0; i < totalPages; i++) chunks.push([i]);
  } else if (mode === 'every') {
    const n = Math.max(1, splitEvery);
    for (let i = 0; i < totalPages; i += n) {
      chunks.push(Array.from({ length: Math.min(n, totalPages - i) }, (_, k) => i + k));
    }
  } else if (mode === 'range') {
    const parts = splitRange.split(',').map(s => s.trim());
    for (const part of parts) {
      if (part.includes('-')) {
        const [start, end] = part.split('-').map(n => Math.max(0, parseInt(n, 10) - 1));
        const endClamped = Math.min(end, totalPages - 1);
        if (!isNaN(start) && !isNaN(endClamped) && start <= endClamped) {
          chunks.push(Array.from({ length: endClamped - start + 1 }, (_, k) => start + k));
        }
      } else {
        const idx = parseInt(part, 10) - 1;
        if (!isNaN(idx) && idx >= 0 && idx < totalPages) chunks.push([idx]);
      }
    }
  }

  if (chunks.length === 0) throw new Error('No valid pages to split.');

  const results: Uint8Array[] = [];
  for (const pageIndices of chunks) {
    const doc = await PDFDocument.create();
    const copied = await doc.copyPages(srcPdf, pageIndices);
    copied.forEach(p => doc.addPage(p));
    results.push(await doc.save());
  }
  return results;
}

async function imagesToPdf(
  imagesData: { name: string; buffer: ArrayBuffer; mimeType: string }[]
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  for (const imgData of imagesData) {
    let img;
    if (imgData.mimeType === 'image/jpeg' || imgData.mimeType === 'image/jpg') {
      img = await pdfDoc.embedJpg(imgData.buffer);
    } else {
      img = await pdfDoc.embedPng(imgData.buffer);
    }
    const page = pdfDoc.addPage([img.width, img.height]);
    page.drawImage(img, { x: 0, y: 0, width: img.width, height: img.height });
  }
  return await pdfDoc.save();
}

expose({ mergePdfs, compressPdf, splitPdf, imagesToPdf });
