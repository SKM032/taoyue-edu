'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { Icon } from '@iconify/react';
import QRCode from 'qrcode';
import { orderApi } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useCart } from '@/lib/cart';
import toast from 'react-hot-toast';

type OrderStatus = 'all' | 'pending' | 'paid' | 'refunded' | 'cancelled';

const statusMap: Record<string, { label: string; color: string; bg: string; dot: string }> = {
  pending: { label: '待支付', color: 'text-[#D97706]', bg: 'bg-amber-50 border-amber-200', dot: 'bg-[#D97706]' },
  paid: { label: '已支付', color: 'text-[#059669]', bg: 'bg-emerald-50 border-emerald-200', dot: 'bg-[#059669]' },
  refunded: { label: '已退款', color: 'text-[#DC2626]', bg: 'bg-red-50 border-red-200', dot: 'bg-[#DC2626]' },
  cancelled: { label: '已取消', color: 'text-[#6B7280]', bg: 'bg-gray-100 border-gray-200', dot: 'bg-[#6B7280]' },
};

const tabs: { key: OrderStatus; label: string }[] = [
  { key: 'all', label: '全部订单' },
  { key: 'pending', label: '待支付' },
  { key: 'paid', label: '已支付' },
  { key: 'refunded', label: '已退款' },
  { key: 'cancelled', label: '已取消' },
];

