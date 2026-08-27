"""Pydantic 请求/响应模型"""
import json
from typing import Optional, List, Any
from datetime import datetime
from decimal import Decimal
from pydantic import BaseModel, Field, EmailStr, field_validator


# ==================== 通用 ====================

class PaginationParams(BaseModel):
    """分页参数"""
    page: int = Field(default=1, ge=1, description="页码")
    page_size: int = Field(default=20, ge=1, le=100, description="每页数量")


class PaginatedResponse(BaseModel):
    """分页响应"""
    total: int
    page: int
    page_size: int
    total_pages: int
    items: List[Any]


# ==================== 认证相关 ====================

class SendSmsRequest(BaseModel):
    """发送短信验证码请求"""
    phone: str = Field(..., min_length=11, max_length=11, pattern=r"^1[3-9]\d{9}$")
    type: str = Field(default="login", pattern=r"^(login|register|reset_password)$")
    # 图形验证码（防爬虫）
    captcha_id: Optional[str] = None
    captcha_text: Optional[str] = None

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, v):
        if not v.isdigit():
            raise ValueError("手机号必须为数字")
        return v


class SmsLoginRequest(BaseModel):
    """短信验证码登录请求"""
    phone: str = Field(..., min_length=11, max_length=11, pattern=r"^1[3-9]\d{9}$")
    code: str = Field(..., min_length=6, max_length=6)


class SmsRegisterRequest(BaseModel):
    """短信验证码注册请求"""
    phone: str = Field(..., min_length=11, max_length=11, pattern=r"^1[3-9]\d{9}$")
    code: str = Field(..., min_length=6, max_length=6)
    nickname: str = Field(..., min_length=2, max_length=20)


class PasswordRegisterRequest(BaseModel):
    """账号密码注册请求"""
    username: str = Field(..., min_length=2, max_length=20, description="登录账号")
    password: str = Field(..., min_length=8, max_length=64, description="密码至少8位")


class PasswordLoginRequest(BaseModel):
    """账号密码登录请求（客户端学生端）"""
    username: str = Field(..., min_length=1, description="登录账号")
    password: str = Field(..., min_length=1, description="密码")


class TokenResponse(BaseModel):
    """令牌响应"""
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int
    user: "UserBrief"


class UserBrief(BaseModel):
    """用户简要信息"""
    id: int
    uid: str
    nickname: str
    avatar: str
    phone: str
    role: str

    class Config:
        from_attributes = True


class UserProfileUpdate(BaseModel):
    """更新用户资料"""
    nickname: Optional[str] = Field(None, min_length=2, max_length=20)
    avatar: Optional[str] = None
    email: Optional[EmailStr] = None


# ==================== 课程相关 ====================

class CategoryResponse(BaseModel):
    """分类响应（含父子层级）"""
    id: int
    name: str
    slug: str
    icon: str = ""
    description: str = ""
    course_count: Optional[int] = 0
    parent_id: Optional[int] = None
    children: Optional[list["CategoryResponse"]] = None

    class Config:
        from_attributes = True


class TeacherBrief(BaseModel):
    """讲师简要信息"""
    id: int
    name: str
    avatar: str
    title: str

    class Config:
        from_attributes = True


class TeacherResponse(BaseModel):
    """讲师完整信息"""
    id: int
    name: str
    avatar: str
    title: str
    description: str
    skills: Any = []
    experience: Any = []
    course_count: int
    student_count: int
    rating: float

    class Config:
        from_attributes = True

    @field_validator("skills", "experience", mode="before")
    @classmethod
    def parse_json_field(cls, v):
        if isinstance(v, str):
            try:
                return json.loads(v)
            except (json.JSONDecodeError, TypeError):
                return []
        return v if v is not None else []


class ChapterResponse(BaseModel):
    """章节响应"""
    id: int
    title: str
    description: str
    sort_order: int
    is_free: bool
    lessons: List["LessonResponse"] = []

    class Config:
        from_attributes = True


class LessonResponse(BaseModel):
    """课时响应"""
    id: int
    title: str
    lesson_type: str
    video_duration: int
    is_free: bool
    sort_order: int

    class Config:
        from_attributes = True


