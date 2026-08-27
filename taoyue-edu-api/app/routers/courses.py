"""课程相关路由"""
import json
import re
from datetime import datetime
from math import ceil
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status, UploadFile, File
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import desc, asc, func, or_

from app.database import get_db
from app.models import (
    User, Course, Category, Teacher, Chapter, Lesson,
    CoursePackage, Enrollment, Review, FreeResource,
    Order, OrderItem, Cart,
)
from app.schemas import (
    CourseListItem, CourseDetailResponse, CourseCreateRequest,
    CourseUpdateRequest, ChapterCreateRequest, LessonCreateRequest,
    CategoryResponse, TeacherResponse, PaginatedResponse,
    PackageResponse, CourseFilterParams, PublishCourseRequest,
    ReviewCourseRequest,
)
from app.security import get_current_user, get_current_admin
from app.oss_client import upload_file
from app.config import get_settings
from app.cache import cache_get, cache_set, cache_del_pattern, CATEGORY_TTL, COURSE_LIST_TTL, COURSE_DETAIL_TTL, CONTENT_LIST_TTL

router = APIRouter(prefix="/api/v1/courses", tags=["课程"])
settings = get_settings()


def _parse_json(value, default=None):
    """安全解析 JSON 字符串"""
    if value is None:
        return default
    if isinstance(value, (list, dict)):
        return value
    if isinstance(value, str):
        try:
            return json.loads(value)
        except (json.JSONDecodeError, TypeError):
            return default
    return value


def slugify(text: str) -> str:
    """生成URL友好的slug（仅保留 ASCII，中文等会被替换为哈希）"""
    import unicodedata, hashlib
    if not text:
        return 'course'
    # 中文等非 ASCII 字符先 NFKD 归一化，再丢弃非 ASCII
    ascii_text = unicodedata.normalize('NFKD', text)
    ascii_text = ascii_text.encode('ascii', 'ignore').decode('ascii')
    ascii_text = ascii_text.lower().strip()
    ascii_text = re.sub(r'[^a-z0-9\s_-]', '', ascii_text)
    ascii_text = re.sub(r'[\s_]+', '-', ascii_text)
    ascii_text = re.sub(r'-+', '-', ascii_text)
    ascii_text = ascii_text.strip('-')
    if not ascii_text:
        # title 全中文：用 title 的 md5 前 8 位作为兜底
        h = hashlib.md5(text.encode('utf-8')).hexdigest()[:8]
        return f'course-{h}'
    return ascii_text[:100]


# ==================== 分类 ====================

@router.get("/categories", response_model=list[CategoryResponse], summary="获取所有分类")
async def get_categories(db: Session = Depends(get_db)):
    """获取所有课程分类（顶级分类含子分类层级）"""
    cache_key = "categories"
    cached = cache_get(cache_key)
    if cached is not None:
        return cached

    categories = (
        db.query(Category)
        .order_by(Category.sort_order)
        .all()
    )

    def _build(cat):
        return CategoryResponse(
            id=cat.id,
            name=cat.name,
            slug=cat.slug,
            icon=cat.icon or "",
            description=cat.description or "",
            course_count=db.query(Course).filter(
                Course.category_id == cat.id,
                Course.status == "published",
            ).count(),
            parent_id=cat.parent_id,
        )

    # 顶级分类
    parents = [c for c in categories if c.parent_id is None]
    result = []
    for parent in parents:
        parent_resp = _build(parent)
        # 子分类
        children = [c for c in categories if c.parent_id == parent.id]
        if children:
            child_resp = [_build(c) for c in children]
            # 顶级分类的 course_count 累加子分类数量
            parent_resp.course_count += sum(c.course_count for c in child_resp)
            parent_resp.children = child_resp
        result.append(parent_resp)

    result_data = [item.model_dump() for item in result]
    cache_set(cache_key, result_data, ttl=CATEGORY_TTL)
    return result_data


# ==================== 讲师 ====================

@router.get("/teachers", response_model=list[TeacherResponse], summary="获取所有讲师")
async def get_teachers(db: Session = Depends(get_db)):
    """获取所有讲师"""
    cache_key = "teachers"
    cached = cache_get(cache_key)
    if cached is not None:
        return cached

    teachers = (
        db.query(Teacher)
        .filter(Teacher.status == "active")
        .all()
    )
    result = [TeacherResponse.model_validate(t).model_dump() for t in teachers]
    cache_set(cache_key, result, ttl=CATEGORY_TTL)
    return result


