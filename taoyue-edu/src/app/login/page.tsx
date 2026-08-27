'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Icon } from '@iconify/react';
import { useAuth } from '@/lib/auth';
import { authApi } from '@/lib/api';
import toast from 'react-hot-toast';

export default function LoginPage() {
  const router = useRouter();
  const { login, passwordLogin, isLoggedIn } = useAuth();

  const [tab, setTab] = useState<'sms' | 'password'>('sms');
  const [loading, setLoading] = useState(false);

  // 短信登录
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [sending, setSending] = useState(false);
  const [countdown, setCountdown] = useState(0);

  // 图形验证码（防爬虫）
  const [captchaId, setCaptchaId] = useState('');
  const [captchaText, setCaptchaText] = useState('');
  const [captchaUrl, setCaptchaUrl] = useState('');

  // 密码登录
  const [pwdUsername, setPwdUsername] = useState('');
  const [pwd, setPwd] = useState('');
  const [showPwd, setShowPwd] = useState(false);

  useEffect(() => { if (isLoggedIn) router.push('/'); }, [isLoggedIn, router]);
  useEffect(() => { if (countdown > 0) { const t = setTimeout(() => setCountdown(countdown - 1), 1000); return () => clearTimeout(t); } }, [countdown]);

  // 加载图形验证码
  const loadCaptcha = async () => {
    try {
      const res = await authApi.getCaptcha();
      setCaptchaId(res.headers['x-captcha-id']);
      setCaptchaUrl(URL.createObjectURL(res.data));
    } catch { toast.error('验证码加载失败'); }
  };

  useEffect(() => { loadCaptcha(); }, []);

  const sendCode = async () => {
    if (!/^1[3-9]\d{9}$/.test(phone)) { toast.error('请输入正确的手机号'); return; }
    if (!captchaId || !captchaText) { toast.error('请先输入图形验证码'); return; }
    setSending(true);
    try {
      const res = await authApi.sendSms(phone, 'login', captchaId, captchaText);
      toast.success('验证码已发送');
      setCountdown(60);
      setCaptchaText('');
      loadCaptcha(); // 刷新图形验证码
      if (res.data.debug_code) toast(`调试验证码: ${res.data.debug_code}`, { icon: '🔑', duration: 5000 });
    } catch (err: any) { toast.error(err.response?.data?.detail || '发送失败'); }
    finally { setSending(false); }
  };

  const handleSmsLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone || !code) { toast.error('请填写手机号和验证码'); return; }
    setLoading(true);
    try { await login(phone, code); toast.success('登录成功！'); router.push('/'); }
    catch (err: any) { toast.error(err.response?.data?.detail || '登录失败'); }
    finally { setLoading(false); }
  };

  const handlePwdLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pwdUsername.trim()) { toast.error('请输入账号'); return; }
    if (!pwd) { toast.error('请输入密码'); return; }
    setLoading(true);
    try { await passwordLogin(pwdUsername.trim(), pwd); toast.success('登录成功！'); router.push('/'); }
    catch (err: any) { toast.error(err.response?.data?.detail || '登录失败'); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen pt-16 flex items-center justify-center px-4 py-12" style={{ backgroundColor: '#F5F5F7', fontFamily: "'Inter', system-ui, -apple-system, sans-serif" }}>
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-md border border-[#E5E7EB] p-8">
          <div className="text-center mb-8">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-r from-[#00C4D4] to-[#6D28D9] flex items-center justify-center mx-auto mb-3">
              <span className="text-white font-bold text-2xl">T</span>
            </div>
            <h1 className="text-2xl font-bold text-[#1A1A2E]">欢迎回来</h1>
            <p className="text-[#8B8BA0] text-sm mt-1">登录桃悦智科</p>
          </div>

          {/* Tab 切换 */}
          <div className="flex bg-[#F5F5F7] rounded-xl p-1 mb-6">
            {[
              { key: 'sms', label: '短信登录' },
              { key: 'password', label: '密码登录' },
            ].map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key as any)}
                className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all ${tab === t.key ? 'bg-white text-[#00C4D4] shadow-sm' : 'text-[#8B8BA0]'}`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* 短信登录 */}
          {tab === 'sms' && (
            <form onSubmit={handleSmsLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#1A1A2E] mb-1.5">手机号</label>
                <div className="relative">
                  <Icon icon="mdi:cellphone" className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8B8BA0] w-5 h-5" />
                  <input type="tel" maxLength={11} value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))} placeholder="请输入手机号"
                    className="w-full pl-10 pr-4 py-3 border border-[#E5E7EB] rounded-xl focus:outline-none focus:border-[#00C4D4] focus:ring-1 focus:ring-[#00C4D4] transition-all text-sm" />
                </div>
              </div>

              {/* 图形验证码 */}
              <div>
                <label className="block text-sm font-medium text-[#1A1A2E] mb-1.5">图形验证码</label>
                <div className="flex gap-3">
                  <div className="relative flex-1">
                    <Icon icon="mdi:shield-key" className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8B8BA0] w-5 h-5" />
                    <input type="text" maxLength={6} value={captchaText} onChange={(e) => setCaptchaText(e.target.value)} placeholder="请输入图中字符"
                      className="w-full pl-10 pr-4 py-3 border border-[#E5E7EB] rounded-xl focus:outline-none focus:border-[#00C4D4] focus:ring-1 focus:ring-[#00C4D4] transition-all text-sm" />
                  </div>
                  <button type="button" onClick={loadCaptcha} className="shrink-0 rounded-xl overflow-hidden border border-[#E5E7EB] w-[110px] h-[46px] bg-[#F5F5F7] flex items-center justify-center">
                    {captchaUrl ? (
                      <img src={captchaUrl} alt="验证码" className="w-full h-full object-cover" />
                    ) : (
                      <Icon icon="mdi:reload" className="w-5 h-5 text-[#8B8BA0] animate-spin" />
                    )}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#1A1A2E] mb-1.5">短信验证码</label>
                <div className="flex gap-3">
                  <div className="relative flex-1">
                    <Icon icon="mdi:shield-check" className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8B8BA0] w-5 h-5" />
                    <input type="text" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} placeholder="请输入验证码"
                      className="w-full pl-10 pr-4 py-3 border border-[#E5E7EB] rounded-xl focus:outline-none focus:border-[#00C4D4] focus:ring-1 focus:ring-[#00C4D4] transition-all text-sm" />
                  </div>
                  <button type="button" onClick={sendCode} disabled={sending || countdown > 0}
                    className="px-4 py-3 bg-[#E0F7FA] text-[#00C4D4] rounded-xl text-sm font-bold hover:bg-[#00C4D4] hover:text-white transition-colors disabled:opacity-50 whitespace-nowrap">
                    {countdown > 0 ? `${countdown}s` : sending ? '发送中' : '获取验证码'}
                  </button>
                </div>
              </div>

              <button type="submit" disabled={loading}
                className="w-full py-3 bg-gradient-to-r from-[#00C4D4] to-[#6D28D9] text-white rounded-xl font-bold hover:shadow-lg hover:shadow-[#00C4D4]/25 transition-all disabled:opacity-60">
                {loading ? '登录中...' : '登录'}
              </button>
            </form>
          )}

          {/* 密码登录 */}
          {tab === 'password' && (
            <form onSubmit={handlePwdLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#1A1A2E] mb-1.5">账号</label>
                <div className="relative">
                  <Icon icon="mdi:account" className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8B8BA0] w-5 h-5" />
                  <input type="text" maxLength={20} value={pwdUsername} onChange={(e) => setPwdUsername(e.target.value)} placeholder="请输入登录账号"
                    className="w-full pl-10 pr-4 py-3 border border-[#E5E7EB] rounded-xl focus:outline-none focus:border-[#00C4D4] focus:ring-1 focus:ring-[#00C4D4] transition-all text-sm" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#1A1A2E] mb-1.5">密码</label>
                <div className="relative">
                  <Icon icon="mdi:lock" className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8B8BA0] w-5 h-5" />
                  <input type={showPwd ? 'text' : 'password'} value={pwd} onChange={(e) => setPwd(e.target.value)} placeholder="请输入密码"
                    className="w-full pl-10 pr-10 py-3 border border-[#E5E7EB] rounded-xl focus:outline-none focus:border-[#00C4D4] focus:ring-1 focus:ring-[#00C4D4] transition-all text-sm" />
                  <button type="button" onClick={() => setShowPwd(!showPwd)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8B8BA0] hover:text-[#1A1A2E]">
                    <Icon icon={showPwd ? 'mdi:eye-off' : 'mdi:eye'} className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <button type="submit" disabled={loading}
                className="w-full py-3 bg-gradient-to-r from-[#00C4D4] to-[#6D28D9] text-white rounded-xl font-bold hover:shadow-lg hover:shadow-[#00C4D4]/25 transition-all disabled:opacity-60">
                {loading ? '登录中...' : '登录'}
              </button>
            </form>
          )}

          <p className="text-center text-sm text-[#8B8BA0] mt-6">
            还没有账号？ <Link href="/register" className="text-[#00C4D4] hover:underline font-bold">立即注册</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
