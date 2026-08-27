import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/lib/auth';
import { CartProvider } from '@/lib/cart';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { Toaster } from 'react-hot-toast';

/** 移动端 H5 域名（未配置 HTTPS，用 http） */
const MOBILE_URL = 'http://m.xin1024.top';

/**
 * 移动端适配跳转脚本。
 * 用内联 <script> 在 HTML 解析阶段（React 挂载前）同步执行，避免先渲染 PC 页面再跳转的延迟。
 * 该脚本不依赖任何 React 生命周期，浏览器一读到就执行，手机访问直接跳走。
 */
const mobileRedirectScript = `
(function () {
  var ua = navigator.userAgent || '';
  var isMobile = /Android|webOS|iPhone|iPod|iPad|BlackBerry|IEMobile|Opera Mini/i.test(ua)
    || (('ontouchstart' in window) && window.innerWidth < 768);
  if (isMobile) {
    window.location.replace('${MOBILE_URL}' + window.location.hash);
  }
})();
`;

export const metadata: Metadata = {
  title: '桃悦智科 - 让技术驱动你的职业未来',
  description: '专注IT技能·AI全媒体·跨境电商的实战教育平台',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <head>
        <link rel="icon" href="/favicon.ico" />
        {/* 设备判断跳转脚本：HTML 解析阶段即执行，避免先渲染 PC 页面再跳转 */}
        <script dangerouslySetInnerHTML={{ __html: mobileRedirectScript }} />
      </head>
      <body>
        <AuthProvider>
          <CartProvider>
            <Navbar />
            <main className="min-h-screen">{children}</main>
            <Footer />
            <Toaster position="top-center" />
          </CartProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
