"""人格测试服务：穿搭风格映射 + LLM prompt 格式化。"""
from app.models import UserProfile

# ── 16Personalities 4字母类型 → 穿搭风格映射 ──
PERSONALITY_STYLE_MAP: dict[str, dict] = {
    "INTJ": {
        "style_keywords": ["极简", "结构化", "深色系", "剪裁精良"],
        "style_advice": "你偏好简洁利落的线条和功能性设计，喜欢黑、灰、藏青等理性色系，"
                       "注重面料质感和合身度。推荐剪裁精良的西装外套、直筒裤、简约衬衫。",
        "color_hint": "黑、灰、藏青、白",
    },
    "INTP": {
        "style_keywords": ["舒适", "实用", "叠穿", "中性色"],
        "style_advice": "你注重舒适度和实用性，不追求潮流但有自己的逻辑体系，"
                       "偏好中性色和功能性面料。推荐宽松针织、工装裤、连帽卫衣。",
        "color_hint": "灰、卡其、深蓝、橄榄绿",
    },
    "ENTJ": {
        "style_keywords": ["通勤", "强势", "质感", "经典"],
        "style_advice": "你偏好有气场、显专业的着装，注重品牌调性和整体质感，"
                       "喜欢经典不过时的单品。推荐西装套装、尖领衬衫、质感皮鞋。",
        "color_hint": "黑、白、酒红、深蓝",
    },
    "ENTP": {
        "style_keywords": ["混搭", "趣味", "对比色", "创新"],
        "style_advice": "你喜欢打破常规，善用对比色和非传统搭配方式，"
                       "追求与众不同的视觉效果。推荐撞色单品、设计感配饰、oversized 外套。",
        "color_hint": "亮橙、宝蓝、荧光绿、紫",
    },
    "INFJ": {
        "style_keywords": ["文艺", "质感", "低饱和", "细节"],
        "style_advice": "你偏爱有故事感和氛围感的穿搭，注重材质触感和细节工艺，"
                       "喜欢低饱和度的柔和配色。推荐亚麻衬衫、针织长裙、手工配饰。",
        "color_hint": "燕麦、灰蓝、烟粉、墨绿",
    },
    "INFP": {
        "style_keywords": ["复古", "柔和", "手作感", "独特"],
        "style_advice": "你喜欢有年代感的 Vintage 风格或独立设计师品牌，"
                       "温柔浪漫的配色是你衣橱的主调。推荐古着连衣裙、针织开衫、复古印花。",
        "color_hint": "奶油、薰衣草、焦糖、苔绿",
    },
    "ENFJ": {
        "style_keywords": ["社交", "温暖", "得体", "亲和"],
        "style_advice": "你注重社交场合的得体度，偏好温暖有亲和力的配色和版型，"
                       "善于通过穿搭传递友好感。推荐针织衫、A字裙、柔和色系外套。",
        "color_hint": "暖橘、奶茶、米白、浅蓝",
    },
    "ENFP": {
        "style_keywords": ["多巴胺", "活力", "多变", "有趣"],
        "style_advice": "你喜欢明亮的颜色和有趣的图案，穿搭风格从不无聊，"
                       "乐于尝试各种新趋势。推荐彩色条纹、印花T恤、趣味配饰。",
        "color_hint": "黄、珊瑚粉、天蓝、彩虹色",
    },
    "ISTJ": {
        "style_keywords": ["经典", "保守", "整洁", "规范"],
        "style_advice": "你偏好经过验证的经典搭配，重视整洁度和合身度，"
                       "不追潮流但始终得体。推荐白衬衫、直筒牛仔裤、经典风衣。",
        "color_hint": "白、蓝、卡其、深灰",
    },
    "ISFJ": {
        "style_keywords": ["温柔", "干净", "亲和", "传统"],
        "style_advice": "你喜欢柔和干净的配色和传统优雅的款式，"
                       "注重舒适性和实用性。推荐棉质衬衫、中长裙、软糯针织。",
        "color_hint": "浅粉、淡蓝、米白、浅灰",
    },
    "ESTJ": {
        "style_keywords": ["职业", "干练", "正装", "稳重"],
        "style_advice": "你偏好职业化的着装风格，西装、衬衫、利落裤装是核心单品，"
                       "注重场合着装规范。推荐衬衫+西裤组合、挺括外套、经典皮鞋。",
        "color_hint": "黑、深蓝、白、灰",
    },
    "ESFJ": {
        "style_keywords": ["甜美", "精致", "流行", "女人味"],
        "style_advice": "你关注时尚趋势，偏好精致有女人味的穿搭，"
                       "善于根据场合调整风格。推荐碎花裙、修身针织、精致饰品。",
        "color_hint": "粉色、米色、浅紫、红",
    },
    "ISTP": {
        "style_keywords": ["机能", "工装", "低调", "实用"],
        "style_advice": "你偏好功能性强的工装或户外风格，低调不张扬，"
                       "口袋、拉链、耐用面料是标志元素。推荐工装裤、机能外套、马丁靴。",
        "color_hint": "军绿、黑、深灰、卡其",
    },
    "ISFP": {
        "style_keywords": ["艺术", "色彩感", "个性", "自由"],
        "style_advice": "你有强烈的个人审美，敢于尝试大胆的色彩和廓形，"
                       "穿搭是你表达自我的方式。推荐不对称剪裁、艺术印花、独特配饰。",
        "color_hint": "宝石蓝、紫红、翠绿、金",
    },
    "ESTP": {
        "style_keywords": ["街头", "潮流", "醒目", "自信"],
        "style_advice": "你喜欢引人注目的潮流单品，偏好街头风格和运动元素，"
                       "限量款、联名款对你有吸引力。推荐宽松卫衣、潮流球鞋、机能背包。",
        "color_hint": "红、黑、荧光色、迷彩",
    },
    "ESFP": {
        "style_keywords": ["华丽", "吸睛", "派对", "表现力"],
        "style_advice": "你喜欢成为焦点，偏好华丽或有戏剧感的穿搭，"
                       "亮片、丝绸、大胆剪裁都能驾驭。推荐缎面裙、亮色西装、夸张耳饰。",
        "color_hint": "金、正红、玫红、亮片",
    },
}


