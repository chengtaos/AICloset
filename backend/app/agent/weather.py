"""
高德天气 API 数据提供方。

通过高德地图 Web 服务 API 获取实况天气，失败时降级到本地模拟数据。
"""

import logging
import re
from datetime import datetime

import httpx

from app.schemas import WeatherInfo
from config import AMAP_API_KEY, AMAP_WEATHER_URL

logger = logging.getLogger(__name__)

# ── 城市名 → adcode 映射 ──
CITY_ADCODE: dict[str, str] = {
    # 直辖市
    "北京": "110000", "北京市": "110000",
    "上海": "310000", "上海市": "310000",
    "天津": "120000", "天津市": "120000",
    "重庆": "500000", "重庆市": "500000",
    # 广东
    "广州": "440100", "广州市": "440100",
    "深圳": "440300", "深圳市": "440300",
    "东莞": "441900", "东莞市": "441900",
    "佛山": "440600", "佛山市": "440600",
    "珠海": "440400", "珠海市": "440400",
    # 浙江
    "杭州": "330100", "杭州市": "330100",
    "宁波": "330200", "宁波市": "330200",
    "温州": "330300", "温州市": "330300",
    "绍兴": "330600", "绍兴市": "330600",
    "嘉兴": "330400", "嘉兴市": "330400",
    # 江苏
    "南京": "320100", "南京市": "320100",
    "苏州": "320500", "苏州市": "320500",
    "无锡": "320200", "无锡市": "320200",
    "南通": "320600", "南通市": "320600",
    "常州": "320400", "常州市": "320400",
    "徐州": "320300", "徐州市": "320300",
    "扬州": "321000", "扬州市": "321000",
    # 山东
    "济南": "370100", "济南市": "370100",
    "青岛": "370200", "青岛市": "370200",
    "烟台": "370600", "烟台市": "370600",
    "威海": "371000", "威海市": "371000",
    # 福建
    "福州": "350100", "福州市": "350100",
    "厦门": "350200", "厦门市": "350200",
    "泉州": "350500", "泉州市": "350500",
    # 辽宁
    "沈阳": "210100", "沈阳市": "210100",
    "大连": "210200", "大连市": "210200",
    "鞍山": "210300", "鞍山市": "210300",
    # 黑龙江
    "哈尔滨": "230100", "哈尔滨市": "230100",
    "齐齐哈尔": "230200", "齐齐哈尔市": "230200",
    # 吉林
    "长春": "220100", "长春市": "220100",
    "吉林": "220200", "吉林市": "220200",
    "延边": "222400", "延边朝鲜族自治州": "222400",
    # 河北
    "石家庄": "130100", "石家庄市": "130100",
    "唐山": "130200", "唐山市": "130200",
    "保定": "130600", "保定市": "130600",
    "秦皇岛": "130300", "秦皇岛市": "130300",
    # 河南
    "郑州": "410100", "郑州市": "410100",
    "洛阳": "410300", "洛阳市": "410300",
    "开封": "410200", "开封市": "410200",
    # 湖北
    "武汉": "420100", "武汉市": "420100",
    # 湖南
    "长沙": "430100", "长沙市": "430100",
    # 四川
    "成都": "510100", "成都市": "510100",
    # 陕西
    "西安": "610100", "西安市": "610100",
    "咸阳": "610400", "咸阳市": "610400",
    # 安徽
    "合肥": "340100", "合肥市": "340100",
    # 江西
    "南昌": "360100", "南昌市": "360100",
    # 云南
    "昆明": "530100", "昆明市": "530100",
    "大理": "532900", "大理白族自治州": "532900",
    "丽江": "530700", "丽江市": "530700",
    # 贵州
    "贵阳": "520100", "贵阳市": "520100",
    # 广西
    "南宁": "450100", "南宁市": "450100",
    "桂林": "450300", "桂林市": "450300",
    "北海": "450500", "北海市": "450500",
    # 海南
    "海口": "460100", "海口市": "460100",
    "三亚": "460200", "三亚市": "460200",
    # 山西
    "太原": "140100", "太原市": "140100",
    # 内蒙古
    "呼和浩特": "150100", "呼和浩特市": "150100",
    # 甘肃
    "兰州": "620100", "兰州市": "620100",
    "天水": "620500", "天水市": "620500",
    # 青海
    "西宁": "630100", "西宁市": "630100",
    # 宁夏
    "银川": "640100", "银川市": "640100",
    # 新疆
    "乌鲁木齐": "650100", "乌鲁木齐市": "650100",
    # 西藏
    "拉萨": "540100", "拉萨市": "540100",
}

