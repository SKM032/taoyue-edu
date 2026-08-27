'use client';

import { useState, useEffect, Suspense, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Icon } from '@iconify/react';
import toast from 'react-hot-toast';
import QRCode from 'qrcode';
import { courseApi, orderApi, cartApi } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useCart } from '@/lib/cart';
import { resolveAssetUrl } from '@/lib/asset';

type PayMethod = 'wechat' | 'alipay';

const payMethods: { key: PayMethod; label: string; brand: string; bgClass: string }[] = [
  { key: 'wechat', label: '微信支付', brand: '#07C160', bgClass: 'from-[#07C160] to-[#06AD56]' },
  { key: 'alipay', label: '支付宝', brand: '#1677FF', bgClass: 'from-[#1677FF] to-[#0958D9]' },
];

function CheckoutContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user, isLoggedIn } = useAuth();
  const { refreshCart } = useCart();

  // 支持多个 course_id（合并结算）
  const courseIds = searchParams.getAll('course_id').map(Number).filter(Boolean);

  const [courses, setCourses] = useState<any[]>([]);
  const [payMethod, setPayMethod] = useState<PayMethod>('wechat');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [agree, setAgree] = useState(false);

  // 支付弹框状态：创建订单成功后存储订单号与微信 code_url
  const [payModal, setPayModal] = useState<{
    orderNo: string;
    codeUrl: string;
  } | null>(null);
  // 生成的二维码 dataURL
  const [qrDataUrl, setQrDataUrl] = useState('');
  // 是否已过期（倒计时结束）
  const [expired, setExpired] = useState(false);

  // 支付倒计时（秒，默认 30 分钟）
  const [countdown, setCountdown] = useState(30 * 60);
  // 支付中状态
  const [paying, setPaying] = useState(false);
  // 轮询定时器引用
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!courseIds.length) {
      setLoading(false);
      return;
    }
    Promise.all(courseIds.map((id) => courseApi.getDetail(id)))
      .then((resList) => {
        setCourses(resList.map((r) => r.data).filter(Boolean));
      })
      .catch(() => toast.error('课程信息加载失败'))
      .finally(() => setLoading(false));
  }, [searchParams]);

  // 支付弹框打开：启动 30 分钟倒计时 + 生成二维码 + 轮询订单状态
  useEffect(() => {
    if (!payModal) return;
    setCountdown(30 * 60);
    setExpired(false);
    setPaying(false);
    // 用 code_url 生成二维码
    if (payModal.codeUrl) {
      QRCode.toDataURL(payModal.codeUrl, { width: 220, margin: 2 })
        .then(setQrDataUrl)
        .catch(() => setQrDataUrl(''));
    }
    // 倒计时
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          setExpired(true);
          if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    // 轮询订单状态（每 3 秒）
    pollRef.current = setInterval(() => {
      orderApi.getDetail(payModal.orderNo)
        .then((res) => {
          const status = res.data?.pay_status || res.data?.status;
          if (status === 'paid') {
            if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
            clearInterval(timer);
            toast.success('支付成功');
            setPayModal(null);
            router.push('/orders');
          }
        })
        .catch(() => {});
    }, 3000);
    return () => {
      clearInterval(timer);
      if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
    };
  }, [payModal]);

  const isBatch = courses.length > 1;
  const displayPrice = courses.reduce((sum, c) => sum + Number(c.price || 0), 0);
  const payMethodInfo = payMethods.find((p) => p.key === payMethod) || payMethods[0];
  // 手机浏览器：微信支付走 H5(MWEB) 直接拉起微信，而非扫码
  const isMobile = typeof navigator !== 'undefined' && /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);
  const tradeType = payMethod === 'wechat' && isMobile ? 'MWEB' : 'NATIVE';

  const handleSubmit = async () => {
    if (!courses.length) { toast.error('课程信息缺失'); return; }
    if (!agree) { toast.error('请阅读并同意《用户协议》和《隐私政策》'); return; }
    setSubmitting(true);
    try {
      let res;
      if (isBatch) {
        // 多门课程合并成一个订单
        res = await orderApi.createBatch({
          course_ids: courses.map((c) => c.id),
          pay_method: payMethod,
          return_url: window.location.origin + `/orders`,
          trade_type: tradeType,
        });
      } else {
        res = await orderApi.create({
          course_id: courses[0].id,
          pay_method: payMethod,
          return_url: window.location.origin + `/orders`,
          trade_type: tradeType,
        });
      }
      if (res.data.order_no) {
        // 下单成功：从购物车移除已下单课程
        try {
          for (const c of courses) {
            await cartApi.remove(c.id);
          }
          refreshCart();
        } catch { /* 移除失败不影响支付 */ }
        if (res.data.status === 'paid') {
          // 免费课程直接开通
          toast.success('课程开通成功');
          router.push('/orders');
          return;
        }
        // 手机端微信：H5(MWEB) 直接跳转拉起微信支付
        if (payMethod === 'wechat' && isMobile && res.data.mweb_url) {
          window.location.href = res.data.mweb_url;
          return;
        }
        // 支付宝：直接跳转支付宝收银台（电脑网站支付 URL），而不是二维码
        if (payMethod === 'alipay' && res.data.pay_url) {
          window.location.href = res.data.pay_url;
          return;
        }
        // 微信 PC 端：打开支付弹框展示二维码
        setPayModal({
          orderNo: res.data.order_no,
          codeUrl: res.data.code_url || '',
        });
      } else {
        toast.error(res.data.message || '下单失败');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.detail || '下单失败');
    } finally {
      setSubmitting(false);
    }
  };

  // 手动查询订单状态（供用户点击"我已支付"时刷新）
  const handleCheckStatus = () => {
    if (!payModal) return;
    setPaying(true);
    orderApi.getDetail(payModal.orderNo)
      .then((res) => {
        const status = res.data?.pay_status || res.data?.status;
        if (status === 'paid') {
          if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
          toast.success('支付成功');
          setPayModal(null);
          router.push('/orders');
        } else {
          toast('尚未检测到支付，请扫码后稍等片刻');
        }
      })
      .catch(() => toast.error('查询订单状态失败'))
      .finally(() => setPaying(false));
  };

  // 刷新支付码（订单超时后可重新生成）
  const handleRefreshQr = () => {
    if (!payModal || !courses.length) return;
    toast.loading('正在刷新支付码...');
    const createReq = isBatch
      ? orderApi.createBatch({ course_ids: courses.map((c) => c.id), pay_method: 'wechat', return_url: window.location.origin + `/orders` })
      : orderApi.create({ course_id: courses[0].id, pay_method: 'wechat', return_url: window.location.origin + `/orders` });
    createReq
      .then((res) => {
        const codeUrl = res.data?.code_url || res.data?.pay_url || '';
        if (codeUrl) {
          setPayModal({ orderNo: res.data.order_no, codeUrl });
          setCountdown(30 * 60);
          setExpired(false);
          QRCode.toDataURL(codeUrl, { width: 220, margin: 2 }).then(setQrDataUrl).catch(() => {});
          toast.success('支付码已刷新');
        } else {
          toast.error('刷新失败，请重试');
        }
      })
      .catch(() => toast.error('刷新支付码失败'))
      .finally(() => toast.dismiss());
  };

  // 格式化倒计时 mm:ss
  const formatCountdown = () => {
    const m = Math.floor(countdown / 60);
    const s = countdown % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center py-40" style={{ backgroundColor: '#F5F5F7', minHeight: '60vh' }}>
        <Icon icon="mdi:loading" className="w-10 h-10 animate-spin text-[#00C4D4]" />
        <p className="mt-4 text-sm text-[#8B8BA0]">正在加载订单信息...</p>
      </div>
    );
  }

  if (!courses.length) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-20 pt-32 text-center" style={{ backgroundColor: '#F5F5F7', minHeight: '60vh' }}>
        <div className="inline-flex w-20 h-20 items-center justify-center rounded-full bg-white shadow-md border border-[#E5E7EB] mb-6">
          <Icon icon="mdi:alert-circle-outline" className="w-10 h-10 text-[#D1D5DB]" />
        </div>
        <h2 className="text-2xl font-bold text-[#1A1A2E] mb-2">课程信息缺失</h2>
        <p className="text-[#8B8BA0] mb-6">请从课程详情页或购物车进入结算</p>
        <Link href="/courses" className="inline-flex items-center gap-1 px-6 py-3 bg-gradient-to-r from-[#00C4D4] to-[#6D28D9] text-white rounded-xl font-bold shadow-lg shadow-[#00C4D4]/20 hover:shadow-xl hover:shadow-[#00C4D4]/30 hover:-translate-y-0.5 transition-all">
          返回课程列表 <Icon icon="mdi:arrow-right" className="w-4 h-4" />
        </Link>
      </div>
    );
  }

  return (
    <div className="overflow-x-hidden pb-16" style={{ backgroundColor: '#F5F5F7', color: '#1A1A2E', fontFamily: "'Inter', system-ui, -apple-system, sans-serif" }}>
      {/* 顶部装饰渐变背景 */}
      <div className="absolute top-0 left-0 right-0 h-72 pointer-events-none" style={{ background: 'linear-gradient(180deg, rgba(0,196,212,0.06) 0%, rgba(0,196,212,0) 100%)' }} />

      <div className="relative max-w-[1100px] mx-auto px-6 pt-24">
        {/* 面包屑 */}
        <div className="max-w-full pb-5">
          <div className="flex items-center gap-2 text-sm text-[#8B8BA0]">
            <Link href="/" className="hover:text-[#00C4D4] transition-colors">首页</Link>
            <Icon icon="mdi:chevron-right" className="w-4 h-4" />
            <Link href="/courses" className="hover:text-[#00C4D4] transition-colors">全部课程</Link>
            <Icon icon="mdi:chevron-right" className="w-4 h-4" />
            <span className="line-clamp-1 max-w-[300px]">
              {isBatch ? `${courses.length} 门课程` : courses[0]?.title}
            </span>
            <Icon icon="mdi:chevron-right" className="w-4 h-4" />
            <span className="text-[#1A1A2E] font-medium">确认订单</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 左侧：订单表单 */}
          <div className="lg:col-span-2 space-y-5">
            {/* 未登录提示 */}
            {!isLoggedIn && (
              <div className="bg-gradient-to-r from-amber-50 to-amber-50/50 border border-amber-200/80 rounded-2xl p-4 flex items-center gap-3 shadow-sm">
                <div className="w-9 h-9 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                  <Icon icon="mdi:information-outline" className="w-5 h-5 text-amber-600" />
                </div>
                <p className="text-sm text-amber-900 flex-1">
                  您当前未登录，<Link href="/login" className="underline font-semibold hover:text-amber-700">前往登录</Link>
                </p>
              </div>
            )}

            {/* 支付方式 */}
            <Card icon="mdi:credit-card-fast-outline" title="支付方式" subtitle="选择您偏好的付款方式">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {payMethods.map((m) => {
                  const selected = payMethod === m.key;
                  return (
                    <div
                      key={m.key}
                      onClick={() => setPayMethod(m.key)}
                      className={`relative flex items-center gap-3 p-5 border-2 rounded-2xl cursor-pointer transition-all duration-200 ${
                        selected
                          ? 'border-[#00C4D4] bg-gradient-to-r from-[#E0F7FA]/60 to-transparent shadow-[0_4px_16px_rgba(0,196,212,0.1)]'
                          : 'border-[#E5E7EB] hover:border-[#00C4D4]/40 hover:bg-[#FAFAFA]'
                      }`}
                    >
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                        selected ? 'border-[#00C4D4]' : 'border-[#D1D5DB]'
                      }`}>
                        {selected && <div className="w-2.5 h-2.5 rounded-full bg-[#00C4D4]"></div>}
                      </div>
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-sm bg-gradient-to-br ${m.bgClass}`}>
                        <Icon icon={m.key === 'wechat' ? 'mdi:wechat' : 'simple-icons:alipay'} className="w-6 h-6" />
                      </div>
                      <span className="font-semibold text-[#1A1A2E]">{m.label}</span>
                      {selected && (
                        <Icon icon="mdi:check-circle" className="w-5 h-5 text-[#00C4D4] ml-auto" />
                      )}
                    </div>
                  );
                })}
              </div>
              <div className="mt-4 flex items-center gap-2 text-xs text-[#8B8BA0]">
                <Icon icon="mdi:shield-check-outline" className="w-4 h-4 text-[#059669]" />
                <span>支付过程由 {payMethodInfo.label} 提供安全保障</span>
              </div>
            </Card>

            {/* 服务保障 */}
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-[#E5E7EB]">
              <div className="grid grid-cols-3 gap-4">
                {[
                  { icon: 'mdi:shield-check-outline', text: '7天无理由退订', color: '#059669' },
                  { icon: 'mdi:certificate-outline', text: '官方正品保障', color: '#00C4D4' },
                  { icon: 'mdi:headset', text: '专属学习顾问', color: '#6D28D9' },
                ].map((s) => (
                  <div key={s.text} className="flex flex-col items-center text-center">
                    <Icon icon={s.icon} className="w-6 h-6 mb-1.5" style={{ color: s.color }} />
                    <span className="text-xs text-[#4A4A6A] font-medium">{s.text}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 右侧：订单摘要 */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.04)] border border-[#E5E7EB] sticky top-24 overflow-hidden">
              <div className="px-6 pt-6 pb-4 flex items-center gap-2 border-b border-[#E5E7EB]">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#00C4D4]/10 to-[#6D28D9]/10 flex items-center justify-center">
                  <Icon icon="mdi:receipt-text-outline" className="w-5 h-5 text-[#00C4D4]" />
                </div>
                <h3 className="text-base font-bold text-[#1A1A2E]">订单摘要</h3>
              </div>

              {/* 课程信息（支持合并多门课程） */}
              <div className="border-b border-[#F3F4F6]">
                {courses.map((c) => (
                  <div key={c.id} className="flex gap-3 p-4 border-b border-[#F3F4F6] last:border-b-0">
                    <div
                      className="w-16 h-12 rounded-lg shrink-0 bg-cover bg-center bg-[#F3F4F6] border border-[#E5E7EB]"
                      style={{ backgroundImage: c.cover ? `url(${resolveAssetUrl(c.cover)})` : undefined }}
                    >
                      {!c.cover && (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#00C4D4]/10 to-[#6D28D9]/10 rounded-lg">
                          <Icon icon="mdi:book-open-page-variant-outline" className="w-5 h-5 text-[#00C4D4]" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-[#1A1A2E] line-clamp-2 leading-snug">{c.title}</p>
                      <p className="text-xs text-[#DC2626] font-bold mt-1">¥{Number(c.price).toLocaleString()}</p>
                    </div>
                  </div>
                ))}
                {isBatch && (
                  <div className="px-5 py-2.5 text-xs text-[#8B8BA0]">共 {courses.length} 门课程</div>
                )}
              </div>

              {/* 支付方式 */}
              <div className="px-5 py-4 flex items-center justify-between border-b border-[#F3F4F6]">
                <span className="text-sm text-[#8B8BA0]">支付方式</span>
                <span className="text-sm text-[#1A1A2E] font-semibold flex items-center gap-1.5">
                  <Icon icon={payMethodInfo.key === 'wechat' ? 'mdi:wechat' : 'simple-icons:alipay'} className="w-4 h-4" style={{ color: payMethodInfo.brand }} />
                  {payMethodInfo.label}
                </span>
              </div>

              {/* 实付 */}
              <div className="px-5 py-5 bg-gradient-to-br from-[#FAFAFA] to-white">
                <div className="flex items-baseline justify-between">
                  <span className="text-sm text-[#8B8BA0]">实付金额</span>
                  <div className="flex items-baseline gap-1">
                    <span className="text-base font-bold text-[#1A1A2E]">¥</span>
                    <span className="text-4xl font-black tracking-tight" style={{ background: 'linear-gradient(135deg, #00C4D4, #6D28D9)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                      {displayPrice}
                    </span>
                    <span className="text-xs text-[#8B8BA0]">.00</span>
                  </div>
                </div>
              </div>

              {/* 协议 */}
              <div className="px-5 py-4 border-t border-[#F3F4F6]">
                <label className="flex items-start gap-2 cursor-pointer text-xs text-[#8B8BA0] leading-relaxed">
                  <input
                    type="checkbox"
                    checked={agree}
                    onChange={(e) => setAgree(e.target.checked)}
                    className="mt-0.5 w-4 h-4 accent-[#00C4D4] cursor-pointer shrink-0"
                  />
                  <span>
                    我已阅读并同意
                    <Link href="/terms" className="text-[#00C4D4] hover:underline mx-0.5">《用户协议》</Link>
                    和
                    <Link href="/privacy" className="text-[#00C4D4] hover:underline mx-0.5">《隐私政策》</Link>
                  </span>
                </label>
              </div>

              {/* 提交按钮 */}
              <div className="p-5 pt-2">
                <button
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="w-full py-3.5 text-white rounded-xl font-bold transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 hover:-translate-y-0.5 active:translate-y-0"
                  style={{
                    background: 'linear-gradient(135deg, #00C4D4 0%, #6D28D9 100%)',
                    boxShadow: '0 8px 24px rgba(0,196,212,0.3)',
                  }}
                >
                  {submitting ? (
                    <>
                      <Icon icon="mdi:loading" className="w-4 h-4 animate-spin" />
                      处理中...
                    </>
                  ) : (
                    <>
                      <Icon icon="mdi:lock-outline" className="w-4 h-4" />
                      立即支付 ¥{displayPrice}
                    </>
                  )}
                </button>
                <p className="mt-3 text-[11px] text-center text-[#8B8BA0] flex items-center justify-center gap-1">
                  <Icon icon="mdi:shield-check" className="w-3.5 h-3.5 text-[#059669]" />
                  银行级加密支付 · 资金安全保障
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 支付弹框 */}
      {payModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={() => setPayModal(null)}>
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden" onClick={(e) => e.stopPropagation()}>
            {/* 顶部品牌区（青→紫渐变，符合项目整体风格） */}
            <div className="relative px-6 py-6 text-center text-white overflow-hidden" style={{ background: 'linear-gradient(135deg, #00C4D4 0%, #6D28D9 100%)' }}>
              <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full bg-white/10 pointer-events-none" />
              <div className="absolute -bottom-10 -left-8 w-32 h-32 rounded-full bg-white/5 pointer-events-none" />
              <div className="relative w-14 h-14 mx-auto rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center mb-3">
                <Icon icon="mdi:qrcode-scan" className="w-8 h-8" />
              </div>
              <div className="relative text-lg font-bold">{payMethodInfo.label}</div>
              <div className="relative text-sm text-white/80 mt-0.5">请打开微信扫一扫完成支付</div>
            </div>

            <div className="p-6">
              {/* 金额 */}
              <div className="text-center mb-5">
                <div className="text-[#8B8BA0] text-sm mb-1">应付金额</div>
                <div className="text-4xl font-black tracking-tight text-[#1A1A2E]">¥{displayPrice}</div>
              </div>

              {/* 倒计时 */}
              <div className={`flex items-center justify-center gap-2 rounded-xl py-2.5 mb-5 ${expired || countdown <= 300 ? 'bg-red-50' : 'bg-[#F5F5F7]'}`}>
                <Icon icon="mdi:timer-sand" className={`w-4 h-4 ${expired || countdown <= 300 ? 'text-[#DC2626]' : 'text-[#8B8BA0]'}`} />
                <span className={`text-sm font-medium ${expired || countdown <= 300 ? 'text-[#DC2626]' : 'text-[#4A4A6A]'}`}>
                  {expired ? (
                    '支付码已过期'
                  ) : (
                    <>请在 <span className="font-mono font-bold tracking-widest">{formatCountdown()}</span> 内完成支付</>
                  )}
                </span>
              </div>

              {/* 二维码 */}
              <div className="flex flex-col items-center mb-5">
                <div className="w-52 h-52 rounded-2xl border border-[#E5E7EB] bg-white p-2 flex items-center justify-center shadow-inner">
                  {qrDataUrl ? (
                    <img src={qrDataUrl} alt="支付二维码" className="w-full h-full object-contain" />
                  ) : (
                    <div className="flex flex-col items-center justify-center text-[#8B8BA0]">
                      <Icon icon="mdi:loading" className="w-8 h-8 animate-spin mb-2" />
                      <span className="text-xs">二维码生成中...</span>
                    </div>
                  )}
                </div>
                <div className="text-xs text-[#8B8BA0] mt-3 flex items-center gap-1">
                  <Icon icon="mdi:cellphone" className="w-4 h-4" />
                  请使用手机 {payMethodInfo.label} 扫一扫付款
                </div>
              </div>

              {/* 操作按钮 */}
              {expired ? (
                <button
                  onClick={handleRefreshQr}
                  disabled={paying}
                  className="w-full py-3 text-white rounded-xl font-bold transition-all duration-200 disabled:opacity-60 flex items-center justify-center gap-2 hover:-translate-y-0.5"
                  style={{ background: 'linear-gradient(135deg, #00C4D4 0%, #6D28D9 100%)', boxShadow: '0 8px 24px rgba(0,196,212,0.3)' }}
                >
                  <Icon icon="mdi:refresh" className="w-4 h-4" />
                  刷新支付码
                </button>
              ) : (
                <button
                  onClick={handleCheckStatus}
                  disabled={paying}
                  className="w-full py-3 text-white rounded-xl font-bold transition-all duration-200 disabled:opacity-60 flex items-center justify-center gap-2 hover:-translate-y-0.5"
                  style={{ background: 'linear-gradient(135deg, #00C4D4 0%, #6D28D9 100%)', boxShadow: '0 8px 24px rgba(0,196,212,0.3)' }}
                >
                  {paying ? (
                    <>
                      <Icon icon="mdi:loading" className="w-4 h-4 animate-spin" />
                      正在确认支付...
                    </>
                  ) : (
                    <>
                      <Icon icon="mdi:check-circle-outline" className="w-4 h-4" />
                      我已完成支付
                    </>
                  )}
                </button>
              )}

              <div className="mt-4 flex items-center justify-center gap-3 text-[11px] text-[#8B8BA0]">
                <span className="flex items-center gap-1"><Icon icon="mdi:shield-check-outline" className="w-3.5 h-3.5 text-[#059669]" />加密支付</span>
                <span className="w-px h-3 bg-[#E5E7EB]" />
                <span className="flex items-center gap-1"><Icon icon="mdi:clock-outline" className="w-3.5 h-3.5 text-[#8B8BA0]" />自动检测支付结果</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Card({ icon, title, subtitle, children }: { icon: string; title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-[#E5E7EB] hover:shadow-md transition-shadow">
      <div className="flex items-start gap-3 mb-5">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#00C4D4]/10 to-[#6D28D9]/10 flex items-center justify-center shrink-0">
          <Icon icon={icon} className="w-5 h-5 text-[#00C4D4]" />
        </div>
        <div className="flex-1">
          <h3 className="text-base font-bold text-[#1A1A2E]">{title}</h3>
          {subtitle && <p className="text-xs text-[#8B8BA0] mt-0.5">{subtitle}</p>}
        </div>
      </div>
      {children}
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={
      <div className="flex flex-col justify-center items-center py-40" style={{ backgroundColor: '#F5F5F7', minHeight: '60vh' }}>
        <Icon icon="mdi:loading" className="w-10 h-10 animate-spin text-[#00C4D4]" />
        <p className="mt-4 text-sm text-[#8B8BA0]">正在加载...</p>
      </div>
    }>
      <CheckoutContent />
    </Suspense>
  );
}