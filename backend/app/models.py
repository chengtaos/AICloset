import json
from datetime import datetime, date
from sqlalchemy import Column, Integer, String, Float, Date, DateTime, Text, JSON, func
from app.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, autoincrement=True)
    phone = Column(String(20), unique=True, nullable=False, index=True)
    nickname = Column(String(50), default="")
    password_hash = Column(String(255), nullable=False)
    token_version = Column(Integer, default=0)  # 改密码时 +1，使旧 token 失效
    avatar = Column(String(255), default="")
    created_at = Column(DateTime, default=func.now())


class ClothingItem(Base):
    __tablename__ = "clothing_items"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, nullable=False, index=True)
    name = Column(String(100), default="")            # 用户自定义名称
    category = Column(String(20), nullable=False)  # blouse, tshirt, hoodie, sweater, outer, pants, shorts, skirt, dress, shoes, bag, accessory
    sub_category = Column(String(30), nullable=False)
    colors = Column(JSON, default=list)         # ["白色", "黑色"]
    brand = Column(String(50), default="")
    material = Column(JSON, default=list)        # ["棉", "涤纶"]
    seasons = Column(JSON, default=list)         # ["春", "夏"]
    style_tags = Column(JSON, default=list)      # ["休闲", "通勤"]
    temp_min = Column(Integer, default=0)
    temp_max = Column(Integer, default=40)
    images = Column(JSON, default=list)          # ["uploads/abc.jpg"]
    purchase_date = Column(Date, nullable=True)
    purchase_price = Column(Float, default=0.0)
    status = Column(String(15), default="available")  # available, laundry, archived
    wear_count = Column(Integer, default=0)
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())


class Outfit(Base):
    __tablename__ = "outfits"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, nullable=False, index=True)
    name = Column(String(100), default="")
    items = Column(JSON, default=list)
    # [{"item_id": 1, "position": "upper"}, {"item_id": 2, "position": "lower"}]
    tags = Column(JSON, default=list)            # ["通勤", "休闲"]
    is_ai_generated = Column(Integer, default=0)
    created_at = Column(DateTime, default=func.now())


class WearRecord(Base):
    __tablename__ = "wear_records"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, nullable=False, index=True)
    outfit_id = Column(Integer, nullable=True)
    item_ids = Column(JSON, default=list)        # 直接穿的散件
    wear_date = Column(Date, default=func.current_date(), index=True)
    photo_url = Column(String(255), default="")
    note = Column(String(200), default="")


class Recommendation(Base):
    __tablename__ = "recommendations"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, nullable=False)
    type = Column(String(20), nullable=False)    # daily, scenario
    context = Column(JSON, default=dict)          # weather, occasion etc.
    result = Column(JSON, default=dict)           # suggested outfits
    feedback = Column(String(10), default="neutral")  # liked, disliked, neutral
    created_at = Column(DateTime, default=func.now())


class UserProfile(Base):
    """多级记忆用户偏好档案。

    L2 短期偏好（14天滑动窗口，7天半衰期）
    L3 长期档案（春夏秋冬独立偏好向量，90天半衰期）
    L4 关系记忆（物品共现对 + 品类搭配模式）
    """
    __tablename__ = "user_profiles"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, unique=True, nullable=False, index=True)

    # ── V1 字段（保留兼容，不再写入）──
    style_counts = Column(JSON, default=dict)
    color_counts = Column(JSON, default=dict)
    category_counts = Column(JSON, default=dict)
    item_affinity = Column(JSON, default=dict)
    learned_temp_min = Column(Integer, nullable=True)
    learned_temp_max = Column(Integer, nullable=True)

    # ── L2: 短期偏好（14天滑动窗口）──
    short_term_styles = Column(JSON, default=dict)     # {"休闲": 3, "法式": 2}
    short_term_colors = Column(JSON, default=dict)     # {"黑色": 4, "白色": 2}
    short_term_categories = Column(JSON, default=dict) # {"tshirt": 3, "pants": 3}
    short_term_updated = Column(DateTime, nullable=True)

    # ── L3: 长期档案（季节感知）──
    # {"春": {"休闲": 15,...}, "夏": {...}, "秋": {...}, "冬": {...}}
    seasonal_styles = Column(JSON, default=dict)
    seasonal_colors = Column(JSON, default=dict)
    seasonal_categories = Column(JSON, default=dict)
    # 季节 × 温度舒适区间: {"春": [10, 25], "夏": [22, 35], ...}
    seasonal_temp = Column(JSON, default=dict)
    # 每个季节上次更新时间: {"春": "2026-03-15T10:00:00", ...}
    seasonal_updated = Column(JSON, default=dict)
    # 场合偏好: {"通勤": {"styles": {...}, "categories": {...}}, ...}
    occasion_prefs = Column(JSON, default=dict)

    # ── L4: 关系记忆 ──
    item_pairs = Column(JSON, default=dict)       # {"1_3": 5, "2_4": 3}
    category_pairs = Column(JSON, default=dict)   # {"tshirt_jeans": 10}

    # ── 用户自备 API Key（加密存储）──
    user_api_keys = Column(JSON, default=dict)  # {"deepseek": "enc_xxx", "amap": "enc_xxx", ...}

    # ── 风格画像缓存 ──
    style_portrait_hash = Column(String(64), nullable=True)
    style_portrait_image = Column(String(255), nullable=True)

    # ── 人格测试结果 ──
    personality_test = Column(JSON, default=dict)

    # ── 元信息 ──
    disliked_items = Column(JSON, default=list)
    total_wear_events = Column(Integer, default=0)
    l2_event_count = Column(Integer, default=0)
    l3_event_count = Column(Integer, default=0)
    l4_event_count = Column(Integer, default=0)
    last_updated = Column(DateTime, default=func.now(), onupdate=func.now())
    last_decay_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=func.now())
