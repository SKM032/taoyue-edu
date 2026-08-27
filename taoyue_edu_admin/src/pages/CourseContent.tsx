import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { adminApi } from '../lib/api';
import InlineToast from '../components/InlineToast';
import ConfirmDialog from '../components/ConfirmDialog';

export default function CourseContent() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [chapters, setChapters] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showChapterModal, setShowChapterModal] = useState(false);
  const [showLessonModal, setShowLessonModal] = useState(false);
  const [currentChapterId, setCurrentChapterId] = useState<number | null>(null);
  const [editingChapterId, setEditingChapterId] = useState<number | null>(null);
  const [editingLessonId, setEditingLessonId] = useState<number | null>(null);
  const [toast, setToast] = useState('');
  const [chapterForm, setChapterForm] = useState({ title: '', sort_order: 0, is_free: false });
  const [lessonForm, setLessonForm] = useState({
    title: '', lesson_type: 'video', video_duration: 0, is_free: false,
  });

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 2500); };

  const fetchChapters = async () => {
    setLoading(true);
    try {
      const res = await adminApi.getChapters(Number(id));
      setChapters(res.data || []);
    } catch { showToast('获取章节失败'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchChapters(); }, [id]);

  const submitChapter = async () => {
    if (!chapterForm.title.trim()) { showToast('请输入章节名称'); return; }
    try {
      if (editingChapterId) {
        await adminApi.updateChapter(editingChapterId, chapterForm);
        showToast('章节更新成功');
      } else {
        await adminApi.addChapter(Number(id), chapterForm);
        showToast('章节添加成功');
      }
      setShowChapterModal(false);
      setEditingChapterId(null);
      setChapterForm({ title: '', sort_order: 0, is_free: false });
      fetchChapters();
    } catch { showToast(editingChapterId ? '更新失败' : '添加失败'); }
  };

  // 打开添加章节弹窗（默认序号 = 现有章节数 + 1）
  const openAddChapter = () => {
    setEditingChapterId(null);
    setChapterForm({ title: '', sort_order: chapters.length + 1, is_free: false });
    setShowChapterModal(true);
  };

  // 打开编辑章节弹窗
  const openEditChapter = (chapter: any) => {
    setEditingChapterId(chapter.id);
    setChapterForm({ title: chapter.title, sort_order: chapter.sort_order || 0, is_free: !!chapter.is_free });
    setShowChapterModal(true);
  };

  const [confirmChapter, setConfirmChapter] = useState<number | null>(null);
  const [confirmLesson, setConfirmLesson] = useState<number | null>(null);
  const [confirmLoading, setConfirmLoading] = useState(false);

  const deleteChapter = async () => {
    if (confirmChapter === null) return;
    setConfirmLoading(true);
    try {
      await adminApi.deleteChapter(confirmChapter);
      showToast('章节已删除');
      setConfirmChapter(null);
      fetchChapters();
    } catch { showToast('删除失败'); }
    finally { setConfirmLoading(false); }
  };

  const submitLesson = async () => {
    if (!lessonForm.title.trim() || (!editingLessonId && !currentChapterId)) { showToast('请输入课时名称'); return; }
    try {
      if (editingLessonId) {
        await adminApi.updateLesson(editingLessonId, lessonForm);
        showToast('课时更新成功');
      } else {
        await adminApi.addLesson(currentChapterId as number, lessonForm);
        showToast('课时添加成功');
      }
      setShowLessonModal(false);
      setEditingLessonId(null);
      setLessonForm({ title: '', lesson_type: 'video', video_duration: 0, is_free: false });
      fetchChapters();
    } catch { showToast(editingLessonId ? '更新失败' : '添加失败'); }
  };

  // 打开添加课时弹窗
  const openAddLesson = (chapterId: number) => {
    setEditingLessonId(null);
    setCurrentChapterId(chapterId);
    setLessonForm({ title: '', lesson_type: 'video', video_duration: 0, is_free: false });
    setShowLessonModal(true);
  };

  // 打开编辑课时弹窗
  const openEditLesson = (lesson: any) => {
    setEditingLessonId(lesson.id);
    setCurrentChapterId(lesson.chapter_id || null);
    setLessonForm({
      title: lesson.title || '',
      lesson_type: lesson.lesson_type || 'video',
      video_duration: lesson.video_duration || 0,
      is_free: !!lesson.is_free,
    });
    setShowLessonModal(true);
  };

  const deleteLesson = async () => {
    if (confirmLesson === null) return;
    setConfirmLoading(true);
    try {
      await adminApi.deleteLesson(confirmLesson);
      showToast('课时已删除');
      setConfirmLesson(null);
      fetchChapters();
    } catch { showToast('删除失败'); }
    finally { setConfirmLoading(false); }
  };

  const formatDuration = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = String(s % 60).padStart(2, '0');
    return `${m}:${sec}`;
  };

  const typeIcons: Record<string, { icon: string; color: string }> = {
    video: { icon: 'lucide:play-circle', color: 'text-indigo-500' },
    document: { icon: 'lucide:file-text', color: 'text-emerald-500' },
    quiz: { icon: 'lucide:help-circle', color: 'text-amber-500' },
    resource: { icon: 'lucide:download', color: 'text-blue-500' },
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

      {/* 页头 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/courses')} className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-500 hover:bg-gray-100 transition-colors">
            <iconify-icon icon="lucide:arrow-left" class="text-base"></iconify-icon>
          </button>
          <div>
            <h1 className="text-xl font-bold text-slate-800">内容编排</h1>
            <p className="text-sm text-slate-500 mt-0.5">管理课程的章节和课时</p>
          </div>
        </div>
        <button
          onClick={openAddChapter}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-500 text-white rounded-lg text-sm font-medium hover:bg-indigo-600 transition-colors shadow-sm"
        >
          <iconify-icon icon="lucide:plus" class="text-base"></iconify-icon>
          添加章节
        </button>
      </div>

      {/* 章节列表 */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <svg className="animate-spin h-6 w-6 text-indigo-500" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
          </svg>
        </div>
      ) : chapters.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 flex flex-col items-center justify-center py-16 text-slate-400">
          <iconify-icon icon="lucide:book-open" class="text-5xl mb-3 opacity-30"></iconify-icon>
          <p className="text-sm">暂无章节，点击上方"添加章节"开始编排</p>
        </div>
      ) : (
        <div className="space-y-3">
          {chapters.map((chapter, idx) => (
            <div key={chapter.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              {/* 章节头部 */}
              <div className="flex items-center justify-between px-5 py-3 bg-slate-50 border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <span className="w-7 h-7 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs font-bold">
                    {chapter.sort_order || idx + 1}
                  </span>
                  <h3 className="font-semibold text-slate-700 text-sm">{chapter.title}</h3>
                  {chapter.is_free && (
                    <span className="px-2 py-0.5 bg-emerald-50 text-emerald-600 text-xs font-medium rounded-full">免费</span>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => openAddLesson(chapter.id)}
                    className="px-3 py-1.5 text-xs font-medium text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors flex items-center gap-1"
                  >
                    <iconify-icon icon="lucide:plus" class="text-sm"></iconify-icon>
                    添加课时
                  </button>
                  <button
                    onClick={() => openEditChapter(chapter)}
                    className="px-2 py-1.5 text-xs text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors"
                    title="编辑章节"
                  >
                    <iconify-icon icon="lucide:edit-3" class="text-sm"></iconify-icon>
                  </button>
                  <button
                    onClick={() => setConfirmChapter(chapter.id)}
                    className="px-2 py-1.5 text-xs text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors"
                    title="删除章节"
                  >
                    <iconify-icon icon="lucide:trash-2" class="text-sm"></iconify-icon>
                  </button>
                </div>
              </div>

              {/* 课时列表 */}
              <div className="divide-y divide-gray-50">
                {chapter.lessons?.length > 0 ? (
                  chapter.lessons.map((lesson: any) => {
                    const ti = typeIcons[lesson.lesson_type] || typeIcons.document;
                    return (
                      <div key={lesson.id} className="flex items-center justify-between px-5 py-2.5 hover:bg-slate-50 transition-colors">
                        <div className="flex items-center gap-3 min-w-0">
                          <iconify-icon icon={ti.icon} class={`text-base flex-shrink-0 ${ti.color}`}></iconify-icon>
                          <span className="text-sm text-slate-600 truncate">{lesson.title}</span>
                          {lesson.is_free && (
                            <span className="px-1.5 py-0.5 bg-emerald-50 text-emerald-600 text-[10px] font-medium rounded">试看</span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 flex-shrink-0">
                          {lesson.video_duration > 0 && (
                            <span className="text-xs text-slate-400">{formatDuration(lesson.video_duration)}</span>
                          )}
                          <button
                            onClick={() => openEditLesson(lesson)}
                            className="text-slate-400 hover:text-indigo-600 transition-colors"
                            title="编辑课时"
                          >
                            <iconify-icon icon="lucide:edit-3" class="text-sm"></iconify-icon>
                          </button>
                          <button
                            onClick={() => setConfirmLesson(lesson.id)}
                            className="text-slate-300 hover:text-red-400 transition-colors"
                            title="删除课时"
                          >
                            <iconify-icon icon="lucide:x" class="text-sm"></iconify-icon>
                          </button>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="px-5 py-6 text-center text-sm text-slate-400">暂无课时</div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 添加/编辑章节弹窗 */}
      {showChapterModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => { setShowChapterModal(false); setEditingChapterId(null); }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-slate-800 mb-4">{editingChapterId ? '编辑章节' : '添加章节'}</h3>
            <div className="space-y-3">
              <input
                type="text"
                placeholder="章节名称"
                value={chapterForm.title}
                onChange={(e) => setChapterForm({ ...chapterForm, title: e.target.value })}
                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                autoFocus
              />
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">序号（用于排序）</label>
                <input
                  type="number"
                  min="1"
                  value={chapterForm.sort_order || ''}
                  onChange={(e) => setChapterForm({ ...chapterForm, sort_order: Number(e.target.value) || 0 })}
                  className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="例如：1"
                />
              </div>
              <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
                <input
                  type="checkbox"
                  checked={chapterForm.is_free}
                  onChange={(e) => setChapterForm({ ...chapterForm, is_free: e.target.checked })}
                  className="rounded border-gray-300 text-indigo-500 focus:ring-indigo-500"
                />
                免费章节
              </label>
            </div>
            <div className="flex justify-end gap-3 mt-5">
              <button onClick={() => { setShowChapterModal(false); setEditingChapterId(null); }} className="px-4 py-2 text-sm text-slate-600 hover:bg-gray-100 rounded-lg transition-colors">取消</button>
              <button onClick={submitChapter} className="px-4 py-2 bg-indigo-500 text-white text-sm font-medium rounded-lg hover:bg-indigo-600 transition-colors">
                {editingChapterId ? '保存修改' : '确认添加'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 添加/编辑课时弹窗 */}
      {showLessonModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => { setShowLessonModal(false); setEditingLessonId(null); }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-slate-800 mb-4">{editingLessonId ? '编辑课时' : '添加课时'}</h3>
            <div className="space-y-3">
              <input
                type="text"
                placeholder="课时名称"
                value={lessonForm.title}
                onChange={(e) => setLessonForm({ ...lessonForm, title: e.target.value })}
                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                autoFocus
              />
              <select
                value={lessonForm.lesson_type}
                onChange={(e) => setLessonForm({ ...lessonForm, lesson_type: e.target.value })}
                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="video">视频</option>
                <option value="document">图文</option>
                <option value="quiz">测验</option>
                <option value="resource">资料</option>
              </select>
              <input
                type="number"
                placeholder="视频时长（秒）"
                value={lessonForm.video_duration || ''}
                onChange={(e) => setLessonForm({ ...lessonForm, video_duration: Number(e.target.value) || 0 })}
                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
                <input
                  type="checkbox"
                  checked={lessonForm.is_free}
                  onChange={(e) => setLessonForm({ ...lessonForm, is_free: e.target.checked })}
                  className="rounded border-gray-300 text-indigo-500 focus:ring-indigo-500"
                />
                免费试看
              </label>
            </div>
            <div className="flex justify-end gap-3 mt-5">
              <button onClick={() => { setShowLessonModal(false); setEditingLessonId(null); }} className="px-4 py-2 text-sm text-slate-600 hover:bg-gray-100 rounded-lg transition-colors">取消</button>
              <button onClick={submitLesson} className="px-4 py-2 bg-indigo-500 text-white text-sm font-medium rounded-lg hover:bg-indigo-600 transition-colors">
                {editingLessonId ? '保存修改' : '确认添加'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 删除章节确认 */}
      <ConfirmDialog
        open={confirmChapter !== null}
        danger
        title="删除章节"
        confirmText="确认删除"
        loading={confirmLoading}
        message="确定删除该章节及其下所有课时吗？此操作不可撤销。"
        onConfirm={deleteChapter}
        onCancel={() => { setConfirmChapter(null); setConfirmLoading(false); }}
      />

      {/* 删除课时确认 */}
      <ConfirmDialog
        open={confirmLesson !== null}
        danger
        title="删除课时"
        confirmText="确认删除"
        loading={confirmLoading}
        message="确定删除该课时吗？此操作不可撤销。"
        onConfirm={deleteLesson}
        onCancel={() => { setConfirmLesson(null); setConfirmLoading(false); }}
      />
    </div>
  );
}
