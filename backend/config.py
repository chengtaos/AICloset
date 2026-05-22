import os
from dotenv import load_dotenv

load_dotenv()

# DeepSeek
DEEPSEEK_API_KEY = os.getenv("DEEPSEEK_API_KEY", "")
DEEPSEEK_BASE_URL = "https://api.deepseek.com"
DEEPSEEK_MODEL = "deepseek-chat"

# 高德天气
AMAP_API_KEY = os.getenv("AMAP_API_KEY", "")
AMAP_WEATHER_URL = "https://restapi.amap.com/v3/weather/weatherInfo"
