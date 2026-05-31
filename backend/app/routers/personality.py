"""人格测试路由：本地题库 + 自建评分。"""
import hashlib
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.database import get_db
from app.models import User, UserProfile
from app.agent.personality_questions import QUESTIONS, score_personality
from app.services.personality import get_style_guidance

router = APIRouter(prefix="/api/personality", tags=["personality"])

# 为题目生成稳定 ID
_QUESTIONS_WITH_ID = []
for _i, _q in enumerate(QUESTIONS):
    _qid = hashlib.sha256(f"{_q['dimension']}:{_q['question']}".encode()).hexdigest()[:16]
    _QUESTIONS_WITH_ID.append({**_q, "id": _qid})


# ── Pydantic 模型 ──

class AnswerItem(BaseModel):
    id: str
    value: int = Field(..., ge=-3, le=3)


class SubmitAnswersRequest(BaseModel):
    answers: list[AnswerItem]
    gender: str = "Other"


class TraitInfo(BaseModel):
    key: str = ""
    label: str = ""
    score: int = 0
    trait: str = ""
    description: str = ""
    snippet: str = ""


class StyleGuidanceOut(BaseModel):
    style_keywords: list[str]
    style_advice: str
    color_hint: str


class PersonalityResultOut(BaseModel):
    nice_name: str
    full_code: str
    snippet: str
    traits: list[TraitInfo] = []
    style_guidance: StyleGuidanceOut
    completed_at: str


# ── 端点 ──

@router.get("/questions")
def get_questions():
    """获取人格测试题目（本地题库）。"""
    return _QUESTIONS_WITH_ID


@router.post("/submit", response_model=PersonalityResultOut)
def submit_test(
    req: SubmitAnswersRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """提交人格测试答案，本地评分后存入用户档案。"""
    if not req.answers:
        raise HTTPException(status_code=422, detail="答案不能为空")

    # 将 frontend 的 id → value 映射为 question_text → value
    id_to_q = {q["id"]: q for q in _QUESTIONS_WITH_ID}
    answer_map: dict[str, int] = {}
    for a in req.answers:
        q = id_to_q.get(a.id)
        if q:
            answer_map[q["question"]] = a.value

    if not answer_map:
        raise HTTPException(status_code=422, detail="无有效答案")

    result = score_personality(answer_map)
    guidance = get_style_guidance(result["fullCode"])

    traits_raw = result.get("traits", [])
    traits_out = [
        TraitInfo(
            key=t.get("key", ""),
            label=t.get("label", ""),
            score=t.get("score", 0),
            trait=t.get("trait", ""),
            description=t.get("description", ""),
            snippet=t.get("snippet", ""),
        )
        for t in traits_raw
    ]

    # 存入数据库
    profile = db.query(UserProfile).filter(UserProfile.user_id == current_user.id).first()
    if not profile:
        profile = UserProfile(user_id=current_user.id)
        db.add(profile)

    profile.personality_test = {
        "nice_name": result["niceName"],
        "full_code": result["fullCode"],
        "snippet": result["snippet"],
        "traits": [t.model_dump() for t in traits_out],
        "style_guidance": guidance,
        "completed_at": datetime.now().isoformat(),
    }
    db.commit()

    return PersonalityResultOut(
        nice_name=result["niceName"],
        full_code=result["fullCode"],
        snippet=result["snippet"],
        traits=traits_out,
        style_guidance=StyleGuidanceOut(**guidance),
        completed_at=profile.personality_test["completed_at"],
    )


@router.get("/result")
def get_existing_result(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """获取用户已有的人格测试结果。未测过返回 null。"""
    profile = db.query(UserProfile).filter(UserProfile.user_id == current_user.id).first()
    if not profile or not profile.personality_test:
        return None

    pt = profile.personality_test
    full_code = pt.get("full_code", "")
    guidance = get_style_guidance(full_code)

    traits_out = [TraitInfo(**t) for t in pt.get("traits", [])]

    return PersonalityResultOut(
        nice_name=pt.get("nice_name", ""),
        full_code=full_code,
        snippet=pt.get("snippet", ""),
        traits=traits_out,
        style_guidance=StyleGuidanceOut(**guidance),
        completed_at=pt.get("completed_at", ""),
    )
