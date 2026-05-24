import os
from pathlib import Path
from typing import Optional
from PIL import Image, ImageDraw, ImageFont
from app.config import settings

def generate_preview(file_path: Path) -> Optional[Path]:
    """
    Generates a 300x300 PNG thumbnail preview of the file.
    Supports PDF (via pdf2image), Images (via Pillow), and documents.
    Returns path to preview PNG or None if failed.
    """
    if not file_path.exists():
        return None
        
    ext = file_path.suffix.lower()
    preview_path = settings.output_dir / f"preview_{file_path.stem}.png"
    
    # 1. Image previews
    if ext in [".png", ".jpg", ".jpeg", ".webp", ".gif"]:
        try:
            with Image.open(file_path) as img:
                img.thumbnail((300, 300))
                # Convert RGBA to RGB for PNG/JPEG saving if needed
                if img.mode != 'RGB' and img.mode != 'RGBA':
                    img = img.convert('RGB')
                img.save(preview_path, "PNG")
                return preview_path
        except Exception:
            pass

    # 2. PDF previews
    elif ext == ".pdf":
        try:
            from pdf2image import convert_from_path
            pages = convert_from_path(str(file_path), first_page=1, last_page=1)
            if pages:
                pages[0].thumbnail((300, 300))
                pages[0].save(preview_path, "PNG")
                return preview_path
        except Exception:
            # pdf2image failed (likely due to missing poppler) - run fallback image generation
            pass

    # Fallback placeholder generation for Office documents and missing binary states
    try:
        # Create a clean placeholder canvas
        img = Image.new("RGB", (300, 300), color=(240, 244, 248))
        draw = ImageDraw.Draw(img)
        
        # Draw format badge
        badge_color = {
            ".pdf": (220, 38, 38),     # Red
            ".docx": (37, 99, 235),    # Blue
            ".pptx": (234, 88, 12),    # Orange
            ".xlsx": (22, 163, 74),    # Green
        }.get(ext, (107, 114, 128))    # Gray
        
        draw.rectangle([20, 20, 280, 280], outline=(203, 213, 225), width=2)
        draw.rectangle([40, 40, 260, 100], fill=badge_color)
        
        # Text markings
        label = ext.upper().lstrip(".") or "FILE"
        draw.text((150, 70), label, fill=(255, 255, 255), anchor="mm")
        
        # Filename text
        filename_truncated = file_path.name
        if len(filename_truncated) > 24:
            filename_truncated = filename_truncated[:21] + "..."
        draw.text((150, 180), filename_truncated, fill=(30, 41, 59), anchor="mm")
        
        # Document size
        size_kb = file_path.stat().st_size / 1024
        draw.text((150, 220), f"{size_kb:.1f} KB", fill=(100, 116, 139), anchor="mm")
        
        img.save(preview_path, "PNG")
        return preview_path
    except Exception:
        return None
