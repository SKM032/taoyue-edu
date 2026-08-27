"""内容相关路由：直播、训练营、Banner"""
from datetime import datetime
from math import ceil
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import desc

from app.database import get_db
from app.models import User, LiveRoom, Bootcamp, Teacher, Banner, FreeResource
from app.security import get_current_user, get_current_admin
from app.cache import cache_get, cache_set, cache_del, cache_del_pattern, BANNER_TTL, CONTENT_LIST_TTL

router = APIRouter(prefix="/api/v1/content", tags=["内容"])


# ==================== 直播公开课 ====================

@router.get("/lives", summary="获取直播列表")
async def get_lives(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=10, ge=1, le=50),
    status: Optional[str] = None,
    db: Session = Depends(get_db),
):
    """获取直播公开课列表"""
    cache_key = f"live:list:{page}:{page_size}:{status or ''}"
    cached = cache_get(cache_key)
    if cached is not None:
        return cached

    query = db.query(LiveRoom)
    if status:
        query = query.filter(LiveRoom.status == status)

    total = query.count()
    lives = (
        query
        .order_by(desc(LiveRoom.start_at))
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )

    items = []
    for live in lives:
        teacher = db.query(Teacher).filter(Teacher.id == live.teacher_id).first()
        items.append({
            "id": live.id,
            "title": live.title,
            "cover": live.cover,
            "description": live.description,
            "start_at": live.start_at.isoformat(),
            "end_at": live.end_at.isoformat(),
            "status": live.status,
            "viewer_count": live.viewer_count,
            "teacher_name": teacher.name if teacher else "",
            "teacher_avatar": teacher.avatar if teacher else "",
        })

    result = {
        "total": total,
        "page": page,
        "page_size": page_size,
        "items": items,
    }
    cache_set(cache_key, result, ttl=CONTENT_LIST_TTL)
    return result


@router.post("/lives", summary="创建直播")
async def create_live(
    req: dict,
    current_user: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """创建直播公开课"""
    live = LiveRoom(
        title=req["title"],
        cover=req.get("cover", ""),
        teacher_id=req["teacher_id"],
        description=req.get("description", ""),
        start_at=datetime.fromisoformat(req["start_at"]),
        end_at=datetime.fromisoformat(req["end_at"]),
        status=req.get("status", "upcoming"),
    )
    db.add(live)
    db.commit()
    cache_del_pattern("live:list:*")
    return {"id": live.id, "message": "直播创建成功"}


# ==================== 训练营 ====================

@router.get("/bootcamps", summary="获取训练营列表")
async def get_bootcamps(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=10, ge=1, le=50),
    status: Optional[str] = None,
    db: Session = Depends(get_db),
):
    """获取训练营列表"""
    cache_key = f"bootcamp:list:{page}:{page_size}:{status or ''}"
    cached = cache_get(cache_key)
    if cached is not None:
        return cached

    query = db.query(Bootcamp)
    if status:
        query = query.filter(Bootcamp.status == status)

    total = query.count()
    bootcamps = (
        query
        .order_by(desc(Bootcamp.start_at))
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )

    items = []
    for bc in bootcamps:
        teacher = db.query(Teacher).filter(Teacher.id == bc.teacher_id).first()
        items.append({
            "id": bc.id,
            "title": bc.title,
            "cover": bc.cover,
            "description": bc.description,
            "price": float(bc.price),
            "original_price": float(bc.original_price),
            "max_students": bc.max_students,
            "enrolled_count": bc.enrolled_count,
            "start_at": bc.start_at.isoformat(),
            "end_at": bc.end_at.isoformat(),
            "status": bc.status,
            "teacher_name": teacher.name if teacher else "",
        })

    result = {
        "total": total,
        "page": page,
        "page_size": page_size,
        "items": items,
    }
    cache_set(cache_key, result, ttl=CONTENT_LIST_TTL)
    return result


# ==================== Banner ====================

@router.get("/banners", summary="获取Banner")
async def get_banners(
    position: str = Query(default="home"),
    db: Session = Depends(get_db),
):
    """获取指定位置的Banner"""
    cache_key = f"banner:{position}"
    cached = cache_get(cache_key)
    if cached is not None:
        return cached

    banners = (
        db.query(Banner)
        .filter(Banner.position == position, Banner.is_active == True)
        .order_by(Banner.sort_order)
        .all()
    )
    result = [
        {
            "id": b.id,
            "title": b.title,
            "image_url": b.image_url,
            "link_url": b.link_url,
            "sort_order": b.sort_order,
        }
        for b in banners
    ]
    cache_set(cache_key, result, ttl=BANNER_TTL)
    return result


