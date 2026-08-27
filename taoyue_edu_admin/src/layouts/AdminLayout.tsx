import { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/auth';

interface NavItem {
  key: string;
  icon: string;
  label: string;
  children?: { key: string; label: string }[];
}

const navItems: NavItem[] = [
  { key: '/', icon: 'lucide:layout-dashboard', label: '工作台' },
  {
    key: 'courses-group',
    icon: 'lucide:book-open',
    label: '课程交付管理',
    children: [
      { key: '/courses', label: '课程列表' },
      { key: '/courses/create', label: '创建课程' },
      { key: '/courses/publish', label: '发布管理' },
      { key: '/courses/trash', label: '回收站' },
    ],
  },
  { key: '/categories', icon: 'lucide:folder', label: '分类管理' },
  { key: '/teachers', icon: 'lucide:graduation-cap', label: '讲师管理' },
  { key: '/banners', icon: 'lucide:image', label: '轮播图管理' },
  { key: '/users', icon: 'lucide:users', label: '用户管理' },
  { key: '/orders', icon: 'lucide:shopping-cart', label: '交易明细' },
  { key: '/sales', icon: 'lucide:bar-chart-3', label: '销售概览' },
  { key: '/settings', icon: 'lucide:settings', label: '平台配置' },
];

export default function AdminLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const [expandedGroup, setExpandedGroup] = useState<string | null>('courses-group');
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuthStore();

  const currentPath = location.pathname;

  const isActive = (key: string) => {
    if (key === '/') return currentPath === '/';
    return currentPath.startsWith(key);
  };

  const toggleGroup = (key: string) => {
    setExpandedGroup(expandedGroup === key ? null : key);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {/* 侧边栏 */}
      <aside
        className={`fixed left-0 top-0 z-20 h-full bg-slate-900 transition-all duration-300 flex flex-col ${
          collapsed ? 'w-[72px]' : 'w-[240px]'
        }`}
      >
        {/* Logo */}
        <div className="flex items-center h-16 px-4 border-b border-slate-700/50 flex-shrink-0">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center flex-shrink-0">
            <iconify-icon icon="lucide:graduation-cap" class="text-white text-lg"></iconify-icon>
          </div>
          {!collapsed && (
            <span className="ml-3 text-white font-bold text-base whitespace-nowrap">
              桃悦智科 · 管理后台
            </span>
          )}
        </div>

        {/* 导航菜单 */}
        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
          {navItems.map((item) => {
            if (item.children) {
              const expanded = expandedGroup === item.key;
              const anyChildActive = item.children.some((c) => isActive(c.key));
              return (
                <div key={item.key}>
                  <button
                    onClick={() => toggleGroup(item.key)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                      anyChildActive
                        ? 'bg-indigo-500/15 text-indigo-300'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                    } ${collapsed ? 'justify-center' : ''}`}
                  >
                    <iconify-icon icon={item.icon} class="text-lg flex-shrink-0"></iconify-icon>
                    {!collapsed && (
                      <>
                        <span className="flex-1 text-left">{item.label}</span>
                        <iconify-icon
                          icon="lucide:chevron-down"
                          class={`text-xs transition-transform ${expanded ? 'rotate-0' : '-rotate-90'}`}
                        ></iconify-icon>
                      </>
                    )}
                  </button>
                  {expanded && !collapsed && (
                    <div className="ml-4 mt-0.5 space-y-0.5 border-l border-slate-700/50 pl-4">
                      {item.children.map((child) => (
                        <button
                          key={child.key}
                          onClick={() => navigate(child.key)}
                          className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all duration-200 ${
                            isActive(child.key)
                              ? 'text-indigo-300 bg-indigo-500/10 font-medium'
                              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                          }`}
                        >
                          {child.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            }

            return (
              <button
                key={item.key}
                onClick={() => navigate(item.key)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                  isActive(item.key)
                    ? 'bg-indigo-500/15 text-indigo-300 shadow-[0_0_0_1px_rgba(99,102,241,0.3)]'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                } ${collapsed ? 'justify-center' : ''}`}
              >
                <iconify-icon icon={item.icon} class="text-lg flex-shrink-0"></iconify-icon>
                {!collapsed && <span>{item.label}</span>}
              </button>
            );
          })}
        </nav>

        {/* 底部用户区 */}
        <div className="border-t border-slate-700/50 p-3 flex-shrink-0">
          <div
            className={`flex items-center gap-3 ${collapsed ? 'justify-center' : ''} cursor-pointer rounded-lg p-2 hover:bg-slate-800 transition-colors group`}
            onClick={handleLogout}
          >
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center flex-shrink-0">
              <span className="text-white text-xs font-bold">
                {user?.nickname?.[0] || 'A'}
              </span>
            </div>
            {!collapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-200 truncate">
                  {user?.nickname || '管理员'}
                </p>
                <p className="text-xs text-slate-500 truncate capitalize">{user?.role || ''}</p>
              </div>
            )}
            {!collapsed && (
              <iconify-icon
                icon="lucide:log-out"
                class="text-slate-500 group-hover:text-red-400 text-base opacity-0 group-hover:opacity-100 transition-all"
              ></iconify-icon>
            )}
          </div>
        </div>
      </aside>

      {/* 主内容区 */}
      <div
        className={`flex-1 flex flex-col transition-all duration-300 ${
          collapsed ? 'ml-[72px]' : 'ml-[240px]'
        }`}
      >
        {/* 顶部栏 */}
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 sticky top-0 z-10 flex-shrink-0">
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="w-9 h-9 flex items-center justify-center rounded-lg text-slate-500 hover:bg-gray-100 hover:text-slate-700 transition-colors"
          >
            <iconify-icon
              icon={collapsed ? 'lucide:panel-right' : 'lucide:panel-left'}
              class="text-lg"
            ></iconify-icon>
          </button>

          <div className="flex items-center gap-3">
            <button className="relative w-9 h-9 flex items-center justify-center rounded-lg text-slate-500 hover:bg-gray-100 hover:text-slate-700 transition-colors">
              <iconify-icon icon="lucide:bell" class="text-lg"></iconify-icon>
              <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full ring-2 ring-white"></span>
            </button>
            <button
              onClick={handleLogout}
              className="w-9 h-9 flex items-center justify-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors"
              title="退出登录"
            >
              <iconify-icon icon="lucide:log-out" class="text-lg"></iconify-icon>
            </button>
          </div>
        </header>

        {/* 内容区 */}
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
