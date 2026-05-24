export interface FileTypeResult {
  extension: string;
  mime: string;
  confidence: 'high' | 'low';
}

/**
 * Detect file type using client-side magic-byte signatures
 */
export async function detectFileType(file: File): Promise<FileTypeResult> {
  try {
    // Read the first 4100 bytes (sufficient for magic bytes)
    const headerSlice = file.slice(0, 4100);
    const buffer = await headerSlice.arrayBuffer();
    const arr = new Uint8Array(buffer);
    
    // Construct hex sequence of first 16 bytes for quick matching
    let hex = "";
    const len = Math.min(arr.length, 16);
    for (let i = 0; i < len; i++) {
      hex += arr[i].toString(16).padStart(2, "0");
    }

    // 1. PDF Check: "%PDF" is 25 50 44 46
    if (hex.startsWith("25504446")) {
      return { extension: "pdf", mime: "application/pdf", confidence: "high" };
    }

    // 2. PNG Check: 89 50 4E 47 0D 0A 1A 0A
    if (hex.startsWith("89504e470d0a1a0a")) {
      return { extension: "png", mime: "image/png", confidence: "high" };
    }

    // 3. JPEG Check: FF D8 FF
    if (hex.startsWith("ffd8ff")) {
      return { extension: "jpg", mime: "image/jpeg", confidence: "high" };
    }

    // 4. WEBP Check: RIFF (52 49 46 46) and WEBP (57 45 42 50) at offset 8
    if (hex.startsWith("52494646") && hex.substring(16, 24) === "57454250") {
      return { extension: "webp", mime: "image/webp", confidence: "high" };
    }

    // 5. ZIP/Office Open XML Check: "PK" is 50 4B 03 04
    if (hex.startsWith("504b0304")) {
      const ext = file.name.split('.').pop()?.toLowerCase();
      if (ext === 'docx') {
        return { extension: "docx", mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", confidence: "high" };
      } else if (ext === 'xlsx') {
        return { extension: "xlsx", mime: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", confidence: "high" };
      } else if (ext === 'pptx') {
        return { extension: "pptx", mime: "application/vnd.openxmlformats-officedocument.presentationml.presentation", confidence: "high" };
      }
      return { extension: "zip", mime: "application/zip", confidence: "high" };
    }

    // 6. MP4 Check: "ftyp" is 66 74 79 70 at offset 4
    if (hex.substring(8, 16) === "66747970") {
      return { extension: "mp4", mime: "video/mp4", confidence: "high" };
    }
  } catch (error) {
    console.warn("Magic byte detection error, falling back to extension:", error);
  }

  // Fallback to extension matching
  const ext = file.name.split('.').pop()?.toLowerCase() || '';
  let mime = file.type || 'application/octet-stream';
  if (ext === 'md') mime = 'text/markdown';
  
  return {
    extension: ext,
    mime,
    confidence: "low"
  };
}

/**
 * Gets the workspace category appropriate for a given mime type or extension
 */
export function getWorkspaceCategory(mime: string, ext: string): 'pdf' | 'image' | 'office' | 'video' | null {
  if (mime === 'application/pdf' || ext === 'pdf') {
    return 'pdf';
  }
  if (mime.startsWith('image/') || ['png', 'jpg', 'jpeg', 'webp'].includes(ext)) {
    return 'image';
  }
  if (
    mime.startsWith('video/') || 
    ext === 'mp4'
  ) {
    return 'video';
  }
  if (
    mime.includes('officedocument') || 
    mime.includes('word') || 
    mime.includes('sheet') || 
    mime.includes('presentation') ||
    mime === 'text/markdown' ||
    ['docx', 'xlsx', 'pptx', 'md'].includes(ext)
  ) {
    return 'office';
  }
  return null;
}
