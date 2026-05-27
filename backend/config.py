import os
from dotenv import load_dotenv

load_dotenv()

# CORS — 逗号分隔的允许域名，生产环境务必配置
_CORS_RAW = os.getenv("CORS_ORIGINS", "http://localhost:5173")
CORS_ORIGINS = [o.strip() for o in _CORS_RAW.split(",") if o.strip()]

# Rate limit — 登录/注册频率限制（默认每分钟 5 次）
RATE_LIMIT_AUTH = os.getenv("RATE_LIMIT_AUTH", "5/minute")

# Redis（可选，用于分布式限流）
REDIS_URL = os.getenv("REDIS_URL", "")

# 图片上传限制
MAX_UPLOAD_SIZE_MB = int(os.getenv("MAX_UPLOAD_SIZE_MB", "10"))
ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp"}

# DeepSeek
DEEPSEEK_API_KEY = os.getenv("DEEPSEEK_API_KEY", "")
DEEPSEEK_BASE_URL = "https://api.deepseek.com"
DEEPSEEK_MODEL = "deepseek-chat"

# 高德天气
AMAP_API_KEY = os.getenv("AMAP_API_KEY", "")
AMAP_WEATHER_URL = "https://restapi.amap.com/v3/weather/weatherInfo"

# 阿里云 DashScope（视觉识别）
DASHSCOPE_API_KEY = os.getenv("DASHSCOPE_API_KEY", "")
DASHSCOPE_BASE_URL = "https://dashscope.aliyuncs.com/compatible-mode/v1"
DASHSCOPE_VISION_MODEL = "qwen-vl-max"

# 阿里云 服饰分割（SegmentCloth）
ALIBABA_CLOUD_ACCESS_KEY_ID = os.getenv("ALIBABA_CLOUD_ACCESS_KEY_ID", "")
ALIBABA_CLOUD_ACCESS_KEY_SECRET = os.getenv("ALIBABA_CLOUD_ACCESS_KEY_SECRET", "")
