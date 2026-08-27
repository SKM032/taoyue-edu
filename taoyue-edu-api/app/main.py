"""桃悦智科 API 主入口"""
import logging
from contextlib import asynccontextmanager

import os
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from fastapi.staticfiles import StaticFiles

from app.config import get_settings
from app.database import engine, Base
from app.response import UnifiedResponseMiddleware
from app.routers import auth, courses, orders, admin, content, cart

settings = get_settings()

# 日志配置
logging.basicConfig(
    level=logging.INFO if not settings.DEBUG else logging.DEBUG,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """应用生命周期管理"""
    logger.info("正在初始化数据库表...")
    try:
        Base.metadata.create_all(bind=engine)
        _run_light_migrations(engine)
        logger.info("数据库表初始化完成")
        # 确保默认管理员账号存在
        try:
            from create_admin import ensure_admin
            result = ensure_admin()
            logger.info(f"[初始化] {result}: admin / Admin123456!")
        except Exception as e:
            logger.warning(f"[初始化] 创建管理员失败: {e}")
    except Exception as e:
        logger.error(f"数据库初始化失败: {e}")
        logger.warning("服务已启动，但数据库不可用，请检查 MySQL 是否运行")
    logger.info(f"API文档地址: http://localhost:8000/docs")
    yield


def _run_light_migrations(engine):
    """轻量迁移：确保已有表包含新增列（兼容 MySQL 5.x / 8.x / SQLite）"""
    from sqlalchemy import text
    # (表, 列, 类型) —— 通过 information_schema 判断列是否存在，避免用 IF NOT EXISTS
    migrations = [
        ("orders", "code_url", "TEXT"),
        ("orders", "pay_url", "TEXT"),
        ("orders", "mweb_url", "TEXT"),
        ("orders", "refund_no", "VARCHAR(64)"),
    ]
    try:
        with engine.begin() as conn:
            for table, col, coltype in migrations:
                # 判断列是否已存在
                exists = conn.execute(
                    text(
                        "SELECT COUNT(*) FROM information_schema.COLUMNS "
                        "WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = :t AND COLUMN_NAME = :c"
                    ),
                    {"t": table, "c": col},
                ).scalar()
                if exists:
                    continue
                # 列不存在才添加（MySQL 5.x / 8.x 都支持）
                conn.execute(text(f"ALTER TABLE {table} ADD COLUMN {col} {coltype} DEFAULT ''"))
                logger.info(f"迁移: {table} 表新增列 {col}")
        logger.info("数据库轻量迁移完成")
    except Exception as e:
        # SQLite 等没有 information_schema，容错跳过
        logger.warning(f"数据库轻量迁移跳过: {e}")


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="桃悦智科教育平台API - 提供课程管理、用户认证、订单支付等接口",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
)

# CORS 中间件
# allow_origins: 精确域名白名单（.env 的 CORS_ORIGINS）
# allow_origin_regex: 宽松匹配，支持 localhost/127.0.0.1 任意端口 + 线上域名
#  - localhost / 127.0.0.1 任意端口（本地开发，避免频繁改 CORS）
#  - *.xin1024.top 及其本身（线上移动端 m.xin1024.top 等）
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1)(:\d+)?$|^https?://([a-z0-9-]+\.)*xin1024\.top(:\d+)?$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["X-Total-Count", "X-Request-Id", "X-Captcha-Id"],
)

# 统一响应格式中间件（必须在 GZip 之前注册，
# 这样 Starlette LIFO 顺序使 UnifiedResponse 在内层、GZip 在外层，
# 响应流：路由 → UnifiedResponse(包装) → GZip(压缩) → 客户端，避免压缩后无法包装）
app.add_middleware(UnifiedResponseMiddleware)

# GZip 压缩（注册晚于 UnifiedResponse，运行时处于更外层）
app.add_middleware(GZipMiddleware, minimum_size=1024)


# 全局异常处理
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """请求参数验证异常 -> 统一格式"""
    errors = []
    for error in exc.errors():
        errors.append({
            "field": ".".join(str(loc) for loc in error["loc"]),
            "message": error["msg"],
        })
    return JSONResponse(
        status_code=422,
        content={
            "code": 422,
            "message": "请求参数验证失败",
            "data": errors,
        },
    )


# 健康检查
@app.get("/api/v1/health", tags=["系统"])
async def health_check():
    """健康检查"""
    return {
        "status": "ok",
        "version": settings.APP_VERSION,
        "app_name": settings.APP_NAME,
    }


# 注册路由
app.include_router(auth.router)
app.include_router(courses.router)
app.include_router(orders.router)
app.include_router(admin.router)
app.include_router(content.router)
app.include_router(cart.router)

# 本地静态文件（OSS 不可用时本地存储的文件）
_static_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "static")
os.makedirs(_static_dir, exist_ok=True)
app.mount("/static", StaticFiles(directory=_static_dir), name="static")
