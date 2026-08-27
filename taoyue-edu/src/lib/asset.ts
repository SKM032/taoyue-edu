/** 后端域名（与 api.ts 保持一致，去掉了 /api/v1 前缀） */
export const API_HOST = process.env.NEXT_PUBLIC_API_HOST || 'http://localhost:8000';

/**
 * 解析资源（图片等）URL
 * - 相对路径（/static/...）补全后端域名
 * - 绝对 URL（http/https）原样返回
 * - 空值返回空
 */
export function resolveAssetUrl(url?: string | null): string {
  if (!url) return '';
  // 已是完整 URL 或 data URI
  if (/^(https?:)?\/\//.test(url) || url.startsWith('data:')) {
    return url;
  }
  // 相对路径（/static/...）
  if (url.startsWith('/')) {
    return `${API_HOST}${url}`;
  }
  return url;
}

/**
 * 解析富文本 HTML 中的图片地址
 * - 后端未配置 OSS 时上传返回的是相对路径（/static/uploads/...），
 *   直接渲染会相对客户端域名解析导致 404，这里统一补全后端域名
 * - 绝对 URL（http/https）与 data URI 原样保留
 */
export function resolveRichTextImages(html?: string | null): string {
  if (!html) return '';
  return html.replace(/<img\b[^>]*>/gi, (tag) => {
    // 匹配 src="..." 或 src='...'
    const srcMatch = tag.match(/\bsrc\s*=\s*["']([^"']*)["']/i);
    if (!srcMatch) return tag;
    const resolved = resolveAssetUrl(srcMatch[1]);
    if (resolved === srcMatch[1]) return tag;
    // 只替换 src 值，保留 img 其他属性（class/style 等）
    return tag.replace(srcMatch[0], `src="${resolved}"`);
  });
}