def _extract_type_code(full_code: str) -> str:
    """从 'ENFP-T' 或 'ENFP-A' 中提取 4 字母类型码 'ENFP'。"""
    if not full_code:
        return ""
    code = full_code.strip().upper()
    if len(code) >= 4 and code[4:5] == "-":
        return code[:4]
    return code[:4] if len(code) >= 4 else code


def get_style_guidance(full_code: str) -> dict:
    """
    根据 16Personalities 的 full_code（如 'ENFP-T'）返回穿搭风格建议。
    未识别的类型返回中性默认值。
    """
    code = _extract_type_code(full_code)
    if code in PERSONALITY_STYLE_MAP:
        return PERSONALITY_STYLE_MAP[code]

    return {
        "style_keywords": ["简约", "百搭", "舒适"],
        "style_advice": "偏好简约百搭的基础款，注重舒适和实用性。",
        "color_hint": "黑、白、灰、蓝",
    }


# ── LLM Prompt 格式化 ──

def format_personality_for_llm(profile: UserProfile | None) -> str:
    """
    从 UserProfile.personality_test 生成 LLM prompt 段落。
    无需穿着历史即可返回（冷启动友好）。

    返回示例：
    ## 你的穿搭人格
    人格类型：ENFP-T（Campaigner / 竞选者）
    穿搭偏好：多巴胺、活力、多变、有趣
    建议色系：黄、珊瑚粉、天蓝、彩虹色
    穿搭建议：你喜欢明亮的颜色和有趣的图案，穿搭风格从不无聊...
    """
    if not profile or not profile.personality_test:
        return ""

    pt = profile.personality_test
    nice_name = pt.get("nice_name", "")
    full_code = pt.get("full_code", "")

    if not full_code:
        return ""

    guidance = get_style_guidance(full_code)
    keywords_str = "、".join(guidance["style_keywords"])

    return (
        "## 你的穿搭人格\n"
        f"人格类型：{full_code}（{nice_name}）\n"
        f"穿搭偏好：{keywords_str}\n"
        f"建议色系：{guidance['color_hint']}\n"
        f"穿搭建议：{guidance['style_advice']}\n"
        "\n请你显著参考以上穿搭人格信息，优先从衣橱中挑选与用户的风格偏好相符的单品。\n"
    )