@router.get("/teachers/{teacher_id}", response_model=TeacherResponse, summary="获取讲师详情")
async def get_teacher_detail(teacher_id: int, db: Session = Depends(get_db)):
    """获取讲师详情"""
    teacher = db.query(Teacher).filter(Teacher.id == teacher_id).first()
    if not teacher:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="讲师不存在")
    return TeacherResponse.model_validate(teacher)


# ==================== 课程列表 ====================

@router.get("", summary="获取课程列表（公开）")
async def get_courses(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    category_id: Optional[int] = None,
    category_ids: Optional[str] = None,
    teacher_id: Optional[int] = None,
    keyword: Optional[str] = None,
    difficulty: Optional[str] = None,
    course_type: Optional[str] = None,
    price_min: Optional[float] = None,
    price_max: Optional[float] = None,
    sort_by: str = Query(default="latest", pattern=r"^(latest|popular|rating|price_asc|price_desc)$"),
    status: str = "published",
    is_featured: Optional[bool] = None,
    is_recommended: Optional[bool] = None,
    db: Session = Depends(get_db),
):
    """获取课程列表，支持多维筛选和排序"""
    # 缓存：按完整筛选条件生成 key（公开接口、读多写少）
    cache_key = "course:list:{}:{}:{}:{}:{}:{}:{}:{}:{}:{}:{}".format(
        page, page_size, category_id or "", category_ids or "", teacher_id or "",
        keyword or "", difficulty or "", course_type or "",
        price_min or "", price_max or "", sort_by,
    )
    cached = cache_get(cache_key)
    if cached is not None:
        return cached

    query = db.query(Course).options(
        joinedload(Course.teacher),
    )

    # 基础过滤
    query = query.filter(Course.status == status)

    if category_ids:
        # 支持逗号分隔的多个分类 id（如顶级+子分类一起查询）
        ids = [int(x) for x in category_ids.split(",") if x.strip().isdigit()]
        if ids:
            query = query.filter(Course.category_id.in_(ids))
    elif category_id:
        query = query.filter(Course.category_id == category_id)
    if teacher_id:
        query = query.filter(Course.teacher_id == teacher_id)
    if keyword:
        query = query.filter(
            or_(
                Course.title.ilike(f"%{keyword}%"),
                Course.subtitle.ilike(f"%{keyword}%"),
            )
        )
    if difficulty:
        query = query.filter(Course.difficulty == difficulty)
    if course_type:
        query = query.filter(Course.course_type == course_type)
    if price_min is not None:
        query = query.filter(Course.price >= price_min)
    if price_max is not None:
        query = query.filter(Course.price <= price_max)
    if is_featured is not None:
        query = query.filter(Course.is_featured == is_featured)
    if is_recommended is not None:
        query = query.filter(Course.is_recommended == is_recommended)

    # 排序
    sort_map = {
        "latest": desc(Course.published_at),
        "popular": desc(Course.student_count),
        "rating": desc(Course.rating),
        "price_asc": asc(Course.price),
        "price_desc": desc(Course.price),
    }
    query = query.order_by(sort_map[sort_by])

    total = query.count()
    total_pages = ceil(total / page_size) if total > 0 else 0
    courses = query.offset((page - 1) * page_size).limit(page_size).all()

    items = []
    for course in courses:
        cat = db.query(Category).filter(Category.id == course.category_id).first()
        items.append(CourseListItem(
            id=course.id,
            title=course.title,
            subtitle=course.subtitle,
            slug=course.slug,
            cover=course.cover,
            category_id=course.category_id,
            category_name=cat.name if cat else "",
            teacher=TeacherResponse.model_validate(course.teacher) if course.teacher else None,
            course_type=course.course_type,
            price=course.price,
            original_price=course.original_price,
            difficulty=course.difficulty,
            student_count=course.student_count,
            rating=float(course.rating),
            review_count=course.review_count,
            tags=_parse_json(course.tags, []),
            duration_hours=float(course.duration_hours or 0),
            status=course.status,
        ))

    result = {
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": total_pages,
        "items": [item.model_dump() for item in items],
    }
    cache_set(cache_key, result, ttl=COURSE_LIST_TTL)
    return result


