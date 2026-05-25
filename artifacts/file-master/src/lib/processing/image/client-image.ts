// Client-side image processing using Canvas API (no backend required)

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Failed to load image')); };
    img.src = url;
  });
}

function canvasToBlob(canvas: HTMLCanvasElement, mime: string, quality = 0.92): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => blob ? resolve(blob) : reject(new Error('Canvas toBlob failed')),
      mime,
      quality
    );
  });
}

function outputMime(file: File, format?: string): string {
  if (format) return `image/${format}`;
  const t = file.type;
  if (t === 'image/jpeg' || t === 'image/jpg') return 'image/jpeg';
  if (t === 'image/webp') return 'image/webp';
  return 'image/png';
}

// ── Remove background (ML-powered, client-side) ───────────────────────────
export async function removeImageBackground(
  file: File,
  outputFormat: 'png' | 'jpeg' | 'webp' = 'png',
  backgroundFill?: string,
  onProgress?: (pct: number) => void
): Promise<Blob> {
  const { removeBackground } = await import('@imgly/background-removal');

  onProgress?.(10);
  const resultBlob = await removeBackground(file, {
    progress: (key: string, current: number, total: number) => {
      if (total > 0) onProgress?.(10 + Math.round((current / total) * 70));
    },
  });
  onProgress?.(85);

  if (outputFormat === 'png' && !backgroundFill) return resultBlob;

  // Composite onto background fill color (for JPEG output or custom bg)
  const img = await loadImage(new File([resultBlob], 'result.png', { type: 'image/png' }));
  const canvas = document.createElement('canvas');
  canvas.width  = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext('2d')!;
  if (backgroundFill) {
    ctx.fillStyle = backgroundFill;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  } else if (outputFormat !== 'png') {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
  ctx.drawImage(img, 0, 0);
  onProgress?.(95);
  return canvasToBlob(canvas, `image/${outputFormat}`, 0.93);
}

// ── Compress / resize ──────────────────────────────────────────────────────
export async function compressImage(
  file: File,
  quality = 0.82,
  maxWidth?: number,
  maxHeight?: number,
  outputFormat?: string
): Promise<Blob> {
  const img = await loadImage(file);
  let w = img.naturalWidth;
  let h = img.naturalHeight;
  if (maxWidth && w > maxWidth)   { h = Math.round(h * maxWidth / w);  w = maxWidth; }
  if (maxHeight && h > maxHeight) { w = Math.round(w * maxHeight / h); h = maxHeight; }
  const canvas = document.createElement('canvas');
  canvas.width  = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, 0, 0, w, h);
  const mime = outputFormat ? `image/${outputFormat}` : (file.type || 'image/jpeg');
  return canvasToBlob(canvas, mime === 'image/png' ? 'image/png' : mime, quality);
}

// ── Resize to exact dimensions ─────────────────────────────────────────────
export async function resizeImage(
  file: File,
  width: number,
  height: number,
  outputFormat: 'png' | 'jpeg' | 'webp' = 'png',
  quality = 0.92
): Promise<Blob> {
  const img = await loadImage(file);
  const canvas = document.createElement('canvas');
  canvas.width  = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, 0, 0, width, height);
  return canvasToBlob(canvas, `image/${outputFormat}`, quality);
}

// ── Crop image ─────────────────────────────────────────────────────────────
export async function cropImage(
  file: File,
  x: number, y: number,
  cropWidth: number, cropHeight: number,
  format?: string
): Promise<Blob> {
  const img = await loadImage(file);
  const canvas = document.createElement('canvas');
  canvas.width  = cropWidth;
  canvas.height = cropHeight;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(img, x, y, cropWidth, cropHeight, 0, 0, cropWidth, cropHeight);
  return canvasToBlob(canvas, outputMime(file, format), 0.93);
}

// ── Rotate & Flip ──────────────────────────────────────────────────────────
export async function rotateFlipImage(
  file: File,
  rotateDeg: number,
  flipH = false,
  flipV = false,
  format?: string
): Promise<Blob> {
  const img = await loadImage(file);
  const rad = (rotateDeg * Math.PI) / 180;
  const absRad = Math.abs(rad);
  const sin = Math.abs(Math.sin(absRad));
  const cos = Math.abs(Math.cos(absRad));
  const ow = img.naturalWidth;
  const oh = img.naturalHeight;
  const nw = Math.round(ow * cos + oh * sin);
  const nh = Math.round(ow * sin + oh * cos);
  const canvas = document.createElement('canvas');
  canvas.width  = nw;
  canvas.height = nh;
  const ctx = canvas.getContext('2d')!;
  ctx.translate(nw / 2, nh / 2);
  ctx.rotate(rad);
  if (flipH) ctx.scale(-1, 1);
  if (flipV) ctx.scale(1, -1);
  ctx.drawImage(img, -ow / 2, -oh / 2);
  return canvasToBlob(canvas, outputMime(file, format), 0.93);
}

