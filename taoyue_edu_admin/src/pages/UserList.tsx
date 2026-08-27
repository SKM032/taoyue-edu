import { useEffect, useState } from 'react';
import { adminApi } from '../lib/api';
import InlineToast from '../components/InlineToast';
import ConfirmDialog from '../components/ConfirmDialog';

const roleMap: Record<string, { color: string; bg: string; label: string }> = {
  admin: { color: 'text-red-600', bg: 'bg-red-50', label: '管理员' },
  teacher: { color: 'text-blue-600', bg: 'bg-blue-50', label: '讲师' },
  student: { color: 'text-emerald-600', bg: 'bg-emerald-50', label: '学员' },
};

export default function UserList() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [keyword, setKeyword] = useState('');
  const [role, setRole] = useState('');
  const [toast, setToast] = useState('');

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 2500); };

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await adminApi.getUsers({
        page, page_size: 20,
        keyword: keyword || undefined,
        role: role || undefined,
      });
      setUsers(res.data.items);
      setTotal(res.data.total);
    } catch { showToast('获取用户列表失败'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchUsers(); }, [page, role]);

  const handleSearch = () => { setPage(1); fetchUsers(); };

  const [confirmTarget, setConfirmTarget] = useState<{ id: number; action: string } | null>(null);
  const [confirmLoading, setConfirmLoading] = useState(false);

  const requestToggle = (id: number, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'disabled' : 'active';
    const action = newStatus === 'active' ? '启用' : '禁用';
    setConfirmTarget({ id, action });
  };

  const toggleStatus = async () => {
    if (!confirmTarget) return;
    const newStatus = confirmTarget.action === '启用' ? 'active' : 'disabled';
    setConfirmLoading(true);
    try {
      await adminApi.updateUserStatus(confirmTarget.id, newStatus);
      showToast(`${confirmTarget.action}成功`);
      setConfirmTarget(null);
      fetchUsers();
    } catch { showToast('操作失败'); }
    finally { setConfirmLoading(false); }
  };

  return (
    <div className="space-y-5">
      {toast && (
        <InlineToast
          message={toast}
          type={toast.includes('失败') ? 'error' : 'success'}
          onClose={() => setToast('')}
        />
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-800">用户管理</h1>
          <p className="text-sm text-slate-500 mt-1">共 {total} 位用户</p>
        </div>
      </div>

      {/* 筛选栏 */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative">
          <iconify-icon icon="lucide:search" class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm"></iconify-icon>
          <input
            type="text"
            placeholder="搜索昵称/手机号..."
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className="pl-9 pr-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent w-60"
          />
        </div>
        <select
          value={role}
          onChange={(e) => { setRole(e.target.value); setPage(1); }}
          className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">全部角色</option>
          <option value="student">学员</option>
          <option value="teacher">讲师</option>
          <option value="admin">管理员</option>
        </select>
        <button onClick={() => { setKeyword(''); setRole(''); setPage(1); }} className="px-3 py-2 text-sm text-slate-500 hover:text-slate-700 hover:bg-gray-100 rounded-lg transition-colors">重置</button>
        <button onClick={handleSearch} className="px-4 py-2 bg-slate-100 text-slate-600 rounded-lg text-sm hover:bg-slate-200 transition-colors">搜索</button>
      </div>

      {/* 用户列表 */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="hidden md:grid grid-cols-12 gap-4 px-5 py-3 bg-slate-50 border-b border-gray-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
          <div className="col-span-2">昵称</div>
          <div className="col-span-2">手机号</div>
          <div className="col-span-1">角色</div>
          <div className="col-span-1">状态</div>
          <div className="col-span-2">最后登录</div>
          <div className="col-span-2">注册时间</div>
          <div className="col-span-2">操作</div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <svg className="animate-spin h-6 w-6 text-indigo-500" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
            </svg>
          </div>
        ) : users.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400">
            <iconify-icon icon="lucide:users" class="text-5xl mb-3 opacity-30"></iconify-icon>
            <p className="text-sm">暂无用户数据</p>
          </div>
        ) : (
          users.map((user) => {
            const r = roleMap[user.role] || { color: 'text-slate-500', bg: 'bg-slate-100', label: user.role };
            return (
              <div key={user.id} className="md:grid grid-cols-12 gap-4 px-5 py-3 border-b border-gray-100 hover:bg-slate-50 transition-colors items-center">
                <div className="col-span-2 flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center flex-shrink-0">
                    <span className="text-white text-xs font-bold">{user.nickname?.[0] || '?'}</span>
                  </div>
                  <span className="text-sm font-medium text-slate-700 truncate">{user.nickname}</span>
                </div>
                <div className="col-span-2 text-sm text-slate-500">{user.phone || '-'}</div>
                <div className="col-span-1">
                  <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${r.color} ${r.bg}`}>{r.label}</span>
                </div>
                <div className="col-span-1">
                  <span className={`inline-flex items-center gap-1 text-xs font-medium ${user.status === 'active' ? 'text-emerald-600' : 'text-red-500'}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${user.status === 'active' ? 'bg-emerald-500' : 'bg-red-400'}`}></span>
                    {user.status === 'active' ? '启用' : '禁用'}
                  </span>
                </div>
                <div className="col-span-2 text-sm text-slate-500">{user.last_login_at?.slice(0, 16) || '-'}</div>
                <div className="col-span-2 text-sm text-slate-500">{user.created_at?.slice(0, 10)}</div>
                <div className="col-span-2">
                  <button
                    onClick={() => requestToggle(user.id, user.status)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                      user.status === 'active'
                        ? 'text-red-500 hover:bg-red-50'
                        : 'text-emerald-500 hover:bg-emerald-50'
                    }`}
                  >
                    {user.status === 'active' ? '禁用' : '启用'}
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* 分页 */}
      {total > 20 && (
        <div className="flex items-center justify-between text-sm text-slate-500">
          <span>共 {total} 条记录</span>
          <div className="flex items-center gap-1">
            <button disabled={page <= 1} onClick={() => setPage(page - 1)} className="px-3 py-1.5 rounded-md hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed">上一页</button>
            <span className="px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-md font-medium">{page}</span>
            <button disabled={page * 20 >= total} onClick={() => setPage(page + 1)} className="px-3 py-1.5 rounded-md hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed">下一页</button>
          </div>
        </div>
      )}

      {/* 启用/禁用确认 */}
      <ConfirmDialog
        open={!!confirmTarget}
        danger
        title={confirmTarget?.action === '启用' ? '启用用户' : '禁用用户'}
        confirmText={confirmTarget?.action || '确认'}
        loading={confirmLoading}
        message={
          confirmTarget ? (
            <>确定要{confirmTarget.action}该用户吗？{confirmTarget.action === '禁用' ? '禁用后用户将无法登录。' : ''}</>
          ) : null
        }
        onConfirm={toggleStatus}
        onCancel={() => { setConfirmTarget(null); setConfirmLoading(false); }}
      />
    </div>
  );
}
