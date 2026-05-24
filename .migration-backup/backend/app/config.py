import os
import tempfile
from pathlib import Path
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    APP_NAME: str = "File Master API"
    DEBUG: bool = True
    
    # CORS Origins (Comma-separated string in env, parsed as list)
    ALLOWED_ORIGINS: str = "http://localhost:3000,http://127.0.0.1:3000"
    
    # Redis & Celery
    REDIS_URL: str = os.getenv("REDIS_URL", "redis://localhost:6379/0")
    
    # File Storage Locations (defaults to cross-platform OS temp dir)
    BASE_TEMP_DIR: Path = Path(tempfile.gettempdir()) / "filemaster"
    
    # Rate Limiting
    GLOBAL_RATE_LIMIT: str = "60/minute"
    
    # File limits
    MAX_FILE_SIZE_MB: int = 100  # Default max 100MB per file
    
    # Retention
    TEMP_TTL_SECONDS: int = 1800  # 30 minutes
    GRACE_PERIOD_SECONDS: int = 300  # 5 minutes after download

    @property
    def upload_dir(self) -> Path:
        d = self.BASE_TEMP_DIR / "uploads"
        d.mkdir(parents=True, exist_ok=True)
        return d

    @property
    def output_dir(self) -> Path:
        d = self.BASE_TEMP_DIR / "outputs"
        d.mkdir(parents=True, exist_ok=True)
        return d

    class Config:
        env_file = ".env"
        extra = "ignore"

settings = Settings()
