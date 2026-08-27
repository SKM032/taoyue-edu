"""支付模块：微信支付(APIv2) + 支付宝(电脑网站/手机网站支付)

设计说明：
- 当商户配置(WECHAT_PAY_* / ALIPAY_*)未在 .env 中填写时，自动降级为「模拟支付」，
  保证本地开发流程不中断；一旦填齐配置即自动启用真实支付。
- 微信支付使用 APIv2（统一下单 unifiedorder，MD5 签名，XML 报文）。
- 支付宝使用「电脑网站支付 alipay.trade.page.pay / 手机网站支付 alipay.trade.wap.pay」，
  RSA2 签名。

需要准备的商户资料见 README / 本文件底部 CONFIG_REQUIRED 说明。
"""
import hashlib
import json
import logging
import os
import time
import uuid
import base64
from decimal import Decimal
from typing import Dict, Optional, Tuple
from urllib.parse import urlencode, parse_qsl

import httpx
from fastapi import HTTPException, status

from app.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()


# ==================== 通用工具 ====================

def _safe_str(v) -> str:
    """转字符串，None -> ''"""
    return "" if v is None else str(v)


def _wechat_amount(amount: Decimal) -> int:
    """元 -> 分（微信金额单位）"""
    return int((Decimal(amount) * 100).quantize(Decimal("1")))


# ==================== 微信支付(APIv2) ====================

class WechatPay:
    """微信支付（APIv2）—— 统一下单 / 扫码(NATIVE) / 公众号+小程序(JSAPI) / APP"""

    GATEWAY = "https://api.mch.weixin.qq.com"

    def __init__(self):
        self.app_id = settings.WECHAT_PAY_APP_ID
        self.mch_id = settings.WECHAT_PAY_MCH_ID
        self.api_key = settings.WECHAT_PAY_API_KEY
        self.notify_url = settings.WECHAT_PAY_NOTIFY_URL

    @property
    def configured(self) -> bool:
        return bool(self.app_id and self.mch_id and self.api_key and self.notify_url)

    # ---- 签名 ----
    def _make_sign(self, params: Dict) -> str:
        """APIv2 MD5 签名（需包含商户 key，注意 key 值本身不参与排序）"""
        items = []
        for k in sorted(params.keys()):
            v = params[k]
            if v is None or v == "" or k == "sign":
                continue
            items.append(f"{k}={_safe_str(v)}")
        items.append(f"key={self.api_key}")
        sign_str = "&".join(items)
        return hashlib.md5(sign_str.encode("utf-8")).hexdigest().upper()

    @staticmethod
    def _dict_to_xml(data: Dict) -> str:
        parts = ["<xml>"]
        for k, v in data.items():
            parts.append(f"<{k}><![CDATA[{_safe_str(v)}]]></{k}>")
        parts.append("</xml>")
        return "".join(parts)

    @staticmethod
    def _xml_to_dict(xml_str: str) -> Dict:
        import xml.etree.ElementTree as ET
        try:
            root = ET.fromstring(xml_str)
            return {child.tag: (child.text or "") for child in root}
        except Exception as e:
            logger.error(f"解析微信返回 XML 失败: {e}")
            return {}

    def unified_order(
        self,
        order_no: str,
        amount: Decimal,
        body: str,
        openid: str = "",
        trade_type: str = "NATIVE",
        client_ip: str = "127.0.0.1",
    ) -> Dict:
        """微信统一下单，返回真实 prepay_id / code_url。

        trade_type: NATIVE(扫码) / JSAPI(公众号/小程序) / APP
        """
        if not self.configured:
            logger.warning("微信支付未配置，返回模拟下单数据")
            return {
                "mock": True,
                "prepay_id": f"wx_prepay_{uuid.uuid4().hex}",
                "code_url": f"weixin://wxpay/bizpayurl?pr={uuid.uuid4().hex[:16]}",
                "order_no": order_no,
            }

        params = {
            "appid": self.app_id,
            "mch_id": self.mch_id,
            "nonce_str": uuid.uuid4().hex,
            "body": body[:128],
            "out_trade_no": order_no,
            "total_fee": _wechat_amount(amount),
            "spbill_create_ip": client_ip,
            "notify_url": self.notify_url,
            "trade_type": trade_type,
        }
        if trade_type == "JSAPI":
            if not openid:
                raise HTTPException(status_code=400, detail="JSAPI支付必须提供 openid")
            params["openid"] = openid
        params["sign"] = self._make_sign(params)

        xml_body = self._dict_to_xml(params)
        try:
            resp = httpx.post(
                f"{self.GATEWAY}/pay/unifiedorder",
                content=xml_body,
                headers={"Content-Type": "text/xml"},
                timeout=15,
            )
            result = self._xml_to_dict(resp.text)
        except Exception as e:
            logger.error(f"微信统一下单请求异常: {e}")
            raise HTTPException(status_code=502, detail="微信支付服务暂时不可用")

        if result.get("return_code") != "SUCCESS":
            raise HTTPException(
                status_code=502,
                detail=f"微信下单失败: {result.get('return_msg', '未知错误')}",
            )
        if result.get("result_code") != "SUCCESS":
            logger.error(f"微信下单业务失败: {result}")
            raise HTTPException(
                status_code=502,
                detail=f"微信下单失败: {result.get('err_code_des', result.get('return_msg', ''))}",
            )

        return {
            "mock": False,
            "prepay_id": result.get("prepay_id", ""),
            "code_url": result.get("code_url", ""),
            "mweb_url": result.get("mweb_url", ""),
            "order_no": order_no,
            "trade_type": trade_type,
        }

    def build_jsapi_pay_params(self, prepay_id: str) -> Dict:
        """根据 prepay_id 生成 JSAPI 前端拉起支付所需的参数（含 paySign）"""
        params = {
            "appId": self.app_id,
            "timeStamp": str(int(time.time())),
            "nonceStr": uuid.uuid4().hex,
            "package": f"prepay_id={prepay_id}",
            "signType": "MD5",
        }
        params["paySign"] = self._make_sign({
            "appId": params["appId"],
            "timeStamp": params["timeStamp"],
            "nonceStr": params["nonceStr"],
            "package": params["package"],
            "signType": params["signType"],
        })
        return params

    def build_app_pay_params(self, prepay_id: str) -> Dict:
        """APP 支付所需的 prepay 参数"""
        params = {
            "appid": self.app_id,
            "partnerid": self.mch_id,
            "prepayid": prepay_id,
            "package": "Sign=WXPay",
            "noncestr": uuid.uuid4().hex,
            "timestamp": str(int(time.time())),
        }
        params["sign"] = self._make_sign(params)
        return params

    # ---- 回调验签 ----
    def verify_notify(self, notify_data: Dict) -> bool:
        """验证异步通知签名（V2 MD5）。不修改传入字典。"""
        if not self.configured:
            logger.warning("微信支付未配置，跳过回调验签")
            return True
        sign = notify_data.get("sign", "")
        data = {k: v for k, v in notify_data.items() if k != "sign"}
        return self._make_sign(data) == sign


