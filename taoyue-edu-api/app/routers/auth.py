"""认证相关路由：短信登录/注册"""
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.responses import JSONResponse, Response
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User
from app.schemas import (
    SendSmsRequest, SmsLoginRequest, SmsRegisterRequest,
    PasswordRegisterRequest, PasswordLoginRequest,
    TokenResponse, UserBrief,
)
from app.security import (
    create_access_token, create_refresh_token,
    send_sms_code, verify_sms_code,
    get_current_user, hash_password, verify_password,
)
from app.config import get_settings
from app.captcha import create_captcha, verify_captcha

router = APIRouter(prefix="/api/v1/auth", tags=["认证"])
settings = get_settings()


@router.get("/captcha", summary="获取图形验证码")
async def get_captcha():
    """获取图形验证码（防爬虫），返回 PNG 图片 + captcha_id"""
    captcha_id, image_bytes, _debug_text = create_captcha()
    return Response(
        content=image_bytes,
        media_type="image/png",
        headers={
            "X-Captcha-Id": captcha_id,
        },
    )


@router.post("/send-sms", summary="发送短信验证码")
async def send_sms(req: SendSmsRequest, request: Request, db: Session = Depends(get_db)):
    """发送短信验证码，60秒内不可重复发送"""
    # 图形验证码校验（防爬虫）
    if settings.REQUIRE_CAPTCHA:
        if not verify_captcha(req.captcha_id, req.captcha_text):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="图形验证码错误或已过期",
            )

    # 频率限制：60秒内只能发一次（使用 Redis 计数器，Redis 不可用时降级放行）
    try:
        from app.redis_client import get_redis
        redis = next(get_redis())
        freq_key = f"sms:rate:{req.phone}:{req.type}"
        if redis.exists(freq_key):
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="验证码发送过于频繁，请60秒后再试",
            )
        redis.setex(freq_key, 60, "1")
    except HTTPException:
        raise
    except Exception:
        pass  # Redis 异常时降级放行

    # 注册时需要检查手机号是否已存在
    if req.type == "register":
        existing = db.query(User).filter(User.phone == req.phone).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="该手机号已注册",
            )
    # 登录时需要检查手机号是否存在
    elif req.type == "login":
        existing = db.query(User).filter(User.phone == req.phone).first()
        if not existing:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="该手机号未注册",
            )

    # 发送短信（验证码由阿里云生成并管理生命周期）
    ok = send_sms_code(req.phone, req.type)
    if not ok:
        # 开发环境兜底：未配置阿里云短信时，返回固定验证码 123456
        # 这样前端可以走完整登录流程，便于本地调试
        if not getattr(settings, "SMS_ACCESS_KEY_ID", ""):
            from app.security import generate_sms_code
            dev_code = generate_sms_code()
            # 开发模式：直接把验证码存到 Redis（即使 Redis 不可用也尝试 fallback）
            try:
                from app.redis_client import get_redis
                r = next(get_redis())
                r.setex(f"sms:code:{req.phone}:{req.type}", 600, dev_code)
            except Exception:
                pass
            return {
                "message": "验证码已发送（开发模式）",
                "debug_code": dev_code,
            }
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="短信发送失败，请稍后重试",
        )

    return {
        "message": "验证码已发送",
        "debug_code": None,  # 验证码由阿里云生成并管理，项目侧无法获取
    }


@router.post("/login", response_model=TokenResponse, summary="短信验证码登录")
async def login(req: SmsLoginRequest, request: Request, db: Session = Depends(get_db)):
    """使用短信验证码登录"""
    # 验证验证码
    if not verify_sms_code(req.phone, req.code, "login"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="验证码错误或已过期",
        )

    user = db.query(User).filter(User.phone == req.phone).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="用户不存在",
        )

    if user.status != "active":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="账号已被禁用",
        )

    # 更新登录信息
    user.last_login_at = datetime.utcnow()
    user.last_login_ip = request.client.host if request.client else ""
    db.commit()
    db.refresh(user)

    # 生成令牌
    access_token = create_access_token(data={"sub": str(user.id)})
    refresh_token = create_refresh_token(data={"sub": str(user.id)})

    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "expires_in": settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        "user": UserBrief.model_validate(user),
    }


@router.post("/register", response_model=TokenResponse, summary="短信验证码注册")
async def register(req: SmsRegisterRequest, request: Request, db: Session = Depends(get_db)):
    """使用短信验证码注册新账号"""
    # 验证验证码
    if not verify_sms_code(req.phone, req.code, "register"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="验证码错误或已过期",
        )

    # 检查手机号是否已注册
    existing = db.query(User).filter(User.phone == req.phone).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="该手机号已注册",
        )

    # 创建用户
    from app.security import hash_password
    user = User(
        nickname=req.nickname,
        phone=req.phone,
        password_hash=hash_password(req.phone),  # 使用手机号作为初始密码哈希
        role="student",
        last_login_at=datetime.utcnow(),
        last_login_ip=request.client.host if request.client else "",
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    # 生成令牌
    access_token = create_access_token(data={"sub": str(user.id)})
    refresh_token = create_refresh_token(data={"sub": str(user.id)})

    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "expires_in": settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        "user": UserBrief.model_validate(user),
    }


class AdminPasswordLoginRequest(BaseModel):
    """管理后台账号密码登录请求"""
    username: str = Field(..., min_length=1, description="账号（昵称或手机号）")
    password: str = Field(..., min_length=1, description="密码")


