# -*- coding: utf-8 -*-
"""微信支付 APIv3 模块（企业级）

基于微信支付 APIv3 规范实现，覆盖以下能力：
- NATIVE 扫码支付（PC 端）
- H5（MWEB）支付（手机浏览器拉起微信 App）
- 异步通知回调验签 + AES-256-GCM 资源解密
- 主动查询订单（对账/防漏单）
- 关闭订单、申请退款

签名体系：
- 商户请求签名：RSA-SHA256（SHA256withRSA），放入 HTTP 头 Authorization
- 回调验签：使用「微信支付平台证书」公钥验证 Wechatpay-Signature
- 回调报文解密：使用 APIv3 密钥 + 接口返回的 nonce/associated_data 做 AES-256-GCM

配置项（.env）：
- WECHAT_PAY_APP_ID         公众号/小程序/App 的 AppID
- WECHAT_PAY_MCH_ID         商户号
- WECHAT_PAY_APIV3_KEY      APIv3 密钥（商户平台「API安全-APIv3密钥」）
- WECHAT_PAY_SERIAL_NO      商户 API 证书序列号
- WECHAT_PAY_PRIVATE_KEY    商户 API 证书私钥（PEM，apiclient_key.pem 内容）
- WECHAT_PAY_NOTIFY_URL     回调地址（必须是公网 HTTPS）
"""
import base64
import json
import logging
import os
import time
import uuid
from decimal import Decimal
from typing import Dict, Optional

import httpx
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import padding

from app.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

WECHAT_API_BASE = "https://api.mch.weixin.qq.com"


def _amount_to_fen(amount) -> int:
    """元 -> 分"""
    return int((Decimal(str(amount)) * 100).quantize(Decimal("1")))


