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

SYSTEM_PROMPT = """你是一个专业的女性服装分类助手，服务于电子衣橱应用。分析图片中的衣物，返回严格 JSON。

字段说明：
- category: 品类，必须是以下之一：top / bottom / outer / dress / shoes / accessory / bag
- sub_category: 子品类，从对应品类下的选项中选最匹配的：
  上衣(top): T恤、衬衫、卫衣、毛衣、针织衫、背心、吊带、打底衫、雪纺衫、蕾丝衫、一字肩、方领上衣、Polo衫、短款上衣、罩衫、马甲、抹胸、泡泡袖
  下装(bottom): 牛仔裤、西裤、休闲裤、短裤、阔腿裤、半身裙、百褶裙、A字裙、包臀裙、鱼尾裙、伞裙、工装裤、瑜伽裤、骑行裤、喇叭裤、直筒裤、烟管裤、皮短裤、纱裙、缎面裙
  外套(outer): 风衣、西装外套、牛仔外套、皮衣、羽绒服、棉服、大衣、夹克、针织开衫、小香风外套、棒球服、冲锋衣、毛呢大衣、羊羔绒外套、披肩、斗篷、摇粒绒外套、工装外套
  连衣裙(dress): 短袖连衣裙、长袖连衣裙、吊带裙、衬衫裙、茶歇裙、裹身裙、娃娃裙、旗袍、小黑裙、蕾丝裙、缎面裙、针织裙、碎花裙、波点裙、格纹裙、鱼尾连衣裙、抹胸裙、挂脖裙
  鞋子(shoes): 运动鞋、帆布鞋、乐福鞋、高跟鞋、靴子、凉鞋、拖鞋、玛丽珍鞋、穆勒鞋、切尔西靴、过膝靴、老爹鞋、芭蕾舞鞋、厚底鞋、罗马凉鞋、细高跟、粗跟鞋、马丁靴、雪地靴、尖头鞋、方头鞋
  配饰(accessory): 帽子、围巾、手套、腰带、手表、耳环、项链、手链、戒指、发饰、丝巾、墨镜、发箍、胸针、领巾、choker
  包袋(bag): 双肩包、单肩包、手提包、斜挎包、托特包、腋下包、法棍包、水桶包、链条包、帆布包、迷你包、腰包、邮差包、云朵包、草编包、剑桥包、马鞍包
- colors: 颜色数组，从以下选项中选择1-3个最匹配的：白色、黑色、灰色、藏青、卡其色、棕色、米色、燕麦色、奶油白、大象灰、炭灰、红色、粉色、橙色、黄色、绿色、蓝色、紫色、酒红、裸粉、雾霾蓝、牛油果绿、香芋紫、克莱因蓝、勃艮第红、焦糖色、军绿、宝蓝、玫红、珊瑚橘、婴儿蓝、淡紫、鹅黄、条纹、格纹、碎花、波点、豹纹、斑马纹、千鸟格
- style_tags: 风格标签数组，从以下选择2-3个最匹配的：休闲、通勤、运动、甜美、复古、极简、度假、街头、正式、居家、法式、韩系、日系、新中式、老钱风、学院风、辣妹风、纯欲风、Y2K、芭蕾风、静奢风、多巴胺、美拉德、波西米亚、工装风、机车风、Athleisure、Clean Fit、Gorpcore
- seasons: 适用季节数组，从 春/夏/秋/冬 中选择
- material: 材质数组，从以下推测1-2个：棉、麻、羊毛、羊绒、真丝、涤纶、牛仔、皮革、羽绒、棉麻、雪纺、蕾丝、缎面、针织、灯芯绒、天鹅绒、欧根纱、莫代尔、莱赛尔、醋酸、PU、人造皮草、马海毛、府绸、丹宁、麂皮、漆皮
- temp_min / temp_max: 适用温度范围（℃），根据衣物厚薄推测，例如薄T恤15-35、毛衣0-18、羽绒服-10-5

返回格式：
{"category":"top","sub_category":"T恤","colors":["白色"],"style_tags":["休闲","法式"],"seasons":["春","夏"],"material":["棉"],"temp_min":15,"temp_max":35}

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
