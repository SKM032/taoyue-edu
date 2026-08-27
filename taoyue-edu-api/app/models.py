"""数据库模型定义"""
import json
import uuid
from datetime import datetime, timedelta
from sqlalchemy import (
    Column, Integer, String, Text, Boolean, DateTime, Float,
    DECIMAL, Enum as SAEnum, ForeignKey, Index, BigInteger
)
from sqlalchemy.dialects.mysql import MEDIUMTEXT
from sqlalchemy.orm import relationship
from app.database import Base


# 兼容低版本 MySQL，用 Text 替代 JSON
def json_column(**kwargs):
    """返回 Text 列，自动序列化/反序列化 JSON"""
    return Column(Text, **kwargs)


def json_default(value):
    """读取 JSON 字段，兼容 None/空字符串"""
    if value is None or value == "":
        return None
    if isinstance(value, (list, dict)):
        return value
    try:
        return json.loads(value)
    except (json.JSONDecodeError, TypeError):
        return value


def json_set(value):
    """写入 JSON 字段"""
    if value is None:
        return None
    if isinstance(value, str):
        return value
    return json.dumps(value, ensure_ascii=False)


def gen_uuid():
    return str(uuid.uuid4().hex)


class User(Base):
    """用户表"""
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, autoincrement=True)
    uid = Column(String(64), unique=True, nullable=False, default=gen_uuid, index=True)
    nickname = Column(String(50), nullable=False)
    avatar = Column(String(500), default="")
    phone = Column(String(20), unique=True, nullable=False, index=True)
    email = Column(String(100), default="")
    password_hash = Column(String(256), nullable=False)
    role = Column(String(20), default="student", comment="student/teacher/admin")
    status = Column(String(20), default="active", comment="active/disabled")
    last_login_at = Column(DateTime, nullable=True)
    last_login_ip = Column(String(50), default="")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # 关系
    enrollments = relationship("Enrollment", back_populates="user")
    orders = relationship("Order", back_populates="user")
    reviews = relationship("Review", back_populates="user")
    carts = relationship("Cart")


class SmsCode(Base):
    """短信验证码表"""
    __tablename__ = "sms_codes"

    id = Column(Integer, primary_key=True, autoincrement=True)
    phone = Column(String(20), nullable=False, index=True)
    code = Column(String(6), nullable=False)
    type = Column(String(20), default="login", comment="login/register/reset_password")
    used = Column(Boolean, default=False)
    expires_at = Column(DateTime, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)


