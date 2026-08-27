"""安全相关：JWT、密码哈希、验证码、限流"""
import hashlib
import hmac
import json
import random
import time
from datetime import datetime, timedelta
from typing import Optional

import bcrypt
from fastapi import Depends, HTTPException, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt
from sqlalchemy.orm import Session

from app.config import get_settings
from app.database import get_db
from app.models import User
from app.redis_client import get_redis

settings = get_settings()
security_scheme = HTTPBearer()


# ==================== 密码哈希 ====================

def hash_password(password: str) -> str:
    """密码哈希 (bcrypt)"""
    salt = bcrypt.gensalt(rounds=10)
    return bcrypt.hashpw(password.encode("utf-8"), salt).decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """验证密码"""
    if not hashed_password:
        return False
    try:
        return bcrypt.checkpw(
            plain_password.encode("utf-8"),
            hashed_password.encode("utf-8")
        )
    except Exception:
        return False


# ==================== JWT ====================

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """创建访问令牌"""
    to_encode = data.copy()
    expire = datetime.utcnow() + (
        expires_delta or timedelta(minutes=settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    to_encode.update({"exp": expire, "type": "access"})
    return jwt.encode(to_encode, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)


def create_refresh_token(data: dict) -> str:
    """创建刷新令牌"""
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(days=settings.JWT_REFRESH_TOKEN_EXPIRE_DAYS)
    to_encode.update({"exp": expire, "type": "refresh"})
    return jwt.encode(to_encode, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)


def decode_token(token: str) -> dict:
    """解码JWT令牌"""
    try:
        payload = jwt.decode(
            token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM]
        )
        return payload
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="无效的认证令牌",
        )


# ==================== 当前用户依赖 ====================

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security_scheme),
    db: Session = Depends(get_db),
) -> User:
    """获取当前登录用户"""
    token = credentials.credentials
    payload = decode_token(token)
    user_id = payload.get("sub")
    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="无效的认证令牌",
        )
    user = db.query(User).filter(User.id == int(user_id)).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="用户不存在",
        )
    if user.status != "active":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="账号已被禁用",
        )
    return user


async def get_current_admin(
    current_user: User = Depends(get_current_user),
) -> User:
    """获取当前管理员用户"""
    if current_user.role not in ("admin", "teacher"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="权限不足，需要管理员身份",
        )
    return current_user


# ==================== 短信验证码 ====================


def _get_dypns_client():
    """懒加载阿里云短信认证服务 SDK（避免未使用时引入依赖）"""
    from alibabacloud_dypnsapi20170525.client import Client as DypnsapiClient
    from alibabacloud_tea_openapi import models as open_api_models

    settings = get_settings()
    config = open_api_models.Config(
        access_key_id=settings.SMS_ACCESS_KEY,
        access_key_secret=settings.SMS_SECRET_KEY,
        region_id="cn-hangzhou",
    )
    config.endpoint = "dypnsapi.aliyuncs.com"
    return DypnsapiClient(config)


def send_sms_code(phone: str, code_type: str = "login", valid_minutes: int = 5) -> bool:
    """
    发送短信验证码（阿里云号码认证服务 PNVS / 短信认证服务）

    注意：验证码由阿里云自动生成，调用方无需传入 code。
    需在 .env 中配置 SMS_ACCESS_KEY / SMS_SECRET_KEY；签名/模板从 config 默认值读取。
    未配置 AccessKey 时降级为模拟发送（仅写日志，便于本地开发调试）。
    """
    import logging
    logger = logging.getLogger(__name__)
    settings = get_settings()

    # 未配置 AccessKey 时降级为模拟发送
    if not (settings.SMS_ACCESS_KEY and settings.SMS_SECRET_KEY):
        logger.warning(
            f"[短信模拟] 未配置阿里云短信认证服务，将跳过真实发送到 {phone} (类型: {code_type})"
        )
        return True

    try:
        from alibabacloud_dypnsapi20170525 import models as dypnsapi_models
        from alibabacloud_tea_util import models as util_models

        client = _get_dypns_client()

        # 用 ##code## 占位符，让阿里云自动生成验证码；min 为有效分钟数
        template_param = json.dumps({"code": "##code##", "min": str(valid_minutes)})

        request_kwargs = dict(
            phone_number=phone,
            sign_name=settings.SMS_SIGN_NAME,
            template_code=settings.SMS_TEMPLATE_ID,
            template_param=template_param,
            valid_time=valid_minutes * 60,
            # 验证码固定 6 位纯数字，与前端输入框/后端 schema 保持一致
            code_length=6,
            code_type=1,
        )
        if settings.SMS_SCHEME_NAME:
            request_kwargs["scheme_name"] = settings.SMS_SCHEME_NAME

        request = dypnsapi_models.SendSmsVerifyCodeRequest(**request_kwargs)
        runtime = util_models.RuntimeOptions()
        response = client.send_sms_verify_code_with_options(request, runtime)
        body = response.body

        if body.code == "OK":
            logger.info(
                f"[阿里云短信认证] 发送成功到 {phone} (类型: {code_type}, 请求ID: {body.request_id})"
            )
            return True
        else:
            logger.error(
                f"[阿里云短信认证] 发送失败到 {phone}: code={body.code} msg={body.message} "
                f"recommend={getattr(body, 'recommend', '')} request_id={body.request_id}"
            )
            return False
    except Exception as e:
        logger.error(f"[阿里云短信认证] 发送异常到 {phone}: {e}")
        return False


