# ============ 依赖安装阶段 ============
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
# npm 使用国内镜像源，加速构建
RUN sed -i 's|https://registry.npmjs.org/|https://registry.npmmirror.com/|g' package-lock.json \
    && npm config set registry https://registry.npmmirror.com \
    && npm ci

# ============ 构建阶段 ============
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# 构建参数：浏览器访问 API 的地址（由 docker-compose 传入）
ARG NEXT_PUBLIC_API_URL=http://localhost/api/v1
ARG NEXT_PUBLIC_API_HOST=http://localhost
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_HOST=$NEXT_PUBLIC_API_HOST
RUN npm run build

# ============ 运行阶段（standalone 产物）============
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
# 创建非 root 用户
RUN addgroup --system --gid 1001 nodejs \
    && adduser --system --uid 1001 nextjs
# 复制 standalone 产物（next.config.js 已配置 output: 'standalone'）
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
# 复制静态资源目录（public 下的图片等，否则部署后 404）
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
CMD ["node", "server.js"]
