import zipfile
from pathlib import Path
from typing import Optional

# Standard MIME type mappings
MIME_MAP = {
    # Documents & text
    "pdf": "application/pdf",
    "txt": "text/plain",
    "md": "text/markdown",
    "html": "text/html",
    # Images
    "png": "image/png",
    "jpg": "image/jpeg",
    "jpeg": "image/jpeg",
    "gif": "image/gif",
    "webp": "image/webp",
    # MS Office
    "docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "zip": "application/zip",
    # Media
    "mp4": "video/mp4",
    "gif_video": "image/gif",
    "mp3": "audio/mpeg",
    "wav": "audio/wav",
}

def detect_mime_type(file_path: Path) -> str:
    """
    Detects the MIME type of a file using its magic bytes (headers) and content inspection.
    Avoids native library dependency issues on Windows/Linux environments.
    """
    if not file_path.exists():
        return "application/octet-stream"

    # Read first 32 bytes for general magic check
    try:
        with open(file_path, "rb") as f:
            header = f.read(32)
    except IOError:
        return "application/octet-stream"

    # 1. PDF
    if header.startswith(b"%PDF"):
        return MIME_MAP["pdf"]

    # 2. PNG
    if header.startswith(b"\x89PNG\r\n\x1a\n"):
        return MIME_MAP["png"]

    # 3. JPEG
    if header.startswith(b"\xff\xd8\xff"):
        return MIME_MAP["jpg"]

    # 4. GIF
    if header.startswith(b"GIF87a") or header.startswith(b"GIF89a"):
        return MIME_MAP["gif"]

    # 5. WEBP
    if header.startswith(b"RIFF") and len(header) >= 12 and header[8:12] == b"WEBP":
        return MIME_MAP["webp"]

    # 6. WAV
    if header.startswith(b"RIFF") and len(header) >= 12 and header[8:12] == b"WAVE":
        return MIME_MAP["wav"]

    # 7. MP3
    if header.startswith(b"ID3") or header.startswith(b"\xff\xfb") or header.startswith(b"\xff\xf3") or header.startswith(b"\xff\xf2"):
        return MIME_MAP["mp3"]

    # 8. MP4
    if len(header) >= 8 and header[4:8] == b"ftyp":
        return MIME_MAP["mp4"]

    # 9. ZIP / Office Formats (docx, xlsx, pptx)
    if header.startswith(b"PK\x03\x04"):
        # We need to peek inside the zip to check what type of document it is
        try:
            with zipfile.ZipFile(file_path, "r") as zf:
                namelist = zf.namelist()
                if "word/document.xml" in namelist:
                    return MIME_MAP["docx"]
                elif "ppt/presentation.xml" in namelist:
                    return MIME_MAP["pptx"]
                elif "xl/workbook.xml" in namelist:
                    return MIME_MAP["xlsx"]
                else:
                    return MIME_MAP["zip"]
        except zipfile.BadZipFile:
            return MIME_MAP["zip"]

    # 10. Plain text, markdown, html check (by decoding first chunk)
    try:
        text_preview = header.decode("utf-8", errors="strict")
        if text_preview.strip().startswith("<!DOCTYPE html") or text_preview.strip().startswith("<html"):
            return MIME_MAP["html"]
        # Fallback to text/plain if it decodes cleanly
        return MIME_MAP["txt"]
    except UnicodeDecodeError:
        pass

    # Default fallback using extension
    ext = file_path.suffix.lower().lstrip(".")
    return MIME_MAP.get(ext, "application/octet-stream")
