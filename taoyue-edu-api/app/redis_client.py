"""Redis 连接管理"""
import redis
from app.config import get_settings

settings = get_settings()

redis_client = redis.from_url(
    settings.REDIS_URL,
    decode_responses=True,
    socket_connect_timeout=5,
    socket_keepalive=True,
    health_check_interval=30,
)


def get_redis():
    """获取Redis连接（依赖注入）"""
    try:
        yield redis_client
    finally:
        pass
