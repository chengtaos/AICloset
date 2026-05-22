from fastapi.testclient import TestClient
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).parent.parent))

from main import app
from app.database import Base, engine

Base.metadata.create_all(bind=engine)

client = TestClient(app)


def _create_item(**kwargs):
    """Helper: create an item and return its id."""
    defaults = {
        "category": "top",
        "sub_category": "T恤",
        "colors": ["白色", "黑色"],
        "brand": "Uniqlo",
        "material": ["棉"],
        "seasons": ["春", "夏"],
        "style_tags": ["休闲", "通勤"],
        "temp_min": 15,
        "temp_max": 35,
        "purchase_price": 99.0,
    }
    defaults.update(kwargs)
    response = client.post("/api/wardrobe/items", json=defaults)
    assert response.status_code == 201
    return response.json()["id"]


def test_health():
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_create_item():
    item_id = _create_item()
    response = client.get(f"/api/wardrobe/items/{item_id}")
    assert response.status_code == 200
    data = response.json()
    assert data["category"] == "top"
    assert data["sub_category"] == "T恤"
    assert data["colors"] == ["白色", "黑色"]


def test_list_items():
    _create_item()
    response = client.get("/api/wardrobe/items")
    assert response.status_code == 200
    assert isinstance(response.json(), list)


def test_get_item():
    item_id = _create_item()
    response = client.get(f"/api/wardrobe/items/{item_id}")
    assert response.status_code == 200
    assert response.json()["id"] == item_id


def test_update_item():
    item_id = _create_item()
    response = client.put(f"/api/wardrobe/items/{item_id}", json={
        "sub_category": "长袖T恤",
        "temp_min": 10,
    })
    assert response.status_code == 200
    assert response.json()["sub_category"] == "长袖T恤"
    assert response.json()["temp_min"] == 10


def test_delete_item():
    item_id = _create_item()
    response = client.delete(f"/api/wardrobe/items/{item_id}")
    assert response.status_code == 204
    response = client.get(f"/api/wardrobe/items/{item_id}")
    assert response.status_code == 404


def test_filter_items():
    _create_item(category="bottom", sub_category="牛仔裤", colors=["蓝色"], seasons=["秋", "冬"], temp_min=0, temp_max=25)
    response = client.get("/api/wardrobe/items?category=bottom")
    assert response.status_code == 200
    for item in response.json():
        assert item["category"] == "bottom"


def test_get_stats():
    _create_item()
    response = client.get("/api/wardrobe/stats")
    assert response.status_code == 200
    data = response.json()
    assert "total_items" in data
    assert "category_distribution" in data
    assert "sleeping_items" in data


def test_record_wear():
    item_id = _create_item()
    response = client.post("/api/wardrobe/wear-records", json={
        "item_ids": [item_id],
        "note": "今天穿这件",
    })
    assert response.status_code == 201
    assert item_id in response.json()["item_ids"]
    # 验证穿着次数增加
    item_resp = client.get(f"/api/wardrobe/items/{item_id}")
    assert item_resp.json()["wear_count"] >= 1


def test_get_wear_history():
    response = client.get("/api/wardrobe/wear-records")
    assert response.status_code == 200
    assert isinstance(response.json(), list)


def test_create_outfit():
    top_id = _create_item()
    bottom_id = _create_item(category="bottom", sub_category="牛仔裤", colors=["蓝色"], temp_min=5, temp_max=30)
    response = client.post("/api/outfits", json={
        "name": "日常通勤",
        "items": [
            {"item_id": top_id, "position": "top"},
            {"item_id": bottom_id, "position": "bottom"},
        ],
        "tags": ["通勤", "休闲"],
    })
    assert response.status_code == 201
    assert response.json()["name"] == "日常通勤"
    assert len(response.json()["items"]) == 2


def test_recommend_daily():
    _create_item()
    _create_item(category="bottom", sub_category="牛仔裤", colors=["蓝色"])
    response = client.post("/api/recommend/daily", json={
        "city": "北京",
        "occasion": "",
    })
    assert response.status_code == 200
    data = response.json()
    assert "weather" in data
    assert "suggestions" in data
    assert len(data["suggestions"]) > 0


def test_recommend_scenario():
    _create_item()
    _create_item(category="bottom", sub_category="牛仔裤", colors=["蓝色"])
    response = client.post("/api/recommend/scenario", json={
        "description": "明天有个面试",
        "city": "上海",
    })
    assert response.status_code == 200
    data = response.json()
    assert len(data["suggestions"]) > 0
