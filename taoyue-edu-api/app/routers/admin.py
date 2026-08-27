"""后台管理相关路由"""
import json
from datetime import datetime, timedelta
from decimal import Decimal
from math import ceil
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status, UploadFile, File
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import desc, func, extract

from app.database import get_db
from app.models import (
    User, Course, Category, Teacher, Chapter, Lesson,
    Order, Enrollment, Review, LiveRoom, Bootcamp,
    CoursePackage, FreeResource, Banner,
)
from app.schemas import (
    DashboardStats, SalesTrendItem,
    UserBrief, CourseCreateRequest, TeacherResponse,
)
from app.security import get_current_user, get_current_admin
from app.oss_client import upload_file

router = APIRouter(prefix="/api/v1/admin", tags=["管理后台"])


# ==================== 仪表盘 ====================

@router.get("/dashboard", summary="仪表盘数据")
async def get_dashboard(
    period: str = Query(default="week", pattern=r"^(today|week|month)$"),
    current_user: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """获取仪表盘统计数据"""
    now = datetime.utcnow()

    # 时间范围
    if period == "today":
        start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        prev_start = start - timedelta(days=1)
    elif period == "month":
        start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        prev_start = (start - timedelta(days=1)).replace(day=1)
    else:  # week
        start = now - timedelta(days=7)
        prev_start = start - timedelta(days=7)

    # 统计数据
    total_courses = db.query(Course).count()
    published_courses = db.query(Course).filter(Course.status == "published").count()
    total_users = db.query(User).count()
    total_orders = db.query(Order).filter(Order.pay_status == "paid").count()

    total_revenue = db.query(func.sum(Order.amount)).filter(
        Order.pay_status == "paid"
    ).scalar() or Decimal("0")

    # 当前周期
    period_orders = db.query(Order).filter(
        Order.pay_status == "paid",
        Order.created_at >= start,
    ).count()
    period_revenue = db.query(func.sum(Order.amount)).filter(
        Order.pay_status == "paid",
        Order.created_at >= start,
    ).scalar() or Decimal("0")

    # 上期对比
    prev_revenue = db.query(func.sum(Order.amount)).filter(
        Order.pay_status == "paid",
        Order.created_at >= prev_start,
        Order.created_at < start,
    ).scalar() or Decimal("0")

    revenue_growth = (
        float((period_revenue - prev_revenue) / prev_revenue * 100)
        if prev_revenue > 0 else 0
    )

    # 销售趋势
    trend_data = []
    for i in range(7):
        day = start + timedelta(days=i)
        day_start = day.replace(hour=0, minute=0, second=0)
        day_end = day_start + timedelta(days=1)
        day_amount = db.query(func.sum(Order.amount)).filter(
            Order.pay_status == "paid",
            Order.created_at >= day_start,
            Order.created_at < day_end,
        ).scalar() or Decimal("0")
        day_count = db.query(Order).filter(
            Order.pay_status == "paid",
            Order.created_at >= day_start,
            Order.created_at < day_end,
        ).count()
        trend_data.append({
            "date": day.strftime("%m-%d"),
            "amount": float(day_amount),
            "order_count": day_count,
        })

    # 热门课程
    hot_courses = (
        db.query(Course)
        .filter(Course.status == "published")
        .order_by(desc(Course.student_count))
        .limit(10)
        .all()
    )

    return {
        "stats": {
            "total_courses": published_courses,
            "total_users": total_users,
            "total_orders": total_orders,
            "total_revenue": float(total_revenue),
            "period_orders": period_orders,
            "period_revenue": float(period_revenue),
            "revenue_growth": round(revenue_growth, 1),
        },
        "trend": trend_data,
        "hot_courses": [
            {
                "id": c.id,
                "title": c.title,
                "cover": c.cover,
                "price": float(c.price),
                "student_count": c.student_count,
                "rating": float(c.rating),
            }
            for c in hot_courses
        ],
    }


# ==================== 课程管理 ====================

@router.get("/courses", summary="获取所有课程（管理端）")
async def admin_get_courses(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    keyword: Optional[str] = None,
    category_id: Optional[int] = None,
    status: Optional[str] = None,
    current_user: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """管理端获取课程列表"""
    query = db.query(Course).options(
        joinedload(Course.category),
        joinedload(Course.teacher),
    )

    if keyword:
        from sqlalchemy import or_
        query = query.filter(
            or_(
                Course.title.ilike(f"%{keyword}%"),
                Course.subtitle.ilike(f"%{keyword}%"),
            )
        )
    if category_id:
        query = query.filter(Course.category_id == category_id)
    if status:
        # 指定状态：只查该状态
        query = query.filter(Course.status == status)
    else:
        # 未指定状态：排除已删除（unpublished）的课程，删除的只去回收站看
        query = query.filter(Course.status != "unpublished")

    total = query.count()
    courses = (
        query
        .order_by(desc(Course.updated_at))
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )

    items = []
    for c in courses:
        items.append({
            "id": c.id,
            "title": c.title,
            "subtitle": c.subtitle,
            "slug": c.slug,
            "cover": c.cover,
            "category_name": c.category.name if c.category else "",
            "teacher_name": c.teacher.name if c.teacher else "",
            "price": float(c.price),
            "original_price": float(c.original_price),
            "student_count": c.student_count,
            "rating": float(c.rating),
            "status": c.status,
            "course_type": c.course_type,
            "chapter_count": c.chapter_count,
            "created_at": c.created_at.isoformat(),
            "updated_at": c.updated_at.isoformat(),
        })

    return {
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": ceil(total / page_size) if total > 0 else 0,
        "items": items,
    }


# ==================== 用户管理 ====================

@router.get("/users", summary="获取用户列表")
async def admin_get_users(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    keyword: Optional[str] = None,
    role: Optional[str] = None,
    status: Optional[str] = None,
    current_user: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """管理端获取用户列表"""
    query = db.query(User)

    if keyword:
        query = query.filter(
            (User.nickname.ilike(f"%{keyword}%")) |
            (User.phone.ilike(f"%{keyword}%"))
        )
    if role:
        query = query.filter(User.role == role)
    if status:
        query = query.filter(User.status == status)

    total = query.count()
    users = (
        query
        .order_by(desc(User.created_at))
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )

    return {
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": ceil(total / page_size) if total > 0 else 0,
        "items": [
            {
                "id": u.id,
                "uid": u.uid,
                "nickname": u.nickname,
                "avatar": u.avatar,
                "phone": u.phone[:3] + "****" + u.phone[-4:],
                "role": u.role,
                "status": u.status,
                "last_login_at": u.last_login_at.isoformat() if u.last_login_at else None,
                "created_at": u.created_at.isoformat(),
            }
            for u in users
        ],
    }


@router.put("/users/{user_id}/status", summary="更新用户状态")
async def admin_update_user_status(
    user_id: int,
    req: dict,
    current_user: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """启用/禁用用户"""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="用户不存在")
    if user.id == current_user.id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="不能操作自己")
    user.status = req.get("status", "active")
    db.commit()
    return {"message": "用户状态更新成功"}


# ==================== 订单/交易管理 ====================

@router.get("/orders", summary="获取订单列表")
async def admin_get_orders(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    keyword: Optional[str] = None,
    pay_status: Optional[str] = None,
    pay_method: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    current_user: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """管理端获取订单列表"""
    query = db.query(Order)

    if keyword:
        query = query.filter(
            Order.order_no.ilike(f"%{keyword}%")
        )
    if pay_status:
        query = query.filter(Order.pay_status == pay_status)
    if pay_method:
        query = query.filter(Order.pay_method == pay_method)
    if start_date:
        query = query.filter(Order.created_at >= datetime.fromisoformat(start_date))
    if end_date:
        query = query.filter(Order.created_at <= datetime.fromisoformat(end_date))

    total = query.count()
    orders = (
        query
        .order_by(desc(Order.created_at))
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )

    items = []
    for o in orders:
        user = db.query(User).filter(User.id == o.user_id).first()
        course = db.query(Course).filter(Course.id == o.course_id).first()
        items.append({
            "id": o.id,
            "order_no": o.order_no,
            "amount": float(o.amount),
            "pay_method": o.pay_method,
            "pay_status": o.pay_status,
            "transaction_id": o.transaction_id,
            "user_name": user.nickname if user else "",
            "user_phone": (user.phone[:3] + "****" + user.phone[-4:]) if user else "",
            "course_title": course.title if course else "",
            "created_at": o.created_at.isoformat(),
            "paid_at": o.paid_at.isoformat() if o.paid_at else None,
        })

    return {
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": ceil(total / page_size) if total > 0 else 0,
        "items": items,
    }


# ==================== 销售概览 ====================

@router.get("/sales/overview", summary="销售概览")
async def get_sales_overview(
    period: str = Query(default="month", pattern=r"^(today|week|month)$"),
    current_user: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """获取销售概览数据"""
    now = datetime.utcnow()
    if period == "today":
        start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    elif period == "month":
        start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    else:
        start = now - timedelta(days=7)

    # 总数据
    total_revenue = db.query(func.sum(Order.amount)).filter(
        Order.pay_status == "paid"
    ).scalar() or Decimal("0")
    total_orders = db.query(Order).filter(Order.pay_status == "paid").count()

    period_revenue = db.query(func.sum(Order.amount)).filter(
        Order.pay_status == "paid",
        Order.created_at >= start,
    ).scalar() or Decimal("0")
    period_orders = db.query(Order).filter(
        Order.pay_status == "paid",
        Order.created_at >= start,
    ).count()

    avg_price = float(period_revenue / period_orders) if period_orders > 0 else 0

    # 支付渠道占比
    wechat_count = db.query(Order).filter(
        Order.pay_status == "paid",
        Order.pay_method == "wechat",
        Order.created_at >= start,
    ).count()
    alipay_count = db.query(Order).filter(
        Order.pay_status == "paid",
        Order.pay_method == "alipay",
        Order.created_at >= start,
    ).count()

    total_paid = wechat_count + alipay_count or 1

    return {
        "total_revenue": float(total_revenue),
        "total_orders": total_orders,
        "period_revenue": float(period_revenue),
        "period_orders": period_orders,
        "avg_price": round(avg_price, 2),
        "payment_channels": {
            "wechat": {"count": wechat_count, "percent": round(wechat_count / total_paid * 100, 1)},
            "alipay": {"count": alipay_count, "percent": round(alipay_count / total_paid * 100, 1)},
        },
    }


# ==================== 交付监控 ====================

@router.get("/delivery/{course_id}", summary="课程交付监控")
async def get_delivery_stats(
    course_id: int,
    current_user: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """获取课程交付数据"""
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="课程不存在")

    total_students = db.query(Enrollment).filter(
        Enrollment.course_id == course_id
    ).count()

    avg_progress = db.query(func.avg(Enrollment.progress)).filter(
        Enrollment.course_id == course_id
    ).scalar() or 0

    # 学习进度分布
    progress_dist = {"0-25": 0, "25-50": 0, "50-75": 0, "75-100": 0}
    enrollments = db.query(Enrollment).filter(Enrollment.course_id == course_id).all()
    for e in enrollments:
        p = e.progress or 0
        if p <= 25:
            progress_dist["0-25"] += 1
        elif p <= 50:
            progress_dist["25-50"] += 1
        elif p <= 75:
            progress_dist["50-75"] += 1
        else:
            progress_dist["75-100"] += 1

    # 学员列表
    students = (
        db.query(Enrollment)
        .options(joinedload(Enrollment.user))
        .filter(Enrollment.course_id == course_id)
        .order_by(desc(Enrollment.last_active_at))
        .limit(50)
        .all()
    )

    return {
        "course_title": course.title,
        "total_students": total_students,
        "avg_progress": round(float(avg_progress), 1),
        "progress_distribution": progress_dist,
        "students": [
            {
                "user_name": s.user.nickname if s.user else "",
                "user_avatar": s.user.avatar if s.user else "",
                "progress": s.progress,
                "last_active_at": s.last_active_at.isoformat() if s.last_active_at else None,
                "enrolled_at": s.enrolled_at.isoformat(),
            }
            for s in students
        ],
    }


# ==================== 评价管理 ====================

@router.get("/reviews", summary="评价列表（管理端）")
async def admin_get_reviews(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    course_id: Optional[int] = None,
    current_user: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """管理端获取评价列表"""
    query = db.query(Review).options(
        joinedload(Review.user),
        joinedload(Review.course),
    )
    if course_id:
        query = query.filter(Review.course_id == course_id)

    total = query.count()
    reviews = (
        query
        .order_by(desc(Review.created_at))
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )

    return {
        "total": total,
        "page": page,
        "page_size": page_size,
        "items": [
            {
                "id": r.id,
                "user_name": r.user.nickname if r.user else "",
                "course_title": r.course.title if r.course else "",
                "rating": r.rating,
                "content": r.content,
                "created_at": r.created_at.isoformat(),
            }
            for r in reviews
        ],
    }


# ==================== 分类管理 ====================

@router.get("/categories", summary="获取分类列表")
async def admin_get_categories(
    current_user: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """管理端获取所有课程分类（含父子层级、课程数量）"""
    categories = db.query(Category).order_by(Category.sort_order).all()

    # 分类 -> 该分类及所有子分类下的课程数量（统计全部状态，含草稿/未发布）
    def _course_count(cat_id: int) -> int:
        return db.query(Course).filter(
            Course.category_id == cat_id,
        ).count()

    items = []
    for c in categories:
        # 统计该分类及子分类的课程总数
        total_count = _course_count(c.id)
        child_ids = [child.id for child in categories if child.parent_id == c.id]
        for child_id in child_ids:
            total_count += _course_count(child_id)

        items.append({
            "id": c.id,
            "name": c.name,
            "slug": c.slug,
            "icon": c.icon,
            "description": c.description,
            "sort_order": c.sort_order,
            "parent_id": c.parent_id,
            "is_parent": c.parent_id is None,
            "course_count": total_count,
            "created_at": c.created_at.isoformat() if c.created_at else None,
        })

    return {"items": items, "parents": [c.id for c in categories if c.parent_id is None]}


@router.post("/categories", summary="创建分类")
async def create_category(
    req: dict,
    current_user: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """创建课程分类"""
    name = req.get("name", "").strip()
    if not name:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="分类名称不能为空")

    # 校验上级分类
    parent_id = req.get("parent_id")
    if parent_id:
        parent = db.query(Category).filter(Category.id == parent_id).first()
        if not parent:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="上级分类不存在")
        if parent.parent_id is not None:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="仅支持两级分类，上级分类必须是顶级分类")

    slug = req.get("slug", "").strip() or name.lower().replace(" ", "-")
    existing = db.query(Category).filter(Category.slug == slug).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="分类slug已存在")

    # 计算排序值
    max_sort = db.query(func.max(Category.sort_order)).scalar() or 0

    cat = Category(
        name=name,
        slug=slug,
        icon=req.get("icon", ""),
        description=req.get("description", ""),
        sort_order=req.get("sort_order", max_sort + 1),
        parent_id=parent_id,
    )
    db.add(cat)
    db.commit()
    db.refresh(cat)
    return {"id": cat.id, "message": "分类创建成功"}


@router.put("/categories/{category_id}", summary="更新分类")
async def update_category(
    category_id: int,
    req: dict,
    current_user: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """更新课程分类"""
    cat = db.query(Category).filter(Category.id == category_id).first()
    if not cat:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="分类不存在")

    name = req.get("name", "").strip()
    if name:
        cat.name = name

    new_slug = req.get("slug", "").strip()
    if new_slug:
        # 检查 slug 冲突（排除自身）
        existing = db.query(Category).filter(
            Category.slug == new_slug,
            Category.id != category_id,
        ).first()
        if existing:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="分类slug已存在")
        cat.slug = new_slug

    if "icon" in req:
        cat.icon = req.get("icon", "")
    if "description" in req:
        cat.description = req.get("description", "")
    if "sort_order" in req and req.get("sort_order") is not None:
        cat.sort_order = req.get("sort_order")

    # 修改上级分类（支持设为顶级 parent_id=null）
    if "parent_id" in req:
        new_parent_id = req.get("parent_id")
        if new_parent_id is None:
            cat.parent_id = None
        else:
            if new_parent_id == cat.id:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="上级分类不能是自身")
            # 不能设为自己的子分类
            child_ids = [c.id for c in db.query(Category).filter(Category.parent_id == cat.id).all()]
            if new_parent_id in child_ids:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="不能将分类移动到其子分类下")
            parent = db.query(Category).filter(Category.id == new_parent_id).first()
            if not parent:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="上级分类不存在")
            if parent.parent_id is not None:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="仅支持两级分类，上级分类必须是顶级分类")
            cat.parent_id = new_parent_id

    db.commit()
    return {"message": "分类更新成功"}


