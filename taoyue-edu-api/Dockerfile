# ============ 构建阶段 ============
FROM python:3.12-slim AS builder

WORKDIR /app

# 安装系统依赖（apt 源改为阿里云镜像，加速国内构建）
RUN rm -f /etc/apt/sources.list.d/debian.sources \
    && echo "deb http://mirrors.aliyun.com/debian/ trixie main contrib non-free non-free-firmware" > /etc/apt/sources.list \
    && echo "deb http://mirrors.aliyun.com/debian/ trixie-updates main contrib non-free non-free-firmware" >> /etc/apt/sources.list \
    && echo "deb http://mirrors.aliyun.com/debian-security/ trixie-security main contrib non-free non-free-firmware" >> /etc/apt/sources.list \
    && apt-get update \
    && apt-get install -y --no-install-recommends \
       gcc \
       libssl-dev \
    && rm -rf /var/lib/apt/lists/*

# 安装 Python 依赖到 /install 目录（使用阿里云 PyPI 镜像加速）
COPY requirements.txt .
RUN pip install --no-cache-dir -i https://mirrors.aliyun.com/pypi/simple/ --prefix=/install -r requirements.txt

# ============ 运行阶段 ============
FROM python:3.12-slim

WORKDIR /app

# 创建非 root 用户
RUN groupadd -r appuser && useradd -r -g appuser appuser

# 从构建阶段复制依赖
COPY --from=builder /install /usr/local

# 复制应用代码
COPY app/ ./app/
COPY run.py .
COPY init_db.py .
COPY create_admin.py .

# 创建静态文件目录
RUN mkdir -p /app/static && chown -R appuser:appuser /app

USER appuser

EXPOSE 8000

# 健康检查
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/api/v1/health')" || exit 1

# 启动命令
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "4", "--proxy-headers", "--forwarded-allow-ips", "*"]