@router.post("/banners", summary="创建Banner")
async def create_banner(
    req: dict,
    current_user: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """创建Banner"""
    banner = Banner(
        title=req.get("title", ""),
        image_url=req["image_url"],
        link_url=req.get("link_url", ""),
        position=req.get("position", "home"),
        sort_order=req.get("sort_order", 0),
        is_active=req.get("is_active", True),
    )
    db.add(banner)
    db.commit()
    cache_del_pattern("banner:*")
    return {"id": banner.id, "message": "Banner创建成功"}


# ==================== Banner 管理端接口（后台） ====================

@router.get("/admin/banners", summary="后台Banner列表")
async def admin_list_banners(
    position: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin),
):
    """后台获取所有Banner（含未上架），支持按位置过滤"""
    query = db.query(Banner)
    if position:
        query = query.filter(Banner.position == position)
    banners = query.order_by(Banner.sort_order, Banner.id.desc()).all()
    return [
        {
            "id": b.id,
            "title": b.title,
            "image_url": b.image_url,
            "link_url": b.link_url,
            "position": b.position,
            "sort_order": b.sort_order,
            "is_active": b.is_active,
        }
        for b in banners
    ]


@router.put("/admin/banners/{banner_id}", summary="更新Banner")
async def admin_update_banner(
    banner_id: int,
    req: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin),
):
    """更新Banner信息"""
    banner = db.query(Banner).filter(Banner.id == banner_id).first()
    if not banner:
        raise HTTPException(status_code=404, detail="Banner不存在")
    if "title" in req:
        banner.title = req.get("title", "")
    if "image_url" in req:
        banner.image_url = req.get("image_url", banner.image_url)
    if "link_url" in req:
        banner.link_url = req.get("link_url", "")
    if "position" in req:
        banner.position = req.get("position", "home")
    if "sort_order" in req:
        banner.sort_order = req.get("sort_order", 0)
    if "is_active" in req:
        banner.is_active = bool(req.get("is_active", True))
    db.commit()
    cache_del_pattern("banner:*")
    return {"message": "Banner更新成功"}


@router.delete("/admin/banners/{banner_id}", summary="删除Banner")
async def admin_delete_banner(
    banner_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin),
):
    """删除Banner"""
    banner = db.query(Banner).filter(Banner.id == banner_id).first()
    if not banner:
        raise HTTPException(status_code=404, detail="Banner不存在")
    db.delete(banner)
    db.commit()
    cache_del_pattern("banner:*")
    return {"message": "Banner删除成功"}


@router.put("/admin/banners/{banner_id}/toggle", summary="上下架Banner")
async def admin_toggle_banner(
    banner_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin),
):
    """切换Banner上下架状态"""
    banner = db.query(Banner).filter(Banner.id == banner_id).first()
    if not banner:
        raise HTTPException(status_code=404, detail="Banner不存在")
    banner.is_active = not banner.is_active
    db.commit()
    cache_del_pattern("banner:*")
    return {"id": banner.id, "is_active": banner.is_active, "message": "状态已切换"}


# ==================== 免费资料 ====================

@router.get("/resources", summary="获取免费资料")
async def get_resources(db: Session = Depends(get_db)):
    """获取免费资料列表"""
    cache_key = "free_resources"
    cached = cache_get(cache_key)
    if cached is not None:
        return cached

    resources = (
        db.query(FreeResource)
        .order_by(FreeResource.sort_order)
        .all()
    )
    result = [
        {
            "id": r.id,
            "title": r.title,
            "file_type": r.file_type,
            "file_url": r.file_url,
            "icon": r.icon,
            "download_count": r.download_count,
        }
        for r in resources
    ]
    cache_set(cache_key, result, ttl=CONTENT_LIST_TTL)
    return result


@router.post("/resources/{resource_id}/download", summary="下载资料")
async def download_resource(resource_id: int, db: Session = Depends(get_db)):
    """下载资料并增加计数"""
    resource = db.query(FreeResource).filter(FreeResource.id == resource_id).first()
    if not resource:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="资料不存在")
    resource.download_count += 1
    db.commit()
    cache_del("free_resources")
    return {"url": resource.file_url, "message": "下载成功"}
