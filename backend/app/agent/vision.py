"""
Qwen-VL 衣物视觉识别。

拍照上传 → 图片转 base64 → Qwen-VL 识别 → 返回结构化分类结果。
"""

import base64
import json
import logging
from openai import OpenAI
from config import DASHSCOPE_API_KEY, DASHSCOPE_BASE_URL, DASHSCOPE_VISION_MODEL

logger = logging.getLogger(__name__)

_client: OpenAI | None = None

SYSTEM_PROMPT = """你是一个专业的服装分类助手。分析图片中的衣物，返回严格 JSON。

字段说明：
- category: 品类，必须是以下之一：top / bottom / outer / dress / shoes / accessory / bag
- sub_category: 子品类，如 T恤、牛仔裤、风衣、运动鞋 等
- colors: 颜色数组，如 ["白色","黑色"]
- style_tags: 风格标签数组，从以下选择2-3个最匹配的：休闲、通勤、运动、甜美、复古、极简、度假、街头、正式、居家
- seasons: 适用季节数组，从 春/夏/秋/冬 中选择
- material: 材质数组，从以下推测：棉、麻、羊毛、羊绒、真丝、涤纶、牛仔、皮革、羽绒、棉麻、雪纺
- temp_min / temp_max: 适用温度范围（℃），根据衣物厚薄推测

返回格式：
{"category":"top","sub_category":"T恤","colors":["白色"],"style_tags":["休闲","通勤"],"seasons":["春","夏"],"material":["棉"],"temp_min":15,"temp_max":35}

只返回 JSON，不要其他内容。"""


def _get_client() -> OpenAI | None:
    global _client
    if not DASHSCOPE_API_KEY:
        return None
    if _client is None:
        _client = OpenAI(api_key=DASHSCOPE_API_KEY, base_url=DASHSCOPE_BASE_URL)
    return _client


def classify_image(image_path: str) -> dict | None:
    """
    识别图片中的衣物，返回分类 dict。
    失败返回 None。
    """
    client = _get_client()
    if client is None:
        logger.warning("DASHSCOPE_API_KEY 未配置")
        return None

    try:
        with open(image_path, "rb") as f:
            image_data = base64.b64encode(f.read()).decode("utf-8")

        # 判断图片类型
        ext = image_path.lower().rsplit(".", 1)[-1]
        mime = f"image/{'jpeg' if ext == 'jpg' else ext}"

        logger.info("调用 Qwen-VL 识别: %s", image_path)

        response = client.chat.completions.create(
            model=DASHSCOPE_VISION_MODEL,
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "image_url",
                            "image_url": {"url": f"data:{mime};base64,{image_data}"},
                        },
                        {"type": "text", "text": "识别这件衣物"},
                    ],
                },
            ],
            max_tokens=500,
            temperature=0.1,
        )

        content = response.choices[0].message.content or ""
        # 去掉可能的 markdown 代码块包装
        content = content.strip()
        if content.startswith("```"):
            content = content.split("\n", 1)[-1]
            if content.endswith("```"):
                content = content[:-3]

        result = json.loads(content)

        # 类型校验
        valid_categories = {"top", "bottom", "outer", "dress", "shoes", "accessory", "bag"}
        if result.get("category") not in valid_categories:
            logger.warning("模型返回无效品类: %s", result.get("category"))
            return None

        logger.info("Qwen-VL 识别成功: %s %s", result.get("category"), result.get("sub_category"))
        return result

    except Exception as e:
        logger.error("视觉识别失败: %s", e)
        return None
