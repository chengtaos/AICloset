import logging
import sys
from pathlib import Path
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.database import init_db
from app.routers import wardrobe, outfits, recommend, auth

# ── 日志配置 ──
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-7s  %(name)-25s  %(message)s",
    datefmt="%H:%M:%S",
    stream=sys.stdout,
)
# 项目模块详细日志
logging.getLogger("app.agent").setLevel(logging.DEBUG)
logging.getLogger("app.services").setLevel(logging.DEBUG)
# 第三方库保持 WARNING，避免噪音
logging.getLogger("httpx").setLevel(logging.WARNING)
logging.getLogger("httpcore").setLevel(logging.WARNING)
logging.getLogger("openai").setLevel(logging.WARNING)
logging.getLogger("urllib3").setLevel(logging.WARNING)
logging.getLogger("asyncio").setLevel(logging.WARNING)


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    logging.getLogger(__name__).info("数据库已初始化，日志系统就绪")
    yield


app = FastAPI(title="AiCloset API", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 静态文件 — 图片访问
uploads_dir = Path(__file__).parent / "uploads"
uploads_dir.mkdir(exist_ok=True)
app.mount("/uploads", StaticFiles(directory=str(uploads_dir)), name="uploads")

app.include_router(auth.router)
app.include_router(wardrobe.router)
app.include_router(outfits.router)
app.include_router(recommend.router)


@app.get("/api/health")
def health():
    return {"status": "ok"}
