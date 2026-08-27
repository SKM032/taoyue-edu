#!/usr/bin/env python3
# -*- coding: utf-8 -*-
# ============================================================================
# 桃悦智科：GitHub Actions 部署 Webhook 服务 webhook_server.py
# ============================================================================

import json
import hmac
import os
import subprocess
import threading
from http.server import BaseHTTPRequestHandler, HTTPServer

# 配置区
HOST = "0.0.0.0"
PORT = int(os.environ.get("WEBHOOK_PORT", "9000"))
TOKEN = os.environ.get("WEBHOOK_TOKEN", "change-me-please")
ALLOWED_SERVICES = {"api", "web"}
DEPLOY_SCRIPT = os.environ.get("DEPLOY_SCRIPT", "/root/projects/deploy.sh")
DEPLOY_TIMEOUT = int(os.environ.get("DEPLOY_TIMEOUT", "300"))


class DeployHandler(BaseHTTPRequestHandler):

    def log_message(self, fmt, *args):
        print(f"[webhook] {self.log_date_time_string()} - {fmt % args}", flush=True)

    def _send_json(self, code, payload):
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def _check_token(self):
        supplied = self.headers.get("X-Deploy-Token", "")
        return hmac.compare_digest(supplied, TOKEN)

    def do_POST(self):

        if self.path != "/hook":
            self._send_json(404, {"ok": False, "error": "not found"})
            return

        if not self._check_token():
            print("[webhook] token 校验失败", flush=True)
            self._send_json(401, {"ok": False, "error": "invalid token"})
            return

        try:
            length = int(self.headers.get("Content-Length", "0"))
            raw = self.rfile.read(length)
            data = json.loads(raw) if raw else {}
        except Exception as e:
            self._send_json(400, {"ok": False, "error": f"bad json: {e}"})
            return

        service = data.get("service", "")
        tag = data.get("tag", "latest")

        if service not in ALLOWED_SERVICES:
            self._send_json(400, {"ok": False, "error": f"service {service} not allowed"})
            return

        def _deploy():
            print(f"[webhook] 开始部署 {service} @ {tag}", flush=True)
            try:
                result = subprocess.run(
                    ["/bin/bash", DEPLOY_SCRIPT, service, tag],
                    capture_output=True,
                    text=True,
                    timeout=DEPLOY_TIMEOUT
                )
                print(f"[webhook] deploy {service} exit={result.returncode}", flush=True)
                if result.stdout:
                    print(f"[webhook] stdout:\n{result.stdout}", flush=True)
                if result.stderr:
                    print(f"[webhook] stderr:\n{result.stderr}", flush=True)
            except subprocess.TimeoutExpired:
                print(f"[webhook] deploy {service} 超时", flush=True)
            except Exception as e:
                print(f"[webhook] deploy {service} 异常: {e}", flush=True)

        threading.Thread(target=_deploy, daemon=True).start()
        self._send_json(200, {"ok": True, "service": service, "tag": tag})


def main():
    if TOKEN == "change-me-please":
        print("⚠️  警告: WEBHOOK_TOKEN 未设置，使用默认值！请设置强随机 token。", flush=True)

    server = HTTPServer((HOST, PORT), DeployHandler)
    print(f"✅ webhook_server 监听 http://{HOST}:{PORT}/hook (允许服务: {ALLOWED_SERVICES})", flush=True)

    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n⏹  停止服务", flush=True)
        server.shutdown()


if __name__ == "__main__":
    main()