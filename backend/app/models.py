import json
from datetime import datetime, date
from sqlalchemy import Column, Integer, String, Float, Date, DateTime, Text, JSON, func
from app.database import Base


class ClothingItem(Base):
    __tablename__ = "clothing_items"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, default=1, nullable=False, index=True)
    category = Column(String(20), nullable=False)  # top, bottom, outer, dress, shoes, accessory, bag
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
    user_id = Column(Integer, default=1, nullable=False, index=True)
    name = Column(String(100), default="")
    items = Column(JSON, default=list)
    # [{"item_id": 1, "position": "top"}, {"item_id": 2, "position": "bottom"}]
    tags = Column(JSON, default=list)            # ["通勤", "休闲"]
    is_ai_generated = Column(Integer, default=0)
    created_at = Column(DateTime, default=func.now())


class WearRecord(Base):
    __tablename__ = "wear_records"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, default=1, nullable=False, index=True)
    outfit_id = Column(Integer, nullable=True)
    item_ids = Column(JSON, default=list)        # 直接穿的散件
    wear_date = Column(Date, default=func.current_date(), index=True)
    photo_url = Column(String(255), default="")
    note = Column(String(200), default="")


class Recommendation(Base):
    __tablename__ = "recommendations"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, default=1, nullable=False)
    type = Column(String(20), nullable=False)    # daily, scenario
    context = Column(JSON, default=dict)          # weather, occasion etc.
    result = Column(JSON, default=dict)           # suggested outfits
    feedback = Column(String(10), default="neutral")  # liked, disliked, neutral
    created_at = Column(DateTime, default=func.now())
