import { PDFDocument, degrees, rgb, StandardFonts, PDFString, PDFName, PDFArray } from 'pdf-lib';
import { expose } from 'comlink';

// ── Helpers ────────────────────────────────────────────────────────────────

function hexToRgb(hex: string) {
  const h = (hex || '#000000').replace('#', '');
  return {
    r: parseInt(h.substring(0, 2), 16) / 255,
    g: parseInt(h.substring(2, 4), 16) / 255,
    b: parseInt(h.substring(4, 6), 16) / 255,
  };
}

// ── Core PDF operations ────────────────────────────────────────────────────

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
    for (let i = 0; i < totalPages; i += n)
      chunks.push(Array.from({ length: Math.min(n, totalPages - i) }, (_, k) => i + k));
  } else if (mode === 'range') {
    for (const part of splitRange.split(',').map(s => s.trim())) {
      if (part.includes('-')) {
        const [start, end] = part.split('-').map(n => Math.max(0, parseInt(n, 10) - 1));
        const endC = Math.min(end, totalPages - 1);
        if (!isNaN(start) && !isNaN(endC) && start <= endC)
          chunks.push(Array.from({ length: endC - start + 1 }, (_, k) => start + k));
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
    if (imgData.mimeType === 'image/jpeg' || imgData.mimeType === 'image/jpg')
      img = await pdfDoc.embedJpg(imgData.buffer);
    else
      img = await pdfDoc.embedPng(imgData.buffer);
    const page = pdfDoc.addPage([img.width, img.height]);
    page.drawImage(img, { x: 0, y: 0, width: img.width, height: img.height });
  }
  return await pdfDoc.save();
}

// ── Page-level operations ──────────────────────────────────────────────────

async function rotatePdfPages(
  fileData: { name: string; buffer: ArrayBuffer },
  rotation: number, mode: 'all' | 'specific' | 'odd' | 'even', pageList: number[]
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.load(fileData.buffer);
  const allPages = pdfDoc.getPages();
  const total = allPages.length;
  let indices: number[] = mode === 'all' ? allPages.map((_, i) => i)
    : mode === 'odd'  ? allPages.map((_, i) => i).filter(i => i % 2 === 0)
    : mode === 'even' ? allPages.map((_, i) => i).filter(i => i % 2 === 1)
    : pageList.map(p => p - 1).filter(i => i >= 0 && i < total);
  for (const idx of indices) {
    const current = allPages[idx].getRotation().angle;
    allPages[idx].setRotation(degrees((current + rotation + 360) % 360));
  }
  return await pdfDoc.save();
}

async function deletePdfPages(
  fileData: { name: string; buffer: ArrayBuffer }, pageList: number[]
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.load(fileData.buffer);
  const total = pdfDoc.getPageCount();
  const toRemove = [...new Set(pageList.map(p => p - 1).filter(i => i >= 0 && i < total))].sort((a, b) => b - a);
  for (const idx of toRemove) pdfDoc.removePage(idx);
  return await pdfDoc.save();
}

async function addPdfWatermark(
  fileData: { name: string; buffer: ArrayBuffer },
  text: string,
  options: { fontSize?: number; opacity?: number; rotation?: number; position?: string; colorHex?: string }
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.load(fileData.buffer);
  const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const { fontSize = 52, opacity = 0.18, rotation = -45, position = 'diagonal', colorHex = '#888888' } = options;
  const { r, g, b } = hexToRgb(colorHex);
  for (const page of pdfDoc.getPages()) {
    const { width, height } = page.getSize();
    const textWidth = font.widthOfTextAtSize(text, fontSize);
    const textHeight = font.heightAtSize(fontSize);
    let x: number, y: number, rot: number;
    if (position === 'diagonal')   { x = (width - textWidth) / 2; y = (height - textHeight) / 2; rot = rotation; }
    else if (position === 'center'){ x = (width - textWidth) / 2; y = height / 2; rot = 0; }
    else if (position === 'bottom'){ x = (width - textWidth) / 2; y = 30; rot = 0; }
    else                           { x = (width - textWidth) / 2; y = height - textHeight - 20; rot = 0; }
    page.drawText(text, { x, y, size: fontSize, font, color: rgb(r, g, b), opacity, rotate: degrees(rot) });
  }
  return await pdfDoc.save();
}

async function addPdfPageNumbers(
  fileData: { name: string; buffer: ArrayBuffer },
  options: { position?: string; startFrom?: number; fontSize?: number; prefix?: string; suffix?: string; colorHex?: string }
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.load(fileData.buffer);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const { position = 'bottom-center', startFrom = 1, fontSize = 10, prefix = '', suffix = '', colorHex = '#555555' } = options;
  const { r, g, b } = hexToRgb(colorHex);
  pdfDoc.getPages().forEach((page, idx) => {
    const { width, height } = page.getSize();
    const label = `${prefix}${startFrom + idx}${suffix}`;
    const tw = font.widthOfTextAtSize(label, fontSize);
    let x: number, y: number;
    if (position === 'bottom-center')     { x = (width - tw) / 2; y = 20; }
    else if (position === 'bottom-right') { x = width - tw - 30; y = 20; }
    else if (position === 'bottom-left')  { x = 30; y = 20; }
    else                                  { x = (width - tw) / 2; y = height - 30; }
    page.drawText(label, { x, y, size: fontSize, font, color: rgb(r, g, b) });
  });
  return await pdfDoc.save();
}

async function reorderPdfPages(
  fileData: { name: string; buffer: ArrayBuffer }, newOrder: number[]
): Promise<Uint8Array> {
  const srcPdf = await PDFDocument.load(fileData.buffer);
  const total = srcPdf.getPageCount();
  const indices = newOrder.map(p => p - 1).filter(i => i >= 0 && i < total);
  const newDoc = await PDFDocument.create();
  const copied = await newDoc.copyPages(srcPdf, indices);
  copied.forEach(p => newDoc.addPage(p));
  return await newDoc.save();
}

async function cropPdfPages(
  fileData: { name: string; buffer: ArrayBuffer },
  cropX: number, cropY: number, cropWidth: number, cropHeight: number,
  mode: 'all' | 'specific' | 'odd' | 'even', pageList: number[]
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.load(fileData.buffer);
  const allPages = pdfDoc.getPages();
  const total = allPages.length;
  let indices: number[] = mode === 'all' ? allPages.map((_, i) => i)
    : mode === 'odd'  ? allPages.map((_, i) => i).filter(i => i % 2 === 0)
    : mode === 'even' ? allPages.map((_, i) => i).filter(i => i % 2 === 1)
    : pageList.map(p => p - 1).filter(i => i >= 0 && i < total);
  for (const idx of indices) {
    const page = allPages[idx];
    const { width, height } = page.getSize();
    page.setCropBox(
      Math.max(0, Math.min(cropX, width)),
      Math.max(0, Math.min(cropY, height)),
      Math.max(1, Math.min(cropWidth,  width  - cropX)),
      Math.max(1, Math.min(cropHeight, height - cropY))
    );
  }
  return await pdfDoc.save();
}

async function annotatePdf(
  fileData: { name: string; buffer: ArrayBuffer },
  annotations: Array<{
    page: number; type: 'text' | 'cover' | 'replace';
    x: number; y: number; width?: number; height?: number;
    text?: string; fontSize?: number; colorHex?: string; fillColorHex?: string;
    bold?: boolean; italic?: boolean; opacity?: number;
  }>
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.load(fileData.buffer);
  const fontNormal = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold   = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontItalic = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);
  const fontBI     = await pdfDoc.embedFont(StandardFonts.HelveticaBoldOblique);
  const allPages   = pdfDoc.getPages();
  const total      = allPages.length;

  for (const ann of annotations) {
    const page    = allPages[Math.max(0, Math.min(ann.page - 1, total - 1))];
    const { height: ph } = page.getSize();
    const pdfY   = ph - ann.y - (ann.height || 0);
    const tc     = hexToRgb(ann.colorHex  || '#000000');
    const fc     = hexToRgb(ann.fillColorHex || '#ffffff');
    const fontSize  = ann.fontSize || 12;
    const opacity   = ann.opacity  ?? 1.0;
    const w         = ann.width    || 200;
    const h         = ann.height   || fontSize * 1.5;
    const font = ann.bold && ann.italic ? fontBI : ann.bold ? fontBold : ann.italic ? fontItalic : fontNormal;

    if (ann.type === 'cover' || ann.type === 'replace')
      page.drawRectangle({ x: ann.x, y: pdfY, width: w, height: h, color: rgb(fc.r, fc.g, fc.b), opacity, borderWidth: 0 });

    if ((ann.type === 'text' || ann.type === 'replace') && ann.text) {
      const textY = ann.type === 'replace' ? pdfY + (h - fontSize) / 2 + 1 : pdfY;
      page.drawText(ann.text, { x: ann.x + (ann.type === 'replace' ? 4 : 0), y: textY, size: fontSize, font, color: rgb(tc.r, tc.g, tc.b), opacity, maxWidth: w - 8 });
    }
  }
  return await pdfDoc.save();
}

