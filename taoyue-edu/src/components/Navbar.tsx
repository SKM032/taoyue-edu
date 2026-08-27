'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { useCart } from '@/lib/cart';
import { Icon } from '@iconify/react';
import { courseApi } from '@/lib/api';

interface NavCategory {
  id: number;
  name: string;
  slug: string;
  icon?: string;
  children?: NavCategory[];
}

// 固定的功能性入口（不属分类，保留写死）
const FIXED_LINKS = [
  { href: '/teachers', label: '讲师主页' },
];

// 桌面端导航链接组件：点击后高亮（青色文字 + 底部青色短下划线）
function NavLink({ href, label, active }: { href: string; label: string; active: boolean }) {
  return (
    <Link
      href={href}
      className={`relative px-2.5 py-2 text-sm font-medium rounded-lg transition-colors whitespace-nowrap ${
        active
          ? 'text-[#00C4D4]'
          : 'text-[#4A4A6A] hover:text-[#00C4D4] hover:bg-[#E0F7FA]/50'
      }`}
    >
      {label}
      <span
        className={`absolute left-1/2 -translate-x-1/2 bottom-0 h-[2px] bg-[#00C4D4] rounded-full transition-all duration-200 ${
          active ? 'w-[calc(100%-20px)] opacity-100' : 'w-0 opacity-0'
        }`}
      />
    </Link>
  );
}

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [navLinks, setNavLinks] = useState<NavCategory[]>([]);
  const { user, logout, isLoggedIn } = useAuth();
  const { cartCount } = useCart();
  const pathname = usePathname();
  const router = useRouter();

  // 判断链接是否处于激活态（精确匹配首页，其余做前缀匹配）
  const isActive = (href: string) => {
    if (!pathname) return false;
    if (href === '/') return pathname === '/';
    return pathname === href || pathname.startsWith(href + '/');
  };

  // 从后端动态获取分类作为导航项
  useEffect(() => {
    courseApi.getCategories()
      .then((res) => setNavLinks(res.data || []))
      .catch(() => {});
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const kw = searchText.trim();
    if (kw) {
      // 使用 SPA 客户端路由跳转，避免整页刷新带来的白屏卡顿
      router.push(`/courses?keyword=${encodeURIComponent(kw)}`);
      setSearchText('');
    }
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-[#E5E7EB] h-16 flex items-center" style={{ fontFamily: "'Inter', system-ui, -apple-system, sans-serif" }}>
      <div className="max-w-[1440px] mx-auto px-6 w-full flex items-center">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 shrink-0 mr-6">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-[#00C4D4] to-[#6D28D9] flex items-center justify-center">
            <span className="text-white font-bold text-base">T</span>
          </div>
          <span className="text-lg font-bold text-[#1A1A2E]">桃悦智科</span>
        </Link>

        {/* Desktop Nav */}
        <div className="hidden lg:flex items-center gap-1 flex-1">
          <NavLink href="/" label="首页" active={isActive('/')} />
          {navLinks.map((link) => (
            <NavLink key={link.id} href={`/c/${link.slug}`} label={link.name} active={isActive(`/c/${link.slug}`)} />
          ))}
          {FIXED_LINKS.map((link) => (
            <NavLink key={link.href} href={link.href} label={link.label} active={isActive(link.href)} />
          ))}
          {/* 搜索框：紧挨分类标题 */}
          <form onSubmit={handleSearch} className="relative ml-3 w-[26rem] shrink-0">
            <Icon icon="mdi:magnify" className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8B8BA0] w-[18px] h-[18px] pointer-events-none" />
            <input
              type="text" placeholder="搜索课程、讲师、分类..."
              value={searchText} onChange={(e) => setSearchText(e.target.value)}
              className="w-full pl-10 pr-10 py-2 text-sm text-[#1A1A2E] placeholder-[#B0B3C0] border border-[#E5E7EB] rounded-xl bg-[#F9FAFB] focus:bg-white focus:border-[#00C4D4] focus:ring-2 focus:ring-[#00C4D4]/20 focus:shadow-[0_0_0_1px_rgba(0,196,212,0.1),0_4px_12px_rgba(0,196,212,0.08)] transition-all duration-200 outline-none"
            />
            {searchText && (
              <button
                type="button"
                onClick={() => setSearchText('')}
                aria-label="清空搜索"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center rounded-full text-[#8B8BA0] hover:text-[#1A1A2E] hover:bg-[#E5E7EB] transition-colors"
              >
                <Icon icon="mdi:close-circle" className="w-4 h-4" />
              </button>
            )}
          </form>
        </div>

        {/* Auth */}
        <div className="hidden lg:flex items-center gap-3 flex-1 justify-end">
          {/* 购物车入口 */}
          <Link href="/cart" className="relative p-2 text-[#4A4A6A] hover:text-[#00C4D4] hover:bg-[#E0F7FA]/50 rounded-lg transition-colors" aria-label="购物车">
            <Icon icon="mdi:cart-outline" className="w-6 h-6" />
            {cartCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-[#DC2626] text-white text-[10px] font-bold flex items-center justify-center">
                {cartCount > 99 ? '99+' : cartCount}
              </span>
            )}
          </Link>
          {isLoggedIn ? (
            <div className="flex items-center gap-2 relative group">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#00C4D4] to-[#6D28D9] flex items-center justify-center text-white text-sm font-bold cursor-pointer">
                {user?.nickname?.[0] || 'U'}
              </div>
              <span className="text-sm text-[#4A4A6A] max-w-[80px] truncate">{user?.nickname}</span>
              <div className="absolute right-0 top-full mt-2 w-36 bg-white rounded-xl shadow-lg border border-[#E5E7EB] py-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                <Link href="/my-courses" className="block px-4 py-2 text-sm text-[#4A4A6A] hover:bg-[#F9FAFB]">我的课程</Link>
                <Link href="/orders" className="block px-4 py-2 text-sm text-[#4A4A6A] hover:bg-[#F9FAFB]">我的订单</Link>
                <hr className="my-1 border-[#E5E7EB]" />
                <button onClick={logout} className="w-full text-left px-4 py-2 text-sm text-[#DC2626] hover:bg-[#FEF2F2]">退出登录</button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link href="/login" className="px-4 py-2 text-sm text-[#4A4A6A] hover:text-[#00C4D4] font-medium">登录</Link>
              <Link href="/register" className="px-4 py-2 text-sm bg-gradient-to-r from-[#00C4D4] to-[#6D28D9] text-white rounded-lg font-bold hover:shadow-md transition-all">注册</Link>
            </div>
          )}
        </div>

        {/* Mobile Menu Toggle */}
        <button className="lg:hidden p-2 text-[#4A4A6A]" onClick={() => setMobileOpen(!mobileOpen)} aria-label="菜单">
          <Icon icon={mobileOpen ? 'mdi:close' : 'mdi:menu'} className="w-6 h-6" />
        </button>
      </div>

      {/* Mobile Panel */}
      {mobileOpen && (
        <div className="lg:hidden fixed top-16 left-0 right-0 bg-white border-t border-[#E5E7EB] px-4 py-4 space-y-2 max-h-[80vh] overflow-y-auto shadow-lg z-40">
          <form onSubmit={handleSearch} className="relative mb-4">
            <Icon icon="mdi:magnify" className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8B8BA0] w-4 h-4" />
            <input type="text" placeholder="搜索课程..." value={searchText} onChange={(e) => setSearchText(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 text-sm border border-[#E5E7EB] rounded-lg focus:outline-none focus:border-[#00C4D4]" />
          </form>
          <Link
            href="/"
            onClick={() => setMobileOpen(false)}
            className={`block px-3 py-2.5 text-sm rounded-lg font-medium ${
              isActive('/')
                ? 'text-[#00C4D4] bg-[#E0F7FA]/40'
                : 'text-[#4A4A6A] hover:text-[#00C4D4] hover:bg-[#E0F7FA]/30'
            }`}
          >
            首页
          </Link>
          {navLinks.map((link) => (
            <Link
              key={link.id}
              href={`/c/${link.slug}`}
              onClick={() => setMobileOpen(false)}
              className={`block px-3 py-2.5 text-sm rounded-lg font-medium ${
                isActive(`/c/${link.slug}`)
                  ? 'text-[#00C4D4] bg-[#E0F7FA]/40'
                  : 'text-[#4A4A6A] hover:text-[#00C4D4] hover:bg-[#E0F7FA]/30'
              }`}
            >
              {link.name}
            </Link>
          ))}
          {FIXED_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMobileOpen(false)}
              className={`block px-3 py-2.5 text-sm rounded-lg font-medium ${
                isActive(link.href)
                  ? 'text-[#00C4D4] bg-[#E0F7FA]/40'
                  : 'text-[#4A4A6A] hover:text-[#00C4D4] hover:bg-[#E0F7FA]/30'
              }`}
            >
              {link.label}
            </Link>
          ))}
          <hr className="border-[#E5E7EB]" />
          <Link href="/cart" onClick={() => setMobileOpen(false)} className="flex items-center justify-between px-3 py-2.5 text-sm text-[#4A4A6A]">
            购物车
            {cartCount > 0 && (
              <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-[#DC2626] text-white text-[10px] font-bold flex items-center justify-center">{cartCount}</span>
            )}
          </Link>
          {isLoggedIn ? (
            <>
              <Link href="/my-courses" onClick={() => setMobileOpen(false)} className="block px-3 py-2.5 text-sm text-[#4A4A6A]">我的课程</Link>
              <Link href="/orders" onClick={() => setMobileOpen(false)} className="block px-3 py-2.5 text-sm text-[#4A4A6A]">我的订单</Link>
              <button onClick={() => { logout(); setMobileOpen(false); }} className="w-full text-left px-3 py-2.5 text-sm text-[#DC2626]">退出登录</button>
            </>
          ) : (
            <div className="flex gap-2 pt-2">
              <Link href="/login" onClick={() => setMobileOpen(false)} className="flex-1 text-center py-2.5 text-sm border-2 border-[#00C4D4] text-[#00C4D4] rounded-lg font-bold">登录</Link>
              <Link href="/register" onClick={() => setMobileOpen(false)} className="flex-1 text-center py-2.5 text-sm bg-gradient-to-r from-[#00C4D4] to-[#6D28D9] text-white rounded-lg font-bold">注册</Link>
            </div>
          )}
        </div>
      )}
    </nav>
  );
}
