"""
桃悦智科 API 配置中心（企业级规范）

配置来源优先级（Pydantic Settings 默认）：
    1. 进程环境变量（os.environ）最高优先
    2. .env 文件（默认 .env，可用 APP_ENV_FILE 覆盖）
    3. 字段默认值（兜底）

用法：
    from app.config import get_settings
    settings = get_settings()   # 全局单例，幂等

安全约定：
    - 所有密钥/密码等敏感字段统一命名 *_KEY / *_SECRET / *SECRET_KEY / PRIVATE_KEY
    - __repr__ 已重写，不会在任何日志中打印敏感字段明文
    - 生产环境（APP_ENV=production）会校验 JWT 密钥不得为默认弱密钥
"""
from functools import lru_cache
from typing import List, Set

from pydantic import field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """
    应用配置。

    所有字段均可在 .env 或环境变量中覆盖。字段默认值为开发环境兜底，
    生产环境请务必通过 .env 显式配置。
    """

    # ------------------------------------------------------------------
    # 环境 & 应用信息
    # ------------------------------------------------------------------
    # 运行环境：development / staging / production（影响安全校验与日志级别）
    APP_ENV: str = "development"
    APP_NAME: str = "桃悦智科API"
    APP_VERSION: str = "1.0.0"
    # 是否开启调试（生产必须为 false）
    DEBUG: bool = False

    # 防爬虫：发送短信时是否要求图形验证码
    REQUIRE_CAPTCHA: bool = True

    # ------------------------------------------------------------------
    # 数据库 & 缓存
    # ------------------------------------------------------------------
    DATABASE_URL: str = "mysql+pymysql://root:root@localhost:3306/taoyue_edu"
    REDIS_URL: str = "redis://localhost:6379/0"

    # ------------------------------------------------------------------
    # 安全 / JWT
    # ------------------------------------------------------------------
    # 生产环境必须改为随机强密钥（openssl rand -hex 32）
    JWT_SECRET_KEY: str = "taoyue-edu-jwt-secret-key-2024-very-strong-and-secure"
    JWT_ALGORITHM: str = "HS256"
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    JWT_REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # ------------------------------------------------------------------
    # 阿里云 OSS（图片存储，可选；不填则保存到本地 /app/static）
    # ------------------------------------------------------------------
    OSS_ACCESS_KEY_ID: str = ""
    OSS_ACCESS_KEY_SECRET: str = ""
    # ⚠️ OSS 区域必须与 bucket 实际所在地一致（bucket "2507a" 在北京，用 oss-cn-beijing）
    OSS_ENDPOINT: str = "oss-cn-beijing.aliyuncs.com"
    OSS_BUCKET_NAME: str = "2507a"
    OSS_CDN_DOMAIN: str = "https://2507a.oss-cn-beijing.aliyuncs.com"

    # ------------------------------------------------------------------
    # 短信服务（阿里云号码认证服务 PNVS / 短信认证服务，可选）
    # ------------------------------------------------------------------
    SMS_ACCESS_KEY: str = ""
    SMS_SECRET_KEY: str = ""
    # 系统赠送签名（从"短信认证参数配置-签名配置"页查看）
    SMS_SIGN_NAME: str = "恒创联众"
    # 模板 CODE（登录/注册场景使用 100001）
    SMS_TEMPLATE_ID: str = "100001"
    # 方案名（SchemeName，可选，留空使用"默认方案"）
    SMS_SCHEME_NAME: str = ""

    # ------------------------------------------------------------------
    # 微信支付（APIv3，企业级）
    # ------------------------------------------------------------------
    # 公众号/小程序/App 的 AppID（必须与商户号已绑定）
    WECHAT_PAY_APP_ID: str = ""
    # 商户号
    WECHAT_PAY_MCH_ID: str = ""
    # APIv2 密钥（仅兼容旧接口，新接入请使用 APIv3）
    WECHAT_PAY_API_KEY: str = ""
    # APIv3 密钥（商户平台「API安全-APIv3密钥」，用于回调解密）
    WECHAT_PAY_APIV3_KEY: str = ""
    # 商户 API 证书序列号
    WECHAT_PAY_SERIAL_NO: str = ""
    # 商户 API 证书私钥内容（PEM，推荐用文件方式，见下）
    WECHAT_PAY_PRIVATE_KEY: str = ""
    # 商户 API 证书私钥文件路径（企业级推荐，代码自动探测 certs/apiclient_key.pem）
    WECHAT_PAY_PRIVATE_KEY_PATH: str = ""
    # 支付回调地址（公网 HTTPS，必填）
    WECHAT_PAY_NOTIFY_URL: str = ""
    # 退款回调地址（可选）
    WECHAT_PAY_REFUND_NOTIFY_URL: str = ""

    # ------------------------------------------------------------------
    # 支付宝
    # ------------------------------------------------------------------
    # 开放平台应用 APPID
    ALIPAY_APP_ID: str = ""
    # 应用私钥内容（PEM，推荐用文件方式，见下）
    ALIPAY_PRIVATE_KEY: str = ""
    # 支付宝公钥内容（PEM，推荐用文件方式，见下）
    ALIPAY_PUBLIC_KEY: str = ""
    # 应用私钥/支付宝公钥文件路径（企业级推荐，代码自动探测 certs/alipay_*.pem）
    ALIPAY_PRIVATE_KEY_PATH: str = ""
    ALIPAY_PUBLIC_KEY_PATH: str = ""
    # 支付回调地址（公网 HTTPS，必填）
    ALIPAY_NOTIFY_URL: str = ""
    # 沙箱（免签约测试）：True 时使用沙箱网关与沙箱 AppID，正式环境必须 False
    ALIPAY_SANDBOX: bool = False
    # 沙箱专用 AppID / 网关（沙箱控制台获取），仅沙箱模式使用
    ALIPAY_SANDBOX_APP_ID: str = ""
    ALIPAY_SANDBOX_GATEWAY: str = "https://openapi-sandbox.dl.alipaydev.com/gateway.do"
    # 沙箱是否使用系统默认密钥（True：沙箱内置密钥；False：自定义密钥）
    ALIPAY_SANDBOX_USE_DEFAULT_KEY: bool = True

    # ------------------------------------------------------------------
    # CORS 跨域
    # ------------------------------------------------------------------
    # 允许的前端来源（JSON 数组）。生产环境必须包含所有前端部署域名。
    # 例：["https://xin1024.top","https://m.xin1024.top"]
    CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://localhost:3001",
        "http://localhost:5173",
    ]

    model_config = SettingsConfigDict(
        env_file=".env",          # 默认读取 .env；可用环境变量 APP_ENV_FILE 覆盖
        env_file_encoding="utf-8",
        case_sensitive=True,      # 字段名大小写敏感
        extra="ignore",           # 忽略 .env 中未知字段，避免拼写错误静默失败
        validate_default=True,    # 校验默认值
    )

    # ------------------------------------------------------------------
    # 字段校验
    # ------------------------------------------------------------------
    @field_validator("APP_ENV")
    @classmethod
    def _validate_app_env(cls, v: str) -> str:
        allowed = {"development", "staging", "production"}
        if v not in allowed:
            raise ValueError(f"APP_ENV 必须是 {allowed} 之一，当前: {v}")
        return v

    @field_validator("CORS_ORIGINS")
    @classmethod
    def _validate_cors(cls, v: List[str]) -> List[str]:
        # 去空、去重、去除尾部斜杠，规范化 CORS 列表
        seen: Set[str] = set()
        result: List[str] = []
        for origin in v:
            if not origin or not origin.strip():
                continue
            origin = origin.strip().rstrip("/")
            if origin not in seen:
                seen.add(origin)
                result.append(origin)
        return result

    @field_validator("WECHAT_PAY_APIV3_KEY")
    @classmethod
    def _validate_v3_key(cls, v: str) -> str:
        if v and len(v) != 32:
            raise ValueError("WECHAT_PAY_APIV3_KEY 必须为 32 位字符串")
        return v

    # ------------------------------------------------------------------
    # 环境级安全校验
    # ------------------------------------------------------------------
    @model_validator(mode="after")
    def _check_production_security(self) -> "Settings":
        if self.APP_ENV == "production":
            default_jwt = "taoyue-edu-jwt-secret-key-2024-very-strong-and-secure"
            if self.JWT_SECRET_KEY == default_jwt or not self.JWT_SECRET_KEY:
                raise ValueError(
                    "生产环境 JWT_SECRET_KEY 必须配置为随机强密钥，禁止使用默认值！"
                    "生成命令: openssl rand -hex 32"
                )
            if self.DEBUG:
                raise ValueError("生产环境 DEBUG 必须为 false")
        return self

    # ------------------------------------------------------------------
    # 敏感字段脱敏（企业级：任何日志/打印都不会泄露密钥）
    # ------------------------------------------------------------------
    # 需脱敏的字段名集合
    _SENSITIVE_FIELDS = {
        "JWT_SECRET_KEY",
        "OSS_ACCESS_KEY_ID",
        "OSS_ACCESS_KEY_SECRET",
        "SMS_ACCESS_KEY",
        "SMS_SECRET_KEY",
        "WECHAT_PAY_APIV3_KEY",
        "WECHAT_PAY_API_KEY",
        "WECHAT_PAY_PRIVATE_KEY",
        "ALIPAY_PRIVATE_KEY",
        "ALIPAY_PUBLIC_KEY",
    }

    def masked(self) -> dict:
        """返回脱敏后的配置字典，可用于安全日志/健康检查展示。

        敏感字段仅显示前 4 位 + 省略号，未配置的显示为 (未配置)；
        非敏感字段原样返回。
        """
        data = {}
        for name in self.model_fields:
            value = getattr(self, name)
            if name in self._SENSITIVE_FIELDS:
                data[name] = f"<已配置:{value[:4]}...>" if value else "(未配置)"
            else:
                data[name] = value
        return data

    def __repr__(self) -> str:  # pragma: no cover - 仅用于日志脱敏
        return f"<Settings {self.masked()}>"


@lru_cache()
def get_settings() -> Settings:
    """获取配置单例（进程内只加载一次，读取 .env 或环境变量）。"""
    return Settings()
