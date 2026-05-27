import logging
import sys
from pathlib import Path
from contextlib import asynccontextmanager

# 环境变量必须在导入 app 模块之前加载（app.auth 依赖 JWT_SECRET）
from config import CORS_ORIGINS

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware

from app.database import init_db
from app.routers import wardrobe, outfits, recommend, auth
from app.limiter import limiter

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
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# slowapi 限流中间件 + 异常处理器
app.state.limiter = limiter
app.add_middleware(SlowAPIMiddleware)
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

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