# ==================== 课程详情 ====================

@router.get("/{slug}", summary="获取课程详情")
async def get_course_detail(slug: str, db: Session = Depends(get_db)):
    """通过 slug 或 数字 id 获取课程完整详情"""
    cache_key = f"course:detail:{slug}"
    cached = cache_get(cache_key)
    if cached is not None:
        return cached

    query = db.query(Course).options(
        joinedload(Course.category),
        joinedload(Course.teacher),
        joinedload(Course.chapters).joinedload(Chapter.lessons),
        joinedload(Course.packages),
    )
    # 同时支持数字 ID 和 slug
    if slug.isdigit():
        course = query.filter(Course.id == int(slug)).first()
        if course is None:
            course = query.filter(Course.slug == slug).first()
    else:
        course = query.filter(Course.slug == slug).first()

    if not course:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="课程不存在")

    result = CourseDetailResponse.model_validate(course).model_dump()
    cache_set(cache_key, result, ttl=COURSE_DETAIL_TTL)
    return result


@router.get("/{course_id}/reviews", summary="获取课程评价")
async def get_course_reviews(
    course_id: int,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=10, ge=1, le=50),
    db: Session = Depends(get_db),
):
    """获取课程评价列表"""
    reviews = (
        db.query(Review)
        .options(joinedload(Review.user))
        .filter(Review.course_id == course_id)
        .order_by(desc(Review.created_at))
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )
    total = db.query(Review).filter(Review.course_id == course_id).count()

    return {
        "total": total,
        "page": page,
        "page_size": page_size,
        "items": [
            {
                "id": r.id,
                "rating": r.rating,
                "content": r.content,
                "user_name": r.user.nickname if r.user else "匿名用户",
                "user_avatar": r.user.avatar if r.user else "",
                "created_at": r.created_at.isoformat(),
            }
            for r in reviews
        ],
    }


# ==================== 管理端：CRUD ====================

@router.post("", summary="创建课程（管理端）")
async def create_course(
    req: CourseCreateRequest,
    current_user: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """创建新课程"""
    # 生成slug
    base_slug = slugify(req.title)
    slug = base_slug
    counter = 1
    while db.query(Course).filter(Course.slug == slug).first():
        slug = f"{base_slug}-{counter}"
        counter += 1

    # 验证分类
    category = db.query(Category).filter(Category.id == req.category_id).first()
    if not category:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="分类不存在")

    teacher = None
    if req.teacher_id is not None:
        teacher = db.query(Teacher).filter(Teacher.id == req.teacher_id).first()
        if not teacher:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="讲师不存在")

    course = Course(
        title=req.title,
        subtitle=req.subtitle or "",
        slug=slug,
        cover=req.cover or "",
        description=req.description or "",
        category_id=req.category_id,
        teacher_id=req.teacher_id,
        difficulty=req.difficulty,
        course_type=req.course_type,
        price=req.price,
        original_price=req.original_price,
        tags=json.dumps(req.tags, ensure_ascii=False),
        learning_goals=json.dumps(req.learning_goals, ensure_ascii=False),
        prerequisites=json.dumps(req.prerequisites, ensure_ascii=False),
        status="draft",
    )
    db.add(course)
    db.commit()
    db.refresh(course)

    # 更新讲师课程数
    if teacher:
        teacher.course_count = db.query(Course).filter(
            Course.teacher_id == teacher.id,
            Course.status.in_(["published", "approved"]),
        ).count()
    db.commit()
    cache_del_pattern("course:list:*")
    cache_del_pattern("categories")

    return {"id": course.id, "slug": course.slug, "message": "课程创建成功"}