@router.delete("/categories/{category_id}", summary="删除分类")
async def delete_category(
    category_id: int,
    current_user: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """删除课程分类（需分类下无课程、无子分类）"""
    cat = db.query(Category).filter(Category.id == category_id).first()
    if not cat:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="分类不存在")

    # 有子分类时禁止删除
    child_count = db.query(Category).filter(Category.parent_id == category_id).count()
    if child_count > 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"该分类下还有 {child_count} 个子分类，请先删除子分类",
        )

    course_count = db.query(Course).filter(Course.category_id == category_id).count()
    if course_count > 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"该分类下还有 {course_count} 门课程，无法删除",
        )

    db.delete(cat)
    db.commit()
    return {"message": "分类删除成功"}


# ==================== 讲师管理 ====================

@router.post("/teachers", summary="创建讲师")
async def create_teacher(
    req: dict,
    current_user: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """创建讲师"""
    teacher = Teacher(
        name=req["name"],
        avatar=req.get("avatar", ""),
        title=req.get("title", ""),
        description=req.get("description", ""),
        skills=json.dumps(req.get("skills", []), ensure_ascii=False),
        experience=json.dumps(req.get("experience", []), ensure_ascii=False),
    )
    db.add(teacher)
    db.commit()
    return {"id": teacher.id, "message": "讲师创建成功"}


@router.get("/teachers", summary="讲师列表（管理端）")
async def admin_list_teachers(
    keyword: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin),
):
    """后台获取讲师列表"""
    query = db.query(Teacher)
    if keyword:
        query = query.filter(Teacher.name.like(f"%{keyword}%"))
    teachers = query.order_by(Teacher.id.desc()).all()
    result = []
    for t in teachers:
        result.append({
            "id": t.id,
            "name": t.name,
            "avatar": t.avatar or "",
            "title": t.title or "",
            "description": t.description or "",
            "course_count": t.course_count,
            "student_count": t.student_count,
            "rating": t.rating,
            "status": t.status,
        })
    return result