@router.post("/password-login", summary="账号密码登录")
async def password_login(
    req: AdminPasswordLoginRequest,
    request: Request,
    db: Session = Depends(get_db),
):
    """使用账号密码登录（管理后台）"""
    import logging
    logger = logging.getLogger(__name__)
    from app.security import verify_password

    if not req.username or not req.password:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="请输入账号和密码")

    logger.info(f"[密码登录] 尝试登录: username={req.username}")

    # 用 nickname 或 phone 查找用户
    user = db.query(User).filter(
        (User.nickname == req.username) | (User.phone == req.username)
    ).first()

    if not user:
        logger.warning(f"[密码登录] 用户不存在: {req.username}")
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="账号或密码错误")

    logger.info(f"[密码登录] 找到用户: id={user.id}, nickname={user.nickname}, role={user.role}, status={user.status}")

    if not verify_password(req.password, user.password_hash):
        logger.warning(f"[密码登录] 密码错误: user_id={user.id}")
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="账号或密码错误")

    if user.status != "active":
        logger.warning(f"[密码登录] 账号已禁用: user_id={user.id}")
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="账号已被禁用")

    user.last_login_at = datetime.utcnow()
    user.last_login_ip = request.client.host if request.client else ""
    db.commit()
    db.refresh(user)

    access_token = create_access_token(data={"sub": str(user.id)})
    refresh_token = create_refresh_token(data={"sub": str(user.id)})

    logger.info(f"[密码登录] 登录成功: user_id={user.id}")

    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "expires_in": settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        "user": UserBrief.model_validate(user),
    }


@router.post("/password-register", response_model=TokenResponse, summary="账号密码注册（客户端）")
async def password_register(
    req: PasswordRegisterRequest,
    request: Request,
    db: Session = Depends(get_db),
):
    """使用账号密码注册新账号（客户端学生端，无需手机号/验证码）"""
    username = req.username.strip()

    # 检查账号是否已注册
    existing = db.query(User).filter(User.nickname == username).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="该账号已被注册",
        )

    # 创建用户（账号存为 nickname，手机号用唯一占位符）
    import uuid
    user = User(
        nickname=username,
        phone=f"acct_{uuid.uuid4().hex[:10]}",
        password_hash=hash_password(req.password),
        role="student",
        status="active",
        last_login_at=datetime.utcnow(),
        last_login_ip=request.client.host if request.client else "",
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    # 生成令牌
    access_token = create_access_token(data={"sub": str(user.id)})
    refresh_token = create_refresh_token(data={"sub": str(user.id)})

    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "expires_in": settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        "user": UserBrief.model_validate(user),
    }


@router.post("/password-login/client", response_model=TokenResponse, summary="账号密码登录（客户端）")
async def client_password_login(
    req: PasswordLoginRequest,
    request: Request,
    db: Session = Depends(get_db),
):
    """客户端账号密码登录（学生端，无角色限制）"""
    username = req.username.strip()
    # 用账号（nickname）查找用户
    user = db.query(User).filter(User.nickname == username).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="账号或密码错误",
        )

    if not verify_password(req.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="账号或密码错误",
        )

    if user.status != "active":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="账号已被禁用",
        )

    # 更新登录信息
    user.last_login_at = datetime.utcnow()
    user.last_login_ip = request.client.host if request.client else ""
    db.commit()
    db.refresh(user)

    # 生成令牌
    access_token = create_access_token(data={"sub": str(user.id)})
    refresh_token = create_refresh_token(data={"sub": str(user.id)})

    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "expires_in": settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        "user": UserBrief.model_validate(user),
    }


@router.post("/change-password", summary="修改密码")
async def change_password(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """修改当前用户密码"""
    from app.security import verify_password, hash_password
    body = await request.json()
    old_password = body.get("old_password", "")
    new_password = body.get("new_password", "")

    if not old_password or not new_password:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="请填写旧密码和新密码")

    if len(new_password) < 8:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="新密码至少8位")

    if not verify_password(old_password, current_user.password_hash):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="旧密码错误")

    current_user.password_hash = hash_password(new_password)
    db.commit()

    return {"message": "密码修改成功"}


@router.get("/me", response_model=UserBrief, summary="获取当前用户信息")
async def get_me(current_user: User = Depends(get_current_user)):
    """获取当前登录用户信息"""
    return UserBrief.model_validate(current_user)


@router.post("/refresh", response_model=TokenResponse, summary="刷新令牌")
async def refresh_token(request: Request, db: Session = Depends(get_db)):
    """使用refresh_token刷新access_token"""
    from app.security import decode_token, create_access_token, create_refresh_token

    body = await request.json()
    refresh = body.get("refresh_token")
    if not refresh:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="缺少refresh_token")

    payload = decode_token(refresh)
    if payload.get("type") != "refresh":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="无效的刷新令牌")

    user_id = payload.get("sub")
    user = db.query(User).filter(User.id == int(user_id)).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="用户不存在")

    access_token = create_access_token(data={"sub": str(user.id)})
    new_refresh = create_refresh_token(data={"sub": str(user.id)})

    return {
        "access_token": access_token,
        "refresh_token": new_refresh,
        "token_type": "bearer",
        "expires_in": settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        "user": UserBrief.model_validate(user),
    }
