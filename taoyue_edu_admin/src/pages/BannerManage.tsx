import { useCallback, useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { adminApi } from '../lib/api';

interface Banner {
  id: number;
  title: string;
  image_url: string;
  link_url: string;
  position: string;
  sort_order: number;
  is_active: boolean;
}

interface BannerForm {
  title: string;
  image_url: string;
  link_url: string;
  position: string;
  sort_order: number;
  is_active: boolean;
}

const emptyForm: BannerForm = {
  title: '',
  image_url: '',
  link_url: '',
  position: 'home',
  sort_order: 0,
  is_active: true,
};

const POSITION_OPTIONS = [
  { value: 'home', label: '首页轮播' },
  { value: 'courses', label: '课程页轮播' },
];

export default function BannerManage() {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<BannerForm>({ ...emptyForm });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const fetchBanners = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminApi.getBanners();
      setBanners((res as any).data || []);
    } catch {
      toast.error('加载轮播图失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBanners();
  }, [fetchBanners]);

  // 图片上传
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const res = await adminApi.uploadImage(file);
      setForm((prev) => ({ ...prev, image_url: res.data.url }));
      toast.success('图片上传成功');
    } catch {
      toast.error('图片上传失败');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  // 新增
  const openCreate = () => {
    setEditingId(null);
    setForm({ ...emptyForm });
    setShowModal(true);
  };

  // 编辑
  const openEdit = (b: Banner) => {
    setEditingId(b.id);
    setForm({
      title: b.title,
      image_url: b.image_url,
      link_url: b.link_url,
      position: b.position,
      sort_order: b.sort_order,
      is_active: b.is_active,
    });
    setShowModal(true);
  };

  // 提交
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.image_url) {
      toast.error('请上传轮播图片');
      return;
    }
    setSaving(true);
    try {
      if (editingId) {
        await adminApi.updateBanner(editingId, {
          title: form.title,
          image_url: form.image_url,
          link_url: form.link_url,
          position: form.position,
          sort_order: Number(form.sort_order) || 0,
          is_active: form.is_active,
        });
        toast.success('轮播图更新成功');
      } else {
        await adminApi.createBanner({
          title: form.title,
          image_url: form.image_url,
          link_url: form.link_url,
          position: form.position,
          sort_order: Number(form.sort_order) || 0,
          is_active: form.is_active,
        });
        toast.success('轮播图创建成功');
      }
      setShowModal(false);
      fetchBanners();
    } catch {
      toast.error('保存失败');
    } finally {
      setSaving(false);
    }
  };

  // 上下架
  const handleToggle = async (b: Banner) => {
    try {
      await adminApi.toggleBanner(b.id);
      toast.success(b.is_active ? '已下架' : '已上架');
      fetchBanners();
    } catch {
      toast.error('操作失败');
    }
  };

  // 删除
  const handleDelete = async (b: Banner) => {
    if (!window.confirm(`确定删除轮播图「${b.title || '未命名'}」吗？`)) return;
    try {
      await adminApi.deleteBanner(b.id);
      toast.success('删除成功');
      fetchBanners();
    } catch {
      toast.error('删除失败');
    }
  };

  // 排序调整
  const handleMove = async (b: Banner, dir: 'up' | 'down') => {
    const idx = banners.findIndex((x) => x.id === b.id);
    const targetIdx = dir === 'up' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= banners.length) return;
    const target = banners[targetIdx];
    try {
      await Promise.all([
        adminApi.updateBanner(b.id, { sort_order: target.sort_order }),
        adminApi.updateBanner(target.id, { sort_order: b.sort_order }),
      ]);
      fetchBanners();
    } catch {
      toast.error('排序调整失败');
    }
  };

  return (
    <div className="space-y-6">
      {/* 头部 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">轮播图管理</h1>
          <p className="text-sm text-slate-500 mt-1">管理首页及课程页的轮播图，支持上传、排序、上下架</p>
        </div>
        <button
          onClick={openCreate}
          className="px-4 py-2 bg-indigo-500 text-white text-sm font-medium rounded-lg hover:bg-indigo-600 transition-colors shadow-sm"
        >
          + 新增轮播图
        </button>
      </div>

      {/* 列表 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        {loading ? (
          <div className="p-10 text-center text-slate-400">加载中...</div>
        ) : banners.length === 0 ? (
          <div className="p-10 text-center text-slate-400">
            暂无轮播图，点击右上角「新增轮播图」创建
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {banners.map((b, idx) => (
              <div key={b.id} className="flex items-center gap-4 p-4 hover:bg-gray-50">
                {/* 预览图 */}
                <div className="w-40 h-20 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0 border border-gray-200">
                  {b.image_url ? (
                    <img
                      src={b.image_url.startsWith('/') ? b.image_url : b.image_url}
                      className="w-full h-full object-cover"
                      alt={b.title}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">无图</div>
                  )}
                </div>

                {/* 信息 */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-slate-800 truncate">
                      {b.title || '未命名轮播'}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs ${
                        b.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                      }`}
                    >
                      {b.is_active ? '已上架' : '已下架'}
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-600 text-xs">
                      {POSITION_OPTIONS.find((p) => p.value === b.position)?.label || b.position}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1 truncate">
                    跳转链接：{b.link_url || '无'} · 排序：{b.sort_order}
                  </p>
                </div>

                {/* 操作 */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => handleMove(b, 'up')}
                    disabled={idx === 0}
                    className="px-2 py-1 text-xs text-slate-500 hover:bg-gray-100 rounded disabled:opacity-30"
                    title="上移"
                  >
                    ↑
                  </button>
                  <button
                    onClick={() => handleMove(b, 'down')}
                    disabled={idx === banners.length - 1}
                    className="px-2 py-1 text-xs text-slate-500 hover:bg-gray-100 rounded disabled:opacity-30"
                    title="下移"
                  >
                    ↓
                  </button>
                  <button
                    onClick={() => handleToggle(b)}
                    className={`px-3 py-1.5 text-xs rounded-lg transition-colors ${
                      b.is_active
                        ? 'text-amber-600 hover:bg-amber-50'
                        : 'text-green-600 hover:bg-green-50'
                    }`}
                  >
                    {b.is_active ? '下架' : '上架'}
                  </button>
                  <button
                    onClick={() => openEdit(b)}
                    className="px-3 py-1.5 text-xs text-indigo-600 hover:bg-indigo-50 rounded-lg"
                  >
                    编辑
                  </button>
                  <button
                    onClick={() => handleDelete(b)}
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
            className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-slate-800 mb-4">
              {editingId ? '编辑轮播图' : '新增轮播图'}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* 图片上传 */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  轮播图片 <span className="text-red-400">*</span>
                  <span className="text-xs text-slate-400 ml-1">（建议尺寸 750×300 或 16:5）</span>
                </label>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
                <div
                  onClick={() => fileRef.current?.click()}
                  className={`w-full h-36 rounded-lg border-2 border-dashed flex items-center justify-center cursor-pointer transition-colors ${
                    form.image_url
                      ? 'border-transparent'
                      : 'border-gray-300 hover:border-indigo-400 hover:bg-indigo-50'
                  }`}
                >
                  {uploading ? (
                    <span className="text-slate-400 text-sm">上传中...</span>
                  ) : form.image_url ? (
                    <img
                      src={form.image_url}
                      className="w-full h-full object-cover rounded-lg"
                      alt="轮播预览"
                    />
                  ) : (
                    <span className="text-slate-400 text-sm">点击上传轮播图片</span>
                  )}
                </div>
                {form.image_url && (
                  <div className="flex gap-2 mt-2">
                    <button
                      type="button"
                      onClick={() => fileRef.current?.click()}
                      className="text-xs text-indigo-600 hover:underline"
                    >
                      重新上传
                    </button>
                    <button
                      type="button"
                      onClick={() => setForm((p) => ({ ...p, image_url: '' }))}
                      className="text-xs text-red-500 hover:underline"
                    >
                      移除
                    </button>
                  </div>
                )}
              </div>

              {/* 标题 */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">标题</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                  placeholder="例如：AI大模型实战训练营"
                  className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* 跳转链接 */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">跳转链接</label>
                <input
                  type="text"
                  value={form.link_url}
                  onChange={(e) => setForm((p) => ({ ...p, link_url: e.target.value }))}
                  placeholder="/courses/llm-app 或 https://外部链接（选填）"
                  className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* 位置 + 排序 */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">展示位置</label>
                  <select
                    value={form.position}
                    onChange={(e) => setForm((p) => ({ ...p, position: e.target.value }))}
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-slate-700"
                  >
                    {POSITION_OPTIONS.map((p) => (
                      <option key={p.value} value={p.value}>{p.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">排序</label>
                  <input
                    type="number"
                    value={form.sort_order}
                    onChange={(e) => setForm((p) => ({ ...p, sort_order: Number(e.target.value) }))}
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-slate-700"
                  />
                </div>
              </div>

              {/* 上架开关 */}
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={(e) => setForm((p) => ({ ...p, is_active: e.target.checked }))}
                  className="w-4 h-4 accent-indigo-500"
                />
                <span className="text-sm text-slate-700">立即上架</span>
              </label>

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
                  {saving ? '保存中...' : editingId ? '保存修改' : '创建'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