// ── Unlock PDF ─────────────────────────────────────────────────────────────
// Load a password-protected PDF and re-save it without a password.
async function unlockPdf(
  fileData: { name: string; buffer: ArrayBuffer },
  password: string
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.load(fileData.buffer, { password } as any);
  return await pdfDoc.save();
}

// ── Redact PDF (dedicated) ─────────────────────────────────────────────────
// Draw filled rectangles over sensitive content. Default fill: black.
async function redactPdfAreas(
  fileData: { name: string; buffer: ArrayBuffer },
  areas: Array<{ page: number; x: number; y: number; width: number; height: number; colorHex?: string }>
): Promise<Uint8Array> {
  const pdfDoc  = await PDFDocument.load(fileData.buffer);
  const allPages = pdfDoc.getPages();
  const total   = allPages.length;
  for (const area of areas) {
    const page = allPages[Math.max(0, Math.min(area.page - 1, total - 1))];
    const { height } = page.getSize();
    const { r, g, b } = hexToRgb(area.colorHex || '#000000');
    page.drawRectangle({
      x: area.x, y: height - area.y - area.height,
      width: area.width, height: area.height,
      color: rgb(r, g, b), borderWidth: 0,
    });
  }
  return await pdfDoc.save();
}

// ── Sign PDF (visual) ──────────────────────────────────────────────────────
// Draw a handwriting-style signature text on the specified page.
async function signPdfVisual(
  fileData: { name: string; buffer: ArrayBuffer },
  signatureText: string,
  options: {
    page?: number; x?: number; y?: number; fontSize?: number;
    colorHex?: string; underline?: boolean; drawBox?: boolean;
  }
): Promise<Uint8Array> {
  const pdfDoc   = await PDFDocument.load(fileData.buffer);
  const fontCursive = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const allPages = pdfDoc.getPages();
  const { page: pageNum = allPages.length, x = 60, y = 80, fontSize = 28, colorHex = '#1a1a8c', underline = true, drawBox = true } = options;
  const page     = allPages[Math.max(0, Math.min(pageNum - 1, allPages.length - 1))];
  const { height, width } = page.getSize();
  const { r, g, b } = hexToRgb(colorHex);
  const pdfY     = height - y - fontSize;

  const textWidth = fontCursive.widthOfTextAtSize(signatureText, fontSize);
  const boxPad = 10;

  if (drawBox) {
    page.drawRectangle({
      x: x - boxPad, y: pdfY - boxPad,
      width: Math.min(textWidth + boxPad * 2, width - x - boxPad + textWidth),
      height: fontSize + boxPad * 2,
      borderColor: rgb(0.6, 0.6, 0.6), borderWidth: 1,
      color: rgb(0.98, 0.98, 1), opacity: 0.5,
    });
  }

  page.drawText(signatureText, {
    x, y: pdfY, size: fontSize,
    font: fontCursive, color: rgb(r, g, b),
  });

  if (underline) {
    page.drawLine({
      start: { x, y: pdfY - 3 },
      end: { x: x + textWidth, y: pdfY - 3 },
      thickness: 1.5, color: rgb(r, g, b), opacity: 0.7,
    });
  }

  // Add date stamp below signature
  const dateStr = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  page.drawText(dateStr, {
    x, y: pdfY - fontSize * 0.8,
    size: 8, font: fontRegular, color: rgb(0.5, 0.5, 0.5),
  });

  return await pdfDoc.save();
}

