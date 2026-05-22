from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.schemas import DailyRecommendRequest, ScenarioRecommendRequest, RecommendResponse
from app.services.recommend import recommend_daily, recommend_scenario

router = APIRouter(prefix="/api/recommend", tags=["recommend"])


@router.post("/daily", response_model=RecommendResponse)
def api_recommend_daily(req: DailyRecommendRequest, db: Session = Depends(get_db)):
    return recommend_daily(db, req)


@router.post("/scenario", response_model=RecommendResponse)
def api_recommend_scenario(req: ScenarioRecommendRequest, db: Session = Depends(get_db)):
    return recommend_scenario(db, req)
