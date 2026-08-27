import { useEffect, useState } from 'react';
import { adminApi } from '../lib/api';
import InlineToast from '../components/InlineToast';

const statusMap: Record<string, { color: string; bg: string; label: string }> = {
  draft: { color: 'text-slate-500', bg: 'bg-slate-100', label: '草稿' },
  pending_review: { color: 'text-blue-600', bg: 'bg-blue-50', label: '审核中' },
  reviewing: { color: 'text-blue-600', bg: 'bg-blue-50', label: '审核中' },
  approved: { color: 'text-emerald-600', bg: 'bg-emerald-50', label: '已通过' },
  rejected: { color: 'text-red-600', bg: 'bg-red-50', label: '已驳回' },
  published: { color: 'text-emerald-600', bg: 'bg-emerald-50', label: '已发布' },
};

export default function CoursePublish() {
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [rejectModal, setRejectModal] = useState(false);
  const [rejectId, setRejectId] = useState<number | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [toast, setToast] = useState('');

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 2500); };

  const fetchCourses = async () => {
    setLoading(true);
    try {
      const res = await adminApi.getCourses({ page_size: 100, status: '' });
      setCourses((res.data.items || []).filter((c: any) => c.status !== 'draft'));
    } catch { showToast('获取课程失败'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchCourses(); }, []);

  const handleApprove = async (id: number) => {
    try {
      await adminApi.reviewCourse(id, 'approved');
      showToast('审核通过，课程已发布');
      fetchCourses();
    } catch { showToast('操作失败'); }
  };

  const handleReject = async () => {
    if (!rejectId) return;
    try {
      await adminApi.reviewCourse(rejectId, 'rejected', rejectReason);
      showToast('已驳回');
      setRejectModal(false);
      setRejectReason('');
      fetchCourses();
    } catch { showToast('操作失败'); }
  };

  const handlePublish = async (id: number) => {
    try {
      await adminApi.publishCourse(id, 'published');
      showToast('课程已发布');
      fetchCourses();
    } catch { showToast('发布失败'); }
  };

  const pendingCount = courses.filter((c) => c.status === 'pending_review' || c.status === 'reviewing').length;
  const approvedCount = courses.filter((c) => c.status === 'approved' || c.status === 'published').length;
  const rejectedCount = courses.filter((c) => c.status === 'rejected').length;

  const stats = [
    { label: '审核中', value: pendingCount, icon: 'lucide:clock', color: 'bg-blue-500' },
    { label: '已通过', value: approvedCount, icon: 'lucide:check-circle', color: 'bg-emerald-500' },
    { label: '已驳回', value: rejectedCount, icon: 'lucide:x-circle', color: 'bg-red-500' },
  ];

  return (
    <div className="space-y-5">
      {toast && (
        <InlineToast
          message={toast}
          type={toast.includes('失败') ? 'error' : 'success'}
          onClose={() => setToast('')}
        />
      )}

      <div>
        <h1 className="text-xl font-bold text-slate-800">发布管理</h1>
        <p className="text-sm text-slate-500 mt-1">审核和发布课程</p>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-3 gap-4">
        {stats.map((s) => (
          <div key={s.label} className="bg-white rounded-xl border border-gray-200 p-5 flex items-center gap-4">
            <div className={`w-10 h-10 rounded-lg ${s.color} flex items-center justify-center`}>
              <iconify-icon icon={s.icon} class="text-white text-lg"></iconify-icon>
            </div>
            <div>
              <p className="text-sm text-slate-500">{s.label}</p>
              <p className="text-2xl font-bold text-slate-800">{s.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* 课程列表 */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="hidden md:grid grid-cols-12 gap-4 px-5 py-3 bg-slate-50 border-b border-gray-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
          <div className="col-span-5">课程名称</div>
          <div className="col-span-2">分类</div>
          <div className="col-span-2">讲师</div>
          <div className="col-span-1">状态</div>
          <div className="col-span-2">操作</div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <svg className="animate-spin h-6 w-6 text-indigo-500" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
            </svg>
          </div>
        ) : courses.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400">
            <iconify-icon icon="lucide:inbox" class="text-5xl mb-3 opacity-30"></iconify-icon>
            <p className="text-sm">暂无待审核课程</p>
          </div>
        ) : (
          courses.map((course) => {
            const s = statusMap[course.status] || { color: 'text-slate-500', bg: 'bg-slate-100', label: course.status };
            return (
              <div key={course.id} className="md:grid grid-cols-12 gap-4 px-5 py-3 border-b border-gray-100 hover:bg-slate-50 transition-colors items-center">
                <div className="col-span-5 text-sm font-medium text-slate-700 truncate">{course.title}</div>
                <div className="col-span-2 text-sm text-slate-500">{course.category_name || '-'}</div>
                <div className="col-span-2 text-sm text-slate-500">{course.teacher_name || '-'}</div>
                <div className="col-span-1">
                  <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${s.color} ${s.bg}`}>{s.label}</span>
                </div>
                <div className="col-span-2 flex items-center gap-1.5 mt-1 md:mt-0">
                  {(course.status === 'pending_review' || course.status === 'reviewing') && (
                    <>
                      <button onClick={() => handleApprove(course.id)} className="px-3 py-1.5 text-xs font-medium bg-emerald-500 text-white rounded-md hover:bg-emerald-600 transition-colors">通过</button>
                      <button onClick={() => { setRejectId(course.id); setRejectModal(true); }} className="px-3 py-1.5 text-xs font-medium bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors">驳回</button>
                    </>
                  )}
                  {course.status === 'approved' && (
                    <button onClick={() => handlePublish(course.id)} className="px-3 py-1.5 text-xs font-medium bg-indigo-500 text-white rounded-md hover:bg-indigo-600 transition-colors">发布</button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* 驳回弹窗 */}
      {rejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setRejectModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-slate-800 mb-4">驳回原因</h3>
            <textarea
              rows={3}
              placeholder="请输入驳回原因"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500"
              autoFocus
            />
            <div className="flex justify-end gap-3 mt-5">
              <button onClick={() => { setRejectModal(false); setRejectReason(''); }} className="px-4 py-2 text-sm text-slate-600 hover:bg-gray-100 rounded-lg transition-colors">取消</button>
              <button onClick={handleReject} className="px-4 py-2 bg-red-500 text-white text-sm font-medium rounded-lg hover:bg-red-600 transition-colors">确认驳回</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
