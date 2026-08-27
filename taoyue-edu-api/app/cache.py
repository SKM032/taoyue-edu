"""Redis 缓存工具（企业级）

用于给「读多写少」的公开接口加缓存，避免每次都直查数据库。

特性：
- 统一 key 前缀，便于按业务批量失效
- JSON 序列化 / 反序列化
- 防御性降级：Redis 连接异常时自动跳过缓存，直接走数据库，绝不因缓存故障影响业务
- 缓存击穿保护：可选（set nx 防抖），默认不开启

用法：
    from app.cache import cache_get, cache_set, cache_del_pattern

    # 读：先查缓存，命中直接返回；未命中查库后写入
    cached = cache_get(key)
    if cached is not None:
        return cached
    data = ...  # 查数据库
    cache_set(key, data, ttl=300)
    return data

    # 写：数据变更后按前缀失效
    cache_del_pattern("course:detail:*")
"""
import json
import logging
from typing import Any, Optional

from app.redis_client import redis_client

logger = logging.getLogger(__name__)

# 缓存 key 前缀（统一管理，便于批量失效）
CACHE_PREFIX = "taoyue:cache:"

# 各类缓存的默认 TTL（秒）
DEFAULT_TTL = 300          # 默认 5 分钟
COURSE_LIST_TTL = 120      # 课程列表 2 分钟
COURSE_DETAIL_TTL = 600    # 课程详情 10 分钟
CATEGORY_TTL = 600         # 分类 10 分钟
BANNER_TTL = 600           # Banner 10 分钟
CONTENT_LIST_TTL = 300     # 直播/训练营 5 分钟


def _build_key(*parts) -> str:
    """拼接缓存 key，如 _build_key('course', 'detail', 'slug-123')"""
    joined = ":".join(str(p) for p in parts)
    return f"{CACHE_PREFIX}{joined}"


def cache_get(key: str) -> Optional[Any]:
    """读取缓存，返回反序列化后的对象；未命中或异常返回 None。

    注意：key 为业务 key（不含前缀），内部自动加 `CACHE_PREFIX`，
    与 cache_del_pattern / cache_del 保持一致。
    """
    full = _build_key(key)
    try:
        raw = redis_client.get(full)
        if raw is None:
            return None
        return json.loads(raw)
    except Exception as e:
        # 缓存故障不影响业务，降级为直查数据库
        logger.warning("缓存读取失败(已降级): key=%s err=%s", key, e)
        return None


def cache_set(key: str, value: Any, ttl: int = DEFAULT_TTL) -> bool:
    """写入缓存（JSON 序列化）。失败时静默降级，不影响业务。

    key 为业务 key（不含前缀），内部自动加 `CACHE_PREFIX`。
    """
    full = _build_key(key)
    try:
        redis_client.setex(full, ttl, json.dumps(value, ensure_ascii=False, default=str))
        return True
    except Exception as e:
        logger.warning("缓存写入失败(已降级): key=%s err=%s", key, e)
        return False


def cache_del(key: str) -> bool:
    """删除单个缓存 key（key 为业务 key，内部自动加前缀）。"""
    full = _build_key(key)
    try:
        redis_client.delete(full)
        return True
    except Exception as e:
        logger.warning("缓存删除失败: key=%s err=%s", key, e)
        return False


def cache_del_pattern(pattern: str) -> int:
    """按通配符模式批量失效缓存（如 'course:detail:*'）。

    注意：pattern 为 CACHE_PREFIX 之后的相对模式，自动补全前缀。
    返回删除的 key 数量。
    """
    try:
        full = f"{CACHE_PREFIX}{pattern}" if not pattern.startswith(CACHE_PREFIX) else pattern
        keys = list(redis_client.scan_iter(match=full, count=200))
        if keys:
            return redis_client.delete(*keys)
        return 0
    except Exception as e:
        logger.warning("缓存批量失效失败: pattern=%s err=%s", pattern, e)
        return 0


def clear_all_cache() -> int:
    """清空所有业务缓存（管理端手动刷新时可用）。"""
    return cache_del_pattern("*")