@router.get("/teachers/{teacher_id}", summary="讲师详情（管理端）")
async def admin_get_teacher(
    teacher_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin),
):
    """后台获取讲师详情"""
    teacher = db.query(Teacher).filter(Teacher.id == teacher_id).first()
    if not teacher:
        raise HTTPException(status_code=404, detail="讲师不存在")
    return {
        "id": teacher.id,
        "name": teacher.name,
        "avatar": teacher.avatar or "",
        "title": teacher.title or "",
        "description": teacher.description or "",
        "skills": _safe_json_load(teacher.skills),
        "experience": _safe_json_load(teacher.experience),
        "course_count": teacher.course_count,
        "student_count": teacher.student_count,
        "rating": teacher.rating,
        "status": teacher.status,
    }


@router.put("/teachers/{teacher_id}", summary="更新讲师")
async def admin_update_teacher(
    teacher_id: int,
    req: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin),
):
    """更新讲师信息"""
    teacher = db.query(Teacher).filter(Teacher.id == teacher_id).first()
    if not teacher:
        raise HTTPException(status_code=404, detail="讲师不存在")
    if "name" in req and req.get("name"):
        teacher.name = req["name"]
    if "avatar" in req:
        teacher.avatar = req.get("avatar", teacher.avatar or "")
    if "title" in req:
        teacher.title = req.get("title", teacher.title or "")
    if "description" in req:
        teacher.description = req.get("description", teacher.description or "")
    if "skills" in req:
        teacher.skills = json.dumps(req.get("skills", []), ensure_ascii=False)
    if "experience" in req:
        teacher.experience = json.dumps(req.get("experience", []), ensure_ascii=False)
    if "rating" in req:
        teacher.rating = float(req.get("rating", teacher.rating or 5.0))
    if "status" in req:
        teacher.status = req.get("status", teacher.status or "active")
    db.commit()
    return {"message": "讲师更新成功"}


