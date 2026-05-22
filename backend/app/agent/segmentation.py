"""
阿里云 服饰分割（SegmentCloth）。

上传衣物图片 → 调用 API 抠出主体 → 保存透明背景 PNG → 返回路径。
"""

import logging
import uuid
from pathlib import Path

import httpx
from alibabacloud_imageseg20191230.client import Client
from alibabacloud_imageseg20191230.models import SegmentClothAdvanceRequest
from alibabacloud_tea_openapi.models import Config
from alibabacloud_tea_util.models import RuntimeOptions

from config import ALIBABA_CLOUD_ACCESS_KEY_ID, ALIBABA_CLOUD_ACCESS_KEY_SECRET

logger = logging.getLogger(__name__)

_client: Client | None = None
UPLOAD_DIR = Path(__file__).parent.parent.parent / "uploads"


def _get_client() -> Client | None:
    global _client
    if not ALIBABA_CLOUD_ACCESS_KEY_ID:
        return None
    if _client is None:
        cfg = Config(
            access_key_id=ALIBABA_CLOUD_ACCESS_KEY_ID,
            access_key_secret=ALIBABA_CLOUD_ACCESS_KEY_SECRET,
            region_id="cn-shanghai",
        )
        _client = Client(cfg)
    return _client


def segment_image(image_path: str) -> str | None:
    """
    对本地图片进行服饰分割，返回抠图后的图片路径。
    失败时返回 None，调用方应降级使用原图。
    """
    client = _get_client()
    if client is None:
        logger.warning("ALIBABA_CLOUD_ACCESS_KEY_ID 未配置，跳过服饰分割")
        return None

    src = Path(image_path)
    if not src.exists():
        logger.warning("分割源文件不存在: %s", image_path)
        return None

    ext = src.suffix.lower()
    if ext not in (".png", ".jpg", ".jpeg", ".bmp"):
        logger.warning("不支持的图片格式: %s", ext)
        return None

    file_size = src.stat().st_size
    if file_size > 3 * 1024 * 1024:
        logger.warning("图片过大(%.1fMB)，跳过分割", file_size / 1024 / 1024)
        return None

    try:
        with open(src, "rb") as f:
            req = SegmentClothAdvanceRequest(
                image_urlobject=f,
                return_form=None,  # 默认返回四通道透明 PNG
            )
            runtime = RuntimeOptions()
            resp = client.segment_cloth_advance(req, runtime)

        data = resp.body.data
        if not data or not data.elements:
            logger.warning("服饰分割返回空结果")
            return None

        result_url = data.elements[0].image_url
        if not result_url:
            logger.warning("服饰分割结果无 image_url")
            return None

        # 下载结果并保存
        dl = httpx.get(result_url, timeout=30)
        dl.raise_for_status()

        dst_name = f"seg_{uuid.uuid4().hex}.png"
        dst_path = UPLOAD_DIR / dst_name
        dst_path.write_bytes(dl.content)

        logger.info("服饰分割成功: %s → %s", src.name, dst_name)
        return f"uploads/{dst_name}"

    except Exception as e:
        logger.error("服饰分割失败: %s", e)
        return None