@router.put("/{course_id}", summary="更新课程（管理端）")
async def update_course(
    course_id: int,
    req: CourseUpdateRequest,
    current_user: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """更新课程信息"""
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="课程不存在")

    update_data = req.model_dump(exclude_unset=True)
    # JSON 字段需要序列化
    json_fields = {"tags", "learning_goals", "prerequisites"}
    for field in json_fields:
        if field in update_data and isinstance(update_data[field], list):
            update_data[field] = json.dumps(update_data[field], ensure_ascii=False)

    if "title" in update_data:
        update_data["slug"] = slugify(update_data["title"])
    for key, value in update_data.items():
        if key == "title":
            continue
        setattr(course, key, value)
    if "title" in update_data:
        course.slug = slugify(update_data["title"])
        del update_data["title"]

    course.updated_at = datetime.utcnow()
    db.commit()
    cache_del_pattern("course:*")
    return {"message": "课程更新成功"}


@router.delete("/{course_id}", summary="删除课程（管理端）")
async def delete_course(
    course_id: int,
    current_user: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """删除课程（软删除，标记为下架）"""
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="课程不存在")
    course.status = "unpublished"
    db.commit()
    cache_del_pattern("course:*")
    return {"message": "课程已下架"}


@router.put("/{course_id}/restore", summary="从回收站恢复课程（管理端）")
async def restore_course(
    course_id: int,
    current_user: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """从回收站恢复课程：将状态从 unpublished 改为 published"""
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="课程不存在")

    if course.status != "unpublished":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="只有已下架的课程才能从回收站恢复",
        )

    course.status = "published"
    course.published_at = datetime.utcnow()
    db.commit()
    cache_del_pattern("course:*")
    return {"message": "课程已从回收站恢复"}


@router.delete("/{course_id}/permanent", summary="彻底删除课程（管理端，从数据库删除）")
async def permanent_delete_course(
    course_id: int,
    current_user: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """彻底删除课程：从数据库删除该课程及其关联的章节、课时、套餐、订购、评论、购物车等。

    注意：该操作不可恢复，仅允许对已下架（回收站）的课程执行。
    """
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="课程不存在")

    # 仅允许删除回收站（已下架）课程，避免误删在线课程
    if course.status != "unpublished":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="只有已下架（回收站）的课程才能彻底删除",
        )

    # 级联删除关联数据
    # 1. 章节及课时
    chapter_ids = [c.id for c in db.query(Chapter).filter(Chapter.course_id == course_id).all()]
    if chapter_ids:
        db.query(Lesson).filter(Lesson.chapter_id.in_(chapter_ids)).delete(synchronize_session=False)
    db.query(Chapter).filter(Chapter.course_id == course_id).delete(synchronize_session=False)

    # 2. 课程套餐
    db.query(CoursePackage).filter(CoursePackage.course_id == course_id).delete(synchronize_session=False)

    # 3. 选课记录、评论
    db.query(Enrollment).filter(Enrollment.course_id == course_id).delete(synchronize_session=False)
    db.query(Review).filter(Review.course_id == course_id).delete(synchronize_session=False)

    # 4. 购物车
    db.query(Cart).filter(Cart.course_id == course_id).delete(synchronize_session=False)

    # 5. 订单明细及关联订单（注意：多课程合并订单仅删该课程的明细；若订单只剩此课程则删整单）
    item_order_ids = [i.order_id for i in db.query(OrderItem).filter(OrderItem.course_id == course_id).all()]
    db.query(OrderItem).filter(OrderItem.course_id == course_id).delete(synchronize_session=False)
    if item_order_ids:
        # 删除该课程相关且不再有其它明细的订单
        orphan_order_ids = []
        for oid in set(item_order_ids):
            remaining = db.query(OrderItem).filter(OrderItem.order_id == oid).count()
            if remaining == 0:
                orphan_order_ids.append(oid)
        if orphan_order_ids:
            db.query(Order).filter(Order.id.in_(orphan_order_ids)).delete(synchronize_session=False)
        # 单课程订单直接引用 course_id 的也删除
        db.query(Order).filter(
            Order.course_id == course_id,
            Order.id.notin_(item_order_ids),
        ).delete(synchronize_session=False)

    # 6. 删除课程本身
    db.delete(course)
    db.commit()
    cache_del_pattern("course:*")
    return {"message": "课程已彻底删除"}


