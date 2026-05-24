import os
from pathlib import Path
from typing import List, Dict, Any, Callable, Optional
from PIL import Image, ImageEnhance, ImageFilter
from app.processors.base import BaseProcessor
from app.config import settings

class ImageProcessor(BaseProcessor):
    def validate_options(self, options: Dict[str, Any]) -> None:
        operation = options.get("operation")
        if not operation:
            raise ValueError("Missing 'operation' in options.")
        if operation not in ["compress", "enhance", "convert"]:
            raise ValueError(f"Unsupported Image operation: {operation}")

    def process(
        self, 
        file_paths: List[str], 
        options: Dict[str, Any], 
        progress_callback: Optional[Callable[[float], None]] = None
    ) -> str:
        self.validate_options(options)
        operation = options["operation"]
        
        if not file_paths:
            raise ValueError("No files provided for image processing.")
            
        input_path = file_paths[0]
        if not os.path.exists(input_path):
            raise FileNotFoundError(f"Input image not found: {input_path}")
            
        if progress_callback:
            progress_callback(10.0)

        # Load image
        img = Image.open(input_path)
        
        # Parse target format
        target_format = options.get("target_format", img.format or "PNG").upper()
        # standard cleanings for formats
        if target_format == "JPG":
            target_format = "JPEG"
        
        # Output extension setup
        ext = f".{target_format.lower()}"
        if ext == ".jpeg":
            ext = ".jpg"
        output_filename = f"processed_{Path(input_path).stem}{ext}"
        output_path = settings.output_dir / output_filename

        if progress_callback:
            progress_callback(30.0)

        # 1. Compress operation
        if operation == "compress":
            quality = int(options.get("quality", 85))
            resize_pct = float(options.get("resize_pct", 1.0))
            
            if resize_pct < 1.0:
                new_width = int(img.width * resize_pct)
                new_height = int(img.height * resize_pct)
                img = img.resize((new_width, new_height), Image.Resampling.LANCZOS)
                
            # If output is JPEG and image has alpha channel, discard alpha or background-fill it
            if target_format == "JPEG" and img.mode in ("RGBA", "LA", "P"):
                background = Image.new("RGB", img.size, (255, 255, 255))
                if img.mode == "P":
                    img = img.convert("RGBA")
                background.paste(img, mask=img.split()[3] if img.mode == "RGBA" else None)
                img = background

            if progress_callback:
                progress_callback(70.0)
            img.save(output_path, format=target_format, quality=quality, optimize=True)

        # 2. Enhance operation
        elif operation == "enhance":
            brightness = float(options.get("brightness", 1.0))
            contrast = float(options.get("contrast", 1.0))
            sharpness = float(options.get("sharpness", 1.0))
            denoise = bool(options.get("denoise", False))

            if brightness != 1.0:
                enhancer = ImageEnhance.Brightness(img)
                img = enhancer.enhance(brightness)
                
            if contrast != 1.0:
                enhancer = ImageEnhance.Contrast(img)
                img = enhancer.enhance(contrast)
                
            if sharpness != 1.0:
                enhancer = ImageEnhance.Sharpness(img)
                img = enhancer.enhance(sharpness)

            if denoise:
                # Apply Pillow's smooth filter or a mild median filter for noise reduction
                img = img.filter(ImageFilter.SMOOTH_MORE)

            if progress_callback:
                progress_callback(70.0)
                
            # Save using default high quality or original quality
            if target_format == "JPEG" and img.mode in ("RGBA", "LA", "P"):
                background = Image.new("RGB", img.size, (255, 255, 255))
                if img.mode == "P":
                    img = img.convert("RGBA")
                background.paste(img, mask=img.split()[3] if img.mode == "RGBA" else None)
                img = background
                
            img.save(output_path, format=target_format, quality=95)

        # 3. Convert operation
        elif operation == "convert":
            if progress_callback:
                progress_callback(60.0)
                
            # RGBA to RGB for JPEG target
            if target_format == "JPEG" and img.mode in ("RGBA", "LA", "P"):
                background = Image.new("RGB", img.size, (255, 255, 255))
                if img.mode == "P":
                    img = img.convert("RGBA")
                background.paste(img, mask=img.split()[3] if img.mode == "RGBA" else None)
                img = background
                
            img.save(output_path, format=target_format)

        if progress_callback:
            progress_callback(100.0)

        return str(output_path)
