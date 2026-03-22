import redis
from app.core.config import get_settings
import structlog

logger = structlog.get_logger(__name__)
settings = get_settings()

class LLMUsageProtector:
    """
    Protects against runaway LLM costs by enforcing a hard limit on total calls.
    Uses Redis to maintain a persistent count across processes (workers/api).
    """
    
    LIMIT_KEY = "graider:llm_call_count"
    MAX_CALLS = 40 # As requested by user
    
    def __init__(self):
        # Extract redis host/port from CELERY_BROKER_URL
        # Default: redis://localhost:6379/0
        try:
            self.redis_client = redis.from_url(settings.CELERY_BROKER_URL)
        except Exception as e:
            logger.error("redis_connection_failed", error=str(e))
            self.redis_client = None

    def check_and_increment(self):
        """
        Increments the call count and raises an Exception if limit reached.
        """
        if not self.redis_client:
            logger.warning("llm_protection_disabled_no_redis")
            return

        count = self.redis_client.incr(self.LIMIT_KEY)
        
        if count > self.MAX_CALLS:
            logger.error("llm_limit_reached", count=count, limit=self.MAX_CALLS)
            raise RuntimeError(f"LLM Call Limit Reached ({self.MAX_CALLS} calls). Safety block triggered to prevent costs.")
        
        logger.info("llm_call_registered", current_count=count, remaining=self.MAX_CALLS - count)

    def get_count(self):
        if not self.redis_client:
            return 0
        val = self.redis_client.get(self.LIMIT_KEY)
        return int(val) if val else 0

    def reset(self):
        if self.redis_client:
            self.redis_client.set(self.LIMIT_KEY, 0)

protector = LLMUsageProtector()
