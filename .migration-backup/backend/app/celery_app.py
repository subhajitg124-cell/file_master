from celery import Celery
from app.config import settings

celery_app = Celery(
    "filemaster",
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL,
    include=["app.tasks"]
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    # Clean up results automatically
    result_expires=1800,
    # Enforce concurrency settings
    worker_concurrency=4
)
