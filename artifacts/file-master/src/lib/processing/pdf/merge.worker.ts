import { PDFDocument, degrees, rgb, StandardFonts, BlendMode } from 'pdf-lib';
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

// ── PDF Editor operations ───────────────────────────────────────────────────

async function rotatePdfPages(
  fileData: { name: string; buffer: ArrayBuffer },
  rotation: number,
  mode: 'all' | 'specific' | 'odd' | 'even',
  pageList: number[]
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.load(fileData.buffer);
  const allPages = pdfDoc.getPages();
  const total = allPages.length;

  let indices: number[] = [];
  if (mode === 'all') {
    indices = allPages.map((_, i) => i);
  } else if (mode === 'odd') {
    indices = allPages.map((_, i) => i).filter(i => i % 2 === 0);
  } else if (mode === 'even') {
    indices = allPages.map((_, i) => i).filter(i => i % 2 === 1);
  } else {
    indices = pageList.map(p => p - 1).filter(i => i >= 0 && i < total);
  }

  for (const idx of indices) {
    const page = allPages[idx];
    const current = page.getRotation().angle;
    page.setRotation(degrees((current + rotation + 360) % 360));
  }
  return await pdfDoc.save();
}

async function deletePdfPages(
  fileData: { name: string; buffer: ArrayBuffer },
  pageList: number[]
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.load(fileData.buffer);
  const total = pdfDoc.getPageCount();
  const toRemove = [...new Set(pageList.map(p => p - 1).filter(i => i >= 0 && i < total))].sort((a, b) => b - a);
  for (const idx of toRemove) {
    pdfDoc.removePage(idx);
  }
  return await pdfDoc.save();
}

async function addPdfWatermark(
  fileData: { name: string; buffer: ArrayBuffer },
  text: string,
  options: {
    fontSize?: number;
    opacity?: number;
    rotation?: number;
    position?: 'diagonal' | 'center' | 'bottom' | 'top';
    colorHex?: string;
  }
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.load(fileData.buffer);
  const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const { fontSize = 52, opacity = 0.18, rotation = -45, position = 'diagonal', colorHex = '#888888' } = options;

  const hex = colorHex.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16) / 255;
  const g = parseInt(hex.substring(2, 4), 16) / 255;
  const b = parseInt(hex.substring(4, 6), 16) / 255;

  for (const page of pdfDoc.getPages()) {
    const { width, height } = page.getSize();
    const textWidth = font.widthOfTextAtSize(text, fontSize);
    const textHeight = font.heightAtSize(fontSize);

    let x: number, y: number, rot: number;
    if (position === 'diagonal') {
      x = (width - textWidth) / 2;
      y = (height - textHeight) / 2;
      rot = rotation;
    } else if (position === 'center') {
      x = (width - textWidth) / 2;
      y = height / 2;
      rot = 0;
    } else if (position === 'bottom') {
      x = (width - textWidth) / 2;
      y = 30;
      rot = 0;
    } else {
      x = (width - textWidth) / 2;
      y = height - textHeight - 20;
      rot = 0;
    }

    page.drawText(text, {
      x, y,
      size: fontSize,
      font,
      color: rgb(r, g, b),
      opacity,
      rotate: degrees(rot),
    });
  }
  return await pdfDoc.save();
}

async function addPdfPageNumbers(
  fileData: { name: string; buffer: ArrayBuffer },
  options: {
    position?: 'bottom-center' | 'bottom-right' | 'bottom-left' | 'top-center';
    startFrom?: number;
    fontSize?: number;
    prefix?: string;
    suffix?: string;
    colorHex?: string;
  }
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.load(fileData.buffer);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const {
    position = 'bottom-center',
    startFrom = 1,
    fontSize = 10,
    prefix = '',
    suffix = '',
    colorHex = '#555555',
  } = options;

  const hex = colorHex.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16) / 255;
  const g = parseInt(hex.substring(2, 4), 16) / 255;
  const b = parseInt(hex.substring(4, 6), 16) / 255;

  const allPages = pdfDoc.getPages();
  allPages.forEach((page, idx) => {
    const { width, height } = page.getSize();
    const label = `${prefix}${startFrom + idx}${suffix}`;
    const textWidth = font.widthOfTextAtSize(label, fontSize);

    let x: number, y: number;
    if (position === 'bottom-center')      { x = (width - textWidth) / 2; y = 20; }
    else if (position === 'bottom-right')  { x = width - textWidth - 30; y = 20; }
    else if (position === 'bottom-left')   { x = 30; y = 20; }
    else                                   { x = (width - textWidth) / 2; y = height - 30; }

    page.drawText(label, { x, y, size: fontSize, font, color: rgb(r, g, b) });
  });
  return await pdfDoc.save();
}