def verify_sms_code(phone: str, code: str, code_type: str = "login") -> bool:
    """
    校验短信验证码（阿里云号码认证服务 CheckSmsVerifyCode）。

    注：code_type 参数保留兼容旧调用方，但实际校验由阿里云按 phone+code 完成。
    """
    import logging
    logger = logging.getLogger(__name__)
    settings = get_settings()

    # 未配置 AccessKey 时使用模拟校验：仅接受固定码 123456
    if not (settings.SMS_ACCESS_KEY and settings.SMS_SECRET_KEY):
        logger.warning(
            f"[短信校验模拟] {phone} 输入 {code}（未配置阿里云时仅接受 123456）"
        )
        return code == "123456"

    try:
        from alibabacloud_dypnsapi20170525 import models as dypnsapi_models
        from alibabacloud_tea_util import models as util_models

        client = _get_dypns_client()

        request_kwargs = dict(
            phone_number=phone,
            verify_code=code,
        )
        if settings.SMS_SCHEME_NAME:
            request_kwargs["scheme_name"] = settings.SMS_SCHEME_NAME

        request = dypnsapi_models.CheckSmsVerifyCodeRequest(**request_kwargs)
        runtime = util_models.RuntimeOptions()
        response = client.check_sms_verify_code_with_options(request, runtime)
        body = response.body

        verify_result = bool(
            body.model and getattr(body.model, "verify_result", False)
        )
        if body.code == "OK" and verify_result:
            logger.info(f"[阿里云短信认证] 校验成功 {phone} (类型: {code_type})")
            return True
        else:
            logger.warning(
                f"[阿里云短信认证] 校验失败 {phone}: {body.code} {body.message} (类型: {code_type})"
            )
            return False
    except Exception as e:
        logger.error(f"[阿里云短信认证] 校验异常 {phone}: {e}")
        return False


# ==================== 防重放攻击中间件 ====================

async def verify_request_nonce(request: Request):
    """验证请求nonce防止重放攻击"""
    nonce = request.headers.get("X-Request-Nonce")
    timestamp = request.headers.get("X-Request-Timestamp")

    if not nonce or not timestamp:
        return  # 可选，不强制要求

    try:
        ts = int(timestamp)
        now = int(time.time())
        if abs(now - ts) > 300:  # 5分钟有效期
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="请求已过期",
            )
    except ValueError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="无效的时间戳")

    try:
        redis = next(get_redis())
        key = f"nonce:{nonce}"
        if redis.exists(key):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="请求已被处理",
            )
        redis.setex(key, 600, "1")  # 10分钟过期
    except Exception:
        pass  # Redis不可用时跳过


# ==================== 签名验证 ====================

def verify_webhook_signature(payload: bytes, signature: str, secret: str) -> bool:
    """验证Webhook签名（用于支付回调等）"""
    computed = hmac.new(
        secret.encode("utf-8"),
        payload,
        hashlib.sha256
    ).hexdigest()
    return hmac.compare_digest(computed, signature)
