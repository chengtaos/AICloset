from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Recommendation
from app.schemas import (
    DailyRecommendRequest,
    ScenarioRecommendRequest,
    RecommendResponse,
    RecommendationFeedback,
)
from app.services.preferences import update_preferences_on_wear, suppress_items_in_preferences
from app.services.recommend import recommend_daily, recommend_scenario

router = APIRouter(prefix="/api/recommend", tags=["recommend"])


@router.post("/daily", response_model=RecommendResponse)
def api_recommend_daily(req: DailyRecommendRequest, db: Session = Depends(get_db)):
    return recommend_daily(db, req)


@router.post("/scenario", response_model=RecommendResponse)
def api_recommend_scenario(req: ScenarioRecommendRequest, db: Session = Depends(get_db)):
    return recommend_scenario(db, req)


@router.post("/{recommendation_id}/feedback")
def api_submit_feedback(
    recommendation_id: int,
    fb: RecommendationFeedback,
    db: Session = Depends(get_db),
):
    """对推荐结果提交反馈：liked 增强偏好，disliked 屏蔽相关衣物。"""
    rec = db.query(Recommendation).filter(Recommendation.id == recommendation_id).first()
    if not rec:
        raise HTTPException(status_code=404, detail="推荐记录不存在")
    rec.feedback = fb.feedback
    db.commit()

    # 从推荐结果中提取所有被推荐的物品 ID（兼容新旧格式）
    item_ids: list[int] = []
    for s in (rec.result.get("suggestions", []) if rec.result else []):
        for item in s.get("items", []):
            if isinstance(item, dict):
                item_ids.append(item["id"])
            elif isinstance(item, int):
                item_ids.append(item)

    if fb.feedback == "liked" and item_ids:
        update_preferences_on_wear(db, rec.user_id, item_ids)
    elif fb.feedback == "disliked" and item_ids:
        suppress_items_in_preferences(db, rec.user_id, item_ids)

    return {"status": "ok"}
