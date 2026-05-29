"""
DashScope 图像生成（qwen-image-2.0-pro）。

根据风格人格描述生成简约动漫风格人物画像。
"""

import base64
import logging
import httpx
from config import DASHSCOPE_API_KEY

logger = logging.getLogger(__name__)

DASHSCOPE_IMAGE_URL = "https://dashscope.aliyuncs.com/api/v1/services/aigc/image-generation/generation"
DASHSCOPE_IMAGE_MODEL = "qwen-image-2.0-pro"


def _build_portrait_prompt(archetype_name: str, archetype_desc: str, top_colors: list[str], top_tags: list[str], style_trend: int, color_bold: int, complexity: int, expression: int) -> str:
    """根据风格画像构建生图 prompt。"""
    color_desc = "、".join(top_colors[:3]) if top_colors else "黑白灰"
    tag_desc = "、".join(top_tags[:3]) if top_tags else "简约"

    # 维度描述
    style_side = "潮流前卫" if style_trend >= 50 else "经典优雅"
    color_side = "大胆多彩" if color_bold >= 50 else "沉稳克制"
    complexity_side = "层次丰富" if complexity >= 50 else "简约利落"
    expression_side = "个性鲜明" if expression >= 50 else "实用内敛"

    return (
        f"一个{archetype_name}风格的动漫人物半身像，"
        f"风格关键词：{style_side}、{color_side}、{complexity_side}、{expression_side}，"
        f"主色调为{color_desc}，穿搭元素参考{tag_desc}，"
        f"简约日系动漫风格，柔和光影，干净的线条，纯色柔光背景，"
        f"正面或微侧，上半身构图，时尚插画感，"
        f"精致五官，自然表情，不写实不夸张，高级感"
    )


async def generate_style_portrait(
    archetype_name: str,
    archetype_desc: str,
    top_colors: list[str],
    top_tags: list[str],
    style_trend: int,
    color_bold: int,
    complexity: int,
    expression: int,
    api_key: str = "",
) -> bytes | None:
    """
    调用 DashScope qwen-image-2.0-pro 生成动漫画像。
    api_key 可选，不传则使用全局 DASHSCOPE_API_KEY。
    成功返回图片 bytes，失败返回 None。
    """
    key = api_key or DASHSCOPE_API_KEY
    if not key:
        logger.warning("DASHSCOPE_API_KEY 未配置，无法生成画像")
        return None

    prompt = _build_portrait_prompt(
        archetype_name, archetype_desc, top_colors, top_tags,
        style_trend, color_bold, complexity, expression,
    )
    logger.info("生图 prompt: %s", prompt)

    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            resp = await client.post(
                DASHSCOPE_IMAGE_URL,
                json={
                    "model": DASHSCOPE_IMAGE_MODEL,
                    "input": {"prompt": prompt},
                    "parameters": {"size": "768*768", "n": 1},
                },
                headers={
                    "Authorization": f"Bearer {key}",
                    "Content-Type": "application/json",
                },
            )
            resp.raise_for_status()
            data = resp.json()
    except httpx.HTTPError as e:
        logger.error("图像生成 HTTP 请求失败: %s", e)
        return None
    except Exception as e:
        logger.error("图像生成请求异常: %s", e)
        return None

    # DashScope 返回格式: {"output": {"results": [{"url": "..."}]}}
    # 也可能是 base64: {"output": {"results": [{"b64_image": "..."}]}}
    try:
        results = data.get("output", {}).get("results", [])
        if not results:
            logger.warning("图像生成返回空结果: %s", data)
            return None

        result = results[0]

        # 优先取 URL
        url = result.get("url", "")
        if url:
            logger.info("下载生成图片: %s", url[:80])
            try:
                async with httpx.AsyncClient(timeout=30.0) as client:
                    img_resp = await client.get(url)
                    img_resp.raise_for_status()
                    return img_resp.content
            except Exception as e:
                logger.error("下载生成图片失败: %s", e)
                return None

        # 备选：base64
        b64 = result.get("b64_image", "") or result.get("image", "")
        if b64:
            logger.info("解码 base64 图片 (%d chars)", len(b64))
            return base64.b64decode(b64)

        logger.warning("未知的返回格式: %s", result)
        return None
    except Exception as e:
        logger.error("解析生成结果失败: %s", e)
        return None