@router.delete("/teachers/{teacher_id}", summary="删除讲师")
async def admin_delete_teacher(
    teacher_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin),
):
    """删除讲师"""
    teacher = db.query(Teacher).filter(Teacher.id == teacher_id).first()
    if not teacher:
        raise HTTPException(status_code=404, detail="讲师不存在")
    # 有课程的讲师不允许删除（保护数据完整性）
    course_count = db.query(Course).filter(Course.teacher_id == teacher_id).count()
    if course_count > 0:
        raise HTTPException(status_code=400, detail="该讲师下有关联课程，无法删除")
    db.delete(teacher)
    db.commit()
    return {"message": "讲师删除成功"}


def _safe_json_load(value):
    """安全解析 JSON 字符串"""
    if value is None:
        return []
    if isinstance(value, (list, dict)):
        return value
    try:
        return json.loads(value) if value else []
    except (ValueError, TypeError):
        return []


# ==================== 文件上传 ====================

@router.post("/upload/image", summary="上传图片")
async def admin_upload_image(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_admin),
):
    """管理端上传图片"""
    url = await upload_file(file, "admin/images", "image")
    return {"url": url, "message": "上传成功"}


@router.post("/upload/video", summary="上传视频")
async def admin_upload_video(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_admin),
):
    """管理端上传视频"""
    url = await upload_file(file, "admin/videos", "video")
    return {"url": url, "message": "上传成功"}


