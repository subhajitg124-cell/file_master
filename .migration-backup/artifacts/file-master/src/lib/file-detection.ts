export interface FileTypeResult {
  extension: string;
  mime: string;
  confidence: 'high' | 'low';
}

export async function detectFileType(file: File): Promise<FileTypeResult> {
  try {
    const headerSlice = file.slice(0, 4100);
    const buffer = await headerSlice.arrayBuffer();
    const arr = new Uint8Array(buffer);
    let hex = '';
    const len = Math.min(arr.length, 16);
    for (let i = 0; i < len; i++) hex += arr[i].toString(16).padStart(2, '0');

    if (hex.startsWith('25504446')) return { extension: 'pdf', mime: 'application/pdf', confidence: 'high' };
    if (hex.startsWith('89504e470d0a1a0a')) return { extension: 'png', mime: 'image/png', confidence: 'high' };
    if (hex.startsWith('ffd8ff')) return { extension: 'jpg', mime: 'image/jpeg', confidence: 'high' };
    if (hex.startsWith('52494646') && hex.substring(16, 24) === '57454250') return { extension: 'webp', mime: 'image/webp', confidence: 'high' };
    if (hex.startsWith('47494638')) return { extension: 'gif', mime: 'image/gif', confidence: 'high' };
    // ICO
    if (hex.startsWith('00000100')) return { extension: 'ico', mime: 'image/x-icon', confidence: 'high' };
    // BMP
    if (hex.startsWith('424d')) return { extension: 'bmp', mime: 'image/bmp', confidence: 'high' };
    // TIFF (little-endian & big-endian)
    if (hex.startsWith('49492a00') || hex.startsWith('4d4d002a')) return { extension: 'tiff', mime: 'image/tiff', confidence: 'high' };
    // SVG (text-based — check for '<svg' in first bytes)
    const textPreview = new TextDecoder().decode(arr.slice(0, 200)).toLowerCase().trim();
    if (textPreview.includes('<svg')) return { extension: 'svg', mime: 'image/svg+xml', confidence: 'high' };
    // MP3 ID3 / MPEG audio
    if (hex.startsWith('494433') || hex.startsWith('fffb') || hex.startsWith('fff3') || hex.startsWith('fff2')) return { extension: 'mp3', mime: 'audio/mpeg', confidence: 'high' };
    // AAC / M4A
    if (hex.startsWith('fff1') || hex.startsWith('fff9')) return { extension: 'aac', mime: 'audio/aac', confidence: 'high' };
    // OGG
    if (hex.startsWith('4f676753')) return { extension: 'ogg', mime: 'audio/ogg', confidence: 'high' };
    // FLAC
    if (hex.startsWith('664c6143')) return { extension: 'flac', mime: 'audio/flac', confidence: 'high' };
    // WAV RIFF
    if (hex.startsWith('52494646') && hex.substring(16, 24) === '57415645') return { extension: 'wav', mime: 'audio/wav', confidence: 'high' };
    // ZIP / Office
    if (hex.startsWith('504b0304')) {
      const ext = file.name.split('.').pop()?.toLowerCase();
      if (ext === 'docx') return { extension: 'docx', mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', confidence: 'high' };
      if (ext === 'xlsx') return { extension: 'xlsx', mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', confidence: 'high' };
      if (ext === 'pptx') return { extension: 'pptx', mime: 'application/vnd.openxmlformats-officedocument.presentationml.presentation', confidence: 'high' };
      return { extension: 'zip', mime: 'application/zip', confidence: 'high' };
    }
    // MP4 / MOV ftyp
    if (hex.substring(8, 16) === '66747970') return { extension: 'mp4', mime: 'video/mp4', confidence: 'high' };
    // WEBM
    if (hex.startsWith('1a45dfa3')) return { extension: 'webm', mime: 'video/webm', confidence: 'high' };
  } catch (error) {
    console.warn('Magic byte detection error, falling back to extension:', error);
  }

  // Extension fallback
  const ext = file.name.split('.').pop()?.toLowerCase() || '';
  let mime = file.type || 'application/octet-stream';
  const extMimeMap: Record<string, string> = {
    md: 'text/markdown',
    html: 'text/html',
    htm: 'text/html',
    csv: 'text/csv',
    txt: 'text/plain',
    svg: 'image/svg+xml',
    ico: 'image/x-icon',
    bmp: 'image/bmp',
    tiff: 'image/tiff',
    tif: 'image/tiff',
    mp3: 'audio/mpeg',
    aac: 'audio/aac',
    ogg: 'audio/ogg',
    flac: 'audio/flac',
    wav: 'audio/wav',
    m4a: 'audio/mp4',
    mp4: 'video/mp4',
    webm: 'video/webm',
    mov: 'video/quicktime',
    avi: 'video/x-msvideo',
    mkv: 'video/x-matroska',
  };
  if (extMimeMap[ext]) mime = extMimeMap[ext];
  return { extension: ext, mime, confidence: 'low' };
}

export function getWorkspaceCategory(mime: string, ext: string): 'pdf' | 'image' | 'office' | 'video' | null {
  if (mime === 'application/pdf' || ext === 'pdf') return 'pdf';
  if (mime.startsWith('image/') || ['png', 'jpg', 'jpeg', 'webp', 'gif', 'bmp', 'tiff', 'tif', 'svg', 'ico'].includes(ext)) return 'image';
  if (mime.startsWith('video/') || ['mp4', 'webm', 'mov', 'avi', 'mkv'].includes(ext)) return 'video';
  if (mime.startsWith('audio/') || ['mp3', 'aac', 'ogg', 'flac', 'wav', 'm4a'].includes(ext)) return 'video';
  if (
    mime.includes('officedocument') || mime.includes('word') || mime.includes('sheet') ||
    mime.includes('presentation') || mime === 'text/markdown' || mime === 'text/html' ||
    mime === 'text/csv' || ['docx', 'xlsx', 'pptx', 'md', 'html', 'htm', 'csv'].includes(ext)
  ) return 'office';
  return null;
}