# ==================== 支付宝 ====================

class Alipay:
    """支付宝支付（电脑网站 alipay.trade.page.pay / 手机网站 alipay.trade.wap.pay）"""

    GATEWAY = "https://openapi.alipay.com/gateway.do"

    def __init__(self):
        # 沙箱模式：使用沙箱网关与沙箱 AppID（免签约测试）
        self.sandbox = bool(getattr(settings, "ALIPAY_SANDBOX", False))
        # 沙箱是否用系统默认密钥（True 时不传私钥/公钥，沙箱内部用内置密钥）
        self.sandbox_default_key = self.sandbox and bool(
            getattr(settings, "ALIPAY_SANDBOX_USE_DEFAULT_KEY", True)
        )
        if self.sandbox:
            self.app_id = getattr(settings, "ALIPAY_SANDBOX_APP_ID", "") or settings.ALIPAY_APP_ID
            self.GATEWAY = getattr(settings, "ALIPAY_SANDBOX_GATEWAY", "") or "https://openapi.alipaydev.com/gateway.do"
            logger.warning("支付宝当前为【沙箱模式】，网关: %s，默认密钥: %s",
                           self.GATEWAY, self.sandbox_default_key)
        else:
            self.app_id = settings.ALIPAY_APP_ID
        if self.sandbox_default_key:
            # 沙箱默认密钥模式：使用占位密钥（实际不参与验签，沙箱内部处理）
            self.private_key = "SANDBOX_DEFAULT_KEY"
            self.alipay_public_key = "SANDBOX_DEFAULT_KEY"
        else:
            self.private_key = self._resolve_key(
                settings.ALIPAY_PRIVATE_KEY,
                getattr(settings, "ALIPAY_PRIVATE_KEY_PATH", ""),
                "alipay_private_key.pem",
            )
            self.alipay_public_key = self._resolve_key(
                settings.ALIPAY_PUBLIC_KEY,
                getattr(settings, "ALIPAY_PUBLIC_KEY_PATH", ""),
                "alipay_public_key.pem",
            )
        self.notify_url = settings.ALIPAY_NOTIFY_URL

    @staticmethod
    def _resolve_key(env_value: str, path_value: str, default_file: str) -> str:
        """解析私钥/公钥内容：优先读文件，其次用环境变量值。

        - 文件：ALIPAY_PRIVATE_KEY_PATH / ALIPAY_PUBLIC_KEY_PATH，或自动探测 certs/<default_file>
        - 环境变量：ALIPAY_PRIVATE_KEY / ALIPAY_PUBLIC_KEY（支持 \\n 转义）
        """
        # 1. 显式路径
        candidates = []
        if path_value:
            candidates.append(path_value)
        # 2. 自动探测项目内 certs/ 目录
        candidates.append(os.path.join(os.getcwd(), "certs", default_file))
        candidates.append(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "certs", default_file))

        for p in candidates:
            norm = os.path.normpath(p)
            if norm and os.path.exists(norm):
                try:
                    with open(norm, "r", encoding="utf-8") as f:
                        content = f.read()
                    if content and "-----BEGIN" in content:
                        logger.info(f"从文件加载支付宝密钥: {norm}")
                        return content
                except Exception as e:
                    logger.warning(f"读取支付宝密钥文件失败 {norm}: {e}")

        # 3. 回退到环境变量
        if env_value and "-----BEGIN" in env_value:
            return env_value
        if env_value and "\\n" in env_value:
            return env_value.replace("\\n", "\n")
        return env_value or ""

    @property
    def configured(self) -> bool:
        return bool(self.app_id and self.private_key and self.alipay_public_key and self.notify_url)

    # ---- 签名 ----
    @staticmethod
    def _normalize_params(params: Dict) -> Dict:
        """过滤空值并格式化 biz_content 为 JSON 字符串"""
        normalized = {}
        for k, v in params.items():
            if v is None or v == "":
                continue
            if k == "biz_content" and isinstance(v, (dict, list)):
                normalized[k] = json.dumps(v, ensure_ascii=False, separators=(",", ":"))
            else:
                normalized[k] = _safe_str(v)
        return normalized

    def _sign(self, sign_str: str) -> str:
        """RSA2 (SHA256withRSA) 签名，返回 base64 结果"""
        # 沙箱"系统默认密钥"模式：不进行本地签名，沙箱内部用内置密钥验签
        if getattr(self, "sandbox_default_key", False):
            return ""
        from cryptography.hazmat.primitives import hashes, serialization
        from cryptography.hazmat.primitives.asymmetric import padding

        key = serialization.load_pem_private_key(
            self.private_key.encode("utf-8"), password=None
        )
        signature = key.sign(
            sign_str.encode("utf-8"),
            padding.PKCS1v15(),
            hashes.SHA256(),
        )
        return base64.b64encode(signature).decode()

    def _make_sign(self, params: Dict) -> str:
        """对通用参数（不含 sign）按 key 排序拼接后做 RSA2 签名"""
        # 沙箱默认密钥模式：返回空签名（调用方不应把空 sign 加入参数）
        if getattr(self, "sandbox_default_key", False):
            return ""
        normalized = self._normalize_params(params)
        sign_str = "&".join(f"{k}={normalized[k]}" for k in sorted(normalized.keys()))
        # 调试：打印签名串，便于和支付宝验签串对比
        logger.info("ALIPAY 签名串: %s", sign_str)
        return self._sign(sign_str)

    # ---- 下单 ----
    def _build_pay_url(self, method: str, order_no: str, amount: Decimal,
                       subject: str, return_url: str = "") -> str:
        biz_content = {
            "out_trade_no": order_no,
            "product_code": "FAST_INSTANT_TRADE_PAY",
            "total_amount": f"{Decimal(str(amount)):.2f}",
            "subject": subject[:256],
            "timeout_express": "30m",
        }
        params = {
            "app_id": self.app_id,
            "method": method,
            "format": "JSON",
            "charset": "utf-8",
            "sign_type": "RSA2",
            "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
            "version": "1.0",
            "notify_url": self.notify_url,
        }
        if return_url:
            params["return_url"] = return_url
        params["biz_content"] = biz_content

        normalized = self._normalize_params(params)
        sign = self._sign(
            "&".join(f"{k}={normalized[k]}" for k in sorted(normalized.keys()))
        )
        # 沙箱默认密钥模式：sign 为空，不加入参数（沙箱内部验签）
        if sign:
            normalized["sign"] = sign
        return f"{self.GATEWAY}?{urlencode(normalized)}"

    def page_pay(self, order_no: str, amount: Decimal, subject: str,
                 return_url: str = "") -> str:
        """电脑网站支付，返回跳转支付 URL"""
        if not self.configured:
            logger.warning("支付宝未配置，返回模拟支付 URL")
            return f"/checkout/mock-pay?order_no={order_no}&amount={amount}"
        return self._build_pay_url(
            "alipay.trade.page.pay", order_no, amount, subject, return_url
        )

    def wap_pay(self, order_no: str, amount: Decimal, subject: str,
                return_url: str = "") -> str:
        """手机网站支付，返回跳转支付 URL"""
        if not self.configured:
            logger.warning("支付宝未配置，返回模拟支付 URL")
            return f"/checkout/mock-pay?order_no={order_no}&amount={amount}"
        return self._build_pay_url(
            "alipay.trade.wap.pay", order_no, amount, subject, return_url
        )

    # ---- 通用请求（POST 网关取 JSON 响应：查询/退款等）----
    def _build_common_params(self, method: str, biz_content: Dict) -> Dict:
        """构造带签名的通用请求参数"""
        params = {
            "app_id": self.app_id,
            "method": method,
            "format": "JSON",
            "charset": "utf-8",
            "sign_type": "RSA2",
            "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
            "version": "1.0",
        }
        params["biz_content"] = biz_content
        normalized = self._normalize_params(params)
        sign = self._sign("&".join(f"{k}={normalized[k]}" for k in sorted(normalized.keys())))
        # 沙箱默认密钥模式：sign 为空不加入（沙箱内部验签）
        if sign:
            normalized["sign"] = sign
        return normalized

    def _request_gateway(self, method: str, biz_content: Dict, timeout: float = 15.0) -> Dict:
        """POST 到支付宝网关，解析返回 JSON（用于查询/退款等）。"""
        if not self.configured:
            raise RuntimeError("支付宝未配置，无法调用查询/退款接口")
        params = self._build_common_params(method, biz_content)
        try:
            resp = httpx.post(
                self.GATEWAY,
                data=params,
                headers={"Content-Type": "application/x-www-form-urlencoded;charset=utf-8"},
                timeout=timeout,
            )
            resp.raise_for_status()
            data = resp.json()
        except httpx.HTTPError as e:
            logger.error(f"支付宝网关请求异常: {method}, err={e}")
            raise RuntimeError("支付宝服务暂时不可用")
        except json.JSONDecodeError:
            logger.error(f"支付宝返回非JSON: {resp.text[:300]}")
            raise RuntimeError("支付宝返回格式异常")

        # 判断业务是否成功
        if data.get("alipay_trade_query_response"):
            biz = data["alipay_trade_query_response"]
            if biz.get("code") != "10000":
                raise RuntimeError(f"支付宝查询失败: {biz.get('code')} {biz.get('sub_msg') or biz.get('msg')}")
            return biz
        if data.get("alipay_trade_refund_response"):
            biz = data["alipay_trade_refund_response"]
            if biz.get("code") != "10000":
                raise RuntimeError(f"支付宝退款失败: {biz.get('code')} {biz.get('sub_msg') or biz.get('msg')}")
            return biz
        raise RuntimeError(f"支付宝网关返回异常: {str(data)[:200]}")

    def query_order(self, order_no: str) -> Optional[Dict]:
        """主动查询支付宝订单交易状态（对账用）"""
        biz = {"out_trade_no": order_no}
        resp = self._request_gateway("alipay.trade.query", biz)
        return {
            "trade_no": resp.get("trade_no", ""),
            "trade_status": resp.get("trade_status", ""),
            "total_amount": resp.get("total_amount", ""),
            "out_trade_no": resp.get("out_trade_no", order_no),
        }

    def refund(self, order_no: str, refund_no: str, refund_amount: Decimal, reason: str = "") -> Dict:
        """申请退款（全额/部分退款）"""
        biz = {
            "out_trade_no": order_no,
            "out_request_no": refund_no,
            "refund_amount": str(refund_amount),
        }
        if reason:
            biz["refund_reason"] = reason[:256]
        resp = self._request_gateway("alipay.trade.refund", biz)
        return {
            "trade_no": resp.get("trade_no", ""),
            "refund_status": "REFUND_SUCCESS" if resp.get("fund_change") == "Y" else "PROCESSING",
            "refund_fee": resp.get("refund_fee", ""),
        }

    # ---- 回调验签 ----
    def verify_notify(self, params: Dict) -> bool:
        """验证支付宝异步通知签名（RSA2）。入参为已解析的 dict。"""
        if not self.configured:
            logger.warning("支付宝未配置，跳过回调验签")
            return True

        sign = params.get("sign", "")
        # 参与验签的字段：排除 sign、sign_type
        data = {
            k: _safe_str(v)
            for k, v in params.items()
            if k not in ("sign", "sign_type") and v not in (None, "")
        }
        sign_str = "&".join(f"{k}={data[k]}" for k in sorted(data.keys()))

        from cryptography.hazmat.primitives import hashes, serialization
        from cryptography.hazmat.primitives.asymmetric import padding

        try:
            public_key = serialization.load_pem_public_key(
                self.alipay_public_key.encode("utf-8")
            )
            public_key.verify(
                base64.b64decode(sign),
                sign_str.encode("utf-8"),
                padding.PKCS1v15(),
                hashes.SHA256(),
            )
            return True
        except Exception as e:
            logger.error(f"支付宝回调验签失败: {e}")
            return False


