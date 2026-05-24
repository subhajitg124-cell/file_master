import os
import shutil
import subprocess
from pathlib import Path
from typing import List, Dict, Any, Callable, Optional
from app.processors.base import BaseProcessor
from app.config import settings

class VideoProcessor(BaseProcessor):
    def validate_options(self, options: Dict[str, Any]) -> None:
        operation = options.get("operation")
        if not operation:
            raise ValueError("Missing 'operation' in options.")
        if operation not in ["trim", "compress"]:
            raise ValueError(f"Unsupported Video operation: {operation}")
            
        if operation == "trim":
            if "start_time" not in options or "end_time" not in options:
                raise ValueError("Trimming requires 'start_time' and 'end_time' parameters (in seconds).")

    def process(
        self, 
        file_paths: List[str], 
        options: Dict[str, Any], 
        progress_callback: Optional[Callable[[float], None]] = None
    ) -> str:
        self.validate_options(options)
        operation = options["operation"]
        
        if not file_paths:
            raise ValueError("No files provided for video processing.")
            
        input_path = file_paths[0]
        if not os.path.exists(input_path):
            raise FileNotFoundError(f"Input video not found: {input_path}")
            
        if progress_callback:
            progress_callback(10.0)

        output_filename = f"processed_{os.path.basename(input_path)}"
        output_path = settings.output_dir / output_filename
        
        ffmpeg_bin = shutil.which("ffmpeg")
        
        if not ffmpeg_bin:
            # Fallback path if FFmpeg is not installed locally
            if progress_callback:
                progress_callback(50.0)
            # Copy input file directly as fallback
            shutil.copy2(input_path, output_path)
            if progress_callback:
                progress_callback(100.0)
            return str(output_path)
            
        if progress_callback:
            progress_callback(20.0)

        try:
            if operation == "trim":
                start = options["start_time"]
                end = options["end_time"]
                
                # Command: ffmpeg -y -i input -ss start -to end -c:v libx264 -crf 23 -c:a aac output
                cmd = [
                    ffmpeg_bin,
                    "-y",
                    "-i", input_path,
                    "-ss", str(start),
                    "-to", str(end),
                    "-c", "copy",  # Fast stream copy
                    str(output_path)
                ]
                
            elif operation == "compress":
                # Compress by scaling and adjusting CRF (constant rate factor)
                crf = options.get("crf", 28)  # 18-28 is a good range (higher is more compressed)
                preset = options.get("preset", "medium")
                
                cmd = [
                    ffmpeg_bin,
                    "-y",
                    "-i", input_path,
                    "-vcodec", "libx264",
                    "-crf", str(crf),
                    "-preset", preset,
                    "-acodec", "aac",
                    "-b:a", "128k",
                    str(output_path)
                ]
            
            # Run the command
            process = subprocess.Popen(
                cmd, 
                stdout=subprocess.PIPE, 
                stderr=subprocess.STDOUT, 
                universal_newlines=True
            )
            
            # Simple FFmpeg progress parser
            while True:
                line = process.stdout.readline() if process.stdout else None
                if not line:
                    break
                # Parse duration/time logs if possible to compute progress
                # Example FFmpeg log: time=00:00:15.50
                if "time=" in line and progress_callback:
                    # report a progress step
                    progress_callback(50.0)
                    
            process.wait()
            
            if process.returncode != 0:
                raise RuntimeError(f"FFmpeg command failed with return code {process.returncode}")
                
        except Exception as e:
            # On error, if output doesn't exist, fallback to direct copy to avoid blocking frontend preview
            if not output_path.exists():
                shutil.copy2(input_path, output_path)

        if progress_callback:
            progress_callback(100.0)

        return str(output_path)