# ── 模拟数据（API 失败时 fallback） ──
_CITY_BASELINE = {
    # 华北
    "北京": {"spring": (10, 22), "summer": (24, 35), "autumn": (8, 20), "winter": (-5, 5)},
    "天津": {"spring": (10, 22), "summer": (24, 34), "autumn": (9, 21), "winter": (-4, 4)},
    "石家庄": {"spring": (10, 23), "summer": (24, 35), "autumn": (9, 21), "winter": (-4, 5)},
    "唐山": {"spring": (9, 21), "summer": (23, 33), "autumn": (8, 20), "winter": (-6, 4)},
    "保定": {"spring": (10, 22), "summer": (23, 34), "autumn": (8, 20), "winter": (-5, 5)},
    "秦皇岛": {"spring": (8, 18), "summer": (21, 29), "autumn": (9, 20), "winter": (-6, 3)},
    "太原": {"spring": (6, 21), "summer": (18, 32), "autumn": (5, 19), "winter": (-8, 5)},
    "呼和浩特": {"spring": (3, 17), "summer": (18, 30), "autumn": (2, 17), "winter": (-12, -1)},
    # 东北
    "沈阳": {"spring": (4, 17), "summer": (21, 30), "autumn": (4, 18), "winter": (-12, -1)},
    "大连": {"spring": (6, 16), "summer": (22, 28), "autumn": (8, 19), "winter": (-5, 4)},
    "鞍山": {"spring": (5, 17), "summer": (21, 30), "autumn": (5, 18), "winter": (-10, -1)},
    "哈尔滨": {"spring": (2, 14), "summer": (19, 28), "autumn": (1, 15), "winter": (-20, -7)},
    "齐齐哈尔": {"spring": (0, 13), "summer": (19, 28), "autumn": (-1, 13), "winter": (-22, -8)},
    "长春": {"spring": (3, 15), "summer": (20, 29), "autumn": (2, 16), "winter": (-15, -4)},
    "吉林": {"spring": (3, 15), "summer": (20, 28), "autumn": (2, 15), "winter": (-16, -5)},
    "延边": {"spring": (2, 16), "summer": (17, 27), "autumn": (1, 17), "winter": (-14, -3)},
    # 华东
    "上海": {"spring": (12, 22), "summer": (26, 35), "autumn": (14, 24), "winter": (2, 10)},
    "南京": {"spring": (11, 23), "summer": (26, 35), "autumn": (12, 23), "winter": (0, 9)},
    "苏州": {"spring": (12, 23), "summer": (26, 35), "autumn": (14, 24), "winter": (1, 10)},
    "无锡": {"spring": (12, 23), "summer": (26, 35), "autumn": (14, 24), "winter": (1, 9)},
    "南通": {"spring": (11, 21), "summer": (25, 33), "autumn": (13, 23), "winter": (1, 9)},
    "常州": {"spring": (12, 23), "summer": (26, 35), "autumn": (14, 24), "winter": (1, 9)},
    "徐州": {"spring": (10, 23), "summer": (25, 34), "autumn": (11, 22), "winter": (-2, 7)},
    "扬州": {"spring": (11, 22), "summer": (25, 34), "autumn": (13, 23), "winter": (0, 9)},
    "杭州": {"spring": (12, 23), "summer": (26, 36), "autumn": (13, 24), "winter": (2, 10)},
    "宁波": {"spring": (12, 23), "summer": (26, 35), "autumn": (14, 24), "winter": (3, 11)},
    "温州": {"spring": (13, 23), "summer": (26, 35), "autumn": (15, 25), "winter": (5, 13)},
    "绍兴": {"spring": (12, 23), "summer": (26, 36), "autumn": (13, 24), "winter": (2, 10)},
    "嘉兴": {"spring": (12, 23), "summer": (26, 35), "autumn": (14, 24), "winter": (2, 10)},
    "合肥": {"spring": (11, 23), "summer": (26, 35), "autumn": (12, 23), "winter": (0, 10)},
    "南昌": {"spring": (13, 24), "summer": (27, 36), "autumn": (14, 25), "winter": (3, 11)},
    "济南": {"spring": (11, 23), "summer": (25, 35), "autumn": (11, 22), "winter": (-2, 7)},
    "青岛": {"spring": (8, 18), "summer": (23, 29), "autumn": (11, 22), "winter": (-1, 6)},
    "烟台": {"spring": (8, 19), "summer": (23, 29), "autumn": (11, 21), "winter": (-2, 5)},
    "威海": {"spring": (8, 18), "summer": (23, 28), "autumn": (11, 21), "winter": (-1, 5)},
    # 福建
    "福州": {"spring": (14, 24), "summer": (27, 36), "autumn": (17, 27), "winter": (8, 16)},
    "厦门": {"spring": (15, 24), "summer": (27, 34), "autumn": (18, 28), "winter": (10, 18)},
    "泉州": {"spring": (15, 24), "summer": (27, 35), "autumn": (18, 28), "winter": (9, 18)},
    # 华中
    "武汉": {"spring": (13, 24), "summer": (27, 36), "autumn": (13, 24), "winter": (1, 10)},
    "长沙": {"spring": (13, 24), "summer": (27, 36), "autumn": (13, 24), "winter": (3, 10)},
    "郑州": {"spring": (11, 24), "summer": (25, 35), "autumn": (11, 22), "winter": (-2, 8)},
    "洛阳": {"spring": (11, 24), "summer": (24, 35), "autumn": (10, 22), "winter": (-2, 7)},
    "开封": {"spring": (11, 23), "summer": (24, 34), "autumn": (10, 22), "winter": (-2, 7)},
    # 华南
    "广州": {"spring": (18, 27), "summer": (28, 36), "autumn": (18, 28), "winter": (10, 20)},
    "深圳": {"spring": (18, 27), "summer": (28, 35), "autumn": (18, 28), "winter": (10, 20)},
    "东莞": {"spring": (18, 27), "summer": (28, 35), "autumn": (18, 28), "winter": (10, 20)},
    "佛山": {"spring": (18, 27), "summer": (28, 36), "autumn": (18, 28), "winter": (10, 20)},
    "珠海": {"spring": (18, 27), "summer": (28, 34), "autumn": (19, 28), "winter": (12, 20)},
    "南宁": {"spring": (17, 27), "summer": (27, 35), "autumn": (17, 28), "winter": (10, 19)},
    "桂林": {"spring": (15, 24), "summer": (26, 34), "autumn": (16, 27), "winter": (6, 14)},
    "北海": {"spring": (19, 27), "summer": (28, 34), "autumn": (19, 28), "winter": (12, 21)},
    "海口": {"spring": (21, 31), "summer": (28, 36), "autumn": (21, 30), "winter": (16, 23)},
    "三亚": {"spring": (23, 31), "summer": (28, 34), "autumn": (22, 31), "winter": (18, 27)},
    # 西南
    "成都": {"spring": (12, 24), "summer": (22, 32), "autumn": (13, 22), "winter": (4, 11)},
    "重庆": {"spring": (14, 25), "summer": (26, 36), "autumn": (15, 24), "winter": (6, 12)},
    "昆明": {"spring": (10, 23), "summer": (17, 26), "autumn": (10, 21), "winter": (4, 16)},
    "贵阳": {"spring": (10, 21), "summer": (19, 29), "autumn": (11, 21), "winter": (2, 10)},
    "大理": {"spring": (9, 22), "summer": (16, 26), "autumn": (10, 21), "winter": (3, 16)},
    "丽江": {"spring": (8, 21), "summer": (14, 25), "autumn": (8, 20), "winter": (1, 14)},
    # 西北
    "西安": {"spring": (10, 23), "summer": (24, 35), "autumn": (9, 21), "winter": (-3, 7)},
    "咸阳": {"spring": (10, 23), "summer": (24, 35), "autumn": (9, 21), "winter": (-3, 7)},
    "兰州": {"spring": (7, 21), "summer": (17, 31), "autumn": (6, 19), "winter": (-8, 5)},
    "天水": {"spring": (7, 21), "summer": (17, 30), "autumn": (6, 18), "winter": (-6, 5)},
    "西宁": {"spring": (1, 15), "summer": (11, 25), "autumn": (0, 15), "winter": (-13, 2)},
    "银川": {"spring": (5, 20), "summer": (18, 31), "autumn": (4, 19), "winter": (-10, 2)},
    "乌鲁木齐": {"spring": (0, 14), "summer": (18, 30), "autumn": (2, 16), "winter": (-15, -2)},
    # 高原
    "拉萨": {"spring": (1, 16), "summer": (10, 23), "autumn": (1, 17), "winter": (-8, 9)},
}