# ==================== 初始化种子数据 ====================

@router.post("/seed", summary="初始化种子数据")
async def seed_data(
    current_user: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """初始化演示数据"""
    from app.security import hash_password

    # 创建默认管理员账号
    admin = db.query(User).filter(User.nickname == "admin").first()
    if not admin:
        admin = User(
            nickname="admin",
            phone="13800000000",  # 使用合法手机号格式
            password_hash=hash_password("Admin123456!"),
            role="admin",
            status="active",
        )
        db.add(admin)
        db.commit()
        print("[种子数据] 默认管理员账号已创建: admin / Admin123456!")

    # 创建分类
    categories_data = [
        {"name": "IT技能学院", "slug": "it-academy", "icon": "💻", "description": "编程开发与IT技术"},
        {"name": "AI全媒体运营", "slug": "ai-media", "icon": "🤖", "description": "AI与新媒体运营"},
        {"name": "跨境电商", "slug": "cross-border", "icon": "🌍", "description": "跨境电商与国际贸易"},
        {"name": "职场技能", "slug": "career-skills", "icon": "📊", "description": "职场通用技能"},
    ]
    categories = []
    for cd in categories_data:
        existing = db.query(Category).filter(Category.slug == cd["slug"]).first()
        if not existing:
            cat = Category(**cd)
            db.add(cat)
            db.flush()
            categories.append(cat)
        else:
            categories.append(existing)
    db.commit()

    # 创建讲师
    teachers_data = [
        {
            "name": "张大牛", "title": "前字节跳动前端架构师",
            "description": "10年前端开发经验，Vue/React核心贡献者",
            "skills": ["Vue3", "React", "Node.js", "TypeScript"],
            "experience": [
                {"company": "字节跳动", "role": "前端架构师", "period": "2018-2023"},
                {"company": "阿里巴巴", "role": "高级前端工程师", "period": "2015-2018"},
            ],
        },
        {
            "name": "陈院长", "title": "AI应用专家 / 前微软研究员",
            "description": "专注AI在内容创作领域的应用",
            "skills": ["ChatGPT", "Midjourney", "Stable Diffusion", "Prompt Engineering"],
            "experience": [
                {"company": "微软亚洲研究院", "role": "研究员", "period": "2017-2022"},
                {"company": "百度AI", "role": "高级算法工程师", "period": "2014-2017"},
            ],
        },
        {
            "name": "Alex Wang", "title": "跨境亿级卖家 / 亚马逊金牌讲师",
            "description": "8年跨境电商经验，年GMV超5000万美金",
            "skills": ["亚马逊运营", "TikTok Shop", "供应链管理", "品牌出海"],
            "experience": [
                {"company": "自营跨境品牌", "role": "创始人", "period": "2016-至今"},
                {"company": "环球易购", "role": "运营总监", "period": "2013-2016"},
            ],
        },
        {
            "name": "王算法", "title": "ACM金牌 / 前Google工程师",
            "description": "算法竞赛与面试指导专家",
            "skills": ["算法", "数据结构", "系统设计", "LeetCode"],
            "experience": [
                {"company": "Google", "role": "软件工程师", "period": "2019-2023"},
                {"company": "ACM集训队", "role": "教练", "period": "2017-至今"},
            ],
        },
    ]
    teachers = []
    for td in teachers_data:
        existing = db.query(Teacher).filter(Teacher.name == td["name"]).first()
        if not existing:
            teacher = Teacher(**td)
            db.add(teacher)
            db.flush()
            teachers.append(teacher)
        else:
            teachers.append(existing)
    db.commit()

    # 创建课程
    courses_data = [
        {
            "title": "Vue3 + Node.js 全栈开发实战班",
            "subtitle": "从入门到就业，30个项目实战",
            "category_id": categories[0].id,
            "teacher_id": teachers[0].id,
            "difficulty": "intermediate",
            "course_type": "recorded",
            "price": 3999,
            "original_price": 6999,
            "tags": ["Vue3", "Node.js", "全栈", "实战"],
            "learning_goals": ["掌握Vue3全家桶", "Node.js后端开发", "独立完成全栈项目"],
            "is_featured": True,
        },
        {
            "title": "Go 高并发架构实战",
            "subtitle": "掌握Go语言核心，构建高性能系统",
            "category_id": categories[0].id,
            "teacher_id": teachers[3].id,
            "difficulty": "advanced",
            "course_type": "recorded",
            "price": 4999,
            "original_price": 8999,
            "tags": ["Go", "高并发", "架构"],
            "learning_goals": ["Go语言核心语法", "并发编程", "微服务架构"],
            "is_featured": True,
        },
        {
            "title": "ChatGPT + Midjourney 全媒体内容创作",
            "subtitle": "用AI工具10倍提升内容创作效率",
            "category_id": categories[1].id,
            "teacher_id": teachers[1].id,
            "difficulty": "beginner",
            "course_type": "recorded",
            "price": 2999,
            "original_price": 4999,
            "tags": ["AI", "ChatGPT", "Midjourney", "内容创作"],
            "learning_goals": ["AI文案生成", "AI绘画", "全媒体矩阵搭建"],
            "is_featured": True,
        },
        {
            "title": "亚马逊百万美金卖家实战营",
            "subtitle": "从选品到运营，全程实战指导",
            "category_id": categories[2].id,
            "teacher_id": teachers[2].id,
            "difficulty": "intermediate",
            "course_type": "bootcamp",
            "price": 5999,
            "original_price": 9999,
            "tags": ["亚马逊", "跨境电商", "选品", "运营"],
            "learning_goals": ["选品方法论", "Listing优化", "广告投放", "供应链管理"],
            "is_featured": True,
        },
        {
            "title": "算法面试通关指南",
            "subtitle": "搞定大厂算法面试",
            "category_id": categories[0].id,
            "teacher_id": teachers[3].id,
            "difficulty": "advanced",
            "course_type": "recorded",
            "price": 3499,
            "original_price": 5999,
            "tags": ["算法", "面试", "LeetCode"],
            "learning_goals": ["高频算法题", "系统设计", "面试技巧"],
            "is_recommended": True,
        },
        {
            "title": "短视频爆款脚本与AI虚拟人直播",
            "subtitle": "从0到1打造个人IP",
            "category_id": categories[1].id,
            "teacher_id": teachers[1].id,
            "difficulty": "beginner",
            "course_type": "recorded",
            "price": 1999,
            "original_price": 3999,
            "tags": ["短视频", "AI虚拟人", "直播", "个人IP"],
            "learning_goals": ["脚本创作", "AI虚拟人制作", "直播运营"],
            "is_recommended": True,
        },
        {
            "title": "DevOps 工程化实践",
            "subtitle": "CI/CD + K8s + 监控体系搭建",
            "category_id": categories[0].id,
            "teacher_id": teachers[0].id,
            "difficulty": "advanced",
            "course_type": "recorded",
            "price": 4599,
            "original_price": 7999,
            "tags": ["DevOps", "Docker", "K8s", "CI/CD"],
            "learning_goals": ["容器化部署", "CI/CD流水线", "监控告警"],
            "is_recommended": True,
        },
        {
            "title": "TikTok Shop 全球开店指南",
            "subtitle": "把握短视频电商新风口",
            "category_id": categories[2].id,
            "teacher_id": teachers[2].id,
            "difficulty": "beginner",
            "course_type": "recorded",
            "price": 2599,
            "original_price": 4599,
            "tags": ["TikTok", "短视频电商", "直播带货"],
            "learning_goals": ["TikTok开店", "内容运营", "直播带货"],
            "is_recommended": True,
        },
    ]

    created_courses = []
    for cd in courses_data:
        existing = db.query(Course).filter(Course.title == cd["title"]).first()
        if not existing:
            slug = cd["title"].lower().replace(" ", "-").replace("+", "-")
            slug = slug.replace("--", "-")
            course = Course(
                title=cd["title"],
                subtitle=cd["subtitle"],
                slug=slug,
                category_id=cd["category_id"],
                teacher_id=cd["teacher_id"],
                difficulty=cd["difficulty"],
                course_type=cd["course_type"],
                price=cd["price"],
                original_price=cd["original_price"],
                tags=json.dumps(cd.get("tags", []), ensure_ascii=False),
                learning_goals=json.dumps(cd.get("learning_goals", []), ensure_ascii=False),
                is_featured=cd.get("is_featured", False),
                is_recommended=cd.get("is_recommended", False),
                status="published",
                published_at=datetime.utcnow(),
            )
            db.add(course)
            db.flush()
            created_courses.append(course)
        else:
            created_courses.append(existing)
    db.commit()

    # 为第一个课程创建章节
    if created_courses:
        first_course = created_courses[0]
        existing_chapters = db.query(Chapter).filter(Chapter.course_id == first_course.id).first()
        if not existing_chapters:
            chapters = [
                {"title": "前端工程化基础与Vue3核心", "sort_order": 1, "is_free": True},
                {"title": "Vue3深度进阶", "sort_order": 2, "is_free": False},
                {"title": "Node.js全栈架构", "sort_order": 3, "is_free": False},
            ]
            for ch_data in chapters:
                chapter = Chapter(
                    course_id=first_course.id,
                    title=ch_data["title"],
                    sort_order=ch_data["sort_order"],
                    is_free=ch_data["is_free"],
                )
                db.add(chapter)
                db.flush()

                # 为每个章节添加课时
                if ch_data["sort_order"] == 1:
                    lessons = [
                        {"title": "课程介绍与环境搭建", "lesson_type": "video", "video_duration": 750, "is_free": True, "sort_order": 1},
                        {"title": "学习指南与资源下载", "lesson_type": "document", "is_free": True, "sort_order": 2},
                        {"title": "Vue3核心概念入门", "lesson_type": "video", "video_duration": 1200, "is_free": True, "sort_order": 3},
                    ]
                else:
                    lessons = [
                        {"title": f"{ch_data['title']} - 课时1", "lesson_type": "video", "video_duration": 900, "is_free": False, "sort_order": 1},
                        {"title": f"{ch_data['title']} - 课时2", "lesson_type": "video", "video_duration": 900, "is_free": False, "sort_order": 2},
                    ]

                for le_data in lessons:
                    lesson = Lesson(chapter_id=chapter.id, **le_data)
                    db.add(lesson)

            first_course.chapter_count = 3
            first_course.duration_hours = 2.5
            db.commit()

    # 更新讲师课程数
    for teacher in teachers:
        teacher.course_count = db.query(Course).filter(
            Course.teacher_id == teacher.id,
            Course.status.in_(["published", "approved"]),
        ).count()
    db.commit()

    return {"message": "种子数据初始化完成", "courses_count": len(created_courses)}