@router.put("/{course_id}/publish", summary="发布/提交审核课程")
async def publish_course(
    course_id: int,
    req: PublishCourseRequest,
    current_user: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """发布课程或提交审核"""
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="课程不存在")

    if req.status == "submitted":
        course.status = "pending_review"
    elif req.status == "published":
        course.status = "published"
        course.published_at = datetime.utcnow()

    db.commit()
    cache_del_pattern("course:*")
    return {"message": f"课程状态已更新为: {course.status}"}


@router.put("/{course_id}/review", summary="审核课程（管理端）")
async def review_course(
    course_id: int,
    req: ReviewCourseRequest,
    current_user: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """审核课程"""
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="课程不存在")

    course.status = req.status
    if req.status == "approved":
        course.published_at = datetime.utcnow()
    db.commit()
    cache_del_pattern("course:*")
    return {"message": f"课程审核{req.status}", "reason": req.reason}


# ==================== 章节管理 ====================

@router.get("/{course_id}/chapters", summary="获取课程章节")
async def get_chapters(course_id: int, db: Session = Depends(get_db)):
    """获取课程所有章节和课时"""
    cache_key = f"course:chapters:{course_id}"
    cached = cache_get(cache_key)
    if cached is not None:
        return cached

    chapters = (
        db.query(Chapter)
        .options(joinedload(Chapter.lessons))
        .filter(Chapter.course_id == course_id)
        .order_by(Chapter.sort_order)
        .all()
    )
    result = [
        {
            "id": ch.id,
            "title": ch.title,
            "description": ch.description,
            "sort_order": ch.sort_order,
            "is_free": ch.is_free,
            "lessons": [
                {
                    "id": le.id,
                    "title": le.title,
                    "lesson_type": le.lesson_type,
                    "video_duration": le.video_duration,
                    "is_free": le.is_free,
                    "sort_order": le.sort_order,
                }
                for le in ch.lessons
            ],
        }
        for ch in chapters
    ]
    cache_set(cache_key, result, ttl=COURSE_DETAIL_TTL)
    return result


@router.post("/{course_id}/chapters", summary="添加章节")
async def add_chapter(
    course_id: int,
    req: ChapterCreateRequest,
    current_user: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """为课程添加章节"""
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="课程不存在")

    # 未指定 sort_order 时，自动排在当前课程章节末尾（按添加顺序递增）
    sort_order = req.sort_order
    if sort_order is None:
        max_sort = db.query(func.max(Chapter.sort_order)).filter(
            Chapter.course_id == course_id,
        ).scalar() or 0
        sort_order = max_sort + 1

    chapter = Chapter(
        course_id=course_id,
        title=req.title,
        description=req.description or "",
        sort_order=sort_order,
        is_free=req.is_free,
    )
    db.add(chapter)
    db.commit()
    db.refresh(chapter)

    # 更新课程章节数
    course.chapter_count = db.query(Chapter).filter(Chapter.course_id == course_id).count()
    db.commit()
    cache_del_pattern(f"course:detail:*")

    return {"id": chapter.id, "message": "章节添加成功"}


@router.put("/chapters/{chapter_id}", summary="更新章节")
async def update_chapter(
    chapter_id: int,
    req: ChapterCreateRequest,
    current_user: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """更新章节信息"""
    chapter = db.query(Chapter).filter(Chapter.id == chapter_id).first()
    if not chapter:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="章节不存在")

    chapter.title = req.title
    chapter.description = req.description or ""
    chapter.sort_order = req.sort_order
    chapter.is_free = req.is_free
    db.commit()
    cache_del_pattern("course:detail:*")
    cache_del_pattern("course:chapters:*")
    return {"message": "章节更新成功"}


@router.delete("/chapters/{chapter_id}", summary="删除章节")
async def delete_chapter(
    chapter_id: int,
    current_user: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """删除章节"""
    chapter = db.query(Chapter).filter(Chapter.id == chapter_id).first()
    if not chapter:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="章节不存在")
    course_id = chapter.course_id
    db.delete(chapter)
    db.commit()

    # 更新课程章节数
    course = db.query(Course).filter(Course.id == course_id).first()
    if course:
        course.chapter_count = db.query(Chapter).filter(Chapter.course_id == course_id).count()
        db.commit()
    cache_del_pattern("course:detail:*")
    cache_del_pattern("course:chapters:*")

    return {"message": "章节已删除"}


# ==================== 课时管理 ====================