// ── Add watermark / text overlay ───────────────────────────────────────────
export async function addImageWatermark(
  file: File,
  text: string,
  options: {
    fontSize?: number;
    color?: string;
    opacity?: number;
    position?: 'diagonal' | 'center' | 'bottom-right' | 'bottom-left' | 'top-right' | 'bottom-center';
    fontFamily?: string;
    bold?: boolean;
    shadow?: boolean;
    tileRepeat?: boolean;
  }
): Promise<Blob> {
  const img = await loadImage(file);
  const canvas = document.createElement('canvas');
  canvas.width  = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(img, 0, 0);

  const {
    fontSize = Math.max(20, Math.round(Math.min(canvas.width, canvas.height) * 0.06)),
    color = '#ffffff',
    opacity = 0.45,
    position = 'diagonal',
    fontFamily = 'sans-serif',
    bold = true,
    shadow = true,
    tileRepeat = false,
  } = options;

  ctx.globalAlpha = opacity;
  ctx.font = `${bold ? 'bold ' : ''}${fontSize}px ${fontFamily}`;
  ctx.fillStyle = color;
  ctx.textBaseline = 'middle';

  if (shadow) {
    ctx.shadowColor = 'rgba(0,0,0,0.6)';
    ctx.shadowBlur = 4;
    ctx.shadowOffsetX = 1;
    ctx.shadowOffsetY = 1;
  }

  const tw = ctx.measureText(text).width;
  const th = fontSize;
  const W = canvas.width;
  const H = canvas.height;
  const PAD = 24;

  if (tileRepeat) {
    ctx.save();
    ctx.translate(W / 2, H / 2);
    ctx.rotate(-Math.PI / 6);
    const stepX = tw * 2.5;
    const stepY = th * 3.5;
    for (let x = -W; x < W * 1.5; x += stepX) {
      for (let y = -H; y < H * 1.5; y += stepY) {
        ctx.fillText(text, x - tw / 2, y);
      }
    }
    ctx.restore();
  } else if (position === 'diagonal') {
    ctx.save();
    ctx.translate(W / 2, H / 2);
    ctx.rotate(-Math.PI / 4);
    ctx.fillText(text, -tw / 2, 0);
    ctx.restore();
  } else if (position === 'center') {
    ctx.fillText(text, (W - tw) / 2, H / 2);
  } else if (position === 'bottom-right') {
    ctx.fillText(text, W - tw - PAD, H - PAD - th / 2);
  } else if (position === 'bottom-left') {
    ctx.fillText(text, PAD, H - PAD - th / 2);
  } else if (position === 'top-right') {
    ctx.fillText(text, W - tw - PAD, PAD + th / 2);
  } else if (position === 'bottom-center') {
    ctx.fillText(text, (W - tw) / 2, H - PAD - th / 2);
  }

  ctx.globalAlpha = 1;
  ctx.shadowColor = 'transparent';
  return canvasToBlob(canvas, outputMime(file), 0.93);
}

// ── Convert to ICO (multi-size, embedded PNG) ──────────────────────────────
export async function convertToIco(
  file: File,
  sizes: number[] = [16, 32, 48, 64]
): Promise<Blob> {
  const img = await loadImage(file);
  const pngArrays: Uint8Array[] = [];

  for (const size of sizes) {
    const canvas = document.createElement('canvas');
    canvas.width  = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, 0, 0, size, size);
    const blob = await canvasToBlob(canvas, 'image/png', 1.0);
    pngArrays.push(new Uint8Array(await blob.arrayBuffer()));
  }

  const iconCount = sizes.length;
  const header = new DataView(new ArrayBuffer(6));
  header.setUint16(0, 0, true);
  header.setUint16(2, 1, true);
  header.setUint16(4, iconCount, true);

  let dataOffset = 6 + 16 * iconCount;
  const entries: ArrayBuffer[] = [];

  for (let i = 0; i < iconCount; i++) {
    const s   = sizes[i];
    const ent = new DataView(new ArrayBuffer(16));
    ent.setUint8(0, s >= 256 ? 0 : s);
    ent.setUint8(1, s >= 256 ? 0 : s);
    ent.setUint8(2, 0);
    ent.setUint8(3, 0);
    ent.setUint16(4, 1, true);
    ent.setUint16(6, 32, true);
    ent.setUint32(8, pngArrays[i].byteLength, true);
    ent.setUint32(12, dataOffset, true);
    dataOffset += pngArrays[i].byteLength;
    entries.push(ent.buffer);
  }

  return new Blob([header.buffer, ...entries, ...pngArrays.map(p => p.buffer)], { type: 'image/x-icon' });
}

// ── SVG → PNG ─────────────────────────────────────────────────────────────
export async function convertSvgToPng(
  file: File,
  targetWidth = 512,
  targetHeight = 512
): Promise<Blob> {
  const text = await file.text();
  const blob = new Blob([text], { type: 'image/svg+xml' });
  const url  = URL.createObjectURL(blob);
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const w = targetWidth  || img.naturalWidth  || 512;
      const h = targetHeight || img.naturalHeight || 512;
      const canvas = document.createElement('canvas');
      canvas.width  = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0, w, h);
      canvasToBlob(canvas, 'image/png', 1.0).then(resolve).catch(reject);
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('SVG load failed')); };
    img.src = url;
  });
}

// ── Convert format (PNG ↔ JPEG ↔ WEBP) ────────────────────────────────────
export async function convertImageFormat(
  file: File,
  targetFormat: 'png' | 'jpeg' | 'webp',
  quality = 0.92
): Promise<Blob> {
  const img = await loadImage(file);
  const canvas = document.createElement('canvas');
  canvas.width  = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext('2d')!;
  if (targetFormat !== 'png') {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
  ctx.drawImage(img, 0, 0);
  return canvasToBlob(canvas, `image/${targetFormat}`, quality);
}

// ── Get natural image dimensions ───────────────────────────────────────────
export async function getImageDimensions(file: File): Promise<{ width: number; height: number }> {
  const img = await loadImage(file);
  return { width: img.naturalWidth, height: img.naturalHeight };
}