async function reorderPdfPages(
  fileData: { name: string; buffer: ArrayBuffer },
  newOrder: number[]
): Promise<Uint8Array> {
  const srcPdf = await PDFDocument.load(fileData.buffer);
  const total = srcPdf.getPageCount();
  const indices = newOrder.map(p => p - 1).filter(i => i >= 0 && i < total);
  const newDoc = await PDFDocument.create();
  const copied = await newDoc.copyPages(srcPdf, indices);
  copied.forEach(p => newDoc.addPage(p));
  return await newDoc.save();
}

// ── PDF Crop Pages ──────────────────────────────────────────────────────────
// Crops visible area of each page by setting the CropBox.
// x, y are in PDF user units from the bottom-left; if applyToAll=false, only
// the pages in pageList are cropped.
async function cropPdfPages(
  fileData: { name: string; buffer: ArrayBuffer },
  cropX: number,      // points from left edge
  cropY: number,      // points from bottom edge
  cropWidth: number,
  cropHeight: number,
  mode: 'all' | 'specific' | 'odd' | 'even',
  pageList: number[]
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.load(fileData.buffer);
  const allPages = pdfDoc.getPages();
  const total = allPages.length;

  let indices: number[];
  if (mode === 'all') {
    indices = allPages.map((_, i) => i);
  } else if (mode === 'odd') {
    indices = allPages.map((_, i) => i).filter(i => i % 2 === 0);
  } else if (mode === 'even') {
    indices = allPages.map((_, i) => i).filter(i => i % 2 === 1);
  } else {
    indices = pageList.map(p => p - 1).filter(i => i >= 0 && i < total);
  }

  for (const idx of indices) {
    const page = allPages[idx];
    const { width, height } = page.getSize();
    // Clamp to page bounds
    const x  = Math.max(0, Math.min(cropX, width));
    const y  = Math.max(0, Math.min(cropY, height));
    const w  = Math.max(1, Math.min(cropWidth,  width  - x));
    const h  = Math.max(1, Math.min(cropHeight, height - y));
    page.setCropBox(x, y, w, h);
  }
  return await pdfDoc.save();
}

// ── PDF Annotate: Add Text / Redact Area / Replace Text ───────────────────
// Each annotation in the list is applied sequentially.
// type: 'text'   — draw text at (x,y) in PDF coords (from bottom-left)
// type: 'cover'  — draw a filled rectangle (whiteout / redaction)
// type: 'replace'— cover rect then draw replacement text inside
async function annotatePdf(
  fileData: { name: string; buffer: ArrayBuffer },
  annotations: Array<{
    page: number;         // 1-indexed
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
  }>
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.load(fileData.buffer);
  const fontNormal = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold   = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontItalic = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);
  const fontBI     = await pdfDoc.embedFont(StandardFonts.HelveticaBoldOblique);
  const allPages   = pdfDoc.getPages();
  const total      = allPages.length;

  const hexToRgb = (hex: string) => {
    const h = (hex || '#000000').replace('#', '');
    return {
      r: parseInt(h.substring(0, 2), 16) / 255,
      g: parseInt(h.substring(2, 4), 16) / 255,
      b: parseInt(h.substring(4, 6), 16) / 255,
    };
  };

  for (const ann of annotations) {
    const pageIdx = Math.max(0, Math.min(ann.page - 1, total - 1));
    const page    = allPages[pageIdx];
    const { width: pw, height: ph } = page.getSize();

    // Convert "from-top" y to pdf "from-bottom" y if y looks like screen coords.
    // We expose a pdfCoords flag; if not set we assume user entered from-top.
    const pdfY = ph - ann.y - (ann.height || 0);

    const textColor  = hexToRgb(ann.colorHex || '#000000');
    const fillColor  = hexToRgb(ann.fillColorHex || '#ffffff');
    const fontSize   = ann.fontSize || 12;
    const opacity    = ann.opacity  ?? 1.0;
    const w          = ann.width    || 200;
    const h          = ann.height   || fontSize * 1.5;

    const font = ann.bold && ann.italic ? fontBI :
                 ann.bold               ? fontBold :
                 ann.italic             ? fontItalic : fontNormal;

    if (ann.type === 'cover' || ann.type === 'replace') {
      page.drawRectangle({
        x: ann.x, y: pdfY, width: w, height: h,
        color: rgb(fillColor.r, fillColor.g, fillColor.b),
        opacity,
        borderWidth: 0,
      });
    }

    if ((ann.type === 'text' || ann.type === 'replace') && ann.text) {
      const textY = ann.type === 'replace' ? pdfY + (h - fontSize) / 2 + 1 : pdfY;
      page.drawText(ann.text, {
        x: ann.x + (ann.type === 'replace' ? 4 : 0),
        y: textY,
        size: fontSize,
        font,
        color: rgb(textColor.r, textColor.g, textColor.b),
        opacity,
        maxWidth: w - 8,
      });
    }
  }
  return await pdfDoc.save();
}

expose({
  mergePdfs, compressPdf, splitPdf, imagesToPdf,
  rotatePdfPages, deletePdfPages, addPdfWatermark, addPdfPageNumbers, reorderPdfPages,
  cropPdfPages, annotatePdf,
});
