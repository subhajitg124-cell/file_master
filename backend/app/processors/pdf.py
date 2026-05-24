import os
from pathlib import Path
from typing import List, Dict, Any, Callable, Optional
from pypdf import PdfReader, PdfWriter, PdfMerger
from app.processors.base import BaseProcessor
from app.config import settings

class PDFProcessor(BaseProcessor):
    def validate_options(self, options: Dict[str, Any]) -> None:
        operation = options.get("operation")
        if not operation:
            raise ValueError("Missing 'operation' in options.")
        if operation not in ["merge", "compress"]:
            raise ValueError(f"Unsupported PDF operation: {operation}")

    def process(
        self, 
        file_paths: List[str], 
        options: Dict[str, Any], 
        progress_callback: Optional[Callable[[float], None]] = None
    ) -> str:
        self.validate_options(options)
        operation = options["operation"]
        
        if progress_callback:
            progress_callback(10.0)
            
        output_filename = f"processed_{os.path.basename(file_paths[0])}"
        output_path = settings.output_dir / output_filename
        
        if operation == "merge":
            if not file_paths or len(file_paths) < 2:
                raise ValueError("Merging requires at least 2 files.")
            self._merge_pdfs(file_paths, output_path, progress_callback)
        elif operation == "compress":
            if not file_paths:
                raise ValueError("Compression requires at least 1 file.")
            self._compress_pdf(file_paths[0], output_path, progress_callback)
            
        if progress_callback:
            progress_callback(100.0)
            
        return str(output_path)

    def _merge_pdfs(
        self, 
        file_paths: List[str], 
        output_path: Path, 
        progress_callback: Optional[Callable[[float], None]]
    ) -> None:
        merger = PdfMerger()
        total_files = len(file_paths)
        
        for idx, file_path in enumerate(file_paths):
            if not os.path.exists(file_path):
                raise FileNotFoundError(f"Input PDF file not found: {file_path}")
            merger.append(file_path)
            if progress_callback:
                # scale progress from 10% to 90%
                current_prog = 10.0 + ((idx + 1) / total_files) * 80.0
                progress_callback(min(current_prog, 90.0))
                
        with open(output_path, "wb") as f_out:
            merger.write(f_out)
        merger.close()

    def _compress_pdf(
        self, 
        file_path: str, 
        output_path: Path, 
        progress_callback: Optional[Callable[[float], None]]
    ) -> None:
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"Input PDF file not found: {file_path}")
            
        reader = PdfReader(file_path)
        writer = PdfWriter()
        
        total_pages = len(reader.pages)
        for idx, page in enumerate(reader.pages):
            # Compress content streams
            page.compress_content_streams()
            writer.add_page(page)
            if progress_callback:
                current_prog = 10.0 + ((idx + 1) / total_pages) * 80.0
                progress_callback(min(current_prog, 90.0))
                
        # Optimize metadata
        with open(output_path, "wb") as f_out:
            writer.write(f_out)
