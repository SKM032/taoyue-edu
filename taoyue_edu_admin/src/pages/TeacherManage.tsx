import { useCallback, useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { Editor, Toolbar } from '@wangeditor/editor-for-react';
import { IDomEditor, IEditorConfig, IToolbarConfig } from '@wangeditor/editor';
import { adminApi } from '../lib/api';

interface Teacher {
  id: number;
  name: string;
  avatar: string;
  title: string;
  description: string;
  course_count: number;
  student_count: number;
  rating: number;
  status: string;
}

interface TeacherForm {
  name: string;
  avatar: string;
  title: string;
  description: string;
  rating: number;
  status: string;
}

const emptyForm: TeacherForm = {
  name: '',
  avatar: '',
  title: '',
  description: '',
  rating: 5.0,
  status: 'active',
};

export default function TeacherManage() {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<TeacherForm>({ ...emptyForm });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // 富文本编辑器
  const [editor, setEditor] = useState<IDomEditor | null>(null);
  const [editorHtml, setEditorHtml] = useState('');

  const toolbarConfig: Partial<IToolbarConfig> = {};
  const editorConfig: Partial<IEditorConfig> = {
    placeholder: '请输入讲师简介，支持富文本排版与插入图片...',
    MENU_CONF: {
      uploadImage: {
        customUpload: async (file: File, insertFn: (url: string, alt: string, href: string) => void) => {
          try {
            const res = await adminApi.uploadImage(file);
            insertFn(res.data.url, file.name, res.data.url);
          } catch {
            toast.error('图片上传失败');
          }
        },
      },
    },
  };

  const fetchTeachers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminApi.getTeachers();
      setTeachers((res as any).data || []);
    } catch {
      toast.error('加载讲师列表失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTeachers();
  }, [fetchTeachers]);

  // 编辑器销毁
  useEffect(() => {
    return () => {
      if (editor == null) return;
      editor.destroy();
      setEditor(null);
    };
  }, [editor]);

  // 头像上传
  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const res = await adminApi.uploadImage(file);
      setForm((prev) => ({ ...prev, avatar: res.data.url }));
      toast.success('头像上传成功');
    } catch {
      toast.error('头像上传失败');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  // 新增
  const openCreate = () => {
    setEditingId(null);
    setForm({ ...emptyForm });
    setEditorHtml('');
    setShowModal(true);
  };

  // 编辑
  const openEdit = async (t: Teacher) => {
    setEditingId(t.id);
    setForm({
      name: t.name,
      avatar: t.avatar,
      title: t.title,
      description: t.description,
      rating: t.rating,
      status: t.status,
    });
    setEditorHtml(t.description || '');
    setShowModal(true);
    // 加载富文本简介（若列表返回的 description 是纯文本/HTML，直接用）
  };

  // 提交
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error('请输入讲师姓名');
      return;
    }
    setSaving(true);
    const payload: Record<string, any> = {
      name: form.name.trim(),
      avatar: form.avatar,
      title: form.title.trim(),
      description: editorHtml || form.description,
      rating: Number(form.rating) || 5.0,
      status: form.status,
    };
    try {
      if (editingId) {
        await adminApi.updateTeacher(editingId, payload);
        toast.success('讲师更新成功');
      } else {
        await adminApi.createTeacher(payload);
        toast.success('讲师创建成功');
      }
      setShowModal(false);
      fetchTeachers();
    } catch {
      toast.error('保存失败');
    } finally {
      setSaving(false);
    }
  };

  // 删除
  const handleDelete = async (t: Teacher) => {
    if (!window.confirm(`确定删除讲师「${t.name}」吗？`)) return;
    try {
      await adminApi.deleteTeacher(t.id);
      toast.success('删除成功');
      fetchTeachers();
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || '删除失败');
    }
  };

  // 切换状态
  const handleToggleStatus = async (t: Teacher) => {
    const next = t.status === 'active' ? 'inactive' : 'active';
    try {
      await adminApi.updateTeacher(t.id, { status: next });
      toast.success(next === 'active' ? '已启用' : '已停用');
      fetchTeachers();
    } catch {
      toast.error('操作失败');
    }
  };

  return (
    <div className="space-y-6">
      {/* 头部 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">讲师管理</h1>
          <p className="text-sm text-slate-500 mt-1">管理讲师信息、头像与简介</p>
        </div>
        <button
          onClick={openCreate}
          className="px-4 py-2 bg-indigo-500 text-white text-sm font-medium rounded-lg hover:bg-indigo-600 transition-colors shadow-sm"
        >
          + 新增讲师
        </button>
      </div>

      {/* 列表 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="p-10 text-center text-slate-400">加载中...</div>
        ) : teachers.length === 0 ? (
          <div className="p-10 text-center text-slate-400">
            暂无讲师，点击右上角「新增讲师」创建
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {teachers.map((t) => (
              <div key={t.id} className="flex items-center gap-4 p-4 hover:bg-gray-50">
                {/* 头像 */}
                <div className="w-14 h-14 rounded-full overflow-hidden bg-indigo-50 flex-shrink-0 border border-gray-200">
                  {t.avatar ? (
                    <img src={t.avatar} className="w-full h-full object-cover" alt={t.name} />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-indigo-100 text-indigo-600 text-lg font-bold">
                      {t.name ? t.name[0] : '师'}
                    </div>
                  )}
                </div>

                {/* 信息 */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-slate-800">{t.name}</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs ${
                      t.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                    }`}>
                      {t.status === 'active' ? '启用中' : '已停用'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">{t.title || '暂无头衔'}</p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {t.course_count} 门课程 · {t.student_count} 名学员 · 评分 {t.rating}
                  </p>
                </div>

                {/* 操作 */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => handleToggleStatus(t)}
                    className={`px-3 py-1.5 text-xs rounded-lg transition-colors ${
                      t.status === 'active'
                        ? 'text-amber-600 hover:bg-amber-50'
                        : 'text-green-600 hover:bg-green-50'
                    }`}
                  >
                    {t.status === 'active' ? '停用' : '启用'}
                  </button>
                  <button
                    onClick={() => openEdit(t)}
                    className="px-3 py-1.5 text-xs text-indigo-600 hover:bg-indigo-50 rounded-lg"
                  >
                    编辑
                  </button>
                  <button
                    onClick={() => handleDelete(t)}
                    className="px-3 py-1.5 text-xs text-red-500 hover:bg-red-50 rounded-lg"
                  >
                    删除
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 新增/编辑弹窗 */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 p-6 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-slate-800 mb-4">
              {editingId ? '编辑讲师' : '新增讲师'}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* 头像上传 */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">讲师头像</label>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarUpload}
                  className="hidden"
                />
                <div className="flex items-center gap-4">
                  <div
                    onClick={() => fileRef.current?.click()}
                    className="w-20 h-20 rounded-full overflow-hidden cursor-pointer border-2 border-dashed border-gray-300 hover:border-indigo-400 hover:bg-indigo-50 flex items-center justify-center transition-colors"
                  >
                    {uploading ? (
                      <span className="text-slate-400 text-xs">上传中</span>
                    ) : form.avatar ? (
                      <img src={form.avatar} className="w-full h-full object-cover" alt="头像预览" />
                    ) : (
                      <span className="text-slate-400 text-xs">上传头像</span>
                    )}
                  </div>
                  <div className="text-xs text-slate-400">
                    <p>建议 200×200 正方形</p>
                    {form.avatar && (
                      <button
                        type="button"
                        onClick={() => setForm((p) => ({ ...p, avatar: '' }))}
                        className="text-red-500 hover:underline mt-1"
                      >
                        移除头像
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* 姓名 + 头衔 */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    姓名 <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                    placeholder="讲师姓名"
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">头衔</label>
                  <input
                    type="text"
                    value={form.title}
                    onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                    placeholder="如：高级算法工程师"
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* 评分 + 状态 */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">评分</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="5"
                    value={form.rating}
                    onChange={(e) => setForm((p) => ({ ...p, rating: Number(e.target.value) || 5.0 }))}
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">状态</label>
                  <select
                    value={form.status}
                    onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))}
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-slate-700"
                  >
                    <option value="active">启用</option>
                    <option value="inactive">停用</option>
                  </select>
                </div>
              </div>

              {/* 富文本简介 */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  讲师简介（富文本）
                </label>
                <div className="border border-gray-200 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-indigo-500 transition-shadow bg-white">
                  <Toolbar
                    editor={editor}
                    defaultConfig={toolbarConfig}
                    mode="default"
                    className="border-b border-gray-200"
                  />
                  <Editor
                    defaultConfig={editorConfig}
                    value={editorHtml}
                    onChange={(editor) => setEditorHtml(editor.getHtml())}
                    mode="default"
                    onCreated={setEditor}
                    style={{ height: '300px', overflowY: 'hidden' }}
                  />
                </div>
              </div>

              {/* 按钮 */}
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-sm text-slate-600 hover:bg-gray-100 rounded-lg"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={saving || uploading}
                  className="px-5 py-2 bg-indigo-500 text-white text-sm font-medium rounded-lg hover:bg-indigo-600 disabled:opacity-60"
                >
                  {saving ? '保存中...' : editingId ? '保存修改' : '创建讲师'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