class PackageResponse(BaseModel):
    """套餐响应"""
    id: int
    name: str
    price: Decimal
    original_price: Decimal
    description: str
    features: Any = []

    class Config:
        from_attributes = True

    @field_validator("features", mode="before")
    @classmethod
    def parse_json_field(cls, v):
        if isinstance(v, str):
            try:
                return json.loads(v)
            except (json.JSONDecodeError, TypeError):
                return []
        return v if v is not None else []


class CourseListItem(BaseModel):
    """课程列表项"""
    id: int
    title: str
    subtitle: str
    slug: str
    cover: str
    category_id: int
    category_name: str = ""
    teacher: Optional[TeacherBrief] = None
    course_type: str
    price: Decimal
    original_price: Decimal
    difficulty: str
    student_count: int
    rating: float
    review_count: int
    tags: Any = []
    duration_hours: float
    status: str

    class Config:
        from_attributes = True

    @field_validator("tags", mode="before")
    @classmethod
    def parse_json_field(cls, v):
        if isinstance(v, str):
            try:
                return json.loads(v)
            except (json.JSONDecodeError, TypeError):
                return []
        return v if v is not None else []


class CourseDetailResponse(BaseModel):
    """课程详情"""
    id: int
    title: str
    subtitle: str
    slug: str
    cover: str
    description: str
    category_id: Optional[int] = None
    category: Optional[CategoryResponse] = None
    teacher: Optional[TeacherResponse] = None
    course_type: str
    difficulty: str
    price: Decimal
    original_price: Decimal
    duration_hours: float
    chapter_count: int
    student_count: int
    rating: float
    review_count: int
    tags: Any = []
    learning_goals: Any = []
    prerequisites: Any = []
    chapters: List[ChapterResponse] = []
    packages: List[PackageResponse] = []

    class Config:
        from_attributes = True

    @field_validator("tags", "learning_goals", "prerequisites", mode="before")
    @classmethod
    def parse_json_field(cls, v):
        if isinstance(v, str):
            try:
                return json.loads(v)
            except (json.JSONDecodeError, TypeError):
                return []
        return v if v is not None else []


class CourseCreateRequest(BaseModel):
    """创建课程请求"""
    title: str = Field(..., min_length=2, max_length=200)
    subtitle: Optional[str] = Field(None, max_length=300)
    cover: Optional[str] = None
    description: Optional[str] = Field(None, max_length=50000, description="课程简介（富文本 HTML）")
    category_id: int
    teacher_id: Optional[int] = None
    difficulty: str = Field(default="beginner", pattern=r"^(beginner|intermediate|advanced)$")
    course_type: str = Field(default="recorded", pattern=r"^(recorded|live|bootcamp|private)$")
    price: Decimal = Field(default=0.00, ge=0)
    original_price: Decimal = Field(default=0.00, ge=0)
    tags: List[str] = []
    learning_goals: List[str] = []
    prerequisites: List[str] = []


class CourseUpdateRequest(BaseModel):
    """更新课程请求"""
    title: Optional[str] = Field(None, min_length=2, max_length=200)
    subtitle: Optional[str] = Field(None, max_length=300)
    cover: Optional[str] = None
    description: Optional[str] = Field(None, max_length=50000, description="课程简介（富文本 HTML）")
    category_id: Optional[int] = None
    teacher_id: Optional[int] = None
    difficulty: Optional[str] = Field(None, pattern=r"^(beginner|intermediate|advanced)$")
    course_type: Optional[str] = Field(None, pattern=r"^(recorded|live|bootcamp|private)$")
    price: Optional[Decimal] = Field(None, ge=0)
    original_price: Optional[Decimal] = Field(None, ge=0)
    tags: Optional[List[str]] = None
    learning_goals: Optional[List[str]] = None
    prerequisites: Optional[List[str]] = None


class ChapterCreateRequest(BaseModel):
    """创建章节请求"""
    title: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = None
    sort_order: int = 0
    is_free: bool = False


