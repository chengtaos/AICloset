from datetime import date, datetime
from typing import Optional
from pydantic import BaseModel, Field


# ── ClothingItem ──────────────────────────────────────────────

class ClothingItemCreate(BaseModel):
    name: str = ""
    category: str
    sub_category: str
    colors: list[str] = []
    brand: str = ""
    material: list[str] = []
    seasons: list[str] = []
    style_tags: list[str] = []
    temp_min: int = 0
    temp_max: int = 40
    purchase_date: Optional[date] = None
    purchase_price: float = 0.0
    status: str = "available"
    image_path: Optional[str] = None


class ClothingItemUpdate(BaseModel):
    name: Optional[str] = None
    category: Optional[str] = None
    sub_category: Optional[str] = None
    colors: Optional[list[str]] = None
    brand: Optional[str] = None
    material: Optional[list[str]] = None
    seasons: Optional[list[str]] = None
    style_tags: Optional[list[str]] = None
    temp_min: Optional[int] = None
    temp_max: Optional[int] = None
    purchase_date: Optional[date] = None
    purchase_price: Optional[float] = None
    status: Optional[str] = None


class ClothingItemResponse(BaseModel):
    id: int
    user_id: int
    name: str
    category: str
    sub_category: str
    colors: list[str]
    brand: str
    material: list[str]
    seasons: list[str]
    style_tags: list[str]
    temp_min: int
    temp_max: int
    images: list[str]
    purchase_date: Optional[date]
    purchase_price: float
    status: str
    wear_count: int
    last_worn_date: Optional[date] = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class ClothingItemBrief(BaseModel):
    """Brief item info used inside outfit/recommendation responses."""
    id: int
    name: str
    category: str
    sub_category: str
    colors: list[str]
    images: list[str]
    style_tags: list[str]

    model_config = {"from_attributes": True}


# ── Outfit ────────────────────────────────────────────────────

class OutfitItem(BaseModel):
    item_id: int
    position: str  # top, bottom, outer, shoes, accessory


class OutfitCreate(BaseModel):
    name: str = ""
    items: list[OutfitItem]
    tags: list[str] = []


class OutfitUpdate(BaseModel):
    name: Optional[str] = None
    items: Optional[list[OutfitItem]] = None
    tags: Optional[list[str]] = None


class OutfitResponse(BaseModel):
    id: int
    user_id: int
    name: str
    items: list[OutfitItem]
    tags: list[str]
    is_ai_generated: bool
    created_at: datetime

    model_config = {"from_attributes": True}


# ── WearRecord ────────────────────────────────────────────────

class WearRecordCreate(BaseModel):
    outfit_id: Optional[int] = None
    item_ids: list[int] = []
    wear_date: Optional[date] = None
    note: str = ""


class WearRecordResponse(BaseModel):
    id: int
    user_id: int
    outfit_id: Optional[int]
    item_ids: list[int]
    wear_date: date
    photo_url: str
    note: str

    model_config = {"from_attributes": True}


# ── Recommendation ────────────────────────────────────────────

class DailyRecommendRequest(BaseModel):
    city: str = "北京"
    occasion: str = ""


class ScenarioRecommendRequest(BaseModel):
    description: str
    city: str = "北京"


class WeatherInfo(BaseModel):
    city: str
    temperature: int
    feels_like: int
    condition: str       # 晴, 阴, 雨, 雪
    humidity: int
    wind_level: int
    uv_index: int


class RecommendSuggestion(BaseModel):
    items: list[ClothingItemBrief]
    reason: str


class RecommendResponse(BaseModel):
    recommendation_id: int
    weather: WeatherInfo
    suggestions: list[RecommendSuggestion]


class RecommendationFeedback(BaseModel):
    feedback: str  # "liked" or "disliked"


# ── User Profile ────────────────────────────────────────────────

class ProfileUpdate(BaseModel):
    nickname: Optional[str] = None


class PasswordChange(BaseModel):
    old_password: str
    new_password: str


class ProfileResponse(BaseModel):
    id: int
    phone: str
    nickname: str
    avatar: str

    model_config = {"from_attributes": True}


# ── Stats ─────────────────────────────────────────────────────

class CategoryStat(BaseModel):
    category: str
    count: int


class WardrobeStats(BaseModel):
    total_items: int
    total_value: float
    category_distribution: list[CategoryStat]
    color_distribution: list[CategoryStat]
    most_worn: list[ClothingItemBrief]
    sleeping_items: list[ClothingItemBrief]  # 从未穿过的
