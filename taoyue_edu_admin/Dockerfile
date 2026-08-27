# ============ 构建阶段 ============
FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json ./
# npm 使用国内镜像源，加速构建
RUN sed -i 's|https://registry.npmjs.org/|https://registry.npmmirror.com/|g' package-lock.json \
    && npm config set registry https://registry.npmmirror.com \
    && npm ci
COPY . .
# 构建参数：部署子路径（生产 /admin/，默认 /）
ARG VITE_BASE=/
ENV VITE_BASE=$VITE_BASE
RUN npm run build

# ============ 运行阶段（Nginx 托管静态文件）============
FROM nginx:alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html
EXPOSE 80