# ==================== 支付服务门面 ====================

wechat_pay = WechatPay()
alipay = Alipay()


def create_payment(
    pay_method: str,
    order_no: str,
    amount: Decimal,
    subject: str,
    openid: str = "",
    return_url: str = "",
    client_ip: str = "127.0.0.1",
    trade_type: str = "NATIVE",
) -> Dict:
    """统一支付入口。返回可直接用于前端渲染的支付数据。"""
    if pay_method == "wechat":
        result = wechat_pay.unified_order(
            order_no=order_no,
            amount=amount,
            body=subject,
            openid=openid,
            trade_type=trade_type,
            client_ip=client_ip,
        )
        # JSAPI（小程序/公众号）需要额外的拉起支付参数，供 wx.requestPayment 使用
        prepay_id = result.get("prepay_id", "")
        if trade_type == "JSAPI" and prepay_id:
            result["jsapi_pay_params"] = wechat_pay.build_jsapi_pay_params(prepay_id)
        return {"method": "wechat", **result}
    elif pay_method == "alipay":
        # 电脑网站支付(NATIVE/page) / 手机网站支付(MWEB/wap)
        if trade_type in ("MWEB", "WAP", "H5"):
            pay_url = alipay.wap_pay(
                order_no=order_no,
                amount=amount,
                subject=subject,
                return_url=return_url,
            )
        else:
            pay_url = alipay.page_pay(
                order_no=order_no,
                amount=amount,
                subject=subject,
                return_url=return_url,
            )
        return {"method": "alipay", "pay_url": pay_url, "order_no": order_no}
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"不支持的支付方式: {pay_method}",
        )