class Category(Base):
    """课程分类表"""
    __tablename__ = "categories"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(50), unique=True, nullable=False)
    slug = Column(String(50), unique=True, nullable=False)
    icon = Column(String(500), default="")
    description = Column(String(500), default="")
    sort_order = Column(Integer, default=0)
    parent_id = Column(Integer, ForeignKey("categories.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    courses = relationship("Course", back_populates="category")


class Teacher(Base):
    """讲师表"""
    __tablename__ = "teachers"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(50), nullable=False)
    avatar = Column(String(500), default="")
    title = Column(String(100), default="", comment="头衔")
    description = Column(Text, default="")
    skills = json_column(default="[]")
    experience = json_column(default="[]", comment="职业经历")
    course_count = Column(Integer, default=0)
    student_count = Column(Integer, default=0)
    rating = Column(Float, default=5.0)
    status = Column(String(20), default="active")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    courses = relationship("Course", back_populates="teacher")


class Course(Base):
    """课程表"""
    __tablename__ = "courses"

    id = Column(Integer, primary_key=True, autoincrement=True)
    title = Column(String(200), nullable=False)
    subtitle = Column(String(300), default="")
    slug = Column(String(200), unique=True, nullable=False, index=True)
    cover = Column(String(500), default="")
    # 课程简介：富文本 HTML，容量升级为 MEDIUMTEXT(16MB)
    description = Column(MEDIUMTEXT, default="")
    category_id = Column(Integer, ForeignKey("categories.id"), nullable=False)
    teacher_id = Column(Integer, ForeignKey("teachers.id"), nullable=True)
    difficulty = Column(String(20), default="beginner", comment="beginner/intermediate/advanced")
    course_type = Column(String(50), default="recorded", comment="recorded/live/bootcamp/private")
    price = Column(DECIMAL(10, 2), default=0.00)
    original_price = Column(DECIMAL(10, 2), default=0.00)
    duration_hours = Column(Float, default=0, comment="总时长（小时）")
    chapter_count = Column(Integer, default=0)
    student_count = Column(Integer, default=0)
    rating = Column(Float, default=5.0)
    review_count = Column(Integer, default=0)
    tags = json_column(default="[]")
    learning_goals = json_column(default="[]", comment="学习目标")
    prerequisites = json_column(default="[]", comment="先修要求")
    status = Column(
        String(20), default="draft",
        comment="draft/pending_review/reviewing/approved/rejected/published/unpublished"
    )
    is_featured = Column(Boolean, default=False)
    is_recommended = Column(Boolean, default=False)
    sort_order = Column(Integer, default=0)
    published_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # 关系
    category = relationship("Category", back_populates="courses")
    teacher = relationship("Teacher", back_populates="courses")
    chapters = relationship("Chapter", back_populates="course", order_by="Chapter.sort_order")
    packages = relationship("CoursePackage", back_populates="course")
    enrollments = relationship("Enrollment", back_populates="course")
    reviews = relationship("Review", back_populates="course")

    __table_args__ = (
        Index("idx_course_category_status", "category_id", "status"),
        Index("idx_course_published", "status", "published_at"),
    )


class Chapter(Base):
    """课程章节表"""
    __tablename__ = "chapters"

    id = Column(Integer, primary_key=True, autoincrement=True)
    course_id = Column(Integer, ForeignKey("courses.id"), nullable=False)
    title = Column(String(200), nullable=False)
    description = Column(Text, default="")
    sort_order = Column(Integer, default=0)
    is_free = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    course = relationship("Course", back_populates="chapters")
    lessons = relationship("Lesson", back_populates="chapter", order_by="Lesson.sort_order")


class Lesson(Base):
    """课时表"""
    __tablename__ = "lessons"

    id = Column(Integer, primary_key=True, autoincrement=True)
    chapter_id = Column(Integer, ForeignKey("chapters.id"), nullable=False)
    title = Column(String(200), nullable=False)
    lesson_type = Column(String(20), default="video", comment="video/document/quiz/resource")
    video_url = Column(String(500), default="")
    video_duration = Column(Integer, default=0, comment="视频时长（秒）")
    document_url = Column(String(500), default="")
    content = Column(Text, default="")
    is_free = Column(Boolean, default=False)
    sort_order = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    chapter = relationship("Chapter", back_populates="lessons")


class CoursePackage(Base):
    """课程套餐表"""
    __tablename__ = "course_packages"

    id = Column(Integer, primary_key=True, autoincrement=True)
    course_id = Column(Integer, ForeignKey("courses.id"), nullable=False)
    name = Column(String(100), nullable=False, comment="套餐名：体验课/集训营/系统班/私教陪跑")
    price = Column(DECIMAL(10, 2), default=0.00)
    original_price = Column(DECIMAL(10, 2), default=0.00)
    description = Column(String(500), default="")
    features = json_column(default="[]")
    sort_order = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)

    course = relationship("Course", back_populates="packages")


class Enrollment(Base):
    """选课/报名表"""
    __tablename__ = "enrollments"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    course_id = Column(Integer, ForeignKey("courses.id"), nullable=False)
    package_id = Column(Integer, ForeignKey("course_packages.id"), nullable=True)
    progress = Column(Float, default=0, comment="学习进度 0-100")
    completed_lessons = json_column(default="[]", comment="已完成的课时ID列表")
    last_lesson_id = Column(Integer, nullable=True)
    last_active_at = Column(DateTime, nullable=True)
    enrolled_at = Column(DateTime, default=datetime.utcnow)
    expires_at = Column(DateTime, nullable=True)

    user = relationship("User", back_populates="enrollments")
    course = relationship("Course", back_populates="enrollments")

    __table_args__ = (
        Index("idx_enrollment_user_course", "user_id", "course_id", unique=True),
    )


class Review(Base):
    """课程评价表"""
    __tablename__ = "reviews"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    course_id = Column(Integer, ForeignKey("courses.id"), nullable=False)
    rating = Column(Float, nullable=False, comment="评分 1-5")
    content = Column(Text, default="")
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="reviews")
    course = relationship("Course", back_populates="reviews")


