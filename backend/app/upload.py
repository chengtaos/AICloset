"""图片上传校验：大小、格式、魔数（防扩展名伪造）。"""

from fastapi import UploadFile, HTTPException
from config import MAX_UPLOAD_SIZE_MB, ALLOWED_IMAGE_TYPES

_EXT_TO_MIME: dict[str, str] = {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".webp": "image/webp",
}

# 文件头魔数校验 — 防止将 .exe 改名为 .jpg 绕过扩展名检查
_MAGIC_BYTES: dict[str, bytes] = {
    "image/jpeg": b"\xff\xd8\xff",
    "image/png": b"\x89PNG\r\n\x1a\n",
    "image/webp": b"RIFF",
}


async def validate_image(file: UploadFile) -> None:
    # 1. 扩展名白名单
    if not file.filename:
        raise HTTPException(status_code=400, detail="文件名不能为空")

    ext = file.filename.rsplit(".", 1)[-1].lower() if "." in file.filename else ""
    expected_mime = _EXT_TO_MIME.get(f".{ext}")
    if expected_mime is None:
        raise HTTPException(
            status_code=400,
            detail=f"不支持的图片格式：.{ext}，仅允许 {', '.join(_EXT_TO_MIME.keys())}",
        )

    # 2. 魔数校验（读前 16 字节即可识别常见图片格式）
    header = await file.read(16)
    await file.seek(0)  # 复位，让后续流程能正常读取

    mime = _guess_mime(header)
    if mime is None:
        raise HTTPException(status_code=400, detail="无法识别图片格式，请上传有效的图片文件")

    if mime != expected_mime:
        raise HTTPException(
            status_code=400,
            detail=f"文件扩展名与实际内容不匹配（扩展名 .{ext}，实际 {mime}）",
        )

    if mime not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"不支持的图片类型：{mime}，仅允许 JPEG / PNG / WebP",
        )

    # 3. 文件大小预检（优先用 Starlette UploadFile.size，其次 content-length header）
    size_bytes: int | None = getattr(file, "size", None) or None
    if not size_bytes:
        cl = file.headers.get("content-length")
        size_bytes = int(cl) if cl and cl.isdigit() else None
    if size_bytes:
        size_mb = size_bytes / (1024 * 1024)
        if size_mb > MAX_UPLOAD_SIZE_MB:
            raise HTTPException(
                status_code=413,
                detail=f"图片大小 {size_mb:.1f}MB 超过上限 {MAX_UPLOAD_SIZE_MB}MB",
            )


def validate_image_size(content: bytes) -> None:
    """读完整文件后的二次大小校验（绕过 content-length 缺失的情况）。"""
    size_mb = len(content) / (1024 * 1024)
    if size_mb > MAX_UPLOAD_SIZE_MB:
        raise HTTPException(
            status_code=413,
            detail=f"图片大小 {size_mb:.1f}MB 超过上限 {MAX_UPLOAD_SIZE_MB}MB",
        )


def _guess_mime(header: bytes) -> str | None:
    for mime, magic in _MAGIC_BYTES.items():
        if header[: len(magic)] == magic:
            # WebP 需要额外校验：RIFF????WEBP
            if mime == "image/webp":
                if len(header) >= 12 and header[8:12] == b"WEBP":
                    return mime
                continue
            return mime
    return None
