import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminApi } from '../lib/api';
import InlineToast from '../components/InlineToast';
import ConfirmDialog from '../components/ConfirmDialog';

export default function TrashList() {
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [keyword, setKeyword] = useState('');
  const [toast, setToast] = useState('');
  const navigate = useNavigate();

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2500);
  };

  // 回收站只展示已下架（删除）的课程
  const fetchTrash = async () => {
    setLoading(true);
    try {
      const res = await adminApi.getCourses({
        page,
        page_size: 20,
        keyword: keyword || undefined,
        status: 'unpublished',
      });
      setCourses(res.data.items);
      setTotal(res.data.total);
    } catch {
      showToast('获取回收站列表失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchTrash(); }, [page]);

  const handleSearch = () => { setPage(1); fetchTrash(); };

  const [restoreTarget, setRestoreTarget] = useState<any>(null);
  const [restoreLoading, setRestoreLoading] = useState(false);

  const handleRestore = async () => {
    if (!restoreTarget) return;
    setRestoreLoading(true);
    try {
      await adminApi.restoreCourse(restoreTarget.id);
      showToast('课程已从回收站恢复');
      setRestoreTarget(null);
      fetchTrash();
    } catch (err: any) {
      showToast(err.response?.data?.detail || '恢复失败');
    } finally {
      setRestoreLoading(false);
    }
  };

  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const handlePermanentDelete = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      await adminApi.permanentDeleteCourse(deleteTarget.id);
      showToast('课程已彻底删除');
      setDeleteTarget(null);
      fetchTrash();
    } catch (err: any) {
      showToast(err.response?.data?.detail || '删除失败');
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Toast */}
      {toast && (
        <InlineToast
          message={toast}
          type={toast.includes('失败') ? 'error' : 'success'}
          onClose={() => setToast('')}
        />
      )}

      {/* 页头 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-800">回收站</h1>
          <p className="text-sm text-slate-500 mt-1">
            共 {total} 门已下架的课程，可恢复后重新上架
          </p>
        </div>
      </div>

      {/* 搜索栏 */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative">
          <iconify-icon icon="lucide:search" class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm"></iconify-icon>
          <input
            type="text"
            placeholder="搜索课程名称..."
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className="pl-9 pr-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent w-60"
          />
        </div>
        <button onClick={handleSearch} className="px-4 py-2 bg-slate-100 text-slate-600 rounded-lg text-sm hover:bg-slate-200 transition-colors">
          搜索
        </button>
        <button
          onClick={() => navigate('/courses')}
          className="px-3 py-2 text-sm text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
        >
          ← 返回课程列表
        </button>
      </div>

      {/* 回收站列表 */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {/* 表头 */}
        <div className="hidden md:grid grid-cols-12 gap-4 px-5 py-3 bg-slate-50 border-b border-gray-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
          <div className="col-span-5">课程信息</div>
          <div className="col-span-2">分类</div>
          <div className="col-span-2">价格</div>
          <div className="col-span-1">状态</div>
          <div className="col-span-2">操作</div>
        </div>

        {/* 加载 */}
        {loading && (
          <div className="flex items-center justify-center py-20">
            <svg className="animate-spin h-6 w-6 text-indigo-500" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
            </svg>
          </div>
        )}

        {/* 空状态 */}
        {!loading && courses.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400">
            <iconify-icon icon="lucide:trash-2" class="text-5xl mb-3 opacity-30"></iconify-icon>
            <p className="text-sm">回收站是空的</p>
          </div>
        )}

        {/* 数据行 */}
        {!loading && courses.map((course) => (
          <div key={course.id} className="md:grid grid-cols-12 gap-4 px-5 py-3.5 border-b border-gray-100 hover:bg-slate-50 transition-colors items-center">
            {/* 课程信息 */}
            <div className="col-span-5 flex items-center gap-3">
              <div
                className="w-14 h-10 rounded-lg flex-shrink-0 bg-cover bg-center opacity-70"
                style={{ backgroundImage: course.cover ? `url(${course.cover})` : undefined, backgroundColor: course.cover ? undefined : '#fef3c7' }}
              >
                {!course.cover && (
                  <div className="w-full h-full flex items-center justify-center">
                    <iconify-icon icon="lucide:book-open" class="text-amber-300 text-sm"></iconify-icon>
                  </div>
                )}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-slate-700 truncate">{course.title}</p>
                <p className="text-xs text-slate-400">下架时间: {course.created_at?.slice(0, 10)}</p>
              </div>
            </div>
            <div className="col-span-2 text-sm text-slate-600">{course.category_name || '-'}</div>
            <div className="col-span-2 text-sm font-medium text-slate-700">¥{course.price}</div>
            <div className="col-span-1">
              <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium text-amber-600 bg-amber-50">
                已下架
              </span>
            </div>
            <div className="col-span-2 flex items-center gap-1.5 flex-wrap mt-2 md:mt-0">
              <button
                onClick={() => setRestoreTarget(course)}
                className="px-2.5 py-1.5 text-xs font-medium bg-emerald-500 text-white rounded-md hover:bg-emerald-600 transition-colors"
              >
                恢复
              </button>
              <button
                onClick={() => setDeleteTarget(course)}
                className="px-2.5 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 rounded-md transition-colors"
              >
                删除
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* 分页 */}
      {total > 20 && (
        <div className="flex items-center justify-between text-sm text-slate-500">
          <span>共 {total} 条记录</span>
          <div className="flex items-center gap-1">
            <button
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
              className="px-3 py-1.5 rounded-md hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              上一页
            </button>
            <span className="px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-md font-medium">{page}</span>
            <button
              disabled={page * 20 >= total}
              onClick={() => setPage(page + 1)}
              className="px-3 py-1.5 rounded-md hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              下一页
            </button>
          </div>
        </div>
      )}

      {/* 恢复确认 */}
      <ConfirmDialog
        open={!!restoreTarget}
        title="恢复课程"
        confirmText="确认恢复"
        loading={restoreLoading}
        message={
          restoreTarget ? (
            <>
              确定要恢复课程
              <span className="font-semibold text-slate-900">「{restoreTarget.title}」</span>
              吗？恢复后课程将重新上架，对用户可见。
            </>
          ) : null
        }
        onConfirm={handleRestore}
        onCancel={() => { setRestoreTarget(null); setRestoreLoading(false); }}
      />

      {/* 彻底删除确认 */}
      <ConfirmDialog
        open={!!deleteTarget}
        title="彻底删除课程"
        confirmText="确认删除"
        loading={deleteLoading}
        danger
        message={
          deleteTarget ? (
            <>
              <p>确定要彻底删除课程
                <span className="font-semibold text-slate-900">「{deleteTarget.title}」</span>
                吗？</p>
              <p className="mt-2 text-red-600">此操作将从数据库中永久删除该课程及其章节、课时、订购记录等，且无法恢复！</p>
            </>
          ) : null
        }
        onConfirm={handlePermanentDelete}
        onCancel={() => { setDeleteTarget(null); setDeleteLoading(false); }}
      />
    </div>
  );
}
