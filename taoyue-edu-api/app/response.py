"""统一 API 响应格式: { code: int, message: str, data: any }"""
import json
import logging

from fastapi.responses import JSONResponse

logger = logging.getLogger(__name__)

# 不需要包装的路径前缀
_SKIP_PREFIXES = (
    "/docs",
    "/redoc",
    "/openapi.json",
)

# 不需要包装的精确路径
_SKIP_EXACT = {
    "/api/v1/orders/wechat/notify",
    "/api/v1/orders/alipay/notify",
}


class UnifiedResponseMiddleware:
    """统一响应格式中间件（纯 ASGI）"""

    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        path = scope["path"]

        # 跳过不需要包装的路径
        if any(path.startswith(p) for p in _SKIP_PREFIXES) or path in _SKIP_EXACT:
            await self.app(scope, receive, send)
            return

        # 拦截 send 来修改响应
        responder = _ResponseModifier(send, path)
        await self.app(scope, receive, responder)


class _ResponseModifier:
    """响应修改器：拦截 JSON 响应并包装为统一格式"""

    def __init__(self, send, path):
        self._send = send
        self._path = path
        self._status_code = 200
        self._headers = []
        self._body = b""
        self._started = False

    async def __call__(self, message):
        msg_type = message["type"]

        if msg_type == "http.response.start":
            self._status_code = message.get("status", 200)
            self._headers = message.get("headers", [])
            self._started = True
            return  # 暂不发送，等 body 到齐后统一处理

        elif msg_type == "http.response.body":
            self._body += message.get("body", b"")
            more = message.get("more_body", False)

            if not more:
                # body 接收完毕，进行包装
                await self._send_wrapped()
            return

        else:
            await self._send(message)

    async def _send_wrapped(self):
        # 检查响应头
        content_type = ""
        content_encoding = ""
        for key, val in self._headers:
            lkey = key.lower()
            if lkey == b"content-type":
                content_type = val.decode("latin-1")
            elif lkey == b"content-encoding":
                content_encoding = val.decode("latin-1")

        # 已压缩的响应（如 gzip）直接透传，不做业务包装，避免破坏压缩数据
        if "gzip" in content_encoding:
            await self._send({
                "type": "http.response.start",
                "status": self._status_code,
                "headers": self._headers,
            })
            await self._send({
                "type": "http.response.body",
                "body": self._body,
            })
            return

        if "application/json" not in content_type:
            # 非 JSON，直接透传
            await self._send({
                "type": "http.response.start",
                "status": self._status_code,
                "headers": self._headers,
            })
            await self._send({
                "type": "http.response.body",
                "body": self._body,
            })
            return

        # 解析原始 JSON
        try:
            original = json.loads(self._body)
        except (json.JSONDecodeError, UnicodeDecodeError):
            original = None

        # 已经是统一格式，透传
        if isinstance(original, dict) and "code" in original and "message" in original and "data" in original:
            await self._send({
                "type": "http.response.start",
                "status": self._status_code,
                "headers": self._headers,
            })
            await self._send({
                "type": "http.response.body",
                "body": self._body,
            })
            return

        # 包装为统一格式
        if self._status_code >= 400:
            detail = original.get("detail", "请求失败") if isinstance(original, dict) else "请求失败"
            wrapped = {"code": self._status_code, "message": detail, "data": None}
        else:
            message = "操作成功"
            data = original
            if isinstance(original, dict) and "message" in original:
                message = original.pop("message")
                if not original:
                    data = None
            wrapped = {"code": 0, "message": message, "data": data}

        wrapped_body = json.dumps(wrapped, ensure_ascii=False).encode("utf-8")

        # 更新 content-length
        new_headers = []
        for key, val in self._headers:
            if key.lower() == b"content-length":
                new_headers.append((key, str(len(wrapped_body)).encode("latin-1")))
            else:
                new_headers.append((key, val))

        await self._send({
            "type": "http.response.start",
            "status": self._status_code,
            "headers": new_headers,
        })
        await self._send({
            "type": "http.response.body",
            "body": wrapped_body,
        })