# ==================== 配置清单说明 ====================
# 需要准备的商户资料（填写到 .env 即可启用真实支付）：
#
# 【微信支付】（需已开通微信商户号）
#   WECHAT_PAY_APP_ID   : 微信开放平台/公众号/小程序 的 AppID
#   WECHAT_PAY_MCH_ID   : 微信商户号（mch_id，如 1900000109）
#   WECHAT_PAY_API_KEY  : 商户平台设置的 APIv3/APIv2 密钥（v2 用，32 位）
#   WECHAT_PAY_NOTIFY_URL: 后端回调地址，如 https://api.example.com/api/v1/orders/wechat/notify
#
# 【支付宝】（需已签约「电脑网站支付/手机网站支付」产品）
#   ALIPAY_APP_ID        : 支付宝开放平台应用 APPID（AppId）
#   ALIPAY_PRIVATE_KEY   : 应用私钥（PEM 格式，含 -----BEGIN PRIVATE KEY-----）
#   ALIPAY_PUBLIC_KEY    : 支付宝公钥（PEM 格式，含 -----BEGIN PUBLIC KEY-----）
#   ALIPAY_NOTIFY_URL    : 后端回调地址，如 https://api.example.com/api/v1/orders/alipay/notify
#
# 注意：
#   - 支付宝公钥需在开放平台「开发设置-接口加签方式」中复制「支付宝公钥」，
#     并填写为 PEM 格式（可在工具中转换）。
#   - notify_url 必须为公网可访问的 HTTPS 地址，微信/支付宝服务器才能回调到。
