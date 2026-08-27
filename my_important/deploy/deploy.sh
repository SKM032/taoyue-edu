#!/usr/bin/env bash
# ============================================================================
# 桃悦智科：服务器端部署脚本 deploy.sh
# ============================================================================

# 0. 严格模式
set -euo pipefail

# 1. 可配置参数
REGISTRY="registry.cn-hangzhou.aliyuncs.com"
NAMESPACE="taoyue-edu"
PROJECT_DIR="/root/projects"
ALLOWED_SERVICES="api web"

# 2. 解析命令行参数
SERVICE="${1:-}"
TAG="${2:-latest}"

if [ -z "$SERVICE" ]; then
  echo "用法: $0 <service> <tag>" >&2
  exit 1
fi

if ! echo "$ALLOWED_SERVICES" | grep -qw "$SERVICE"; then
  echo "不支持的 service: $SERVICE（仅支持: $ALLOWED_SERVICES）" >&2
  exit 1
fi

cd "$PROJECT_DIR" || { echo "目录不存在: $PROJECT_DIR" >&2; exit 1; }

# 3. 日志函数
log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*"; }

log "开始部署 $SERVICE @ ${TAG}"

# 4. 核心部署流程
log "拉取镜像 $REGISTRY/$NAMESPACE/$SERVICE:latest"
docker pull "$REGISTRY/$NAMESPACE/$SERVICE:latest" || true

log "compose 拉取并重建 $SERVICE"
docker compose pull "$SERVICE"
docker compose up -d --no-build --no-deps --force-recreate "$SERVICE"

log "清理旧镜像"
docker image prune -f >/dev/null 2>&1 || true

log "✔ $SERVICE 部署完成"