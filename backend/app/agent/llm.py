"""
DeepSeek LLM 穿搭推荐客户端。

Phase 2：接收规则引擎粗筛后的候选衣物 + 天气/场合上下文，
由 LLM 完成搭配选择 + 推荐理由生成。
"""

import json
import logging
from openai import OpenAI
from app.models import ClothingItem
from app.schemas import WeatherInfo
from config import DEEPSEEK_API_KEY, DEEPSEEK_BASE_URL, DEEPSEEK_MODEL

logger = logging.getLogger(__name__)

_client: OpenAI | None = None


def _get_client(api_key: str = "") -> OpenAI | None:
    """获取 LLM 客户端。优先使用用户 Key，其次全局配置。"""
    key = api_key or DEEPSEEK_API_KEY
    if not key:
        return None
    if api_key:
        # 用户自定义 Key，每次新建（不缓存）
        return OpenAI(api_key=key, base_url=DEEPSEEK_BASE_URL)
    global _client
    if _client is None:
        _client = OpenAI(api_key=key, base_url=DEEPSEEK_BASE_URL)
    return _client


SYSTEM_PROMPT = """你是一位专业的时尚造型师，了解用户的穿搭历史和偏好。用户会提供：
1. 当日天气信息
2. 穿搭场合
3. 用户的穿搭记忆（近期偏好、季节偏好、经典搭配）
4. 衣橱中可选的衣物列表（每件有id、品类、颜色、风格等属性）

请根据天气、场合和用户的穿搭记忆，从候选衣物中挑选并搭配出 3 套完整的穿搭方案。

要求：
- 颜色搭配协调，风格统一
- 考虑天气因素（温度决定厚薄，雨雪天避免浅色下装和不耐水材质，大风天建议防风外套）
- 每套搭配必须包含上衣(blouse/tshirt/hoodie/sweater/outer)或连衣裙(dress)和下装(pants/shorts/skirt)，根据天气决定是否需要外套(outer)和鞋子(shoes)
- 优先选择连衣裙+外套的组合（如果候选中有连衣裙）
- 推荐理由需具体说明配色逻辑和场合适配性，自然有温度，不要模板化的套话
- 尽量避免连续选择相同品类（如不要三套都是T恤+牛仔裤）
- 如果用户有穿搭记忆，优先参考其近期偏好和季节偏好，特别是经典搭配中的组合
- 避免推荐用户明确不喜欢的衣物

返回严格的 JSON 格式，不要包含 markdown 代码块标记：
{
  "suggestions": [
    {
      "item_ids": [3, 7, 12],
      "reason": "推荐理由..."
    }
  ]
}"""


CAPSULE_SYSTEM_PROMPT = """你是一位专业的旅行打包顾问。用户要去旅行，会提供：
1. 目的地、天数、场合
2. 衣橱中所有可用的衣物列表（每件有id、品类、颜色、风格等属性）

请设计一个旅行胶囊衣橱方案，核心原则：
- 用最少件数搭配出最多套方案
- 优先选择百搭基础款（黑/白/灰/卡其色系）
- 每件上衣至少能和2-3件下装搭配
- 鞋子不超过2双
- 考虑目的地的典型天气

返回严格的 JSON 格式：
{
  "items": [1, 2, 3, ...],
  "outfits": [
    {"day": 1, "item_ids": [3, 7], "occasion": "通勤", "reason": "..."}
  ],
  "packing_tip": "打包小贴士..."
}"""


