# 桃悦智科 CI/CD 部署教程（GitHub Actions 版 · 大厂级规范）

> 本文把"每次手动改代码 → scp 上传 → 服务器构建 → 重启"的繁琐流程，升级为 **`git push` 一步到位**：
> 代码推到 GitHub → GitHub Actions 自动构建 4 个端 → 推送镜像/产物 → 服务器自动部署。
>
> **适用对象**：0 基础小白。每一步都有前置检查、可照抄的命令、以及"做对了会看到什么"的验证方法。
> **覆盖范围**：本项目 **4 个端**（后端 API / PC 客户端 / 管理后台 / 移动端 H5）统一使用 **GitHub Actions** 全自动部署到阿里云。
>
> ⚠️ **版本说明**：本文档为**纯 GitHub Actions 方案**（不含 GitLab CI）。所有配置与项目实际生效的 `.github/workflows/deploy.yml`、`deploy/deploy.sh`、`deploy/webhook_server.py` 完全一致。

---

## 目录

- [一、先看懂：你的 4 个端分别怎么部署](#一先看懂你的-4-个端分别怎么部署)
- [二、整体流程与原理](#二整体流程与原理)
- [三、第一步：把项目推到 GitHub（含 .gitignore 安全配置）](#三第一步把项目推到-github含-gitignore-安全配置)
- [四、第二步：阿里云容器镜像仓库 ACR 准备](#四第二步阿里云容器镜像仓库-acr-准备)
- [五、第三步：服务器安装 Docker](#五第三步服务器安装-docker)
- [六、第四步：创建服务器端部署脚本（deploy.sh + webhook_server.py）](#六第四步创建服务器端部署脚本deploysh--webhook_serverpy)
- [七、第五步：配置 GitHub Secrets（关键！）](#七第五步配置-github-secrets关键)
- [八、第六步：检查/编写 GitHub Actions 工作流](#八第六步检查编写-github-actions-工作流)
- [九、第七步：给 compose 加 image（api/web 用）](#九第七步给-compose-加-imageapiweb-用)
- [十、第八步：push 触发部署 & 验证](#十第八步push-触发部署--验证)
- [十一、日常使用：改代码后怎么部署](#十一日常使用改代码后怎么部署)
- [十二、常见问题与排错](#十二常见问题与排错)
- [十三、版本回滚与安全](#十三版本回滚与安全)
- [总结](#总结)

---

## 一、先看懂：你的 4 个端分别怎么部署

部署前必须清楚每个端用什么方式上线。本项目 4 个端的技术栈和部署方式如下：

| # | 端 | 目录 | 技术栈 | 部署方式 |
|---|-----|------|--------|---------|
| 1 | **后端 API** | `taoyue-edu-api/` | Python FastAPI | Docker 镜像 → ACR → 服务器容器（webhook 触发） |
| 2 | **PC 客户端** | `taoyue-edu/` | Next.js 14 | Docker 镜像 → ACR → 服务器容器（webhook 触发） |
| 3 | **管理后台** | `taoyue_edu_admin/` | Vite + React + Antd | GitHub 构建静态产物 → ssh 上传 → `docker cp` 替换容器文件 |
| 4 | **移动端 H5** | `m/` | uni-app (Vue3) | GitHub 构建静态产物 → ssh 上传到服务器 nginx（m-static） |

### 为什么 4 个端部署方式不同？

- **API / PC** 是"服务"，在服务器上以 **Docker 容器** 运行，需要构建镜像、推镜像、拉镜像 → 走 **ACR + webhook** 流程。
- **管理后台 / 移动端** 是纯静态页面，构建后就是 `html/js/css`。为避免服务器内存不足（本项目仅 1.6G）导致 `npm build` 卡死，改为**在 GitHub 云端构建静态产物，直接上传替换**，不走容器镜像。

> ⚠️ **重要**：`docker-compose.yml` 中 `admin` 虽有容器，但它的静态文件是**由 CI 直接 `docker cp` 替换**的，不需要构建 admin 镜像。同理 m 端走 nginx 静态托管。**只有 `api`、`web` 两个端构建 Docker 镜像**。

---

## 二、整体流程与原理

### 2.1 现在的问题（手动部署太麻烦）

旧流程大致是：
```
改代码 → 在服务器 npm ci（很慢甚至卡死）→ docker compose build → 重启 → 一个个验证
```

- **`npm ci`**：把 Node 依赖下载安装到服务器，小内存服务器（如 1.6G）经常**卡死/OOM**
- **`docker compose build`**：在服务器本地编译，同样**极慢甚至超时**
- **手动验证**：登录服务器逐个 `docker ps`/`docker logs`/浏览器检查

**痛点**：构建占用服务器资源、步骤重复易错、每次改代码都要全套重来。

### 2.2 CI/CD 想解决的：push 即上线

```
本地改代码
   │
   ▼  git add / commit / push
GitHub 收到代码
   │
   ▼  自动触发 Actions（免费云端高配机器）
   ├── 1. 构建后端 api 镜像 → 推送到阿里云 ACR → webhook 通知服务器拉取重启
   ├── 2. 构建 PC web 镜像   → 推送到阿里云 ACR → webhook 通知服务器拉取重启
   ├── 3. 构建后台 admin 静态 → ssh 上传 → docker cp 替换容器文件
   └── 4. 构建移动端 m 静态   → ssh 上传到服务器 m-static
   │
   ▼  部署完成 ✅（可配置失败邮件通知）
```

**核心好处**：
1. **构建不在服务器做** → 用 GitHub 免费的高配机器，服务器只负责运行，不再卡死
2. **一次配置，永久自动** → 以后只 `git push`，剩下全自动
3. **镜像带版本号** → 出问题可一键回滚
4. **企业级保障**：并发控制、超时、构建缓存、失败通知

### 2.3 需要的账号和工具

| 资源 | 用途 | 有没有 |
|------|------|--------|
| GitHub 账号 | 存代码 + 跑 CI | 需注册 |
| 阿里云 ACR 容器镜像服务 | 存 api/web 镜像 | 需开通（免费） |
| 阿里云 ECS 服务器 | 跑服务 | 已有 |
| Windows 电脑 + Node.js + Git | 本地操作 | 需安装 |

---

## 三、第一步：把项目推到 GitHub（含 .gitignore 安全配置）

> 目标：在 GitHub 建一个仓库，把你的项目代码放进去。

### 3.1 创建 GitHub 仓库

1. 打开 **github.com** → 登录/注册
2. 右上角 **「+」→「New repository」**
3. 填写：
   - Repository name：`taoyue-edu`（可自定义）
   - 选 **Private**（私有，防止代码/密钥泄露）
   - 不要勾选 "Add a README"（保持空仓库）
4. 点 **「Create repository」**

### 3.2 配置 `.gitignore`（项目根目录，安全底线）

在项目根目录 `e:\my_important\.gitignore` 写入以下内容（**已为你配置好，直接确认即可**）：

```gitignore
# 🔴 安全敏感（绝不提交！）
.env
.env.local
.env.*
!.env.docker.example
certs/
*.pem
*.key
*.p12
*.pfx
*.log

# Python 依赖与缓存
__pycache__/
*.py[cod]
venv/
.venv/
taoyue-edu-api/static/uploads/

# Node 依赖与构建产物
node_modules/
dist/
.next/
m/dist/
m/unpackage/
m/h5/
```

> ⚠️ **`node_modules/` 等通配规则会自动匹配所有层级的同名目录**（`m/node_modules`、`taoyue-edu/node_modules` 等都会被覆盖），无需每个端单独写。
>
> ⚠️ **极其重要**：`.env`（数据库密码、支付密钥）、`certs/*.pem`（微信/支付宝**私钥**）**绝对禁止上传**。一旦泄露到 GitHub，等于把支付操作权交给别人。

### 3.3 检查是否有子模块干扰

> ⚠️ **注意**：`m/` 目录如果曾是独立的 git 仓库，会被主仓库识别为 **submodule**，导致 m 端源码无法上传。请执行检查：

```powershell
cd e:\my_important
git submodule status        # 如果 m 出现在列表且为 - 前缀，说明是未初始化的子模块
git ls-files m              # 如果只返回 "m" 而没有 m/ 下的文件，说明 m 是子模块
```

**若确认 m 是子模块**，需解除（在确保 `m/src/` 源码安全的前提下）：
```powershell
Remove-Item -Recurse -Force m\.git   # 删除 m 内部嵌套的 git 仓库
git rm --cached -f m                 # 从索引移除 gitlink
git add m/                           # 重新作为普通目录添加
```

> 💡 `m/.git` 只是 git 元数据，源码在 `m/src/` 等目录，删除不会丢代码。

### 3.4 本地推送到 GitHub（Windows PowerShell）

在项目根目录 `e:\my_important` 打开 PowerShell，依次执行：

```powershell
# 1. 初始化 git（如果项目还没用 git）
cd e:\my_important
git init

# 2. 添加所有文件到暂存区（敏感文件会被 .gitignore 排除）
git add .

# 3. 确认没有敏感文件被误暂存
git ls-files | Select-String -Pattern "\.env$|\.pem$|certs/|node_modules"

# 4. 第一次提交
git commit -m "init: 项目初始化"

# 5. 主分支命名为 main
git branch -M main

# 6. 关联你的 GitHub 远程仓库（把用户名换成你自己的）
git remote add origin https://github.com/你的GitHub用户名/taoyue-edu.git

# 7. 推送到 GitHub（第一次可能要登录授权）
git push -u origin main
```

**做对了会看到**：
- 命令行显示 `main -> main` 推送成功
- 浏览器打开你的 GitHub 仓库，能看到所有代码文件（且**没有** .env / .pem / node_modules）

> 💡 如果你之前已经 push 过，直接跳到第四步即可。

---

## 四、第二步：阿里云容器镜像仓库 ACR 准备

> 目标：建一个存放 Docker 镜像的"仓库"，CI 把 api/web 镜像放进去，服务器从里面拉。

### 4.1 开通 ACR（个人版是免费存在的）

1. 打开 **https://cr.console.aliyun.com**
2. 登录阿里云 → **免费开通**「容器镜像服务」→ 选择 **个人版**
3. **选择地域**：选离你服务器近的（如华东1（杭州））

> 若控制台没看到个人版：确认右上角**地域选对**了，且该地域下**首次免费开通**个人版。个人版适用于个人/学习/小项目，本项目完全够用。

### 4.2 创建命名空间 + 2 个镜像仓库

先创建命名空间 `taoyue-edu`：
1. 左侧「**命名空间**」→「**创建命名空间**」
2. 命名空间名：`taoyue-edu` → 创建

再创建 2 个镜像仓库（**只需要 api、web 两个**，admin/m 不走镜像）：

| 镜像仓库名 | 对应端 |
|-----------|--------|
| `api` | 后端 |
| `web` | PC 客户端 |

1. 左侧「**镜像仓库**」→「**创建镜像仓库**」
2. 命名空间选 `taoyue-edu` → 仓库名填 `api` → 类型选「**本地仓库**」→ 创建
3. 重复创建 `web`

### 4.3 记住镜像仓库地址

```
registry.cn-hangzhou.aliyuncs.com/taoyue-edu/api
registry.cn-hangzhou.aliyuncs.com/taoyue-edu/web
```
> `cn-hangzhou` 按你选的地域变化（如北京是 `cn-beijing`）。

### 4.4 获取 ACR 登录凭证

1. ACR 控制台 → 左侧「**访问凭证**」
2. 记下 **「用户名」** 和 **「固定密码」**（不是你的阿里云登录密码）
3. 这两个值后面要填进 GitHub Secrets

---

## 五、第三步：服务器安装 Docker

> 目标：让服务器能运行容器、拉取镜像。

### 5.1 用 SSH 登录服务器

Windows PowerShell：
```powershell
ssh root@47.113.230.113
```

### 5.2 安装 Docker + Docker Compose

```bash
curl -fsSL https://get.docker.com | bash -s docker --mirror Aliyun

mkdir -p /usr/local/lib/docker/cli-plugins
curl -SL "https://github.com/docker/compose/releases/download/v2.24.6/docker-compose-linux-x86_64" -o /usr/local/lib/docker/cli-plugins/docker-compose
chmod +x /usr/local/lib/docker/cli-plugins/docker-compose

docker --version && docker compose version
```

### 5.3 服务器登录 ACR（拉私有镜像）

```bash
docker login --username=你的ACR用户名 registry.cn-hangzhou.aliyuncs.com
```

> ⚠️ **必须执行**：否则服务器拉取私有镜像会报 401。

---

## 六、第四步：创建服务器端部署脚本（deploy.sh + webhook_server.py）

> 目标：让服务器能接收 GitHub Actions 通知，并自动拉取 api/web 镜像重启。
> 💡 **本项目已内置这两个文件**，位于项目根目录 `deploy/`，随代码上传即可。

### 6.1 这两个文件是怎么编写的（设计思路）

**先想清楚"谁调用谁"**：

```
GitHub Actions（云端）                     服务器（阿里云 ECS）
┌─────────────────────┐                 ┌──────────────────────────────┐
│ build-api job 完成   │                 │                              │
│  ↓ 发 HTTP POST      │   ─────────→   │ webhook_server.py（9000端口） │
│  DEPLOY_WEBHOOK 地址 │   JSON+Token   │   ↓ 校验 token + 异步调用      │
└─────────────────────┘                 │   ↓                          │
                                        │ deploy.sh api <tag>          │
                                        │   ↓ docker pull + 重建容器     │
                                        │   ↓ 更新线上服务               │
                                        └──────────────────────────────┘
```

**为什么需要两个文件？**

- **`webhook_server.py`**：负责"接收通知 + 鉴权"。因为 GitHub 不能直接执行服务器命令，需要一个常驻 HTTP 服务来接收 CI 的请求。
- **`deploy.sh`**：负责"真正执行部署"。把部署逻辑独立成脚本，既可以被 webhook 调用，也能在服务器手动执行（`bash deploy.sh api latest`）用于排查。

**为什么不让 GitHub 直接 SSH 部署 api/web？**

- admin/m 走静态上传，用 SSH 合适。
- 但 api/web 需要**拉镜像 + 重建容器**，如果每个 job 都 SSH 进去执行，逻辑会散落在 workflow 里。抽成 `deploy.sh` 后：**部署逻辑集中在服务器，workflow 只负责发一个 HTTP 通知**，职责清晰、便于服务器侧独立排错。

### 6.2 `deploy.sh` 是怎么编写的

```
#!/usr/bin/env bash
# ============================================================================
# 桃悦智科：服务器端部署脚本 deploy.sh
#
# 【这个文件是干什么的？】
#   GitHub Actions 构建好 api/web 的 Docker 镜像并推送到阿里云 ACR 后，
#   webhook_server.py 会收到通知，然后调用本脚本，让服务器：
#     1. 从 ACR 拉取最新镜像
#     2. 用 docker compose 重建对应容器（强制用镜像，不本地构建）
#     3. 清理旧镜像释放磁盘
#
# 【怎么使用？】
#   手动触发：   ./deploy.sh api latest
#   手动触发：   ./deploy.sh web latest
#   被 webhook： webhook_server.py 内部调用  /bin/bash deploy.sh <service> <tag>
#
# 【参数说明】
#   第 1 个参数 service：要部署的服务，只能是 api 或 web
#   第 2 个参数 tag    ：镜像标签（通常传 git commit 哈希，仅用于日志显示）
#                        实际拉取固定用 latest，保证部署的是最新
# ============================================================================


# ----------------------------------------------------------------------------
# 0. 严格模式（大厂规范第一步）
# ----------------------------------------------------------------------------
# set -e     : 任何命令失败立即退出，避免"看着执行了其实中间失败"
# set -u     : 使用未定义变量直接报错，防止变量名拼写错误
# set -o pipefail : 管道中任一命令失败则整体失败
set -euo pipefail


# ----------------------------------------------------------------------------
# 1. 可配置参数（集中在脚本顶部，改配置不用翻代码）
# ----------------------------------------------------------------------------
REGISTRY="registry.cn-hangzhou.aliyuncs.com"   # 阿里云 ACR 镜像仓库地址
NAMESPACE="taoyue-edu"                          # ACR 命名空间
PROJECT_DIR="/root/projects"                    # docker-compose.yml 所在目录
ALLOWED_SERVICES="api web"                      # 允许部署的服务（admin/m 走静态上传）


# ----------------------------------------------------------------------------
# 2. 解析命令行参数
# ----------------------------------------------------------------------------
SERVICE="${1:-}"    # 第 1 个参数：服务名。${1:-} 表示"没传则用空字符串"
TAG="${2:-latest}"  # 第 2 个参数：镜像标签。默认 latest

# 2.1 校验：必须传 service
if [ -z "$SERVICE" ]; then
  echo "用法: $0 <service> <tag>" >&2
  exit 1
fi

# 2.2 校验：service 必须在白名单内（grep -qw 精确匹配整个单词，防误匹配）
if ! echo "$ALLOWED_SERVICES" | grep -qw "$SERVICE"; then
  echo "不支持的 service: $SERVICE（仅支持: $ALLOWED_SERVICES）" >&2
  exit 1
fi

# 2.3 进入 compose 所在目录
cd "$PROJECT_DIR" || { echo "目录不存在: $PROJECT_DIR" >&2; exit 1; }


# ----------------------------------------------------------------------------
# 3. 定义日志函数（统一格式，方便按时间定位）
# ----------------------------------------------------------------------------
log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*"; }

log "开始部署 $SERVICE @ ${TAG}"


# ----------------------------------------------------------------------------
# 4. 核心部署流程
# ----------------------------------------------------------------------------

# 4.1 先手动拉一次镜像（提前发现网络/凭证问题，|| true 失败也不中断）
log "拉取镜像 $REGISTRY/$NAMESPACE/$SERVICE:latest"
docker pull "$REGISTRY/$NAMESPACE/$SERVICE:latest" || true

# 4.2 用 docker compose 拉取并重建容器（最关键的一步）
#     --no-build       : 【关键】强制用镜像，禁止本地构建。防服务器小内存卡死
#     --no-deps        : 只重建目标服务，不连带重启依赖（避免误重启 MySQL/Redis）
#     --force-recreate : 强制重建容器，确保用上最新镜像
log "compose 拉取并重建 $SERVICE"
docker compose pull "$SERVICE"
docker compose up -d --no-build --no-deps --force-recreate "$SERVICE"

# 4.3 清理旧镜像，释放磁盘空间（|| true 表示失败不致命）
log "清理旧镜像"
docker image prune -f >/dev/null 2>&1 || true


# ----------------------------------------------------------------------------
# 5. 部署完成
# ----------------------------------------------------------------------------
log "✔ $SERVICE 部署完成"
```



### 6.3 `webhook_server.py` 是怎么编写的（逐段讲解）

```
#!/usr/bin/env python3
# -*- coding: utf-8 -*-
# ============================================================================
# 桃悦智科：GitHub Actions 部署 Webhook 服务 webhook_server.py
#
# 【这个文件是干什么的？】
#   它是在"服务器上常驻运行"的一个小 HTTP 服务。
#   当 GitHub Actions 构建完 api/web 镜像后，会向本服务发一个 HTTP 请求，
#   本服务校验 token 通过后，调用 deploy.sh 在服务器上完成真正的部署。
#
# 【为什么需要它？】
#   因为 GitHub（云端）不能直接执行你服务器上的命令，
#   所以需要一个"服务器上一直开着的端口"来接收 GitHub 的通知。
#   webhook_server.py 就是这个"接收器"，deploy.sh 是"执行器"。
#
# 【怎么启动？】（在服务器上执行）
#   export WEBHOOK_TOKEN="你的强随机token"
#   nohup python3 webhook_server.py > webhook.log 2>&1 &
#
# 【接口约定】（与 .github/workflows/deploy.yml 一致）
#   POST /hook
#   Header : X-Deploy-Token: <token>
#   Body   : {"service":"api","tag":"<sha>"}
#   成功返回: {"ok": true, "service": "api", "tag": "..."}
# ============================================================================


# ----------------------------------------------------------------------------
# 1. 导入标准库（只用 Python 自带，零第三方依赖，服务器无需 pip install）
# ----------------------------------------------------------------------------
import json           # 解析/生成 JSON 数据
import hmac           # 提供安全的 token 比较（防时序攻击）
import os             # 读取环境变量
import subprocess     # 执行 deploy.sh 命令
import threading      # 开子线程，让部署后台执行（不阻塞 HTTP 响应）
from http.server import BaseHTTPRequestHandler, HTTPServer   # 内置 HTTP 服务


# ----------------------------------------------------------------------------
# 2. 配置区（从环境变量读取，密钥不写死在代码里）
# ----------------------------------------------------------------------------
HOST = "0.0.0.0"                                      # 监听所有网卡，才能接收外网请求
PORT = int(os.environ.get("WEBHOOK_PORT", "9000"))     # 端口，默认 9000
# 校验 token：必须与 GitHub Secret 的 DEPLOY_WEBHOOK_TOKEN 一致
TOKEN = os.environ.get("WEBHOOK_TOKEN", "change-me-please")
# 允许部署的服务（与 deploy.sh 白名单一致）。admin/m 走静态上传，不在此列。
ALLOWED_SERVICES = {"api", "web"}
# deploy.sh 的绝对路径（webhook 最终调用的脚本）
DEPLOY_SCRIPT = os.environ.get("DEPLOY_SCRIPT", "/root/projects/deploy.sh")
# 部署超时时间（秒），防止 deploy.sh 卡死时子线程无限占用
DEPLOY_TIMEOUT = int(os.environ.get("DEPLOY_TIMEOUT", "300"))


# ----------------------------------------------------------------------------
# 3. 处理 HTTP 请求的类
# ----------------------------------------------------------------------------
class DeployHandler(BaseHTTPRequestHandler):

    # 3.1 自定义日志格式：每条访问日志加 [webhook] 前缀和时间
    def log_message(self, fmt, *args):
        print(f"[webhook] {self.log_date_time_string()} - {fmt % args}", flush=True)

    # 3.2 统一返回 JSON 的辅助方法
    def _send_json(self, code, payload):
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    # 3.3 校验请求头里的 X-Deploy-Token
    #     ⚠️ 为什么用 hmac.compare_digest 而不是 ==？
    #     普通 == 比较字符串，长度不同会更快返回，攻击者可利用时间差猜 token（时序攻击）。
    #     hmac.compare_digest 耗时恒定，无法从时间推断，更安全。
    def _check_token(self):
        supplied = self.headers.get("X-Deploy-Token", "")
        return hmac.compare_digest(supplied, TOKEN)

    # 3.4 处理 POST 请求（GitHub Actions 只发 POST）
    def do_POST(self):

        # ① 校验路径必须是 /hook
        if self.path != "/hook":
            self._send_json(404, {"ok": False, "error": "not found"})
            return

        # ② 校验 token：不对则拒绝（401）
        if not self._check_token():
            print("[webhook] token 校验失败", flush=True)
            self._send_json(401, {"ok": False, "error": "invalid token"})
            return

        # ③ 解析请求体（GitHub 会发 {"service":"api","tag":"..."}）
        try:
            length = int(self.headers.get("Content-Length", "0"))
            raw = self.rfile.read(length)
            data = json.loads(raw) if raw else {}
        except Exception as e:
            self._send_json(400, {"ok": False, "error": f"bad json: {e}"})
            return

        # 取出服务名和标签
        service = data.get("service", "")
        tag = data.get("tag", "latest")

        # ④ 校验服务在白名单内：只能部署 api/web
        if service not in ALLOWED_SERVICES:
            self._send_json(400, {"ok": False, "error": f"service {service} not allowed"})
            return

        # ⑤ 定义真正的部署动作（在子线程里执行）
        def _deploy():
            print(f"[webhook] 开始部署 {service} @ {tag}", flush=True)
            try:
                # 调用 deploy.sh，参数是 service 和 tag
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

        # ⑥ 关键设计：异步部署
        #    部署可能耗时 1-3 分钟，若同步执行，GitHub 的 curl 会等待甚至超时。
        #    开后台线程跑部署，HTTP 立刻返回 ok，部署在服务器后台继续。
        threading.Thread(target=_deploy, daemon=True).start()

        # ⑦ 立即返回"已受理"
        self._send_json(200, {"ok": True, "service": service, "tag": tag})


# ----------------------------------------------------------------------------
# 4. 程序入口
# ----------------------------------------------------------------------------
def main():
    # 如果 TOKEN 还是默认值，打印警告
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
```



### 6.4 上传并启动部署脚本（服务器）

**本地（Windows PowerShell）上传：**

```powershell
scp e:\my_important\deploy\deploy.sh root@你的服务器IP:/root/projects/deploy
scp e:\my_important\deploy\webhook_server.py root@8.146.238.189:/root/projects/deploy
```

**服务器启动 Webhook：**

```bash
cd /root/projects
chmod +x deploy.sh                       # 给 deploy.sh 加执行权限

# 设置强 token（与 GitHub Secret DEPLOY_WEBHOOK_TOKEN 一致）
openssl rand -hex 32
# d20200dee02ccb32bb28e04842b6ccb3306d38f8bfaad7730ef7f23dc1ef4ef5
export WEBHOOK_TOKEN="d20200dee02ccb32bb28e04842b6ccb3306d38f8bfaad7730ef7f23dc1ef4ef5"

# 后台启动 webhook 服务
nohup python3 webhook_server.py > webhook.log 2>&1 &

# 验证（带 token 测试）
curl -X POST http://127.0.0.1:9000/hook -H "X-Deploy-Token: d20200dee02ccb32bb28e04842b6ccb3306d38f8bfaad7730ef7f23dc1ef4ef5" -d '{"service":"api","tag":"test"}'
# 应看到: {"ok": true, "service": "api", "tag": "test"}
```



### 6.7 阿里云安全组放行 9000 端口

1. ECS → 服务器 →「安全组」→「配置规则」
2. 入方向 →「手动添加」：协议 TCP，端口 **9000**，授权对象 `0.0.0.0/0`
3. 保存

> ⚠️ **必须放行**：否则 GitHub 通知不到服务器，api/web 部署不触发。

---

## 七、第五步：配置 GitHub Secrets（关键！）

> 目标：把密码、密钥、地址等机密告诉 GitHub，但**不让它们出现在代码里**。

### 7.1 打开 Secrets 配置页面

GitHub 仓库 → **「Settings」→「Secrets and variables」→「Actions」** → 「New repository secret」

### 7.2 需要添加的 Secret 清单（共 12 个）

| Secret 名 | 填什么 | 举例 |
|-----------|--------|------|
| `ALIYUN_REGISTRY` | 镜像仓库地址前缀 | `registry.cn-hangzhou.aliyuncs.com` |
| `ALIYUN_NAMESPACE` | 命名空间名 | `taoyue-edu` |
| `ALIYUN_REGISTRY_USER` | ACR 用户名 | `你的ACR用户名` |
| `ALIYUN_REGISTRY_PASSWORD` | ACR 密码 | `你的ACR固定密码` |
| `NEXT_PUBLIC_API_URL` | PC 端 API 地址 | `http://xin1024.top/api/v1` |
| `NEXT_PUBLIC_API_HOST` | PC 端站点地址 | `http://xin1024.top` |
| `MOBILE_API_URL` | **m 端** API 地址 | `http://m.xin1024.top/api/v1` |
| `MOBILE_API_HOST` | **m 端**站点地址 | `http://m.xin1024.top` |
| `DEPLOY_WEBHOOK` | Webhook 地址 | `http://47.113.230.113:9000/hook` |
| `DEPLOY_WEBHOOK_TOKEN` | Webhook 校验 token | `你的强随机token` |
| `SSH_PRIVATE_KEY` | 服务器 SSH 私钥 | `-----BEGIN RSA PRIVATE KEY-----...` |
| `SERVER_IP` | 服务器公网 IP | `自己的服务器地址` |
| `SERVER_USER` | 服务器登录用户 | `root` |

> ⚠️ **注意区分**：`MOBILE_API_URL/HOST`（m 端专用，走 `m.xin1024.top`）与 `NEXT_PUBLIC_API_URL/HOST`（PC 端专用）**不要混用**。
> 可选：`DEPLOY_EMAIL`（部署失败邮件通知）+ `MAIL_USERNAME`/`MAIL_PASSWORD`（SMTP 账号）。

### 7.3 获取 SSH 私钥

**服务器上**（生成/查看公钥并授权）：

```bash
ssh-keygen -t rsa -b 4096            # 若没有，生成（一路回车）
cat ~/.ssh/id_rsa.pub                # 查看公钥
mkdir -p ~/.ssh && echo "公钥内容" >> ~/.ssh/authorized_keys && chmod 600 ~/.ssh/authorized_keys
```

**本地取私钥**：
```powershell
cat $env:USERPROFILE\.ssh\id_rsa      # 粘贴完整私钥（含 BEGIN/END 头尾）到 SSH_PRIVATE_KEY
```

> ⚠️ 私钥和公钥要配套；公钥必须在服务器 `authorized_keys` 里。

---

## 八、第六步：检查/编写 GitHub Actions 工作流

> 目标：让 GitHub 一收到 push 就自动构建部署 4 端。

### 8.1 确认工作流文件已存在

> 💡 **本项目已内置工作流**：`.github/workflows/deploy.yml`。以下为其**大厂级完整版本**（含权限、并发、缓存、超时、失败通知），若需重建，直接使用。

### 8.2 工作流完整内容（大厂级）

创建/核对 `.github/workflows/deploy.yml`，内容如下（**与项目现有配置一致**）：

```yaml
name: Build and Deploy

on:
  push:
    branches: [main]
  workflow_dispatch:

env:
  REGISTRY: ${{ secrets.ALIYUN_REGISTRY }}
  NAMESPACE: ${{ secrets.ALIYUN_NAMESPACE }}
  REGISTRY_USER: ${{ secrets.ALIYUN_REGISTRY_USER }}
  REGISTRY_PASSWORD: ${{ secrets.ALIYUN_REGISTRY_PASSWORD }}
  NEXT_PUBLIC_API_URL: ${{ secrets.NEXT_PUBLIC_API_URL }}
  NEXT_PUBLIC_API_HOST: ${{ secrets.NEXT_PUBLIC_API_HOST }}

# 安全：最小权限
permissions:
  contents: read
  packages: read

# 并发：同一分支连续 push 取消前一个
concurrency:
  group: deploy-${{ github.ref }}
  cancel-in-progress: true

jobs:
  # ==================== 后端 API ====================
  build-api:
    name: 🐳 后端 api
    runs-on: ubuntu-latest
    timeout-minutes: 20
    steps:
      - name: 检出代码
        uses: actions/checkout@v4
      - name: 设置 Docker Buildx
        uses: docker/setup-buildx-action@v3
      - name: 登录阿里云 ACR
        uses: docker/login-action@v3
        with:
          registry: ${{ env.REGISTRY }}
          username: ${{ env.REGISTRY_USER }}
          password: ${{ env.REGISTRY_PASSWORD }}
      - name: 构建并推送 api 镜像
        uses: docker/build-push-action@v5
        with:
          context: ./taoyue-edu-api
          push: true
          cache-from: type=gha
          cache-to: type=gha,mode=max
          tags: |
            ${{ env.REGISTRY }}/${{ env.NAMESPACE }}/api:${{ github.sha }}
            ${{ env.REGISTRY }}/${{ env.NAMESPACE }}/api:latest
      - name: 通知服务器部署 api
        run: |
          curl -sS -X POST "${{ secrets.DEPLOY_WEBHOOK }}" \
            -H "Content-Type: application/json" \
            -H "X-Deploy-Token: ${{ secrets.DEPLOY_WEBHOOK_TOKEN }}" \
            -d '{"service":"api","tag":"${{ github.sha }}"}'

  # ==================== PC 客户端 web ====================
  build-web:
    name: 🖥️ PC 客户端 web
    runs-on: ubuntu-latest
    needs: [build-api]
    timeout-minutes: 20
    steps:
      - name: 检出代码
        uses: actions/checkout@v4
      - name: 设置 Docker Buildx
        uses: docker/setup-buildx-action@v3
      - name: 登录阿里云 ACR
        uses: docker/login-action@v3
        with:
          registry: ${{ env.REGISTRY }}
          username: ${{ env.REGISTRY_USER }}
          password: ${{ env.REGISTRY_PASSWORD }}
      - name: 构建并推送 web 镜像
        uses: docker/build-push-action@v5
        with:
          context: ./taoyue-edu
          build-args: |
            NEXT_PUBLIC_API_URL=${{ env.NEXT_PUBLIC_API_URL }}
            NEXT_PUBLIC_API_HOST=${{ env.NEXT_PUBLIC_API_HOST }}
          push: true
          cache-from: type=gha
          cache-to: type=gha,mode=max
          tags: |
            ${{ env.REGISTRY }}/${{ env.NAMESPACE }}/web:${{ github.sha }}
            ${{ env.REGISTRY }}/${{ env.NAMESPACE }}/web:latest
      - name: 通知服务器部署 web
        run: |
          curl -sS -X POST "${{ secrets.DEPLOY_WEBHOOK }}" \
            -H "Content-Type: application/json" \
            -H "X-Deploy-Token: ${{ secrets.DEPLOY_WEBHOOK_TOKEN }}" \
            -d '{"service":"web","tag":"${{ github.sha }}"}'

  # ==================== 管理后台 admin（静态上传） ====================
  build-admin:
    name: 🛠️ 管理后台 admin
    runs-on: ubuntu-latest
    needs: [build-api]
    timeout-minutes: 15
    steps:
      - name: 检出代码
        uses: actions/checkout@v4
      - name: 设置 Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
          cache-dependency-path: taoyue_edu_admin/package-lock.json
      - name: 安装依赖并构建
        working-directory: taoyue_edu_admin
        run: |
          npm config set registry https://registry.npmmirror.com
          npm ci
          VITE_BASE=/admin/ npm run build
      - name: 上传产物到服务器
        uses: easingthemes/ssh-deploy@v5
        with:
          ssh-private-key: ${{ secrets.SSH_PRIVATE_KEY }}
          remote-host: ${{ secrets.SERVER_IP }}
          remote-user: ${{ secrets.SERVER_USER }}
          source: "taoyue_edu_admin/dist/"
          target: "/root/projects/admin-dist/"
      - name: 替换 admin 容器静态文件
        uses: appleboy/ssh-action@v1
        with:
          host: ${{ secrets.SERVER_IP }}
          username: ${{ secrets.SERVER_USER }}
          key: ${{ secrets.SSH_PRIVATE_KEY }}
          script: |
            docker cp /root/projects/admin-dist/. taoyue-admin:/usr/share/nginx/html/

  # ==================== 移动端 m（静态上传） ====================
  build-m:
    name: 📱 移动端 m
    runs-on: ubuntu-latest
    needs: [build-api]
    timeout-minutes: 15
    steps:
      - name: 检出代码
        uses: actions/checkout@v4
      - name: 设置 Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
          cache-dependency-path: m/package-lock.json
      - name: 注入生产 API 地址
        working-directory: m
        env:
          API_BASE: ${{ secrets.MOBILE_API_URL }}
          API_HOST: ${{ secrets.MOBILE_API_HOST }}
        run: |
          node replace-config.js
      - name: 安装依赖并构建 H5
        working-directory: m
        run: |
          npm config set registry https://registry.npmmirror.com
          npm ci
          npm run build:h5
      - name: 上传 m 端产物到服务器
        uses: easingthemes/ssh-deploy@v5
        with:
          ssh-private-key: ${{ secrets.SSH_PRIVATE_KEY }}
          remote-host: ${{ secrets.SERVER_IP }}
          remote-user: ${{ secrets.SERVER_USER }}
          source: "m/dist/build/h5/"
          target: "/root/projects/m-static/"

  # ==================== 部署结果通知（可选） ====================
  notify:
    name: 🔔 部署结果通知
    runs-on: ubuntu-latest
    needs: [build-api, build-web, build-admin, build-m]
    if: always()
    timeout-minutes: 5
    steps:
      - name: 汇总部署状态
        run: |
          echo "api: ${{ needs.build-api.result }} / web: ${{ needs.build-web.result }}"
          echo "admin: ${{ needs.build-admin.result }} / m: ${{ needs.build-m.result }}"
      - name: 部署失败告警
        if: contains(join(needs.*.result, ','), 'failure')
        run: |
          echo "::error::有部署任务失败，请检查 Actions 日志"
          echo "${{ github.server_url }}/${{ github.repository }}/actions/runs/${{ github.run_id }}"
```

> 💡 4 个 job（build-api/web/admin/m）并行触发（web/admin/m 依赖 api 先成功），notify 汇总结果。

### 8.3 提交工作流文件到 GitHub

```powershell
cd e:\my_important
git add .
git commit -m "feat: 添加 GitHub Actions CI/CD"
git push origin main
```

**做对了会看到**：GitHub 仓库「**Actions**」标签出现正在运行的工作流，含 5 个 job。

---

## 九、第七步：给 compose 加 image（api/web 用）

> 目标：让服务器能从 ACR 拉镜像，而不是本地构建。

> 本项目 `docker-compose.yml` 中 `api`、`web` **只有 `build:` 没有 `image:`**，需给这两个服务补上 `image:`。

### 9.1 大厂级原则：最小化变更

**只给 `api`、`web` 各加一行 `image:`，不要整段替换**（整段替换易丢失 `command`、`volumes`、支付配置等关键字段）。

给 `api` 在 `build:` 下方加：
```yaml
  api:
    build:
      context: ./taoyue-edu-api
    image: registry.cn-hangzhou.aliyuncs.com/taoyue-edu/api:latest   # ← 新增这行
    container_name: taoyue-api
    # ...（其余勿动）
```

给 `web` 同样加：
```yaml
  web:
    build:
      context: ./taoyue-edu
    image: registry.cn-hangzhou.aliyuncs.com/taoyue-edu/web:latest    # ← 新增这行
    container_name: taoyue-web
    # ...（其余勿动）
```

> ⚠️ `admin`、`nginx`、`mysql`、`redis` **不需要加 `image:`**（admin 走 docker cp，其余已是公共镜像）。

### 9.2 安全核对

| 检查项 | 标准 |
|--------|------|
| 密钥不入代码 | `certs/*.pem`、`.env` 已被 .gitignore 排除 |
| 支付私钥进容器 | `api` 的 `volumes` 必须保留 `./taoyue-edu-api/certs:/app/certs` |
| 生产安全校验 | 服务器 `.env` 设 `APP_ENV=production` + 强 `JWT_SECRET_KEY` + `DEBUG=false` |
| HTTPS 回调 | 支付回调地址必须是 `https://你的域名/...` |

### 9.3 两种部署命令

| 场景 | 命令 | 行为 |
|------|------|------|
| 手动部署 | `docker compose up -d --build` | 本地构建 |
| CI/CD 部署 | `docker compose pull && up -d --no-build --force-recreate` | 拉镜像，不本地构建 |

> ⚠️ 有 `build:` 时直接 `up` 会**优先本地构建**（服务器卡死）。CI/CD 必须加 **`--no-build`**。

### 9.4 修改后验证

```bash
docker compose config --quiet && echo "compose 语法 OK"
docker compose config | grep -E "image: registry"
docker compose up -d --build   # 首次启动
docker compose ps
```

---

## 十、第八步：push 触发部署 & 验证

### 10.1 观察 GitHub Actions 运行

GitHub → **「Actions」** → 看到 `Build and Deploy`（黄=进行中，绿=成功，红=失败），点进去看每个 job 日志。

### 10.2 验证每个端

| 端 | 验证方式 |
|----|---------|
| **后端 API** | `docker ps` 看 `taoyue-api`；`docker logs --tail 20 taoyue-api`；访问 `/api/v1/health`；**Redis 连通性**：`docker exec taoyue-redis redis-cli ping`（应返回 `PONG`）|
| **PC 客户端** | 浏览器访问 `http://xin1024.top` |
| **管理后台** | 浏览器访问 `http://xin1024.top/admin/` |
| **移动端 H5** | 浏览器访问 `http://m.xin1024.top` |

### 10.3 成功标志对照

| 检查项 | 通过标准 |
|--------|---------|
| GitHub Actions | 4 个构建 job 全绿 ✓ |
| 阿里云 ACR | `api`、`web` 仓库各有 `latest` 镜像 |
| 服务器 | `docker ps` 看到 api/web 用新镜像；admin 容器内静态文件已更新 |
| 浏览器 | 4 个地址都能访问 |

---

## 十一、日常使用：改代码后怎么部署

配置好之后，日常部署**只有 3 个命令**：

```powershell
cd e:\my_important
git add .
git commit -m "feat: 描述你改了什么"
git push origin main
```

然后等 GitHub Actions 跑完（约 5-15 分钟），自动部署完成。

### 进阶：只改某端才触发（路径过滤）

若想"只改后端不触发前端"，给工作流加路径过滤：

```yaml
on:
  push:
    branches: [main]
    paths:
      - 'taoyue-edu-api/**'   # 只改后端才触发
```

---

## 十二、常见问题与排错

| 问题 | 原因 | 解决 |
|------|------|------|
| Actions 推镜像报 `denied` | ACR 用户名/密码错 | 检查 `ALIYUN_REGISTRY_USER`/`_PASSWORD`，确认是 ACR 访问凭证 |
| 服务器拉镜像 401 | 服务器没登录 ACR | `docker login --username=... registry.cn-hangzhou.aliyuncs.com` |
| api/web 容器没更新 | Webhook 没触发 | 手动测 `bash deploy.sh api latest`；看 `/root/projects/webhook.log` |
| Webhook 9000 连不上 | 安全组未放行 | 阿里云安全组放行 TCP 9000 |
| Webhook 401 invalid token | token 不匹配 | 确认 `WEBHOOK_TOKEN` 与 Secret `DEPLOY_WEBHOOK_TOKEN` 一致 |
| SSH 登录失败 | 私钥/公钥不匹配 | 确认 `SSH_PRIVATE_KEY` 对应公钥在服务器 `authorized_keys` |
| m 端构建报 `缺少 API_BASE/API_HOST` | Secret 未配置 | 补 `MOBILE_API_URL`/`MOBILE_API_HOST`，且 workflow 已传 `API_BASE`/`API_HOST` |
| npm 构建慢 | 国内网络 | 已内置 `registry.npmmirror.com` |
| `docker compose pull` 失败 | `image:` 没加 | 按第九步给 api/web 加 `image:` |
| 部署失败没收到通知 | notify job 未配邮件 | 配置 `DEPLOY_EMAIL` + SMTP，或看 Actions 日志 |
| m 端源码没上传 | m 被当子模块 | 按 3.3 解除子模块 |

### 查看部署日志（服务器）
```bash
tail -f /root/projects/webhook.log      # Webhook 服务日志
tail -f /root/projects/deploy.log       # 部署日志（如有）
```

---

## 十三、版本回滚与安全

### 13.1 版本回滚

每次构建都打了 `commit哈希` 标签，可回滚：

```bash
# 服务器：回滚 api 到某历史 commit 镜像
cd /root/projects
docker pull registry.cn-hangzhou.aliyuncs.com/taoyue-edu/api:旧commit哈希
docker compose up -d --no-build --no-deps --force-recreate api
```

### 13.2 安全最佳实践

1. **所有密钥放 GitHub Secrets**，绝不写进代码或 `.env`
2. `.env`、`certs/`、`*.pem` 已在 `.gitignore`，**严禁上传**
3. 阿里云 ACR 镜像仓库设为**私有**
4. Webhook 必须设 `WEBHOOK_TOKEN`，并**在 GitHub Secret 中配置一致**
5. 定期轮换 ACR 凭证、服务器密码、SSH 密钥
6. 服务器生产环境设置 `APP_ENV=production` 触发安全校验

---

## 总结

```
旧流程（手动，麻烦）：改代码 → scp 上传 → 服务器 npm ci（慢/卡死）→ docker build → 重启 → 验证

新流程（CI/CD，自动）：改代码 → git push → GitHub Actions 自动构建 4 端
  → api/web 推镜像到 ACR，webhook 通知服务器自动拉取重启
  → admin/m 构建静态上传到服务器
  → 完成 ✅（失败自动告警）
```

**一句话**：`git push` 之后，剩下的一切自动化。

> 教程中的域名（xin1024.top、m.xin1024.top）、服务器 IP（47.113.230.113）、镜像地址等占位符，请替换成你自己的实际值。

---

# 附录：服务器端部署脚本完整源码（带注释）

> 以下两个文件位于项目根目录 `deploy/`，随代码上传到服务器 `/root/projects/`。
> 每个代码段都有注释说明"做什么 + 为什么"，可直接复制使用。

## 附录 A：`deploy/deploy.sh`

```bash

```

## 附录 B：`deploy/webhook_server.py`

```python

```

