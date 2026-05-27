from slowapi import Limiter
from slowapi.util import get_remote_address
from config import REDIS_URL

_extra: dict = {"headers_enabled": True}
if REDIS_URL:
    try:
        import redis as _redis
        _extra["storage_uri"] = REDIS_URL
    except ImportError:
        pass

limiter = Limiter(key_func=get_remote_address, **_extra)