// ── Flatten PDF form fields ────────────────────────────────────────────────
// Copies the PDF as-is (pdf-lib does not support form filling natively without
// known fields). This at least strips form field widgets and bakes appearances.
async function flattenPdfForm(
  fileData: { name: string; buffer: ArrayBuffer }
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.load(fileData.buffer);
  const form   = pdfDoc.getForm();
  try { form.flatten(); } catch (_) { /* ignore if no form fields */ }
  return await pdfDoc.save();
}

// ── Insert hyperlinks ──────────────────────────────────────────────────────
// Adds clickable URI link annotations. Optionally draws a visible highlight box.
async function insertPdfLinks(
  fileData: { name: string; buffer: ArrayBuffer },
  links: Array<{
    page: number; x: number; y: number; width: number; height: number;
    url: string; borderWidth?: number; borderColorHex?: string;
    showHighlight?: boolean; highlightColorHex?: string;
    labelText?: string; fontSize?: number;
  }>
): Promise<Uint8Array> {
  const pdfDoc   = await PDFDocument.load(fileData.buffer);
  const allPages = pdfDoc.getPages();
  const total    = allPages.length;
  const font     = await pdfDoc.embedFont(StandardFonts.Helvetica);

  for (const link of links) {
    const page    = allPages[Math.max(0, Math.min(link.page - 1, total - 1))];
    const { height } = page.getSize();
    const pdfY    = height - link.y - link.height;
    const bw      = link.borderWidth ?? 1;
    const { r: br, g: bg, b: bb } = hexToRgb(link.borderColorHex || '#1a56db');

    // Draw visible highlight/border
    if (link.showHighlight !== false) {
      const { r: hr, g: hg, b: hb } = hexToRgb(link.highlightColorHex || '#dbeafe');
      page.drawRectangle({
        x: link.x, y: pdfY, width: link.width, height: link.height,
        color: rgb(hr, hg, hb), opacity: 0.35,
        borderColor: rgb(br, bg, bb), borderWidth: bw,
      });
    }

    // Draw label text inside the box if provided
    if (link.labelText) {
      const fs = link.fontSize || 10;
      page.drawText(link.labelText, {
        x: link.x + 4, y: pdfY + (link.height - fs) / 2 + 1,
        size: fs, font, color: rgb(br, bg, bb),
        maxWidth: link.width - 8,
      });
    }

    // Register URI annotation
    const annotRef = pdfDoc.context.register(
      pdfDoc.context.obj({
        Type: 'Annot', Subtype: 'Link',
        Rect: [link.x, pdfY, link.x + link.width, pdfY + link.height],
        A: { S: 'URI', URI: PDFString.of(link.url) },
        Border: [0, 0, bw],
        C: [br, bg, bb],
      })
    );

    const existing = page.node.lookup(PDFName.of('Annots'));
    if (existing instanceof PDFArray) {
      existing.push(annotRef);
    } else {
      page.node.set(PDFName.of('Annots'), pdfDoc.context.obj([annotRef]));
    }
  }
  return await pdfDoc.save();
}

