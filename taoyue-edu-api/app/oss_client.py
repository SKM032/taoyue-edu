"""阿里云OSS文件上传管理"""
import hashlib
import os
import time
import uuid
from typing import Optional

import oss2
from fastapi import HTTPException, UploadFile, status

from app.config import get_settings

settings = get_settings()

ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/gif", "image/webp", "image/svg+xml"}
ALLOWED_VIDEO_TYPES = {"video/mp4", "video/mov", "video/mkv", "video/webm"}
ALLOWED_DOC_TYPES = {
    "application/pdf",
    "application/zip",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.ms-powerpoint",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
}
MAX_IMAGE_SIZE = 10 * 1024 * 1024  # 10MB
MAX_VIDEO_SIZE = 500 * 1024 * 1024  # 500MB
MAX_DOC_SIZE = 50 * 1024 * 1024  # 50MB


def get_oss_bucket():
    """获取OSS Bucket实例"""
    if not settings.OSS_ACCESS_KEY_ID or not settings.OSS_ACCESS_KEY_SECRET:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="OSS未配置",
        )
    auth = oss2.Auth(settings.OSS_ACCESS_KEY_ID, settings.OSS_ACCESS_KEY_SECRET)
    bucket = oss2.Bucket(auth, settings.OSS_ENDPOINT, settings.OSS_BUCKET_NAME)
    return bucket


def generate_oss_key(prefix: str, filename: str) -> str:
    """生成OSS文件路径"""
    ext = os.path.splitext(filename)[1].lower()
    date_str = time.strftime("%Y/%m/%d")
    unique_id = uuid.uuid4().hex[:12]
    safe_name = hashlib.md5(filename.encode()).hexdigest()[:8]
    return f"{prefix}/{date_str}/{safe_name}_{unique_id}{ext}"


def validate_file(file: UploadFile, file_type: str = "image") -> None:
    """验证上传文件"""
    if file_type == "image":
        if file.content_type not in ALLOWED_IMAGE_TYPES:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"不支持的图片格式: {file.content_type}，仅支持 JPG/PNG/GIF/WebP/SVG",
            )
        if file.size and file.size > MAX_IMAGE_SIZE:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="图片大小不能超过 10MB",
            )
    elif file_type == "video":
        if file.content_type not in ALLOWED_VIDEO_TYPES:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"不支持的视频格式: {file.content_type}，仅支持 MP4/MOV/MKV/WebM",
            )
        if file.size and file.size > MAX_VIDEO_SIZE:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="视频大小不能超过 500MB",
            )
    elif file_type == "document":
        if file.content_type not in ALLOWED_DOC_TYPES:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"不支持的文档格式: {file.content_type}",
            )
        if file.size and file.size > MAX_DOC_SIZE:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="文档大小不能超过 50MB",
            )


def upload_to_oss(file_data: bytes, oss_key: str, content_type: Optional[str] = None) -> str:
    """上传文件到OSS并返回URL"""
    bucket = get_oss_bucket()
    headers = {}
    if content_type:
        headers["Content-Type"] = content_type
    bucket.put_object(oss_key, file_data, headers=headers)
    return f"{settings.OSS_CDN_DOMAIN}/{oss_key}"


def delete_from_oss(oss_key: str) -> None:
    """从OSS删除文件"""
    bucket = get_oss_bucket()
    bucket.delete_object(oss_key)


async def upload_file(file: UploadFile, prefix: str, file_type: str = "image") -> str:
    """上传文件到阿里云 OSS，并返回公网可访问的 OSS 绝对地址。

    - 强制上传到 OSS；OSS 未配置或上传失败时抛出 HTTPException，不再回退本地存储。
    - PC 端 / m 端 / 管理后台都使用该 OSS 地址，任何端均可直接访问。
    """
    validate_file(file, file_type)
    contents = await file.read()

    try:
        oss_key = generate_oss_key(prefix, file.filename or "file")
        url = upload_to_oss(contents, oss_key, file.content_type)
        return url
    except HTTPException:
        raise
    except Exception as e:
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"OSS 上传失败: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"图片上传到阿里云 OSS 失败，请检查 OSS 配置: {e}",
        )


def save_to_local(file_data: bytes, prefix: str, filename: str, content_type: Optional[str] = None) -> str:
    """本地存储（OSS 不可用时的回退方案）"""
    import os
    from fastapi.responses import FileResponse  # noqa

    # 本地静态目录
    static_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "static", "uploads")
    target_dir = os.path.join(static_dir, prefix.replace("/", os.sep))
    os.makedirs(target_dir, exist_ok=True)

    ext = os.path.splitext(filename)[1].lower() or ".bin"
    unique_name = f"{time.strftime('%Y%m%d%H%M%S')}_{uuid.uuid4().hex[:8]}{ext}"
    file_path = os.path.join(target_dir, unique_name)

    with open(file_path, "wb") as f:
        f.write(file_data)

    # 返回可访问的 URL（相对 /static/uploads 的路径）
    url_path = f"/static/uploads/{prefix}/{unique_name}"
    return url_path