class Order(Base):
    """订单表"""
    __tablename__ = "orders"

    id = Column(Integer, primary_key=True, autoincrement=True)
    order_no = Column(String(32), unique=True, nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    # 主课程（兼容单课程订单）；合并订单时指向第一门课程，完整明细存于 order_items
    course_id = Column(Integer, ForeignKey("courses.id"), nullable=True)
    package_id = Column(Integer, ForeignKey("course_packages.id"), nullable=True)
    amount = Column(DECIMAL(10, 2), nullable=False)
    pay_method = Column(String(20), default="", comment="wechat/alipay")
    pay_status = Column(String(20), default="pending", comment="pending/paid/refunded/cancelled")
    # 支付链接（create_order 时生成并存储，详情接口直接读取，避免重复生成交易单）
    code_url = Column(Text, default="", comment="微信 Native 扫码 URL")
    pay_url = Column(Text, default="", comment="支付宝 收银台跳转 URL")
    mweb_url = Column(Text, default="", comment="微信 H5 唤起支付 URL")
    transaction_id = Column(String(64), default="", comment="第三方交易号")
    paid_at = Column(DateTime, nullable=True)
    refund_no = Column(String(64), default="", comment="微信/支付宝退款单号")
    refund_amount = Column(DECIMAL(10, 2), default=0.00)
    refund_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User", back_populates="orders")
    # 订单明细（支持多课程合并订单）
    items = relationship(
        "OrderItem",
        back_populates="order",
        cascade="all, delete-orphan",
        order_by="OrderItem.id",
    )


class OrderItem(Base):
    """订单明细表：一个订单可关联多门课程（合并结算）"""
    __tablename__ = "order_items"

    id = Column(Integer, primary_key=True, autoincrement=True)
    order_id = Column(Integer, ForeignKey("orders.id"), nullable=False, index=True)
    course_id = Column(Integer, ForeignKey("courses.id"), nullable=False)
    course_title = Column(String(200), default="", comment="下单时课程标题快照")
    course_cover = Column(String(500), default="", comment="下单时课程封面快照")
    price = Column(DECIMAL(10, 2), default=0.00, comment="下单时课程价格")
    created_at = Column(DateTime, default=datetime.utcnow)

    order = relationship("Order", back_populates="items")
    course = relationship("Course")


class Cart(Base):
    """购物车表"""
    __tablename__ = "carts"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    course_id = Column(Integer, ForeignKey("courses.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    course = relationship("Course")

    __table_args__ = (
        Index("idx_cart_user_course", "user_id", "course_id", unique=True),
    )


class LiveRoom(Base):
    """直播公开课表"""
    __tablename__ = "live_rooms"

    id = Column(Integer, primary_key=True, autoincrement=True)
    title = Column(String(200), nullable=False)
    cover = Column(String(500), default="")
    teacher_id = Column(Integer, ForeignKey("teachers.id"), nullable=False)
    description = Column(Text, default="")
    start_at = Column(DateTime, nullable=False)
    end_at = Column(DateTime, nullable=False)
    status = Column(String(20), default="upcoming", comment="upcoming/live/ended/replay")
    replay_url = Column(String(500), default="")
    viewer_count = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class Bootcamp(Base):
    """训练营表"""
    __tablename__ = "bootcamps"

    id = Column(Integer, primary_key=True, autoincrement=True)
    title = Column(String(200), nullable=False)
    cover = Column(String(500), default="")
    description = Column(Text, default="")
    teacher_id = Column(Integer, ForeignKey("teachers.id"), nullable=False)
    price = Column(DECIMAL(10, 2), default=0.00)
    original_price = Column(DECIMAL(10, 2), default=0.00)
    max_students = Column(Integer, default=50)
    enrolled_count = Column(Integer, default=0)
    start_at = Column(DateTime, nullable=False)
    end_at = Column(DateTime, nullable=False)
    status = Column(String(20), default="upcoming", comment="upcoming/enrolling/in_progress/ended")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class FreeResource(Base):
    """免费资料表"""
    __tablename__ = "free_resources"

    id = Column(Integer, primary_key=True, autoincrement=True)
    title = Column(String(200), nullable=False)
    file_type = Column(String(20), nullable=False, comment="pdf/zip/xlsx/ppt")
    file_url = Column(String(500), nullable=False)
    icon = Column(String(500), default="")
    download_count = Column(Integer, default=0)
    sort_order = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)


class Banner(Base):
    """轮播图/Banner表"""
    __tablename__ = "banners"

    id = Column(Integer, primary_key=True, autoincrement=True)
    title = Column(String(200), default="")
    image_url = Column(String(500), nullable=False)
    link_url = Column(String(500), default="")
    position = Column(String(50), default="home", comment="home/courses/category")
    sort_order = Column(Integer, default=0)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
