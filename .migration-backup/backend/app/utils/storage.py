import time
import json
import logging
import re
from pathlib import Path
from typing import Optional, Dict, Any, List
import redis
from app.config import settings

logger = logging.getLogger(__name__)

def sanitize_filename(filename: str) -> str:
    """Prevent path traversal & injection attacks"""
    # Remove non-ASCII, control chars, and path separators
    clean = re.sub(r'[^\w\s.\-]', '', filename)
    clean = re.sub(r'\.{2,}', '.', clean)  # Collapse multiple dots
    return clean.strip()[:150]  # Max length

def validate_file_size(file_size: int, mime_type: str) -> bool:
    """Enforce format-specific size limits"""
    LIMITS = {
        "image/": 50 * 1024 * 1024,      # 50MB for images
        "video/": 500 * 1024 * 1024,     # 500MB for video
        "application/pdf": 100 * 1024 * 1024,  # 100MB PDF
        "application/vnd.openxmlformats-officedocument": 50 * 1024 * 1024,  # 50MB Office
    }
    limit = next((v for k, v in LIMITS.items() if mime_type.startswith(k)), 25 * 1024 * 1024)
    return file_size <= limit


# Initialize Redis client (with graceful offline fallback)
redis_client: Optional[redis.Redis] = None
local_metadata_store: Dict[str, Dict[str, Any]] = {}

try:
    redis_client = redis.Redis.from_url(settings.REDIS_URL, decode_responses=True)
    redis_client.ping()
    logger.info("Connected to Redis successfully for metadata storage.")
except Exception as e:
    logger.warning(f"Redis is not available. Falling back to in-memory metadata store. Error: {e}")
    redis_client = None


def get_job_meta(job_id: str) -> Optional[Dict[str, Any]]:
    """Retrieves metadata for a job."""
    if redis_client:
        try:
            data = redis_client.get(f"job:{job_id}")
            if data:
                return json.loads(data)
        except Exception as e:
            logger.error(f"Redis get failed: {e}")
    
    return local_metadata_store.get(job_id)


def set_job_meta(job_id: str, meta: Dict[str, Any], expiry: int = 86400) -> None:
    """Saves metadata for a job with an expiration time."""
    if redis_client:
        try:
            redis_client.set(f"job:{job_id}", json.dumps(meta), ex=expiry)
            return
        except Exception as e:
            logger.error(f"Redis set failed: {e}")
            
    local_metadata_store[job_id] = meta


def update_job_status(job_id: str, status: str, progress: float = 0.0, 
                      error: Optional[str] = None, download_url: Optional[str] = None,
                      metadata: Optional[Dict[str, Any]] = None) -> None:
    """Updates job processing status and progress."""
    meta = get_job_meta(job_id) or {
        "job_id": job_id,
        "input_files": [],
        "created_at": time.time()
    }
    
    meta["status"] = status
    meta["progress"] = progress
    if error:
        meta["error"] = error
    if download_url:
        meta["download_url"] = download_url
    if metadata:
        meta["metadata"] = {**(meta.get("metadata") or {}), **metadata}
        
    set_job_meta(job_id, meta)


def mark_job_downloaded(job_id: str) -> None:
    """Marks the job as downloaded, starting the 5-minute grace period countdown."""
    meta = get_job_meta(job_id)
    if meta:
        meta["downloaded_at"] = time.time()
        # Set short expiration in Redis if available
        set_job_meta(job_id, meta, expiry=settings.GRACE_PERIOD_SECONDS)
        logger.info(f"Job {job_id} marked as downloaded. 5-minute grace period started.")


def clean_expired_files() -> List[str]:
    """
    Deletes temporary files that have expired (TTL exceeded or Grace Period exceeded).
    Returns list of deleted job_ids.
    """
    now = time.time()
    deleted_jobs = []
    
    # 1. Gather jobs to inspect
    jobs_to_check = []
    if redis_client:
        try:
            keys = redis_client.keys("job:*")
            for k in keys:
                data = redis_client.get(k)
                if data:
                    jobs_to_check.append(json.loads(data))
        except Exception as e:
            logger.error(f"Failed to fetch keys from Redis during cleanup: {e}")
    else:
        jobs_to_check = list(local_metadata_store.values())

    for meta in jobs_to_check:
        job_id = meta["job_id"]
        created_at = meta.get("created_at", 0)
        downloaded_at = meta.get("downloaded_at")
        
        should_delete = False
        
        # Scenario A: Grace period (5 mins after download)
        if downloaded_at and (now - downloaded_at > settings.GRACE_PERIOD_SECONDS):
            should_delete = True
            logger.info(f"Job {job_id} grace period expired.")
        # Scenario B: Hard TTL (30 mins after creation)
        elif now - created_at > settings.TEMP_TTL_SECONDS:
            should_delete = True
            logger.info(f"Job {job_id} absolute TTL expired.")

        if should_delete:
            deleted_jobs.append(job_id)
            # Delete physical files
            for file_path_str in meta.get("input_files", []):
                p = Path(file_path_str)
                if p.exists():
                    try:
                        p.unlink()
                        logger.info(f"Cleaned up input file: {p}")
                    except Exception as e:
                        logger.error(f"Error deleting file {p}: {e}")
            
            output_file_str = meta.get("output_file")
            if output_file_str:
                p = Path(output_file_str)
                if p.exists():
                    try:
                        p.unlink()
                        logger.info(f"Cleaned up output file: {p}")
                    except Exception as e:
                        logger.error(f"Error deleting file {p}: {e}")
            
            # Remove metadata
            if redis_client:
                try:
                    redis_client.delete(f"job:{job_id}")
                except Exception as e:
                    logger.error(f"Failed to delete Redis key: {e}")
            else:
                local_metadata_store.pop(job_id, None)

    # 2. General directory sweep for orphaned files (just in case)
    for folder in [settings.upload_dir, settings.output_dir]:
        for item in folder.glob("*"):
            if item.is_file() and (now - item.stat().st_mtime > settings.TEMP_TTL_SECONDS):
                try:
                    item.unlink()
                    logger.info(f"Swept orphaned file: {item}")
                except Exception as e:
                    logger.error(f"Error sweeping orphaned file {item}: {e}")

    return deleted_jobs
