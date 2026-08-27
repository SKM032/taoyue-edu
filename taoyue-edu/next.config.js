/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',  // Docker 独立部署模式
  images: {
    domains: ['2507a.oss-cn-hangzhou.aliyuncs.com'],
    unoptimized: true,
  },
  // Docker 中 API 通过 Nginx 反向代理，不需要 rewrites
};

module.exports = nextConfig;
