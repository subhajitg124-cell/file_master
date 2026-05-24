import uuid
import structlog
from fastapi import Request

# Configure structlog
structlog.configure(
    processors=[
        structlog.contextvars.merge_contextvars,
        structlog.processors.add_log_level,
        structlog.processors.StackInfoRenderer(),
        structlog.dev.set_exc_info,
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.JSONRenderer()
    ],
    wrapper_class=structlog.make_filtering_bound_logger(20), # Info and above
    context_class=dict,
    logger_factory=structlog.PrintLoggerFactory(),
    cache_logger_on_first_use=True,
)

logger = structlog.get_logger()

async def log_middleware(request: Request, call_next):
    """ FastAPI middleware binding request path and request IDs to structured logs. """
    request_id = request.headers.get("X-Request-ID", str(uuid.uuid4()))
    with structlog.contextvars.bound_contextvars(request_id=request_id, path=request.url.path):
        logger.info("request_started", method=request.method)
        try:
            response = await call_next(request)
            logger.info("request_completed", status=response.status_code)
            return response
        except Exception as e:
            logger.error("request_failed", error=str(e))
            raise e