_CONDITIONS = {
    "spring": ["晴", "多云", "阴"],
    "summer": ["晴", "多云", "雷阵雨", "阴"],
    "autumn": ["晴", "多云", "阴"],
    "winter": ["晴", "多云", "阴", "小雪"],
}


def _resolve_adcode(city: str) -> str | None:
    """城市名 → adcode，支持直接传 adcode。"""
    if city.isdigit() and len(city) == 6:
        return city
    return CITY_ADCODE.get(city) or CITY_ADCODE.get(city.rstrip("市"))


def _calculate_feels_like(temp: float, humidity: float, wind_power: float) -> int:
    """简化体感温度计算。"""
    if temp > 25:
        # 夏季：湿度主导
        return int(temp + (humidity - 50) / 8)
    elif temp < 10:
        # 冬季：风寒效应
        return int(temp - wind_power * 2.5)
    return int(temp)


def _estimate_uv(condition: str, month: int) -> int:
    """根据天气状况和月份估算紫外线指数。"""
    base = {12: 1, 1: 1, 2: 2, 3: 4, 4: 6, 5: 8, 6: 10, 7: 10, 8: 9, 9: 6, 10: 4, 11: 2}
    uv = base.get(month, 3)
    if condition in ("阴", "多云"):
        uv = max(1, uv - 4)
    elif condition in ("雨", "雷阵雨", "雪", "小雪", "雨夹雪"):
        uv = max(1, uv - 6)
    return uv


