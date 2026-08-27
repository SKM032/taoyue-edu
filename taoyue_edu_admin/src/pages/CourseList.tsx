import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminApi } from '../lib/api';
import InlineToast from '../components/InlineToast';
import ConfirmDialog from '../components/ConfirmDialog';

const statusMap: Record<string, { color: string; bg: string; label: string }> = {
  draft: { color: 'text-slate-500', bg: 'bg-slate-100', label: '草稿' },
  pending_review: { color: 'text-blue-600', bg: 'bg-blue-50', label: '审核中' },
  reviewing: { color: 'text-blue-600', bg: 'bg-blue-50', label: '审核中' },
  approved: { color: 'text-emerald-600', bg: 'bg-emerald-50', label: '已通过' },
  rejected: { color: 'text-red-600', bg: 'bg-red-50', label: '已驳回' },
  published: { color: 'text-emerald-600', bg: 'bg-emerald-50', label: '已发布' },
  unpublished: { color: 'text-amber-600', bg: 'bg-amber-50', label: '已下架' },
};

export default function CourseList() {
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [keyword, setKeyword] = useState('');
  const [status, setStatus] = useState('');
  const [toast, setToast] = useState('');
  const navigate = useNavigate();

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2500);
  };

  const fetchCourses = async () => {
    setLoading(true);
    try {
      const res = await adminApi.getCourses({ page, page_size: 20, keyword: keyword || undefined, status: status || undefined });
      setCourses(res.data.items);
      setTotal(res.data.total);
    } catch {
      showToast('获取课程列表失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchCourses(); }, [page, status]);

  const handleSearch = () => { setPage(1); fetchCourses(); };

  const [confirmTarget, setConfirmTarget] = useState<{ course: any; isPublished: boolean } | null>(null);
  const [confirmLoading, setConfirmLoading] = useState(false);

  const requestDelete = (course: any) => {
    setConfirmTarget({ course, isPublished: course.status === 'published' });
  };

  const handleDelete = async () => {
    if (!confirmTarget) return;
    const { course, isPublished } = confirmTarget;
    setConfirmLoading(true);
    try {
      await adminApi.deleteCourse(course.id);
      showToast(isPublished ? '课程已下架' : '课程已删除');
      setConfirmTarget(null);
      fetchCourses();
    } catch (err: any) {
      showToast(err.response?.data?.detail || '操作失败');
    } finally {
      setConfirmLoading(false);
    }
  };

  const handlePublish = async (id: number) => {
    try {
      await adminApi.publishCourse(id, 'published');
      showToast('课程已发布');
      fetchCourses();
    } catch {
      showToast('发布失败');
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
          <h1 className="text-xl font-bold text-slate-800">课程列表</h1>
          <p className="text-sm text-slate-500 mt-1">共 {total} 门课程</p>
        </div>
        <button
          onClick={() => navigate('/courses/create')}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-500 text-white rounded-lg text-sm font-medium hover:bg-indigo-600 transition-colors shadow-sm"
        >
          <iconify-icon icon="lucide:plus" class="text-base"></iconify-icon>
          创建课程
        </button>
      </div>

      {/* 筛选栏 */}
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
        <select
          value={status}
          onChange={(e) => { setStatus(e.target.value); setPage(1); }}
          className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">全部状态</option>
          {Object.entries(statusMap).map(([k, v]) => (
            <option key={k} value={k}>{v.label}</option>
          ))}
        </select>
        <button
          onClick={() => { setKeyword(''); setStatus(''); setPage(1); }}
          className="px-3 py-2 text-sm text-slate-500 hover:text-slate-700 hover:bg-gray-100 rounded-lg transition-colors"
        >
          重置
        </button>
        <button onClick={handleSearch} className="px-4 py-2 bg-slate-100 text-slate-600 rounded-lg text-sm hover:bg-slate-200 transition-colors">
          搜索
        </button>
      </div>

      {/* 课程列表 */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {/* 表头 */}
        <div className="hidden md:grid grid-cols-12 gap-4 px-5 py-3 bg-slate-50 border-b border-gray-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
          <div className="col-span-4">课程信息</div>
          <div className="col-span-1">分类</div>
          <div className="col-span-1">讲师</div>
          <div className="col-span-1">价格</div>
          <div className="col-span-1">学员</div>
          <div className="col-span-1">状态</div>
          <div className="col-span-3">操作</div>
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
            <iconify-icon icon="lucide:inbox" class="text-5xl mb-3 opacity-30"></iconify-icon>
            <p className="text-sm">暂无课程数据</p>
          </div>
        )}

        {/* 数据行 */}
        {!loading && courses.map((course) => {
          const s = statusMap[course.status] || { color: 'text-slate-500', bg: 'bg-slate-100', label: course.status };
          return (
            <div key={course.id} className="md:grid grid-cols-12 gap-4 px-5 py-3.5 border-b border-gray-100 hover:bg-slate-50 transition-colors items-center">
              {/* 课程信息 */}
              <div className="col-span-4 flex items-center gap-3">
                <div
                  className="w-14 h-10 rounded-lg flex-shrink-0 bg-cover bg-center"
                  style={{ backgroundImage: course.cover ? `url(${course.cover})` : undefined, backgroundColor: course.cover ? undefined : '#eef2ff' }}
                >
                  {!course.cover && (
                    <div className="w-full h-full flex items-center justify-center">
                      <iconify-icon icon="lucide:book-open" class="text-indigo-300 text-sm"></iconify-icon>
                    </div>
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-700 truncate">{course.title}</p>
                  <p className="text-xs text-slate-400">{course.created_at?.slice(0, 10)}</p>
                </div>
              </div>
              <div className="col-span-1 text-sm text-slate-600">{course.category_name || '-'}</div>
              <div className="col-span-1 text-sm text-slate-600">{course.teacher_name || '-'}</div>
              <div className="col-span-1 text-sm font-medium text-slate-700">¥{course.price}</div>
              <div className="col-span-1 text-sm text-slate-600">{course.student_count}</div>
              <div className="col-span-1">
                <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${s.color} ${s.bg}`}>
                  {s.label}
                </span>
              </div>
              <div className="col-span-3 flex items-center gap-1.5 flex-wrap mt-2 md:mt-0">
                <button
                  onClick={() => navigate(`/courses/edit/${course.id}`)}
                  className="px-2.5 py-1.5 text-xs font-medium text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                >
                  编辑
                </button>
                <button
                  onClick={() => navigate(`/courses/${course.id}/content`)}
                  className="px-2.5 py-1.5 text-xs font-medium text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors"
                >
                  内容编排
                </button>
                <button
                  onClick={() => navigate(`/courses/${course.id}/delivery`)}
                  className="px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-md transition-colors"
                >
                  交付监控
                </button>
                {course.status === 'published' ? (
                  <button
                    onClick={() => requestDelete(course)}
                    className="px-2.5 py-1.5 text-xs font-medium text-amber-600 hover:bg-amber-50 rounded-md transition-colors"
                  >
                    下架
                  </button>
                ) : (
                  <>
                    <button
                      onClick={() => handlePublish(course.id)}
                      className="px-2.5 py-1.5 text-xs font-medium bg-indigo-500 text-white rounded-md hover:bg-indigo-600 transition-colors"
                    >
                      发布
                    </button>
                    <button
                      onClick={() => requestDelete(course)}
                      className="px-2.5 py-1.5 text-xs font-medium text-red-500 hover:bg-red-50 rounded-md transition-colors"
                    >
                      删除
                    </button>
                  </>
                )}
              </div>
            </div>
          );
        })}
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

      {/* 删除/下架确认 */}
      <ConfirmDialog
        open={!!confirmTarget}
        danger
        title={confirmTarget?.isPublished ? '下架课程' : '删除课程'}
        confirmText={confirmTarget?.isPublished ? '确认下架' : '确认删除'}
        loading={confirmLoading}
        message={
          confirmTarget ? (
            <>
              确定要{confirmTarget.isPublished ? '下架' : '删除'}课程
              <span className="font-semibold text-slate-900">「{confirmTarget.course.title}」</span>
              吗？此操作后课程将不再对用户展示。
            </>
          ) : null
        }
        onConfirm={handleDelete}
        onCancel={() => { setConfirmTarget(null); setConfirmLoading(false); }}
      />
    </div>
  );
}
