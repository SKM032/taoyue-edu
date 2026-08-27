import { useState } from 'react';
import { adminAuthApi } from '../lib/api';
import InlineToast from '../components/InlineToast';

export default function SettingsBasic() {
  const [activeTab, setActiveTab] = useState('basic');
  const [toast, setToast] = useState('');
  const [saving, setSaving] = useState(false);

  const [basicForm, setBasicForm] = useState({
    name: '桃悦智科教育科技',
    short_name: '桃悦智科',
    credit_code: '91310115MA1H7Y6X8G',
    contact: '021-88889999',
    description: '',
  });

  const [pwdForm, setPwdForm] = useState({
    old_password: '',
    new_password: '',
    confirm_password: '',
  });

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 2500); };

  const updateBasic = (field: string, value: string) => {
    setBasicForm((prev) => ({ ...prev, [field]: value }));
  };

  const updatePwd = (field: string, value: string) => {
    setPwdForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSaveBasic = (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setTimeout(() => {
      showToast('保存成功');
      setSaving(false);
    }, 500);
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pwdForm.old_password || !pwdForm.new_password) {
      showToast('请填写完整');
      return;
    }
    if (pwdForm.new_password.length < 8) {
      showToast('新密码至少8位');
      return;
    }
    if (pwdForm.new_password !== pwdForm.confirm_password) {
      showToast('两次输入的新密码不一致');
      return;
    }
    setSaving(true);
    try {
      await adminAuthApi.changePassword(pwdForm.old_password, pwdForm.new_password);
      showToast('密码修改成功');
      setPwdForm({ old_password: '', new_password: '', confirm_password: '' });
    } catch (err: any) {
      showToast(err.response?.data?.detail || '密码修改失败');
    } finally {
      setSaving(false);
    }
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

      <div>
        <h1 className="text-xl font-bold text-slate-800">平台配置</h1>
        <p className="text-sm text-slate-500 mt-1">管理平台基本信息和账户安全</p>
      </div>

      {/* Tab 切换 */}
      <div className="flex bg-gray-100 rounded-lg p-1 gap-0.5 w-fit">
        {[
          { key: 'basic', label: '基本信息' },
          { key: 'security', label: '修改密码' },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
              activeTab === tab.key ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 基本信息 */}
      {activeTab === 'basic' && (
        <form onSubmit={handleSaveBasic} className="bg-white rounded-xl border border-gray-200 p-6 max-w-2xl">
          <div className="space-y-5">
            {/* Logo */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">机构Logo</label>
              <div className="flex items-center gap-4">
                <div className="w-20 h-20 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg">
                  <iconify-icon icon="lucide:graduation-cap" class="text-white text-3xl"></iconify-icon>
                </div>
                <button type="button" className="px-4 py-2 text-sm font-medium text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors">
                  更换Logo
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">机构全称</label>
                <input
                  type="text"
                  value={basicForm.name}
                  onChange={(e) => updateBasic('name', e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">机构简称</label>
                <input
                  type="text"
                  value={basicForm.short_name}
                  onChange={(e) => updateBasic('short_name', e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">统一社会信用代码</label>
                <input
                  type="text"
                  value={basicForm.credit_code}
                  disabled
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-slate-500 cursor-not-allowed"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">联系电话</label>
                <input
                  type="text"
                  value={basicForm.contact}
                  onChange={(e) => updateBasic('contact', e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">机构简介</label>
              <textarea
                value={basicForm.description}
                onChange={(e) => updateBasic('description', e.target.value)}
                rows={4}
                placeholder="请输入机构简介"
                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={saving}
                className="px-5 py-2 bg-indigo-500 text-white text-sm font-medium rounded-lg hover:bg-indigo-600 transition-colors shadow-sm disabled:opacity-60"
              >
                {saving ? '保存中...' : '保存修改'}
              </button>
            </div>
          </div>
        </form>
      )}

      {/* 修改密码 */}
      {activeTab === 'security' && (
        <form onSubmit={handleChangePassword} className="bg-white rounded-xl border border-gray-200 p-6 max-w-md">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">当前密码</label>
              <input
                type="password"
                value={pwdForm.old_password}
                onChange={(e) => updatePwd('old_password', e.target.value)}
                placeholder="请输入当前密码"
                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">新密码</label>
              <input
                type="password"
                value={pwdForm.new_password}
                onChange={(e) => updatePwd('new_password', e.target.value)}
                placeholder="请输入新密码（至少8位）"
                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">确认新密码</label>
              <input
                type="password"
                value={pwdForm.confirm_password}
                onChange={(e) => updatePwd('confirm_password', e.target.value)}
                placeholder="请再次输入新密码"
                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 bg-red-500 text-white text-sm font-medium rounded-lg hover:bg-red-600 transition-colors shadow-sm disabled:opacity-60"
            >
              {saving ? '修改中...' : '修改密码'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