class WechatPayV3:
    """微信支付 APIv3 客户端"""

    def __init__(self):
        self.app_id = settings.WECHAT_PAY_APP_ID
        self.mch_id = settings.WECHAT_PAY_MCH_ID
        self.api_v3_key = settings.WECHAT_PAY_APIV3_KEY
        self.serial_no = settings.WECHAT_PAY_SERIAL_NO
        self.private_key = settings.WECHAT_PAY_PRIVATE_KEY
        self.notify_url = settings.WECHAT_PAY_NOTIFY_URL

    # ------------------------------------------------------------------
    # 配置状态
    # ------------------------------------------------------------------
    def _has_private_key(self) -> bool:
        """判断私钥是否可用（环境变量 或 独立文件 certs/apiclient_key.pem）"""
        if self.private_key and "PRIVATE KEY" in self.private_key:
            return True
        # 检查私钥文件是否存在
        candidates = []
        key_path = getattr(settings, "WECHAT_PAY_PRIVATE_KEY_PATH", "") or ""
        if key_path:
            candidates.append(key_path)
        candidates.append(os.path.join(os.getcwd(), "certs", "apiclient_key.pem"))
        candidates.append(os.path.join(os.path.dirname(__file__), "..", "certs", "apiclient_key.pem"))
        for p in candidates:
            norm = os.path.normpath(p)
            if norm and os.path.exists(norm):
                return True
        return False

    @property
    def configured(self) -> bool:
        """是否具备发起真实支付的全部配置"""
        return bool(
            self.app_id
            and self.mch_id
            and self.api_v3_key
            and self.serial_no
            and self._has_private_key()
            and self.notify_url
        )

    # ------------------------------------------------------------------
    # 签名
    # ------------------------------------------------------------------
    def _resolve_private_key_text(self) -> str:
        """解析出完整的商户私钥 PEM 文本。

        优先级：
        1. 私钥文件路径 WECHAT_PAY_PRIVATE_KEY_PATH（企业级推荐）
        2. 从 .env 文件原文中提取完整的 PEM 多行块（解决 dotenv 对多行值只读第一行的问题）
        3. 环境变量 WECHAT_PAY_PRIVATE_KEY（支持 \\n 转义或完整 PEM）
        """
        key_text = self.private_key or ""
        if not key_text:
            return ""

        # 已是完整 PEM 则直接使用
        if "BEGIN PRIVATE KEY" in key_text and "END PRIVATE KEY" in key_text:
            return key_text.replace("\\n", "\n")
        if "BEGIN RSA PRIVATE KEY" in key_text and "END RSA PRIVATE KEY" in key_text:
            return key_text.replace("\\n", "\n")

        # 环境变量被截断（仅开头，无 END）：尝试从 .env 文件原文提取完整 PEM 块
        env_file = os.path.join(os.getcwd(), ".env")
        if os.path.exists(env_file):
            try:
                with open(env_file, "r", encoding="utf-8") as f:
                    lines = f.readlines()
                collecting = False
                block_lines = []
                for raw in lines:
                    line = raw.rstrip("\r\n")
                    stripped = line.strip()
                    # 找到 WECHAT_PAY_PRIVATE_KEY= 开头的行
                    if not collecting and stripped.startswith("WECHAT_PAY_PRIVATE_KEY="):
                        collecting = True
                        value = stripped[len("WECHAT_PAY_PRIVATE_KEY="):]
                        if value:
                            block_lines.append(value)
                        continue
                    if collecting:
                        # 遇到下一个 key 定义则结束收集
                        if "=" in stripped and not stripped.startswith(("-----BEGIN", "-----END")):
                            break
                        block_lines.append(line)
                        if "END PRIVATE KEY" in stripped or "END RSA PRIVATE KEY" in stripped:
                            break
                if block_lines:
                    joined = "\n".join(block_lines)
                    # 处理单行 \\n 转义
                    if "BEGIN PRIVATE KEY" in joined and "\\n" in joined:
                        joined = joined.replace("\\n", "\n")
                    if "BEGIN PRIVATE KEY" in joined and "END PRIVATE KEY" in joined:
                        return joined
                    if "BEGIN RSA PRIVATE KEY" in joined and "END RSA PRIVATE KEY" in joined:
                        return joined
            except Exception as e:
                logger.warning(f"从 .env 解析私钥失败: {e}")

        # 兜底：按字面量 \\n 转义归一化
        return key_text.replace("\\n", "\n")

    def _load_private_key(self):
        """加载商户 API 证书私钥（PEM）。

        私钥来源优先级：
        1. WECHAT_PAY_PRIVATE_KEY_PATH 指定的文件
        2. 自动探测项目内 certs/apiclient_key.pem（本地与服务器均生效）
        3. WECHAT_PAY_PRIVATE_KEY 环境变量（含 .env 原文多行提取）
        """
        key_text = self._resolve_private_key_text()
        key_path = getattr(settings, "WECHAT_PAY_PRIVATE_KEY_PATH", "") or ""

        # 候选私钥文件路径：配置项 + 常见相对路径
        candidates = []
        if key_path:
            candidates.append(key_path)
        candidates.append(os.path.join(os.getcwd(), "certs", "apiclient_key.pem"))
        candidates.append(os.path.join(os.path.dirname(__file__), "..", "certs", "apiclient_key.pem"))

        for path in candidates:
            norm = os.path.normpath(path)
            if norm and os.path.exists(norm):
                try:
                    with open(norm, "r", encoding="utf-8") as f:
                        file_text = f.read()
                    if "PRIVATE KEY" in file_text:
                        key_text = file_text
                        logger.info(f"从私钥文件加载成功: {norm}")
                        break
                except Exception as e:
                    logger.warning(f"读取私钥文件失败 {norm}: {e}")

        if not key_text:
            raise RuntimeError("微信商户私钥未配置（WECHAT_PAY_PRIVATE_KEY 或 certs/apiclient_key.pem）")
        try:
            return serialization.load_pem_private_key(key_text.encode("utf-8"), password=None)
        except Exception as e:
            raise RuntimeError(f"微信商户私钥解析失败，请检查格式: {e}")

    def _sign(self, message: str) -> str:
        """使用商户私钥对 message 做 RSA-SHA256 签名，返回 base64"""
        private_key = self._load_private_key()
        signature = private_key.sign(
            message.encode("utf-8"),
            padding.PKCS1v15(),
            hashes.SHA256(),
        )
        return base64.b64encode(signature).decode("utf-8")

    def _authorization_header(self, method: str, url_path: str, body: str = "") -> str:
        """构造 APIv3 请求所需的 Authorization 头（微信支付V3签名）"""
        timestamp = str(int(time.time()))
        nonce = uuid.uuid4().hex
        message = f"{method}\n{url_path}\n{timestamp}\n{nonce}\n{body}\n"
        sign = self._sign(message)
        return (
            'WECHATPAY2-SHA256-RSA2048 '
            f'mchid="{self.mch_id}",'
            f'nonce_str="{nonce}",'
            f'signature="{sign}",'
            f'timestamp="{timestamp}",'
            f'serial_no="{self.serial_no}"'
        )

    async def _request(
        self,
        method: str,
        path: str,
        payload: Optional[Dict] = None,
        query: str = "",
        timeout: float = 15.0,
    ) -> Dict:
        """发起 APIv3 请求并处理错误。返回响应 JSON。"""
        url_path = f"/v3{path}" + (f"?{query}" if query else "")
        url = WECHAT_API_BASE + url_path
        body_str = json.dumps(payload, ensure_ascii=False) if payload is not None else ""
        headers = {
            "Authorization": self._authorization_header(method, url_path, body_str),
            "Content-Type": "application/json",
            "Accept": "application/json",
            "User-Agent": "taoyue-edu/1.0",
        }
        try:
            async with httpx.AsyncClient(timeout=timeout) as client:
                if method == "GET":
                    resp = await client.get(url, headers=headers)
                elif method == "POST":
                    resp = await client.post(url, headers=headers, content=body_str.encode("utf-8"))
                else:
                    raise ValueError(f"不支持的请求方法: {method}")
        except httpx.HTTPError as e:
            logger.error(f"微信APIv3请求异常: {method} {path} err={e}")
            raise RuntimeError("微信支付服务暂时不可用")

        if resp.status_code >= 300:
            err_detail = self._parse_error(resp)
            logger.error(f"微信APIv3返回错误: {method} {path} status={resp.status_code} body={err_detail}")
            # 退款场景微信用 4xx 表示业务失败，直接抛带信息的异常
            raise WechatPayError(status_code=resp.status_code, code=err_detail.get("code", ""), message=err_detail.get("message", ""))

        if not resp.content:
            return {}
        try:
            return resp.json()
        except json.JSONDecodeError:
            logger.warning(f"微信APIv3返回非JSON: {resp.text[:200]}")
            return {"_raw": resp.text}

    @staticmethod
    def _parse_error(resp: httpx.Response) -> Dict:
        try:
            data = resp.json()
            if isinstance(data, dict):
                return {
                    "code": data.get("code", ""),
                    "message": data.get("message", resp.text[:200]),
                    "detail": data,
                }
        except json.JSONDecodeError:
            pass
        return {"code": "", "message": resp.text[:200]}

    # ------------------------------------------------------------------
    # 下单
    # ------------------------------------------------------------------
    def _build_common_pay(self, order_no: str, amount, description: str) -> Dict:
        return {
            "appid": self.app_id,
            "mchid": self.mch_id,
            "description": description[:127],
            "out_trade_no": order_no,
            "notify_url": self.notify_url,
            "amount": {"total": _amount_to_fen(amount), "currency": "CNY"},
        }

    async def native_pay(self, order_no: str, amount, description: str) -> Dict:
        """NATIVE 扫码支付，返回 code_url（供生成二维码）"""
        payload = self._build_common_pay(order_no, amount, description)
        result = await self._request("POST", "/pay/transactions/native", payload)
        return {
            "mock": False,
            "trade_type": "NATIVE",
            "order_no": order_no,
            "code_url": result.get("code_url", ""),
        }

    async def mweb_pay(self, order_no: str, amount, description: str, client_ip: str = "") -> Dict:
        """H5(MWEB) 支付，返回 h5_url（浏览器跳转拉起微信）"""
        payload = self._build_common_pay(order_no, amount, description)
        payload["scene_info"] = {
            "payer_client_ip": client_ip or "127.0.0.1",
            "h5_info": {"type": "Wap"},
        }
        result = await self._request("POST", "/pay/transactions/h5", payload)
        return {
            "mock": False,
            "trade_type": "MWEB",
            "order_no": order_no,
            "mweb_url": result.get("h5_url", ""),
        }

    # ------------------------------------------------------------------
    # 主动查询订单 / 关闭订单
    # ------------------------------------------------------------------
    async def query_order(self, order_no: str) -> Optional[Dict]:
        """按商户订单号查询微信支付订单状态（对账用）"""
        return await self._request(
            "GET",
            f"/pay/transactions/out-trade-no/{order_no}",
            query=f"mchid={self.mch_id}",
        )

    async def close_order(self, order_no: str) -> bool:
        """关闭未支付订单"""
        await self._request(
            "POST",
            f"/pay/transactions/out-trade-no/{order_no}/close",
            {"mchid": self.mch_id},
        )
        return True

    # ------------------------------------------------------------------
    # 退款
    # ------------------------------------------------------------------
    async def refund(
        self,
        order_no: str,
        refund_no: str,
        refund_amount,
        order_amount,
        reason: str = "",
        notify_url: str = "",
    ) -> Dict:
        """申请退款（返回微信退款单信息）"""
        payload = {
            "out_trade_no": order_no,
            "out_refund_no": refund_no,
            "amount": {
                "refund": _amount_to_fen(refund_amount),
                "total": _amount_to_fen(order_amount),
                "currency": "CNY",
            },
        }
        if reason:
            payload["reason"] = reason[:80]
        if notify_url:
            payload["notify_url"] = notify_url
        return await self._request("POST", "/refund/domestic/refunds", payload)

    async def query_refund(self, refund_no: str) -> Dict:
        """查询退款状态"""
        return await self._request("GET", f"/refund/domestic/refunds/{refund_no}")

    # ------------------------------------------------------------------
    # 平台证书管理与回调验签
    # ------------------------------------------------------------------
    _platform_cert_cache: Dict[str, str] = {}   # serial_no -> PEM

    async def get_platform_cert(self, serial_no: str) -> Optional[str]:
        """获取指定序列号的微信支付平台证书（PEM）。带进程内缓存。"""
        if serial_no in self._platform_cert_cache:
            return self._platform_cert_cache[serial_no]
        try:
            result = await self._request("GET", "/certificates")
        except Exception as e:
            logger.error(f"拉取平台证书失败: {e}")
            return None
        for cert in result.get("data", []):
            if cert.get("serial_no") == serial_no and cert.get("encrypt_certificate"):
                try:
                    cert_text = self._decrypt_resource(cert["encrypt_certificate"])
                    self._platform_cert_cache[serial_no] = cert_text
                    return cert_text
                except Exception as e:
                    logger.error(f"解密平台证书失败: {e}")
                    return None
        logger.error(f"未找到匹配序列号的平台证书: {serial_no}")
        return None

    @staticmethod
    def _load_platform_public_key(cert_pem: str):
        cert = serialization.load_pem_x509_certificate(cert_pem.encode("utf-8"))
        return cert.public_key()

    @staticmethod
    def verify_notify_signature(headers: Dict, body: str, platform_cert_pem: str) -> bool:
        """校验回调签名：RSA-SHA256 验证 + 时间戳防重放（5 分钟内）"""
        timestamp = headers.get("wechatpay-timestamp", "")
        nonce = headers.get("wechatpay-nonce", "")
        signature = headers.get("wechatpay-signature", "")
        try:
            if abs(int(time.time()) - int(timestamp)) > 300:
                logger.warning(f"微信回调时间戳超限，疑似重放: ts={timestamp}")
                return False
        except (ValueError, TypeError):
            return False
        if not all([timestamp, nonce, signature]):
            return False
        message = f"{timestamp}\n{nonce}\n{body}\n"
        try:
            public_key = WechatPayV3._load_platform_public_key(platform_cert_pem)
            public_key.verify(
                base64.b64decode(signature),
                message.encode("utf-8"),
                padding.PKCS1v15(),
                hashes.SHA256(),
            )
            return True
        except Exception as e:
            logger.error(f"微信回调验签失败: {e}")
            return False

    def _decrypt_resource(self, resource: Dict) -> str:
        """用 APIv3 密钥解密 resource 中的密文（AES-256-GCM）"""
        from cryptography.hazmat.primitives.ciphers.aead import AESGCM
        api_key = self.api_v3_key.encode("utf-8")
        associated_data = resource["associated_data"].encode("utf-8")
        nonce = resource["nonce"].encode("utf-8")
        ciphertext = base64.b64decode(resource["ciphertext"])
        aesgcm = AESGCM(api_key)
        plaintext = aesgcm.decrypt(nonce, ciphertext, associated_data)
        return plaintext.decode("utf-8")

    async def parse_notify(self, headers: Dict, body: bytes) -> Optional[Dict]:
        """解析并校验微信支付 v3 回调。

        返回解密后的支付结果 dict；验签/解密失败返回 None。
        注意：本方法仅负责验签解密，最终业务处理在路由层完成。
        """
        if not self.configured:
            logger.warning("微信支付未配置，无法验签 v3 回调")
            return None
        try:
            notify = json.loads(body.decode("utf-8"))
        except json.JSONDecodeError:
            logger.error("微信v3回调非JSON")
            return None

        serial_header = headers.get("wechatpay-serial", "")
        platform_cert = await self.get_platform_cert(serial_header)
        if not platform_cert:
            return None

        if not self.verify_notify_signature(headers, body.decode("utf-8"), platform_cert):
            return None

        event_type = notify.get("event_type", "")
        resource = notify.get("resource", {})
        if not resource:
            logger.error("微信v3回调缺少 resource")
            return None
        try:
            plaintext = self._decrypt_resource(resource)
            data = json.loads(plaintext)
            data["_event_type"] = event_type
            return data
        except Exception as e:
            logger.error(f"微信v3回调解密失败: {e}")
            return None


class WechatPayError(Exception):
    """微信支付业务错误"""

    def __init__(self, status_code=400, code="", message="", detail=None):
        super().__init__(message)
        self.status_code = status_code
        self.code = code
        self.message = message
        self.detail = detail


# 单例
wechat_pay_v3 = WechatPayV3()