def _fetch_from_amap(city: str, api_key: str = "") -> WeatherInfo | None:
    """从高德 API 获取实况天气。优先使用用户 Key，其次全局配置。"""
    key = api_key or AMAP_API_KEY
    if not key:
        logger.warning("AMAP_API_KEY 未配置")
        return None

    adcode = _resolve_adcode(city)
    if not adcode:
        logger.warning(f"无法解析城市编码: {city}")
        return None

    try:
        resp = httpx.get(
            AMAP_WEATHER_URL,
            params={
                "key": key,
                "city": adcode,
                "extensions": "base",
                "output": "JSON",
            },
            timeout=5.0,
        )
        resp.raise_for_status()
        data = resp.json()

        if data.get("status") != "1" or data.get("infocode") != "10000":
            logger.warning(f"高德 API 返回异常: {data.get('info')}")
            return None

        lives = data.get("lives", [])
        if not lives:
            return None

        live = lives[0]
        temp = float(live.get("temperature", 20))
        humidity = float(live.get("humidity", 50))
        # 高德返回的风力可能是 "≤3" 这种格式，提取数字
        wind_raw = str(live.get("windpower", "2"))
        wind_match = re.search(r"[\d.]+", wind_raw)
        wind_power = float(wind_match.group()) if wind_match else 2.0
        condition = live.get("weather", "晴")
        city_name = live.get("city", city)

        feels_like = _calculate_feels_like(temp, humidity, wind_power)
        uv = _estimate_uv(condition, datetime.now().month)

        return WeatherInfo(
            city=city_name,
            temperature=int(temp),
            feels_like=feels_like,
            condition=condition,
            humidity=int(humidity),
            wind_level=int(wind_power),
            uv_index=uv,
        )

    except Exception as e:
        logger.error(f"高德天气 API 请求失败: {e}")
        return None


def _fallback_mock(city: str) -> WeatherInfo:
    """本地模拟数据（最后兜底）。"""
    now = datetime.now()
    month = now.month
    if month in (3, 4, 5):
        season = "spring"
    elif month in (6, 7, 8):
        season = "summer"
    elif month in (9, 10, 11):
        season = "autumn"
    else:
        season = "winter"

    baseline = _CITY_BASELINE.get(city) or _CITY_BASELINE.get(city.rstrip("市")) or _CITY_BASELINE["北京"]
    t_min, t_max = baseline[season]

    day_progress = now.hour / 24
    temp = int(t_min + (t_max - t_min) * (0.3 + 0.4 * day_progress))
    feels_like = temp - 2 if season == "winter" else temp + 1

    conditions = _CONDITIONS[season]
    condition = conditions[now.day % len(conditions)]

    uv_base = {"spring": 5, "summer": 9, "autumn": 4, "winter": 2}
    uv = uv_base[season]
    if condition in ("阴", "雨", "雪"):
        uv = max(1, uv - 4)

    humidity_base = {"spring": 50, "summer": 75, "autumn": 55, "winter": 35}
    humidity = humidity_base[season]

    wind_base = {"spring": 3, "summer": 2, "autumn": 2, "winter": 3}
    wind = wind_base[season]

    return WeatherInfo(
        city=city,
        temperature=temp,
        feels_like=feels_like,
        condition=condition,
        humidity=humidity,
        wind_level=wind,
        uv_index=uv,
    )


def get_weather(city: str, api_key: str = "") -> WeatherInfo:
    """
    获取城市实况天气。
    优先高德 API → 失败降级到本地模拟数据。
    api_key 可选，不传则使用全局 AMAP_API_KEY。
    """
    result = _fetch_from_amap(city, api_key)
    if result is not None:
        return result
    logger.info(f"降级到模拟天气数据: {city}")
    return _fallback_mock(city)
