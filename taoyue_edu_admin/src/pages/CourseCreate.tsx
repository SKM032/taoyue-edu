import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Editor, Toolbar } from '@wangeditor/editor-for-react';
import { IDomEditor, IEditorConfig, IToolbarConfig } from '@wangeditor/editor';
import { adminApi } from '../lib/api';
import CategoryTreeSelect from '../components/CategoryTreeSelect';
import InlineToast from '../components/InlineToast';

// 工具栏配置（排除视频，课程简介以图文为主；启用全屏便于长文编辑）
const toolbarConfig: Partial<IToolbarConfig> = {
  excludeKeys: ['group-video'],
};

const difficultyLabels: Record<string, string> = {
  beginner: '初级',
  intermediate: '中级',
  advanced: '高级',
};

const courseTypeLabels: Record<string, string> = {
  recorded: '系统录播',
  live: '直播班',
  bootcamp: '训练营',
  private: '私教陪跑',
};

export default function CourseCreate() {
  const { id } = useParams();
  const isEdit = !!id;
  const [loading, setLoading] = useState(false);
  const [formLoading, setFormLoading] = useState(isEdit);
  const [categories, setCategories] = useState<any[]>([]);
  const [coverUrl, setCoverUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [toast, setToast] = useState('');
  // 多步骤向导：编辑模式含"内容编排"步骤，新建模式创建后直接跳转内容编排
  const steps = isEdit ? ['基本信息', '课程简介', '内容编排', '发布'] : ['基本信息', '课程简介', '发布'];
  const [currentStep, setCurrentStep] = useState(0);
  const [editorMounted, setEditorMounted] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  // 富文本编辑器
  const [editor, setEditor] = useState<IDomEditor | null>(null);
  const [editorHtml, setEditorHtml] = useState('');

  const [form, setForm] = useState({
    title: '',
    subtitle: '',
    category_id: '',
    difficulty: 'beginner',
    course_type: 'recorded',
    price: 0,
    original_price: 0,
  });

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2500);
  };

  // 编辑器配置（图片上传走后端已有上传接口）
  const editorConfig: Partial<IEditorConfig> = {
    placeholder: '请输入课程简介，支持富文本排版与插入图片...',
    MENU_CONF: {
      uploadImage: {
        async customUpload(file: File, insertFn: (url: string, alt?: string, href?: string) => void) {
          try {
            const res = await adminApi.uploadImage(file);
            insertFn(res.data.url, file.name, '');
          } catch {
            showToast('图片上传失败，请重试');
          }
        },
      },
    },
  };

  // 组件卸载时销毁编辑器
  useEffect(() => {
    return () => {
      if (editor == null) return;
      editor.destroy();
      setEditor(null);
    };
  }, [editor]);

  // 加载分类 + 编辑模式下加载课程详情
  useEffect(() => {
    adminApi.getCategories()
      .then((res) => setCategories(res.data || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!isEdit || !id) return;
    setFormLoading(true);
    adminApi.getCourseDetail(Number(id))
      .then((res) => {
        const c = res.data;
        setForm({
          title: c.title || '',
          subtitle: c.subtitle || '',
          // category_id 回显：优先用 category_id，缺失时回退到 category.id
          category_id: c.category_id
            ? String(c.category_id)
            : (c.category?.id != null ? String(c.category.id) : ''),
          difficulty: c.difficulty || 'beginner',
          course_type: c.course_type || 'recorded',
          price: Number(c.price || 0),
          original_price: Number(c.original_price || 0),
        });
        setEditorHtml(c.description || '');
        setCoverUrl(c.cover || '');
      })
      .catch((err: any) => showToast(err.response?.data?.detail || '课程加载失败'))
      .finally(() => setFormLoading(false));
  }, [id]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const res = await adminApi.uploadImage(file);
      setCoverUrl(res.data.url);
      showToast('封面上传成功');
    } catch {
      showToast('上传失败');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) { showToast('请输入课程名称'); return; }
    if (!form.category_id) { showToast('请选择课程分类'); return; }
    setLoading(true);
    try {
      const payload = {
        ...form,
        category_id: form.category_id ? Number(form.category_id) : undefined,
        cover: coverUrl,
        price: form.price || 0,
        original_price: form.original_price || 0,
        description: editorHtml,
      };
      if (isEdit) {
        await adminApi.updateCourse(Number(id), payload);
        showToast('课程更新成功');
        navigate('/courses');
      } else {
        const res = await adminApi.createCourse(payload);
        showToast('课程创建成功');
        navigate(`/courses/${res.data.id}/content`);
      }
    } catch (err: any) {
      showToast(err.response?.data?.detail || (isEdit ? '更新失败' : '创建失败'));
    } finally {
      setLoading(false);
    }
  };

  const updateField = (field: string, value: any) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleNext = () => {
    if (currentStep === 0) {
      if (!form.title.trim()) { showToast('请输入课程名称'); return; }
      if (!form.category_id) { showToast('请选择课程分类'); return; }
    }
    setCurrentStep((s) => Math.min(s + 1, steps.length - 1));
  };

  const handlePrev = () => {
    setCurrentStep((s) => Math.max(s - 1, 0));
  };

  const categoryName = (() => {
    if (!form.category_id) return '-';
    const flat: any[] = [];
    const walk = (nodes: any[]) => {
      nodes.forEach((c) => {
        flat.push(c);
        if (Array.isArray(c.children)) walk(c.children);
      });
    };
    walk(categories);
    const found = flat.find((c) => String(c.id) === form.category_id);
    return found?.name || '-';
  })();

  // 简介纯文本预览（截断显示）
  const descriptionPreview = editorHtml
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 160);

  // ==================== 步骤渲染 ====================

  const renderBasicInfo = () => (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {/* 封面 */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1.5">课程封面</label>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          onChange={handleUpload}
          className="hidden"
        />
        <div
          onClick={() => fileRef.current?.click()}
          className="w-full aspect-[4/3] border-2 border-dashed border-gray-200 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:border-indigo-300 transition-colors overflow-hidden relative"
          style={{
            backgroundImage: coverUrl ? `url(${coverUrl})` : undefined,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        >
          {uploading && (
            <div className="absolute inset-0 bg-white/80 flex items-center justify-center">
              <svg className="animate-spin h-6 w-6 text-indigo-500" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
              </svg>
            </div>
          )}
          {!coverUrl && !uploading && (
            <>
              <iconify-icon icon="lucide:upload" class="text-3xl text-slate-300 mb-2"></iconify-icon>
              <p className="text-sm text-slate-400">点击上传封面</p>
              <p className="text-xs text-slate-300 mt-1">建议 750x1000px</p>
            </>
          )}
        </div>
      </div>

      {/* 基本信息 */}
      <div className="md:col-span-2 space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">课程名称 <span className="text-red-400">*</span></label>
          <input
            type="text"
            value={form.title}
            onChange={(e) => updateField('title', e.target.value)}
            placeholder="请输入课程名称"
            maxLength={200}
            className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">副标题</label>
          <input
            type="text"
            value={form.subtitle}
            onChange={(e) => updateField('subtitle', e.target.value)}
            placeholder="课程副标题（选填）"
            maxLength={300}
            className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">课程分类 <span className="text-red-400">*</span></label>
            <CategoryTreeSelect
              categories={categories}
              value={form.category_id}
              onChange={(id) => updateField('category_id', id)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">课程难度</label>
            <select
              value={form.difficulty}
              onChange={(e) => updateField('difficulty', e.target.value)}
              className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="beginner">初级</option>
              <option value="intermediate">中级</option>
              <option value="advanced">高级</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">课程类型</label>
            <select
              value={form.course_type}
              onChange={(e) => updateField('course_type', e.target.value)}
              className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="recorded">系统录播</option>
              <option value="live">直播班</option>
              <option value="bootcamp">训练营</option>
              <option value="private">私教陪跑</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">售价 (¥)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.price}
              onChange={(e) => updateField('price', parseFloat(e.target.value) || 0)}
              className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">原价 (¥)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.original_price}
              onChange={(e) => updateField('original_price', parseFloat(e.target.value) || 0)}
              className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>
      </div>
    </div>
  );

  const renderDescription = () => (
    <div className="w-full">
      <div className="flex items-center justify-between mb-3">
        <div>
          <label className="block text-sm font-medium text-slate-700">课程简介</label>
          <p className="text-xs text-slate-400 mt-0.5">详细介绍课程亮点、大纲、适合人群等，支持图文混排，可全屏编辑</p>
        </div>
        <span className="text-xs text-slate-400">已输入 {editorHtml.length} 字符</span>
      </div>
      {/* 编辑器挂载后常驻 DOM，由外层 wrapper 控制显隐 */}
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
          style={{ height: '560px', overflowY: 'hidden' }}
        />
      </div>
    </div>
  );

  const renderContentArrangement = () => (
    <div className="text-center py-12">
      <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-indigo-50 flex items-center justify-center">
        <iconify-icon icon="lucide:list-video" class="text-3xl text-indigo-500"></iconify-icon>
      </div>
      <h3 className="text-lg font-semibold text-slate-800">课程内容编排</h3>
      <p className="text-sm text-slate-500 mt-2 max-w-md mx-auto">
        章节、课时、课件与试听设置均在内容编排页面完成，保存基本信息后可随时继续编排。
      </p>
      <button
        type="button"
        onClick={() => navigate(`/courses/${id}/content`)}
        className="mt-6 inline-flex items-center gap-2 px-5 py-2 bg-indigo-500 text-white text-sm font-medium rounded-lg hover:bg-indigo-600 transition-colors shadow-sm"
      >
        前往内容编排
        <iconify-icon icon="lucide:arrow-right" class="text-sm"></iconify-icon>
      </button>
    </div>
  );

  const renderPublish = () => (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <div className="w-24 h-32 rounded-lg border border-gray-200 overflow-hidden flex-shrink-0 bg-gray-50 flex items-center justify-center">
          {coverUrl ? (
            <img src={coverUrl} alt="封面" className="w-full h-full object-cover" />
          ) : (
            <iconify-icon icon="lucide:image" class="text-3xl text-slate-300"></iconify-icon>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-lg font-bold text-slate-800 truncate">{form.title || '（未填写课程名称）'}</h3>
          {form.subtitle && <p className="text-sm text-slate-500 truncate mt-0.5">{form.subtitle}</p>}
          <div className="flex flex-wrap items-center gap-2 mt-2">
            <span className="px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-600 text-xs font-medium">{categoryName}</span>
            <span className="px-2 py-0.5 rounded-full bg-gray-100 text-slate-500 text-xs">{difficultyLabels[form.difficulty] || form.difficulty}</span>
            <span className="px-2 py-0.5 rounded-full bg-gray-100 text-slate-500 text-xs">{courseTypeLabels[form.course_type] || form.course_type}</span>
          </div>
          <p className="text-sm mt-2">
            <span className="text-indigo-600 font-bold">{Number(form.price) > 0 ? `¥${form.price}` : '免费'}</span>
            {Number(form.original_price) > 0 && (
              <span className="text-slate-400 line-through ml-2">¥{form.original_price}</span>
            )}
          </p>
        </div>
      </div>

      <div className="border border-gray-200 rounded-lg p-4 bg-gray-50/50">
        <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-2">课程简介预览</p>
        {descriptionPreview ? (
          <p className="text-sm text-slate-600 leading-relaxed">{descriptionPreview}{editorHtml.length > 160 ? '...' : ''}</p>
        ) : (
          <p className="text-sm text-slate-400">暂无简介内容</p>
        )}
      </div>

      <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 flex items-start gap-2">
        <iconify-icon icon="lucide:info" class="text-amber-500 mt-0.5 flex-shrink-0"></iconify-icon>
        <p className="text-xs text-amber-700 leading-relaxed">
          {isEdit
            ? '保存后将立即生效并同步展示到学生端课程详情页。'
            : '课程创建后可继续编排章节、课时与试听内容，并可在列表页进行上下架操作。'}
        </p>
      </div>
    </div>
  );

  const isLastStep = currentStep === steps.length - 1;

  // 进入/离开简介步骤时挂载编辑器
  useEffect(() => {
    if (currentStep === 1) setEditorMounted(true);
  }, [currentStep]);

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
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/courses')} className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-500 hover:bg-gray-100 transition-colors">
          <iconify-icon icon="lucide:arrow-left" class="text-base"></iconify-icon>
        </button>
        <div>
          <h1 className="text-xl font-bold text-slate-800">{isEdit ? '编辑课程' : '创建新课程'}</h1>
          <p className="text-sm text-slate-500 mt-0.5">{isEdit ? '修改课程基本信息' : '填写课程基本信息'}</p>
        </div>
      </div>

      {/* 编辑模式加载中 */}
      {formLoading && (
        <div className="flex items-center justify-center py-24">
          <div className="flex flex-col items-center gap-3">
            <svg className="animate-spin h-8 w-8 text-indigo-500" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
            </svg>
            <span className="text-sm text-slate-400">课程信息加载中...</span>
          </div>
        </div>
      )}

      {/* 步骤指示器 */}
      <div className="flex items-center gap-2 flex-wrap">
        {steps.map((label, idx) => (
          <div key={idx} className="flex items-center gap-2">
            <div
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium cursor-pointer transition-colors ${
                idx === currentStep ? 'bg-indigo-100 text-indigo-600' : 'bg-gray-100 text-slate-400 hover:bg-gray-200'
              }`}
              onClick={() => {
                // 允许点击"基本信息"等已填写的步骤回退，不允许跳过简介直达后续步骤
                if (idx < currentStep || editorMounted) setCurrentStep(idx);
              }}
            >
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${
                idx === currentStep ? 'bg-indigo-500 text-white' : 'bg-gray-300 text-white'
              }`}>{idx + 1}</span>
              {label}
            </div>
            {idx < steps.length - 1 && <div className="w-8 h-px bg-gray-200"></div>}
          </div>
        ))}
      </div>

      {/* 表单 */}
      {!formLoading && (
        <form onSubmit={handleSubmit}>
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            {/* 简介编辑器首次进入后常驻挂载（CSS 隐藏），避免步骤切换重建编辑器 */}
            {editorMounted && <div className={currentStep === 1 ? '' : 'hidden'}>{renderDescription()}</div>}
            {currentStep === 0 && renderBasicInfo()}
            {currentStep === 2 && (isEdit ? renderContentArrangement() : renderPublish())}
            {currentStep === 3 && renderPublish()}

            {/* 操作按钮 */}
            <div className="flex justify-between gap-3 mt-6 pt-5 border-t border-gray-100">
              <button type="button" onClick={() => navigate('/courses')} className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-gray-100 rounded-lg transition-colors">
                取消
              </button>
              <div className="flex items-center gap-3">
                {currentStep > 0 && (
                  <button
                    type="button"
                    onClick={handlePrev}
                    className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    上一步
                  </button>
                )}
                {!isLastStep ? (
                  <button
                    type="button"
                    onClick={handleNext}
                    className="px-5 py-2 bg-indigo-500 text-white text-sm font-medium rounded-lg hover:bg-indigo-600 transition-colors shadow-sm"
                  >
                    下一步
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-5 py-2 bg-indigo-500 text-white text-sm font-medium rounded-lg hover:bg-indigo-600 transition-colors shadow-sm disabled:opacity-60 flex items-center gap-2"
                  >
                    {loading ? (
                      <>
                        <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                        </svg>
                        保存中...
                      </>
                    ) : (
                      isEdit ? '保存修改' : '创建课程'
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        </form>
      )}
    </div>
  );
}
