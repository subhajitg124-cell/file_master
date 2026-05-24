import logging
from typing import List, Dict, Any
from app.celery_app import celery_app
from app.utils.storage import update_job_status, clean_expired_files
from app.utils.mime import detect_mime_type
from pathlib import Path

logger = logging.getLogger(__name__)

# Map MIME/extensions to Processor classes
def get_processor_for_file(file_path_str: str, operation: str):
    p = Path(file_path_str)
    mime = detect_mime_type(p)
    ext = p.suffix.lower()

    if mime == "application/pdf" or ext == ".pdf":
        from app.processors.pdf import PDFProcessor
        return PDFProcessor()
        
    elif mime.startswith("image/") or ext in [".png", ".jpg", ".jpeg", ".webp", ".gif"]:
        from app.processors.image import ImageProcessor
        return ImageProcessor()
        
    elif mime.startswith("video/") or ext in [".mp4", ".avi", ".mkv", ".mov"]:
        from app.processors.video import VideoProcessor
        return VideoProcessor()
        
    elif mime in [
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "text/markdown",
        "text/html"
    ] or ext in [".docx", ".pptx", ".xlsx", ".md", ".csv"]:
        from app.processors.docx_pdf import DocumentProcessor
        return DocumentProcessor()
        
    else:
        # Fallback based on typical extensions
        if ext in [".docx", ".doc", ".pptx", ".ppt", ".xlsx", ".xls", ".md", ".html", ".csv"]:
            from app.processors.docx_pdf import DocumentProcessor
            return DocumentProcessor()
        elif ext in [".mp4", ".mov", ".avi", ".mkv", ".webm"]:
            from app.processors.video import VideoProcessor
            return VideoProcessor()
        elif ext in [".jpg", ".jpeg", ".png", ".webp", ".gif"]:
            from app.processors.image import ImageProcessor
            return ImageProcessor()
        
    raise ValueError(f"No processor registered for file format: {ext} (MIME: {mime})")

@celery_app.task(bind=True, name="process_file")
def process_file_task(self, job_id: str, operation: str, file_paths: List[str], options: Dict[str, Any]):
    """
    Main processing worker task.
    Resolves the appropriate processor, runs it, and saves metadata.
    """
    logger.info(f"Worker received job {job_id} for operation: {operation}")
    update_job_status(job_id, "processing", progress=5.0)
    
    try:
        if not file_paths:
            raise ValueError("No files provided for processing.")

        # Find the correct processor using the first file
        processor = get_processor_for_file(file_paths[0], operation)
        
        # Build options dictionary
        run_options = {**options, "operation": operation}
        
        # Progress callback hook
        def progress_callback(progress_value: float):
            # Scale progress so 100% processing is 95% overall, saving 100% for after download url is returned.
            overall_progress = 5.0 + (progress_value / 100.0) * 90.0
            update_job_status(job_id, "processing", progress=round(overall_progress, 1))
            self.update_state(state="PROGRESS", meta={"progress": overall_progress})

        # Run processor
        output_file_path = processor.process(file_paths, run_options, progress_callback=progress_callback)
        
        # Calculate size saving metric
        in_size = sum(Path(fp).stat().st_size for fp in file_paths if Path(fp).exists())
        out_size = Path(output_file_path).stat().st_size if Path(output_file_path).exists() else 0
        savings_pct = ((in_size - out_size) / in_size * 100) if in_size > 0 else 0
        
        download_url = f"/api/v1/download/{job_id}"
        
        # Update job metadata to complete
        meta_updates = {
            "output_file": output_file_path,
            "metadata": {
                "input_size_bytes": in_size,
                "output_size_bytes": out_size,
                "savings_percent": round(savings_pct, 1),
                "output_name": Path(output_file_path).name,
            }
        }
        
        # Save updates
        from app.utils.storage import get_job_meta, set_job_meta
        meta = get_job_meta(job_id) or {}
        meta.update(meta_updates)
        set_job_meta(job_id, meta)
        
        update_job_status(job_id, "done", progress=100.0, download_url=download_url)
        logger.info(f"Worker completed job {job_id}. Output at: {output_file_path}")
        return {"status": "done", "download_url": download_url}
        
    except Exception as e:
        logger.error(f"Error processing job {job_id}: {e}", exc_info=True)
        update_job_status(job_id, "failed", error=str(e))
        return {"status": "failed", "error": str(e)}

@celery_app.task(name="cleanup_expired_files")
def cleanup_expired_files_task():
    """Periodic task to wipe temporary uploads and output folders."""
    logger.info("Running storage cleanup task...")
    deleted_jobs = clean_expired_files()
    logger.info(f"Cleanup finished. Swept metadata and files for {len(deleted_jobs)} expired jobs.")
    return deleted_jobs

# Configure periodic scheduler beat schedule (every 10 minutes)
celery_app.conf.beat_schedule = {
    "auto-cleanup-temp-files-every-10-mins": {
        "task": "cleanup_expired_files",
        "schedule": 600.0,
    }
}