class LessonCreateRequest(BaseModel):
    """创建课时请求"""
    title: str = Field(..., min_length=1, max_length=200)
    lesson_type: str = Field(default="video", pattern=r"^(video|document|quiz|resource)$")
    video_url: Optional[str] = None
    video_duration: int = 0
    document_url: Optional[str] = None
    content: Optional[str] = None
    is_free: bool = False
    sort_order: int = 0


class CourseFilterParams(BaseModel):
    """课程筛选参数"""
    category_id: Optional[int] = None
    keyword: Optional[str] = None
    difficulty: Optional[str] = None
    course_type: Optional[str] = None
    price_min: Optional[Decimal] = None
    price_max: Optional[Decimal] = None
    sort_by: str = Field(default="latest", pattern=r"^(latest|popular|rating|price_asc|price_desc)$")
    status: str = "published"


# ==================== 订单相关 ====================

class CreateOrderRequest(BaseModel):
    """创建订单请求"""
    course_id: int
    package_id: Optional[int] = None
    pay_method: str = Field(..., pattern=r"^(wechat|alipay)$")
    return_url: str = ""
    # 微信支付交易类型：NATIVE(扫码，PC端) / MWEB(H5手机网页) / JSAPI(小程序/公众号) / APP
    # 支付宝下此字段忽略
    trade_type: str = "NATIVE"


class CreateBatchOrderRequest(BaseModel):
    """合并下单请求：多门课程合并成一个订单"""
    course_ids: List[int] = Field(..., min_length=1, description="要合并结算的课程ID列表")
    pay_method: str = Field(..., pattern=r"^(wechat|alipay)$")
    return_url: str = ""
    # 微信支付交易类型：NATIVE(扫码，PC端) / MWEB(H5手机网页) / JSAPI(小程序/公众号) / APP
    # 支付宝下此字段忽略
    trade_type: str = "NATIVE"


class OrderResponse(BaseModel):
    """订单响应"""
    id: int
    order_no: str
    amount: Decimal
    pay_method: str
    pay_status: str
    course_title: str = ""
    course_cover: str = ""
    slug: str = ""
    created_at: datetime
    paid_at: Optional[datetime] = None
    refund_amount: str = "0"
    refund_at: Optional[datetime] = None
    transaction_id: str = ""
    # 支付链接（仅在 pending 时由后端重新生成，便于 H5/小程序直接跳转或调起支付）
    code_url: str = ""        # 微信 Native 扫码 URL
    pay_url: str = ""         # 支付宝 收银台跳转 URL
    mweb_url: str = ""        # 微信 H5 唤起支付 URL

    class Config:
        from_attributes = True


class PayCallbackData(BaseModel):
    """支付回调数据"""
    order_no: str
    transaction_id: str
    pay_method: str


# ==================== 直播/训练营 ====================

class LiveRoomResponse(BaseModel):
    """直播间响应"""
    id: int
    title: str
    cover: str
    description: str
    start_at: datetime
    end_at: datetime
    status: str
    viewer_count: int
    teacher_name: str = ""

    class Config:
        from_attributes = True


class BootcampResponse(BaseModel):
    """训练营响应"""
    id: int
    title: str
    cover: str
    description: str
    price: Decimal
    original_price: Decimal
    max_students: int
    enrolled_count: int
    start_at: datetime
    end_at: datetime
    status: str
    teacher_name: str = ""

    class Config:
        from_attributes = True


# ==================== 后台管理 ====================

class DashboardStats(BaseModel):
    """仪表盘统计"""
    total_courses: int
    total_users: int
    total_orders: int
    total_revenue: Decimal
    course_growth: float
    user_growth: float
    revenue_growth: float


class SalesTrendItem(BaseModel):
    """销售趋势"""
    date: str
    amount: Decimal
    order_count: int


class PublishCourseRequest(BaseModel):
    """发布课程请求"""
    status: str = Field(..., pattern=r"^(submitted|published)$")


class ReviewCourseRequest(BaseModel):
    """审核课程请求"""
    status: str = Field(..., pattern=r"^(approved|rejected)$")
    reason: Optional[str] = None