// ── Insert images ──────────────────────────────────────────────────────────
// Embeds PNG/JPEG images at exact positions on any page.
async function insertPdfImages(
  fileData: { name: string; buffer: ArrayBuffer },
  images: Array<{
    page: number; x: number; y: number; width: number; height: number;
    mimeType: string; buffer: ArrayBuffer; opacity?: number;
    borderColorHex?: string; borderWidth?: number;
  }>
): Promise<Uint8Array> {
  const pdfDoc   = await PDFDocument.load(fileData.buffer);
  const allPages = pdfDoc.getPages();
  const total    = allPages.length;

  for (const img of images) {
    const page = allPages[Math.max(0, Math.min(img.page - 1, total - 1))];
    const { height } = page.getSize();
    const pdfY = height - img.y - img.height;

    const embedded = (img.mimeType === 'image/jpeg' || img.mimeType === 'image/jpg')
      ? await pdfDoc.embedJpg(img.buffer)
      : await pdfDoc.embedPng(img.buffer);

    page.drawImage(embedded, {
      x: img.x, y: pdfY, width: img.width, height: img.height,
      opacity: img.opacity ?? 1.0,
    });

    // Optional border around the image
    if (img.borderWidth && img.borderWidth > 0) {
      const { r, g, b } = hexToRgb(img.borderColorHex || '#000000');
      page.drawRectangle({
        x: img.x, y: pdfY, width: img.width, height: img.height,
        borderColor: rgb(r, g, b), borderWidth: img.borderWidth,
        color: undefined, opacity: 0,
      });
    }
  }
  return await pdfDoc.save();
}

