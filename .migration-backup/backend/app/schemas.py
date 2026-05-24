from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
try:
    from enum import StrEnum
except ImportError:
    from enum import Enum
    class StrEnum(str, Enum):
        pass

class ErrorCode(StrEnum):
    FILE_TOO_LARGE = "FILE_TOO_LARGE"
    UNSUPPORTED_FORMAT = "UNSUPPORTED_FORMAT"
    MAGIC_BYTE_MISMATCH = "MAGIC_BYTE_MISMATCH"
    PROCESSING_TIMEOUT = "PROCESSING_TIMEOUT"
    LIBREOFFICE_MISSING = "LIBREOFFICE_MISSING"

class APIError(BaseModel):
    code: ErrorCode
    message: str
    suggestion: Optional[str] = None

class HealthResponse(BaseModel):
    status: str
    version: str
    capabilities: Dict[str, Any]


class ProcessRequest(BaseModel):
    operation: str = Field(..., description="Operation to perform: merge, compress, enhance, edit, convert")
    options: Dict[str, Any] = Field(default_factory=dict, description="Configuration options for the operation")

class JobStatusResponse(BaseModel):
    job_id: str
    status: str = Field(..., description="queued, processing, done, failed")
    progress: float = Field(0.0, description="Progress percentage 0-100")
    download_url: Optional[str] = None
    error: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None
    ttl_remaining: Optional[float] = None

