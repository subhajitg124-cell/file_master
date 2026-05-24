import os
import uuid
import time
import shutil
from pathlib import Path
from typing import List, Dict, Any
from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Depends, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from app.config import settings
from app.schemas import HealthResponse, ProcessRequest, JobStatusResponse, ErrorCode, APIError
from app.utils.mime import detect_mime_type
from app.utils.storage import (
    get_job_meta, 
    set_job_meta, 
    update_job_status, 
    mark_job_downloaded,
    redis_client,
    clean_expired_files,
    sanitize_filename,
    validate_file_size
)
from app.utils.preview import generate_preview
from app.tasks import process_file_task
from app.utils.logging import log_middleware

# 1. Rate Limiting setup
limiter = Limiter(key_func=get_remote_address)
app = FastAPI(title=settings.APP_NAME, version="1.0.0")
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# 2. CORS configuration
origins = [o.strip() for o in settings.ALLOWED_ORIGINS.split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 3. Add Structured Logging Middleware
app.middleware("http")(log_middleware)

# 4. Startup & Heartbeat
@app.on_event("startup")
def startup_event():
    # Make sure dirs exist
    settings.upload_dir
    settings.output_dir

def get_disk_free(path: str) -> int:
    try:
        return shutil.disk_usage(path).free
    except Exception:
        return 0

@app.get("/api/v1/health", response_model=HealthResponse)
@limiter.limit(settings.GLOBAL_RATE_LIMIT)
def health_check(request: Request):
    """
    Health check endpoint reporting connectivity to external tools and services.
    Helps frontend show warnings for missing native capabilities (FFmpeg, LibreOffice).
    """
    # Check Redis
    redis_healthy = False
    if redis_client:
        try:
            redis_healthy = redis_client.ping()
        except Exception:
            pass

    # Check LibreOffice
    libreoffice_installed = False
    for cmd in ["soffice", "libreoffice", "soffice.exe"]:
        if shutil.which(cmd):
            libreoffice_installed = True
            break
    if not libreoffice_installed:
        # Check standard Windows paths
        win_paths = [
            r"C:\Program Files\LibreOffice\program\soffice.exe",
            r"C:\Program Files (x86)\LibreOffice\program\soffice.exe"
        ]
        if any(os.path.exists(p) for p in win_paths):
            libreoffice_installed = True

    # Check FFmpeg
    ffmpeg_installed = shutil.which("ffmpeg") is not None
    free_space = get_disk_free(str(settings.BASE_TEMP_DIR))

    return HealthResponse(
        status="healthy" if (redis_healthy or not settings.DEBUG) else "degraded",
        version="1.0.0",
        capabilities={
            "libreoffice": libreoffice_installed,
            "ffmpeg": ffmpeg_installed,
            "redis": redis_healthy,
            "tmp_space_gb": round(free_space / (1024**3), 2)
        }
    )

# 5. Upload Files
@app.post("/api/v1/upload")
@limiter.limit(settings.GLOBAL_RATE_LIMIT)
async def upload_files(
    request: Request,
    files: List[UploadFile] = File(...),
    job_id: str = Form(None)
):
    """
    Accepts files, runs magic-byte validation, saves to /tmp/uploads,
    generates a quick preview image, and registers metadata.
    """
    if not job_id:
        job_id = str(uuid.uuid4())

    uploaded_meta = []
    local_file_paths = []

    for file in files:
        # Sanitize filename to prevent path traversal
        clean_name = sanitize_filename(file.filename or "upload")
        
        # Save temp file first to run magic byte validation on disk
        file_uuid = uuid.uuid4().hex
        ext = Path(clean_name).suffix
        temp_filename = f"{file_uuid}{ext}"
        temp_path = settings.upload_dir / temp_filename
        
        file_bytes = await file.read()
        with open(temp_path, "wb") as f_out:
            f_out.write(file_bytes)

        # Magic byte validation
        detected_mime = detect_mime_type(temp_path)
        
        # Validate file size limits based on detected MIME
        if not validate_file_size(len(file_bytes), detected_mime):
            if temp_path.exists():
                temp_path.unlink()
            raise HTTPException(
                status_code=400,
                detail={
                    "code": ErrorCode.FILE_TOO_LARGE,
                    "message": f"File {clean_name} exceeds size limit for format {detected_mime}.",
                    "suggestion": "Resize images or compress PDF files locally first."
                }
            )
        
        # Generate thumbnail preview
        preview_path = generate_preview(temp_path)
        preview_url = f"/api/v1/preview/{job_id}/{temp_filename}" if preview_path else None
        
        local_file_paths.append(str(temp_path))
        uploaded_meta.append({
            "filename": clean_name,
            "temp_path": str(temp_path),
            "temp_filename": temp_filename,
            "size_bytes": len(file_bytes),
            "mime_type": detected_mime,
            "preview_url": preview_url
        })

    # Register initial metadata in Redis/memory
    job_meta = {
        "job_id": job_id,
        "status": "queued",
        "progress": 0.0,
        "input_files": local_file_paths,
        "uploaded_meta": uploaded_meta,
        "created_at": time.time(),
        "downloaded_at": None
    }
    set_job_meta(job_id, job_meta)

    return {"job_id": job_id, "files": uploaded_meta}

# 6. Serve Previews
@app.get("/api/v1/preview/{job_id}/{temp_filename}")
def get_preview_image(job_id: str, temp_filename: str):
    """Streams a preview PNG thumbnail generated for the upload."""
    job_meta = get_job_meta(job_id)
    if not job_meta:
        raise HTTPException(status_code=404, detail="Job preview context not found.")

    # Find the correct file in uploaded meta
    file_record = None
    for meta in job_meta.get("uploaded_meta", []):
        if meta["temp_filename"] == temp_filename:
            file_record = meta
            break
            
    if not file_record:
        raise HTTPException(status_code=404, detail="Preview file index not found.")
        
    preview_file_path = settings.output_dir / f"preview_{Path(file_record['temp_filename']).stem}.png"
    if not preview_file_path.exists():
        # Fallback to generating one now
        original_path = Path(file_record["temp_path"])
        generated = generate_preview(original_path)
        if not generated or not generated.exists():
            raise HTTPException(status_code=404, detail="Preview unavailable.")
        preview_file_path = generated

    return FileResponse(str(preview_file_path), media_type="image/png")

# 7. Process Queue Endpoint - Rate Limited to 10 requests per minute
@app.post("/api/v1/process", response_model=JobStatusResponse)
@limiter.limit("10/minute")
def start_processing(request: Request, body: ProcessRequest, job_id: str = Form(...)):
    """
    Kicks off asynchronous file execution on Celery workers.
    """
    job_meta = get_job_meta(job_id)
    if not job_meta:
        raise HTTPException(status_code=404, detail="Job context not found. Upload files first.")
        
    # Queue task
    update_job_status(job_id, "queued", progress=0.0)
    
    process_file_task.delay(
        job_id=job_id,
        operation=body.operation,
        file_paths=job_meta["input_files"],
        options=body.options
    )
    
    return JobStatusResponse(
        job_id=job_id,
        status="queued",
        progress=0.0
    )

# 8. Status Polling
@app.get("/api/v1/status/{job_id}", response_model=JobStatusResponse)
def get_job_status(job_id: str):
    """Polls progress of a given job_id."""
    meta = get_job_meta(job_id)
    if not meta:
        raise HTTPException(status_code=404, detail="Job not found.")
        
    now = time.time()
    created_at = meta.get("created_at", now)
    downloaded_at = meta.get("downloaded_at")
    
    # Calculate TTL
    ttl_remaining = 0.0
    if downloaded_at:
        ttl_remaining = max(0.0, settings.GRACE_PERIOD_SECONDS - (now - downloaded_at))
    else:
        ttl_remaining = max(0.0, settings.TEMP_TTL_SECONDS - (now - created_at))
        
    return JobStatusResponse(
        job_id=job_id,
        status=meta.get("status", "failed"),
        progress=meta.get("progress", 0.0),
        download_url=meta.get("download_url"),
        error=meta.get("error"),
        metadata=meta.get("metadata"),
        ttl_remaining=round(ttl_remaining, 1)
    )

# 9. File Downloader
@app.get("/api/v1/download/{job_id}")
def download_processed_file(job_id: str):
    """
    Serves the output file and triggers the 5-minute deletion grace period.
    """
    meta = get_job_meta(job_id)
    if not meta:
        raise HTTPException(status_code=404, detail="Job not found or download link expired.")
        
    if meta.get("status") != "done" or not meta.get("output_file"):
        raise HTTPException(status_code=400, detail="Job is not completed yet.")
        
    output_path = Path(meta["output_file"])
    if not output_path.exists():
        raise HTTPException(status_code=404, detail="Processed file not found on disk.")

    # Determine filename
    out_metadata = meta.get("metadata") or {}
    friendly_name = out_metadata.get("output_name") or output_path.name
    
    # Trigger 5-minute grace period
    mark_job_downloaded(job_id)
    
    # Detect dynamic MIME
    content_mime = detect_mime_type(output_path)
    
    return FileResponse(
        path=str(output_path),
        filename=friendly_name,
        media_type=content_mime
    )

# 10. Force Clean Trigger
@app.post("/api/v1/cleanup")
def force_cleanup():
    """Forces manual check and sweeps all expired files immediately."""
    deleted_jobs = clean_expired_files()
    return {"status": "success", "cleaned_jobs_count": len(deleted_jobs), "cleaned_job_ids": deleted_jobs}