export default function OrdersPage() {
  const { isLoggedIn } = useAuth();
  const { refreshCart } = useCart();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<OrderStatus>('all');

  // 支付弹窗状态
  const [payOrder, setPayOrder] = useState<any>(null);
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [paying, setPaying] = useState(false);
  const pollRef = useRef<any>(null);

  useEffect(() => {
    if (!isLoggedIn) return;
    orderApi.getList()
      .then((res) => setOrders(res.data.items || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [isLoggedIn]);

  const loadOrders = () => {
    orderApi.getList()
      .then((res) => setOrders(res.data.items || []))
      .catch(() => {});
  };

  // 发起支付：对已有订单获取支付参数
  const handlePay = async (order: any) => {
    setPayOrder(order);
    setQrDataUrl('');
    setPaying(false);
    try {
      const res = await orderApi.getDetail(order.order_no);
      const detail = res.data;
      // 支付宝：直接跳转收银台
      if (order.pay_method === 'alipay' && detail.pay_url) {
        setPayOrder(null);
        window.location.href = detail.pay_url;
        return;
      }
      // 微信：展示二维码
      const codeUrl = detail.code_url || detail.mweb_url || detail.pay_url || '';
      if (codeUrl) {
        QRCode.toDataURL(codeUrl, { width: 220, margin: 2 })
          .then(setQrDataUrl)
          .catch(() => setQrDataUrl(''));
        // 轮询支付状态
        if (pollRef.current) clearInterval(pollRef.current);
        pollRef.current = setInterval(() => {
          orderApi.getDetail(order.order_no)
            .then((r) => {
              if (r.data?.pay_status === 'paid') {
                if (pollRef.current) clearInterval(pollRef.current);
                toast.success('支付成功');
                setPayOrder(null);
                refreshCart();
                loadOrders();
              }
            })
            .catch(() => {});
        }, 3000);
      } else {
        toast.error('未获取到支付参数，请稍后重试');
        setPayOrder(null);
      }
    } catch {
      toast.error('获取支付信息失败');
      setPayOrder(null);
    }
  };

  const closePayModal = () => {
    if (pollRef.current) clearInterval(pollRef.current);
    setPayOrder(null);
    setQrDataUrl('');
  };

  // 取消/关闭待支付订单
  const handleCancel = async (order: any) => {
    if (!confirm('确定取消该订单吗？')) return;
    try {
      await orderApi.close(order.order_no);
      toast.success('订单已取消');
      loadOrders();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || '取消失败');
    }
  };

  const handleCheckPaid = () => {
    if (!payOrder) return;
    setPaying(true);
    orderApi.getDetail(payOrder.order_no)
      .then((r) => {
        if (r.data?.pay_status === 'paid') {
          if (pollRef.current) clearInterval(pollRef.current);
          toast.success('支付成功');
          setPayOrder(null);
          refreshCart();
          loadOrders();
        } else {
          toast('尚未检测到支付，请扫码后稍等片刻');
        }
      })
      .catch(() => toast.error('查询订单状态失败'))
      .finally(() => setPaying(false));
  };

  if (!isLoggedIn) {
    return (
      <div className="flex items-center justify-center min-h-[70vh] bg-[#F5F5F7]">
        <div className="bg-white rounded-2xl shadow-sm border border-[#E5E7EB] p-12 text-center max-w-md w-full">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#00C4D4]/10 to-[#6D28D9]/10 flex items-center justify-center mx-auto mb-5">
            <Icon icon="mdi:lock-outline" className="w-8 h-8 text-[#00C4D4]" />
          </div>
          <h2 className="text-xl font-bold text-[#1A1A2E] mb-2">请先登录</h2>
          <p className="text-sm text-[#8B8BA0] mb-6">登录后即可查看您的订单记录</p>
          <Link href="/login" className="inline-flex items-center gap-1 px-6 py-2.5 bg-gradient-to-r from-[#00C4D4] to-[#6D28D9] text-white rounded-xl font-bold shadow-lg shadow-[#00C4D4]/20 hover:shadow-xl transition-all">
            前往登录 <Icon icon="mdi:arrow-right" className="w-4 h-4" />
          </Link>
        </div>
      </div>
    );
  }

  const filtered = activeTab === 'all' ? orders : orders.filter((o) => o.pay_status === activeTab);

  const stats = [
    { label: '全部订单', value: orders.length, icon: 'mdi:receipt-text-outline', color: '#00C4D4' },
    { label: '待支付', value: orders.filter((o) => o.pay_status === 'pending').length, icon: 'mdi:timer-sand', color: '#D97706' },
    { label: '已支付', value: orders.filter((o) => o.pay_status === 'paid').length, icon: 'mdi:check-decagram', color: '#059669' },
    { label: '已退款', value: orders.filter((o) => o.pay_status === 'refunded').length, icon: 'mdi:undo-variant', color: '#DC2626' },
  ];

  return (
    <div className="min-h-screen pb-16" style={{ backgroundColor: '#F5F5F7', color: '#1A1A2E', fontFamily: "'Inter', system-ui, -apple-system, sans-serif" }}>
      {/* 顶部装饰渐变 */}
      <div className="h-48 w-full" style={{ background: 'linear-gradient(135deg, #00C4D4 0%, #6D28D9 100%)' }} />

      <div className="max-w-[1100px] mx-auto px-6 -mt-28 relative">
        {/* 头部 */}
        <div className="bg-white rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.08)] border border-[#E5E7EB] p-6 mb-6">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-[#00C4D4]/10 to-[#6D28D9]/10 flex items-center justify-center">
                <Icon icon="mdi:receipt-text-clock-outline" className="w-6 h-6 text-[#00C4D4]" />
              </div>
              <div>
                <h1 className="text-xl font-black text-[#1A1A2E]">订单中心</h1>
                <p className="text-xs text-[#8B8BA0] mt-0.5">管理您的全部订单记录</p>
              </div>
            </div>
            <Link href="/courses" className="text-sm text-[#00C4D4] font-bold hover:underline flex items-center gap-1">
              <Icon icon="mdi:plus-circle-outline" className="w-4 h-4" />
              去选课
            </Link>
          </div>

          {/* 数据统计 */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {stats.map((s) => (
              <div key={s.label} className="bg-[#FAFAFA] rounded-xl p-4 border border-[#E5E7EB]/60">
                <div className="flex items-center gap-2 mb-2">
                  <Icon icon={s.icon} className="w-4 h-4" style={{ color: s.color }} />
                  <span className="text-xs text-[#8B8BA0]">{s.label}</span>
                </div>
                <div className="text-2xl font-black text-[#1A1A2E]">{s.value}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Tab 筛选 */}
        <div className="bg-white rounded-2xl border border-[#E5E7EB] shadow-sm mb-6">
          <div className="flex border-b border-[#E5E7EB] overflow-x-auto">
            {tabs.map((tab) => {
              const active = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`relative px-6 py-3.5 text-sm font-bold whitespace-nowrap transition-colors ${
                    active ? 'text-[#00C4D4]' : 'text-[#8B8BA0] hover:text-[#1A1A2E]'
                  }`}
                >
                  {tab.label}
                  <span className={`absolute left-1/2 -translate-x-1/2 bottom-0 h-[2px] rounded-full bg-[#00C4D4] transition-all duration-200 ${active ? 'w-8' : 'w-0'}`} />
                </button>
              );
            })}
          </div>

          <div className="p-5">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-16">
                <Icon icon="mdi:loading" className="w-8 h-8 animate-spin text-[#00C4D4]" />
                <p className="mt-3 text-sm text-[#8B8BA0]">正在加载订单...</p>
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16">
                <div className="w-16 h-16 rounded-full bg-[#F5F5F7] flex items-center justify-center mb-4">
                  <Icon icon="mdi:receipt-text-outline" className="w-8 h-8 text-[#D1D5DB]" />
                </div>
                <p className="text-[#8B8BA0] mb-2">{activeTab === 'all' ? '暂无订单记录' : '该状态下暂无订单'}</p>
                <p className="text-xs text-[#B0B3C0] mb-4">去挑选一门心仪的课程吧</p>
                <Link href="/courses" className="text-sm text-[#00C4D4] font-bold hover:underline">浏览课程 →</Link>
              </div>
            ) : (
              <div className="space-y-4">
                {filtered.map((order) => {
                  const st = statusMap[order.pay_status] || { label: order.pay_status, color: 'text-[#6B7280]', bg: 'bg-gray-100 border-gray-200', dot: 'bg-[#6B7280]' };
                  return (
                    <div key={order.id} className="bg-white rounded-2xl border border-[#E5E7EB] overflow-hidden transition-shadow hover:shadow-md">
                      {/* 订单头 */}
                      <div className="flex items-center justify-between px-5 py-3 bg-[#FAFAFA] border-b border-[#E5E7EB]">
                        <div className="flex items-center gap-2 text-xs text-[#8B8BA0]">
                          <Icon icon="mdi:package-variant-closed" className="w-4 h-4" />
                          订单号：<span className="font-mono text-[#4A4A6A]">{order.order_no}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-[#B0B3C0]">{order.created_at?.slice(0, 16)}</span>
                          <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full border ${st.bg} ${st.color}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />
                            {st.label}
                          </span>
                        </div>
                      </div>

                      {/* 订单体 */}
                      <div className="flex items-center gap-4 p-5">
                        <div className="w-20 h-14 rounded-xl bg-gradient-to-br from-[#00C4D4]/10 to-[#6D28D9]/10 flex items-center justify-center shrink-0 border border-[#E5E7EB]">
                          <Icon icon="mdi:book-open-variant" className="w-6 h-6 text-[#00C4D4]" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-[#1A1A2E] line-clamp-1">{order.course_title || '课程订单'}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="text-xl font-black text-[#DC2626]">¥{order.amount?.toLocaleString()}</div>
                          <div className="text-xs text-[#8B8BA0] mt-0.5">{order.pay_method === 'alipay' ? '支付宝' : order.pay_method === 'wechat' ? '微信支付' : ''}</div>
                        </div>
                      </div>

                      {/* 订单操作 */}
                      <div className="flex justify-end gap-3 px-5 py-3 bg-[#FAFAFA] border-t border-[#E5E7EB]">
                        {order.pay_status === 'pending' && (
                          <>
                            <button
                              onClick={() => handleCancel(order)}
                              className="px-4 py-1.5 text-xs font-bold text-[#8B8BA0] hover:text-[#DC2626] transition-colors"
                            >
                              取消订单
                            </button>
                            <button
                              onClick={() => handlePay(order)}
                              className="px-4 py-1.5 text-xs font-bold text-white bg-gradient-to-r from-[#00C4D4] to-[#6D28D9] rounded-lg hover:shadow-md transition-all"
                            >
                              去支付
                            </button>
                          </>
                        )}
                        {order.pay_status === 'paid' && (
                          <Link href="/my-courses" className="px-4 py-1.5 text-xs font-bold text-[#059669] border border-[#059669] rounded-lg hover:bg-[#059669] hover:text-white transition-colors">
                            开始学习
                          </Link>
                        )}
                        {order.pay_status === 'refunded' && (
                          <button className="px-4 py-1.5 text-xs font-bold text-[#8B8BA0] hover:text-[#1A1A2E] transition-colors">查看退款详情</button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 支付弹窗 */}
      {payOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={closePayModal}>
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="relative px-6 py-6 text-center text-white overflow-hidden" style={{ background: 'linear-gradient(135deg, #00C4D4 0%, #6D28D9 100%)' }}>
              <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full bg-white/10 pointer-events-none" />
              <div className="absolute -bottom-10 -left-8 w-32 h-32 rounded-full bg-white/5 pointer-events-none" />
              <div className="relative w-14 h-14 mx-auto rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center mb-3">
                <Icon icon="mdi:qrcode-scan" className="w-8 h-8" />
              </div>
              <div className="relative text-lg font-bold">微信支付</div>
              <div className="relative text-sm text-white/80 mt-0.5">请打开微信扫一扫完成支付</div>
            </div>

            <div className="p-6">
              <div className="text-center mb-5">
                <div className="text-[#8B8BA0] text-sm mb-1">应付金额</div>
                <div className="text-4xl font-black tracking-tight text-[#1A1A2E]">¥{Number(payOrder.amount).toLocaleString()}</div>
              </div>

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
                  请使用微信扫一扫付款
                </div>
              </div>

              <button
                onClick={handleCheckPaid}
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
                  '我已支付'
                )}
              </button>
              <button
                onClick={async () => {
                  try {
                    const r = await orderApi.sync(payOrder.order_no);
                    if (r.data?.pay_status === 'paid') {
                      toast.success('支付状态已同步');
                      setPayOrder(null);
                      loadOrders();
                    } else {
                      toast(r.data?.wechat_trade_state === 'SUCCESS' ? '支付未完成' : '尚未支付');
                    }
                  } catch {
                    toast.error('同步订单状态失败');
                  }
                }}
                className="w-full mt-2 py-2.5 text-sm text-[#00C4D4] font-bold hover:underline transition-colors"
              >
                同步订单状态
              </button>
              <button onClick={closePayModal} className="w-full mt-2 py-2.5 text-sm text-[#8B8BA0] hover:text-[#4A4A6A] transition-colors">
                稍后支付
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
