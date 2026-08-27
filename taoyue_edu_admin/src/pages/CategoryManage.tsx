import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { adminApi } from '../lib/api';

const emptyForm = { name: '', slug: '', icon: '', description: '', parent_id: '' as string | number, sort_order: 0 };

// 独立的分类表单弹窗子组件（memo 隔离，避免父组件重渲染导致输入框重建/失焦）
const CategoryFormModal = memo(function CategoryFormModal({
  editingId, form, parents, saving,
  onChange, onClose, onSubmit,
}: {
  editingId: number | null;
  form: typeof emptyForm;
  parents: Category[];
  saving: boolean;
  onChange: (patch: Partial<typeof emptyForm>) => void;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
}) {
  // 记录鼠标按下时是否在遮罩层上，避免"在输入框选中文字拖到遮罩层抬起"误关闭弹窗
  const mouseDownOnMask = useRef(false);
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onMouseDown={(e) => {
        mouseDownOnMask.current = e.target === e.currentTarget;
      }}
      onMouseUp={(e) => {
        // 只有"按下和抬起都在遮罩层"才关闭，拖动选中文字不会误触发
        if (mouseDownOnMask.current && e.target === e.currentTarget) {
          onClose();
        }
        mouseDownOnMask.current = false;
      }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-lg font-semibold text-slate-800 mb-4">
          {editingId ? '编辑分类' : '新建分类'}
        </h3>
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">上级分类</label>
            <select
              value={String(form.parent_id)}
              onChange={(e) => onChange({ parent_id: e.target.value === '' ? '' : Number(e.target.value) })}
              className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">顶级分类</option>
              {parents.filter((p) => p.id !== editingId).map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
            <p className="text-xs text-slate-400 mt-1">选择上级分类则作为其子分类，仅支持两级</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">分类名称 <span className="text-red-400">*</span></label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => onChange({ name: e.target.value })}
              placeholder="例如：IT技能学院"
              className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">唯一标识 (slug)</label>
            <input
              type="text"
              value={form.slug}
              onChange={(e) => onChange({ slug: e.target.value })}
              placeholder="英文短横线，如 it-academy（留空自动生成）"
              className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">图标 (emoji)</label>
            <input
              type="text"
              value={form.icon}
              onChange={(e) => onChange({ icon: e.target.value })}
              placeholder="例如：💻（选填）"
              className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">排序序号 <span className="text-xs text-slate-400">（数字越小越靠前，用于控制显示顺序）</span></label>
            <input
              type="number"
              value={form.sort_order}
              onChange={(e) => onChange({ sort_order: Number(e.target.value) || 0 })}
              placeholder="例如：1"
              className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">描述</label>
            <textarea
              value={form.description}
              onChange={(e) => onChange({ description: e.target.value })}
              rows={2}
              placeholder="分类描述（选填）"
              className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-slate-600 hover:bg-gray-100 rounded-lg transition-colors">
              取消
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 bg-indigo-500 text-white text-sm font-medium rounded-lg hover:bg-indigo-600 transition-colors shadow-sm disabled:opacity-60"
            >
              {saving ? '保存中...' : editingId ? '保存修改' : '创建分类'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
});

interface Category {
  id: number;
  name: string;
  slug: string;
  icon: string;
  description: string;
  sort_order: number;
  parent_id: number | null;
  is_parent: boolean;
  course_count: number;
  created_at?: string;
}

export default function CategoryManage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);

  // 默认全部折叠
  const [expanded, setExpanded] = useState<Set<number>>(new Set());

  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const fetchCategories = async () => {
    setLoading(true);
    try {
      const res = await adminApi.getAdminCategories();
      const items: Category[] = res.data.items || [];
      setCategories(items);
      // 保留用户当前的展开状态，不自动展开
      setExpanded((prev) => {
        const validIds = new Set(items.filter((c) => c.is_parent).map((c) => c.id));
        const next = new Set<number>();
        prev.forEach((id) => { if (validIds.has(id)) next.add(id); });
        return next;
      });
    } catch {
      setResult({ type: 'error', title: '加载失败', message: '获取分类列表失败' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchCategories(); }, []);

  const { parents, childrenMap } = useMemo(() => {
    const parents = categories.filter((c) => c.is_parent);
    const childrenMap: Record<number, Category[]> = {};
    categories.filter((c) => !c.is_parent).forEach((c) => {
      const pid = c.parent_id ?? 0;
      if (!childrenMap[pid]) childrenMap[pid] = [];
      childrenMap[pid].push(c);
    });
    return { parents, childrenMap };
  }, [categories]);

  const toggleExpand = (id: number) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const expandAll = () => setExpanded(new Set(parents.map((p) => p.id)));
  const collapseAll = () => setExpanded(new Set());

  const openCreate = (parentId: number | null = null) => {
    setEditingId(null);
    setForm({ ...emptyForm, parent_id: parentId ?? '' });
    setShowModal(true);
  };

  const openEdit = (cat: Category) => {
    setEditingId(cat.id);
    setForm({
      name: cat.name,
      slug: cat.slug,
      icon: cat.icon || '',
      description: cat.description || '',
      parent_id: cat.parent_id ?? '',
      sort_order: cat.sort_order || 0,
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { setResult({ type: 'error', title: '提示', message: '请输入分类名称' }); return; }
    setSaving(true);
    try {
      const payload: Record<string, any> = {
        name: form.name,
        slug: form.slug,
        icon: form.icon,
        description: form.description,
        parent_id: form.parent_id === '' || form.parent_id === null ? null : Number(form.parent_id),
        sort_order: Number(form.sort_order) || 0,
      };
      if (editingId) {
        await adminApi.updateCategory(editingId, payload);
        setResult({ type: 'success', title: '操作成功', message: `分类「${form.name}」更新成功` });
      } else {
        await adminApi.createCategory(payload);
        setResult({ type: 'success', title: '操作成功', message: `分类「${form.name}」创建成功` });
      }
      setShowModal(false);
      fetchCategories();
    } catch (err: any) {
      setResult({ type: 'error', title: '操作失败', message: err.response?.data?.detail || '保存失败，请稍后重试' });
    } finally {
      setSaving(false);
    }
  };

  // 删除确认 / 结果弹窗状态
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [result, setResult] = useState<{ type: 'success' | 'error'; title: string; message: string } | null>(null);

  const requestDelete = (cat: Category) => {
    if (cat.course_count > 0) {
      // 有课程不能删，直接弹结果
      setResult({ type: 'error', title: '无法删除', message: `该分类下有 ${cat.course_count} 门课程，无法删除` });
      return;
    }
    setDeleteTarget(cat);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await adminApi.deleteCategory(deleteTarget.id);
      setDeleteTarget(null);
      setResult({ type: 'success', title: '删除成功', message: `分类「${deleteTarget.name}」已删除` });
      fetchCategories();
    } catch (err: any) {
      setDeleteTarget(null);
      setResult({ type: 'error', title: '删除失败', message: err.response?.data?.detail || '删除失败，请稍后重试' });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* 页头 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-800">分类管理</h1>
          <p className="text-sm text-slate-500 mt-1">
            管理课程分类（支持两级层级），共 {categories.length} 个分类
          </p>
        </div>
        <div className="flex items-center gap-2">
          {parents.length > 0 && (
            <>
              <button
                onClick={expandAll}
                className="px-3 py-2 text-sm text-slate-500 hover:bg-gray-100 rounded-lg transition-colors flex items-center gap-1"
                title="全部展开"
              >
                <iconify-icon icon="lucide:chevrons-down-up" class="text-base"></iconify-icon>
                展开
              </button>
              <button
                onClick={collapseAll}
                className="px-3 py-2 text-sm text-slate-500 hover:bg-gray-100 rounded-lg transition-colors flex items-center gap-1"
                title="全部折叠"
              >
                <iconify-icon icon="lucide:chevrons-up-down" class="text-base"></iconify-icon>
                折叠
              </button>
            </>
          )}
          <button
            onClick={() => openCreate(null)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-500 text-white rounded-lg text-sm font-medium hover:bg-indigo-600 transition-colors shadow-sm"
          >
            <iconify-icon icon="lucide:plus" class="text-base"></iconify-icon>
            新建顶级分类
          </button>
        </div>
      </div>

      {/* 手风琴式分类列表 */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <svg className="animate-spin h-6 w-6 text-indigo-500" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
          </svg>
        </div>
      ) : parents.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 flex flex-col items-center justify-center py-16 text-slate-400">
          <iconify-icon icon="lucide:folder-open" class="text-5xl mb-3 opacity-30"></iconify-icon>
          <p className="text-sm">暂无分类，点击"新建顶级分类"开始创建</p>
        </div>
      ) : (
        <div className="space-y-3">
          {parents.map((parent) => {
            const children = childrenMap[parent.id] || [];
            const isOpen = expanded.has(parent.id);
            const hasChildren = children.length > 0;
            return (
              <div
                key={parent.id}
                className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:border-indigo-200 transition-colors"
              >
                {/* 顶级分类头部（可点击展开） */}
                <div
                  onClick={() => hasChildren && toggleExpand(parent.id)}
                  className={`flex items-center justify-between px-4 py-3 cursor-pointer select-none ${hasChildren ? '' : 'cursor-default'} ${isOpen ? 'border-b border-gray-100' : ''}`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {/* 折叠图标 */}
                    {hasChildren ? (
                      <iconify-icon
                        icon="lucide:chevron-down"
                        class={`text-base text-slate-400 transition-transform duration-200 ${isOpen ? '' : '-rotate-90'}`}
                      ></iconify-icon>
                    ) : (
                      <span className="w-4" />
                    )}
                    {/* 图标 */}
                    <span className="text-2xl flex-shrink-0">{parent.icon || '📁'}</span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="px-1.5 py-0.5 bg-indigo-100 text-indigo-600 text-[10px] font-bold rounded">顶级</span>
                        <h3 className="font-bold text-slate-800 truncate">{parent.name}</h3>
                        <span className="text-xs text-slate-400 truncate">({parent.slug})</span>
                      </div>
                      {parent.description && (
                        <p className="text-xs text-slate-500 mt-0.5 truncate">{parent.description}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                    <span className="inline-flex items-center gap-1 text-xs text-emerald-600 font-medium">
                      <iconify-icon icon="lucide:book-open" class="text-xs"></iconify-icon>
                      {parent.course_count}
                    </span>
                    {hasChildren && (
                      <span className="inline-flex items-center gap-1 text-xs text-slate-500">
                        <iconify-icon icon="lucide:folder" class="text-xs"></iconify-icon>
                        {children.length}
                      </span>
                    )}
                    <button
                      onClick={() => openCreate(parent.id)}
                      className="px-2.5 py-1.5 text-xs font-medium text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors flex items-center gap-1"
                      title="添加子分类"
                    >
                      <iconify-icon icon="lucide:plus" class="text-sm"></iconify-icon>
                      <span className="hidden md:inline">添加子分类</span>
                    </button>
                    <button
                      onClick={() => openEdit(parent)}
                      className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                      title="编辑"
                    >
                      <iconify-icon icon="lucide:edit-3" class="text-sm"></iconify-icon>
                    </button>
                    <button
                      onClick={() => requestDelete(parent)}
                      className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                      title="删除"
                    >
                      <iconify-icon icon="lucide:trash-2" class="text-sm"></iconify-icon>
                    </button>
                  </div>
                </div>

                {/* 子分类折叠区域 */}
                {hasChildren && (
                  <div
                    className={`grid transition-all duration-300 ease-in-out ${
                      isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
                    }`}
                  >
                    <div className="overflow-hidden">
                      <table className="w-full">
                        <thead className="bg-slate-50 border-y border-gray-100">
                          <tr className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                            <th className="pl-12 pr-4 py-2.5 text-left">子分类名称</th>
                            <th className="px-4 py-2.5 text-left hidden md:table-cell">slug</th>
                            <th className="px-4 py-2.5 text-left hidden lg:table-cell">描述</th>
                            <th className="px-4 py-2.5 text-left hidden md:table-cell">排序</th>
                            <th className="px-4 py-2.5 text-center">课程数</th>
                            <th className="px-4 py-2.5 text-right">操作</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {children.map((child) => (
                            <tr key={child.id} className="hover:bg-indigo-50/30 transition-colors group">
                              <td className="pl-12 pr-4 py-3 relative">
                                {/* 树状连接线：从父级延伸到子分类 */}
                                <span className="absolute left-3 top-0 bottom-0 w-px bg-gray-200"></span>
                                <span className="absolute left-3 top-1/2 w-4 h-px bg-gray-200"></span>
                                <div className="flex items-center gap-2">
                                  <iconify-icon icon="lucide:corner-down-right" class="text-indigo-300 text-base flex-shrink-0"></iconify-icon>
                                  <span className="text-base flex-shrink-0">{child.icon || '📄'}</span>
                                  <span className="font-medium text-slate-700 text-sm">{child.name}</span>
                                </div>
                              </td>
                              <td className="px-4 py-3 text-xs text-slate-400 hidden md:table-cell">{child.slug}</td>
                              <td className="px-4 py-3 text-xs text-slate-500 hidden lg:table-cell max-w-[200px] truncate">
                                {child.description || '—'}
                              </td>
                              <td className="px-4 py-3 text-xs text-slate-400 hidden md:table-cell">{child.sort_order}</td>
                              <td className="px-4 py-3 text-center">
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 text-emerald-600 text-xs font-medium rounded-full">
                                  {child.course_count}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-right">
                                <div className="flex items-center justify-end gap-1">
                                  <button
                                    onClick={() => openEdit(child)}
                                    className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                                    title="编辑"
                                  >
                                    <iconify-icon icon="lucide:edit-3" class="text-sm"></iconify-icon>
                                  </button>
                                  <button
                                    onClick={() => requestDelete(child)}
                                    className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                                    title="删除"
                                  >
                                    <iconify-icon icon="lucide:trash-2" class="text-sm"></iconify-icon>
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* 新建/编辑弹窗（memo 子组件，避免重渲染导致输入框失焦） */}
      {showModal && (
        <CategoryFormModal
          editingId={editingId}
          form={form}
          parents={parents}
          saving={saving}
          onChange={(patch) => setForm((prev) => ({ ...prev, ...patch }))}
          onClose={() => setShowModal(false)}
          onSubmit={handleSubmit}
        />
      )}

      {/* 删除确认对话框 */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => !deleting && setDeleteTarget(null)}>
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden animate-[fadeIn_0.2s_ease-out]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 头部 */}
            <div className="flex items-center gap-3 px-6 pt-6 pb-4">
              <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center flex-shrink-0">
                <iconify-icon icon="lucide:trash-2" class="text-red-500 text-xl"></iconify-icon>
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-800">删除分类</h3>
                <p className="text-sm text-slate-500 mt-0.5">此操作不可撤销，请谨慎操作</p>
              </div>
            </div>

            {/* 内容 */}
            <div className="px-6 py-4">
              <div className="bg-slate-50 rounded-lg px-4 py-3 border border-slate-100">
                <p className="text-sm text-slate-700">
                  确定要删除分类
                  <span className="font-semibold text-slate-900">「{deleteTarget.name}」</span>
                  吗？
                </p>
                <p className="text-xs text-slate-500 mt-1.5">
                  该分类下有 <span className="font-medium text-slate-700">{deleteTarget.course_count}</span> 门课程
                </p>
              </div>
            </div>

            {/* 底部操作 */}
            <div className="flex items-center justify-end gap-3 px-6 py-5 bg-slate-50 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
                className="px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-200 rounded-lg transition-colors disabled:opacity-50"
              >
                取消
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="px-5 py-2.5 bg-red-500 text-white text-sm font-medium rounded-lg hover:bg-red-600 transition-colors shadow-sm flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {deleting ? (
                  <>
                    <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                    </svg>
                    删除中...
                  </>
                ) : (
                  <>
                    <iconify-icon icon="lucide:trash-2" class="text-base"></iconify-icon>
                    确认删除
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 删除结果弹窗（遮罩层，无视觉跳动） */}
      {result && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setResult(null)}>
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 p-6 text-center animate-[fadeIn_0.2s_ease-out]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className={`mx-auto mb-4 w-16 h-16 rounded-full flex items-center justify-center ${
              result.type === 'success' ? 'bg-emerald-50' : 'bg-red-50'
            }`}>
              <iconify-icon
                icon={result.type === 'success' ? 'lucide:check-circle-2' : 'lucide:alert-triangle'}
                class={`text-3xl ${result.type === 'success' ? 'text-emerald-500' : 'text-red-500'}`}
              ></iconify-icon>
            </div>
            <h3 className={`text-lg font-bold ${result.type === 'success' ? 'text-slate-800' : 'text-red-600'}`}>
              {result.title}
            </h3>
            <p className="text-sm text-slate-500 mt-2">{result.message}</p>
            <button
              type="button"
              onClick={() => setResult(null)}
              className={`mt-6 w-full py-2.5 text-white text-sm font-medium rounded-lg transition-colors ${
                result.type === 'success' ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-red-500 hover:bg-red-600'
              }`}
            >
              知道了
            </button>
          </div>
        </div>
      )}
    </div>
  );
}