def generate_recommendations(
    candidates: dict[str, list[ClothingItem]],
    weather: WeatherInfo,
    occasion: str = "",
    limit: int = 3,
    preferences_text: str = "",
    api_key: str = "",
) -> list[dict]:
    """
    调用 DeepSeek API 生成穿搭建议。
    preferences_text 为偏好引擎生成的用户偏好段落，空字符串表示冷启动。
    api_key 可选，不传则使用全局 DEEPSEEK_API_KEY。
    失败时返回空列表，上游应 fallback 到规则引擎。
    """
    client = _get_client(api_key)
    if client is None:
        logger.warning("DEEPSEEK_API_KEY 未配置，跳过 LLM 推荐")
        return []

    # ── 构建候选衣物列表 ──
    item_lines: list[str] = []
    for cat, items in candidates.items():
        for it in items:
            parts = [
                f"  id={it.id}",
                f"品类={it.category}/{it.sub_category}",
                f"颜色={'+'.join(it.colors or ['未知'])}",
                f"风格={'+'.join(it.style_tags or ['百搭'])}",
                f"材质={'+'.join(it.material or ['未知'])}",
                f"适用{it.temp_min}~{it.temp_max}°C",
            ]
            item_lines.append(" | ".join(parts))

    if not item_lines:
        return []

    items_text = "\n".join(item_lines)

    occasion_text = f"场合：{occasion}" if occasion else "场合：日常出行"

    pref_section = f"\n{preferences_text}\n" if preferences_text else ""

    user_message = f"""天气：{weather.city}，{weather.condition}，气温{weather.temperature}°C（体感{weather.feels_like}°C），湿度{weather.humidity}%，风力{weather.wind_level}级，紫外线指数{weather.uv_index}
{occasion_text}
{pref_section}
可选衣物：
{items_text}

请推荐 {limit} 套穿搭方案。"""

    try:
        total_candidates = sum(len(v) for v in candidates.values())
        logger.info("调用 DeepSeek API: 候选%d件 → 请求%d套搭配", total_candidates, limit)

        response = client.chat.completions.create(
            model=DEEPSEEK_MODEL,
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": user_message},
            ],
            temperature=0.8,
            max_tokens=1500,
            response_format={"type": "json_object"},
        )

        usage = response.usage
        if usage:
            logger.info(
                "LLM 返回: prompt=%d tokens, completion=%d tokens, total=%d",
                usage.prompt_tokens, usage.completion_tokens, usage.total_tokens,
            )

        content = response.choices[0].message.content
        if not content:
            logger.warning("LLM 返回空内容")
            return []

        data = json.loads(content)
        raw_suggestions = data.get("suggestions", [])

        # ── 验证并解析结果 ──
        valid_ids = {it.id for items in candidates.values() for it in items}
        result = []
        for s in raw_suggestions:
            item_ids = s.get("item_ids", [])
            reason = s.get("reason", "")
            valid = [iid for iid in item_ids if iid in valid_ids]
            if valid:
                result.append({"item_ids": valid, "reason": str(reason)})

        logger.info("LLM 有效推荐: %d套 / %d套", len(result), len(raw_suggestions))
        return result

    except Exception as e:
        logger.error(f"LLM 调用失败: {e}")
        return []


def generate_capsule(
    all_items: list[ClothingItem],
    destination: str,
    days: int,
    occasions: str = "",
    api_key: str = "",
) -> dict | None:
    """调用 DeepSeek API 生成旅行胶囊衣橱方案。失败时返回 None。"""
    client = _get_client(api_key)
    if client is None:
        logger.warning("DEEPSEEK_API_KEY 未配置，无法生成胶囊衣橱")
        return None

    item_lines: list[str] = []
    for it in all_items:
        parts = [
            f"  id={it.id}",
            f"品类={it.category}/{it.sub_category}",
            f"颜色={'+'.join(it.colors or ['未知'])}",
            f"风格={'+'.join(it.style_tags or ['百搭'])}",
            f"适用{it.temp_min}~{it.temp_max}°C",
        ]
        item_lines.append(" | ".join(parts))

    items_text = "\n".join(item_lines)
    occasion_text = f"场合需求：{occasions}" if occasions else "场合需求：日常出行 + 休闲"

    user_message = f"""目的地：{destination}
旅行天数：{days} 天
{occasion_text}

衣橱中所有可用衣物：
{items_text}

请设计一个 {days} 天的旅行胶囊衣橱，用最少件数搭配最多方案。"""

    try:
        response = client.chat.completions.create(
            model=DEEPSEEK_MODEL,
            messages=[
                {"role": "system", "content": CAPSULE_SYSTEM_PROMPT},
                {"role": "user", "content": user_message},
            ],
            temperature=0.7,
            max_tokens=2000,
            response_format={"type": "json_object"},
        )

        content = response.choices[0].message.content
        if not content:
            return None

        data = json.loads(content)
        return data

    except Exception as e:
        logger.error(f"胶囊衣橱 LLM 调用失败: {e}")
        return None