// ── Draw shapes ────────────────────────────────────────────────────────────
// Draws rectangles, ellipses, lines, and arrows on any page.
async function insertPdfShapes(
  fileData: { name: string; buffer: ArrayBuffer },
  shapes: Array<{
    page: number; type: 'rectangle' | 'ellipse' | 'line' | 'arrow';
    x: number; y: number;
    width?: number; height?: number;
    x2?: number; y2?: number;
    fillColorHex?: string; fillOpacity?: number; noFill?: boolean;
    strokeColorHex?: string; strokeWidth?: number;
    labelText?: string; fontSize?: number; labelColorHex?: string;
  }>
): Promise<Uint8Array> {
  const pdfDoc   = await PDFDocument.load(fileData.buffer);
  const allPages = pdfDoc.getPages();
  const total    = allPages.length;
  const font     = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  for (const shape of shapes) {
    const page = allPages[Math.max(0, Math.min(shape.page - 1, total - 1))];
    const { height: pageH } = page.getSize();

    const sw   = shape.strokeWidth ?? 2;
    const fill = hexToRgb(shape.fillColorHex   || '#4f46e5');
    const strk = hexToRgb(shape.strokeColorHex || '#4f46e5');
    const fo   = shape.fillOpacity ?? 0.15;

    if (shape.type === 'rectangle') {
      const w  = shape.width  || 100;
      const h  = shape.height || 50;
      const pdfY = pageH - shape.y - h;
      page.drawRectangle({
        x: shape.x, y: pdfY, width: w, height: h,
        color:       shape.noFill ? undefined : rgb(fill.r, fill.g, fill.b),
        opacity:     shape.noFill ? 0 : fo,
        borderColor: rgb(strk.r, strk.g, strk.b),
        borderWidth: sw,
        borderOpacity: 1,
      });
      if (shape.labelText) {
        const fs = shape.fontSize || 11;
        const { r: lr, g: lg, b: lb } = hexToRgb(shape.labelColorHex || shape.strokeColorHex || '#000000');
        page.drawText(shape.labelText, {
          x: shape.x + 6, y: pdfY + (h - fs) / 2 + 1,
          size: fs, font, color: rgb(lr, lg, lb), maxWidth: w - 12,
        });
      }
    } else if (shape.type === 'ellipse') {
      const w = shape.width  || 100;
      const h = shape.height || 50;
      const cx = shape.x + w / 2;
      const cy = pageH - shape.y - h / 2;
      page.drawEllipse({
        x: cx, y: cy, xScale: w / 2, yScale: h / 2,
        color:       shape.noFill ? undefined : rgb(fill.r, fill.g, fill.b),
        opacity:     shape.noFill ? 0 : fo,
        borderColor: rgb(strk.r, strk.g, strk.b),
        borderWidth: sw,
        borderOpacity: 1,
      });
      if (shape.labelText) {
        const fs = shape.fontSize || 11;
        const { r: lr, g: lg, b: lb } = hexToRgb(shape.labelColorHex || shape.strokeColorHex || '#000000');
        const tw = font.widthOfTextAtSize(shape.labelText, fs);
        page.drawText(shape.labelText, {
          x: cx - tw / 2, y: cy - fs / 2,
          size: fs, font, color: rgb(lr, lg, lb),
        });
      }
    } else if (shape.type === 'line' || shape.type === 'arrow') {
      const x2 = shape.x2 ?? shape.x + 100;
      const y2 = shape.y2 ?? shape.y;
      page.drawLine({
        start: { x: shape.x, y: pageH - shape.y },
        end:   { x: x2,      y: pageH - y2      },
        thickness: sw, color: rgb(strk.r, strk.g, strk.b), opacity: 1,
      });
      if (shape.type === 'arrow') {
        // Draw arrowhead triangle at the end point
        const dx = x2 - shape.x, dy = (pageH - y2) - (pageH - shape.y);
        const len = Math.sqrt(dx * dx + dy * dy) || 1;
        const ux = dx / len, uy = dy / len;
        const headLen = Math.max(10, sw * 4);
        const headW   = Math.max(6,  sw * 2.5);
        const tipX = x2, tipY = pageH - y2;
        const baseX = tipX - ux * headLen, baseY = tipY - uy * headLen;
        const perpX = -uy * headW, perpY =  ux * headW;
        page.drawLine({ start: { x: tipX, y: tipY }, end: { x: baseX + perpX, y: baseY + perpY }, thickness: sw, color: rgb(strk.r, strk.g, strk.b) });
        page.drawLine({ start: { x: tipX, y: tipY }, end: { x: baseX - perpX, y: baseY - perpY }, thickness: sw, color: rgb(strk.r, strk.g, strk.b) });
      }
    }
  }
  return await pdfDoc.save();
}

expose({
  mergePdfs, compressPdf, splitPdf, imagesToPdf,
  rotatePdfPages, deletePdfPages, addPdfWatermark, addPdfPageNumbers, reorderPdfPages,
  cropPdfPages, annotatePdf,
  unlockPdf, redactPdfAreas, signPdfVisual, flattenPdfForm,
  insertPdfLinks, insertPdfImages, insertPdfShapes,
});
