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

SYSTEM_PROMPT = """你是一个专业的女性服装分类助手，服务于电子衣橱应用。分析图片中的所有衣物，返回严格 JSON 数组，每件衣物一个对象。

如果图中只有一件衣物，返回长度为1的数组；如果有多件，每个都识别出来；如果不是衣物，返回空数组。

每件衣物的字段说明：
- category: 品类，必须是以下之一：blouse / tshirt / hoodie / sweater / outer / pants / shorts / skirt / dress / shoes / bag / accessory
  品类对照：
  blouse(衬衫/罩衫): 衬衫、罩衫、雪纺衫、蕾丝衫、一字肩、方领上衣、Polo衫、短款上衣
  tshirt(T恤/背心): T恤、背心、吊带、抹胸、打底衫
  hoodie(卫衣): 卫衣、帽衫、运动夹克
  sweater(毛衣/针织): 毛衣、针织衫、羊绒衫、针织开衫
  outer(外套/大衣): 风衣、大衣、羽绒服、棉服、夹克、皮衣、西装外套、牛仔外套
  pants(裤装): 牛仔裤、西裤、休闲裤、阔腿裤、直筒裤、工装裤、瑜伽裤
  shorts(短裤): 牛仔短裤、运动短裤、百慕大短裤
  skirt(半身裙): 半身裙、百褶裙、A字裙、包臀裙、鱼尾裙、伞裙
  dress(连衣裙): 短袖连衣裙、长袖连衣裙、吊带裙、衬衫裙、旗袍
  shoes(鞋靴): 运动鞋、帆布鞋、高跟鞋、靴子、凉鞋、乐福鞋
  bag(包袋): 双肩包、单肩包、手提包、斜挎包、托特包
  accessory(配饰): 帽子、围巾、首饰、腰带、墨镜、丝巾
- sub_category: 子品类，从上面对应品类下的选项中选择最匹配的一个
- colors: 颜色数组，从以下选项中选择1-3个最匹配的：白色、黑色、灰色、藏青、卡其色、棕色、米色、燕麦色、奶油白、大象灰、炭灰、红色、粉色、橙色、黄色、绿色、蓝色、紫色、酒红、裸粉、雾霾蓝、牛油果绿、香芋紫、克莱因蓝、勃艮第红、焦糖色、军绿、宝蓝、玫红、珊瑚橘、婴儿蓝、淡紫、鹅黄、条纹、格纹、碎花、波点、豹纹、斑马纹、千鸟格
- style_tags: 风格标签数组，从以下选择2-3个最匹配的：休闲、通勤、运动、甜美、复古、极简、度假、街头、正式、居家、法式、韩系、日系、新中式、老钱风、学院风、辣妹风、纯欲风、Y2K、芭蕾风、静奢风、多巴胺、美拉德、波西米亚、工装风、机车风、Athleisure、Clean Fit、Gorpcore
- seasons: 适用季节数组，从 春/夏/秋/冬 中选择
- material: 材质数组，从以下推测1-2个：棉、麻、羊毛、羊绒、真丝、涤纶、牛仔、皮革、羽绒、棉麻、雪纺、蕾丝、缎面、针织、灯芯绒、天鹅绒、欧根纱、莫代尔、莱赛尔、醋酸、PU、人造皮草、马海毛、府绸、丹宁、麂皮、漆皮
- temp_min / temp_max: 适用温度范围（℃），根据衣物厚薄推测，例如薄T恤15-35、毛衣0-18、羽绒服-10-5

返回格式（JSON 数组）：
[{"category":"tshirt","sub_category":"T恤","colors":["白色"],"style_tags":["休闲","法式"],"seasons":["春","夏"],"material":["棉"],"temp_min":15,"temp_max":35}]

只返回 JSON 数组，不要其他内容。"""


def _get_client(api_key: str = "") -> OpenAI | None:
    """获取视觉识别客户端。优先使用用户 Key，其次全局配置。"""
    key = api_key or DASHSCOPE_API_KEY
    if not key:
        return None
    if api_key:
        return OpenAI(api_key=key, base_url=DASHSCOPE_BASE_URL)
    global _client
    if _client is None:
        _client = OpenAI(api_key=key, base_url=DASHSCOPE_BASE_URL)
    return _client


def classify_image(image_path: str, api_key: str = "") -> list[dict] | None:
    """
    识别图片中的所有衣物，返回分类 dict 列表。
    失败返回 None。
    api_key 可选，不传则使用全局 DASHSCOPE_API_KEY。
    """
    client = _get_client(api_key)
    if client is None:
        logger.warning("DASHSCOPE_API_KEY 未配置")
        return None

    try:
        with open(image_path, "rb") as f:
            image_data = base64.b64encode(f.read()).decode("utf-8")

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
                        {"type": "text", "text": "识别图片中的所有衣物"},
                    ],
                },
            ],
            max_tokens=800,
            temperature=0.1,
        )

        content = response.choices[0].message.content or ""
        content = content.strip()
        if content.startswith("```"):
            content = content.split("\n", 1)[-1]
            if content.endswith("```"):
                content = content[:-3]

        results = json.loads(content)

        if not isinstance(results, list):
            logger.warning("模型返回非数组格式，尝试包装")
            if isinstance(results, dict):
                results = [results]
            else:
                return None

        # 类型校验
        valid_categories = {"blouse", "tshirt", "hoodie", "sweater", "outer", "pants", "shorts", "skirt", "dress", "shoes", "bag", "accessory"}
        valid = [r for r in results if isinstance(r, dict) and r.get("category") in valid_categories]

        if not valid:
            logger.warning("模型返回无有效品类: %s", results)
            return None

        logger.info("Qwen-VL 识别成功: %d 件衣物", len(valid))
        return valid

    except Exception as e:
        logger.error("视觉识别失败: %s", e)
        return None