@router.post("/chapters/{chapter_id}/lessons", summary="添加课时")
async def add_lesson(
    chapter_id: int,
    req: LessonCreateRequest,
    current_user: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """为章节添加课时"""
    chapter = db.query(Chapter).filter(Chapter.id == chapter_id).first()
    if not chapter:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="章节不存在")

    # 未指定 sort_order 时，自动排在当前章节课时末尾（按添加顺序递增）
    sort_order = req.sort_order
    if sort_order is None:
        max_sort = db.query(func.max(Lesson.sort_order)).filter(
            Lesson.chapter_id == chapter_id,
        ).scalar() or 0
        sort_order = max_sort + 1

    lesson = Lesson(
        chapter_id=chapter_id,
        title=req.title,
        lesson_type=req.lesson_type,
        video_url=req.video_url or "",
        video_duration=req.video_duration,
        document_url=req.document_url or "",
        content=req.content or "",
        is_free=req.is_free,
        sort_order=sort_order,
    )
    db.add(lesson)
    db.commit()
    db.refresh(lesson)

    # 更新课程总时长
    course = db.query(Course).filter(Course.id == chapter.course_id).first()
    if course:
        total_seconds = (
            db.query(func.sum(Lesson.video_duration))
            .join(Chapter)
            .filter(Chapter.course_id == course.id)
            .scalar()
        ) or 0
        course.duration_hours = round(total_seconds / 3600, 1)
        db.commit()
    cache_del_pattern("course:detail:*")
    cache_del_pattern("course:chapters:*")

    return {"id": lesson.id, "message": "课时添加成功"}


@router.put("/lessons/{lesson_id}", summary="更新课时")
async def update_lesson(
    lesson_id: int,
    req: LessonCreateRequest,
    current_user: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """更新课时信息"""
    lesson = db.query(Lesson).filter(Lesson.id == lesson_id).first()
    if not lesson:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="课时不存在")

    lesson.title = req.title
    lesson.lesson_type = req.lesson_type
    lesson.video_url = req.video_url or ""
    lesson.video_duration = req.video_duration
    lesson.document_url = req.document_url or ""
    lesson.content = req.content or ""
    lesson.is_free = req.is_free
    lesson.sort_order = req.sort_order
    db.commit()
    cache_del_pattern("course:detail:*")
    cache_del_pattern("course:chapters:*")
    return {"message": "课时更新成功"}


@router.delete("/lessons/{lesson_id}", summary="删除课时")
async def delete_lesson(
    lesson_id: int,
    current_user: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """删除课时"""
    lesson = db.query(Lesson).filter(Lesson.id == lesson_id).first()
    if not lesson:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="课时不存在")
    db.delete(lesson)
    db.commit()
    cache_del_pattern("course:detail:*")
    cache_del_pattern("course:chapters:*")
    return {"message": "课时已删除"}


# ==================== 套餐管理 ====================

@router.post("/{course_id}/packages", summary="添加课程套餐")
async def add_package(
    course_id: int,
    req: dict,
    current_user: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """为课程添加套餐"""
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="课程不存在")

    pkg = CoursePackage(
        course_id=course_id,
        name=req.get("name", ""),
        price=req.get("price", 0),
        original_price=req.get("original_price", 0),
        description=req.get("description", ""),
        features=req.get("features", []),
        sort_order=req.get("sort_order", 0),
    )
    db.add(pkg)
    db.commit()
    cache_del_pattern("course:detail:*")
    cache_del_pattern("course:chapters:*")
    return {"id": pkg.id, "message": "套餐添加成功"}


# ==================== 文件上传 ====================

@router.post("/upload/image", summary="上传课程图片")
async def upload_course_image(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_admin),
):
    """上传课程封面图"""
    url = await upload_file(file, "courses/images", "image")
    return {"url": url, "message": "上传成功"}


@router.post("/upload/video", summary="上传课程视频")
async def upload_course_video(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_admin),
):
    """上传课程视频"""
    url = await upload_file(file, "courses/videos", "video")
    return {"url": url, "message": "上传成功"}


# ==================== 免费资料 ====================

@router.get("/resources", summary="获取免费资料")
async def get_free_resources(db: Session = Depends(get_db)):
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
