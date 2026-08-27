import { useEffect, useState } from 'react';
import { adminApi } from '../lib/api';
import InlineToast from '../components/InlineToast';

const statusMap: Record<string, { color: string; bg: string; label: string }> = {
  pending: { color: 'text-amber-600', bg: 'bg-amber-50', label: '待支付' },
  paid: { color: 'text-emerald-600', bg: 'bg-emerald-50', label: '已支付' },
  refunded: { color: 'text-red-600', bg: 'bg-red-50', label: '已退款' },
  cancelled: { color: 'text-slate-500', bg: 'bg-slate-100', label: '已取消' },
};

const payMethodMap: Record<string, string> = {
  wechat: '微信支付',
  alipay: '支付宝',
};

export default function OrderList() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [keyword, setKeyword] = useState('');
  const [payStatus, setPayStatus] = useState('');
  const [toast, setToast] = useState('');

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 2500); };

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const res = await adminApi.getOrders({
        page, page_size: 20,
        keyword: keyword || undefined,
        pay_status: payStatus || undefined,
      });
      setOrders(res.data.items);
      setTotal(res.data.total);
    } catch { showToast('获取订单失败'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchOrders(); }, [page, payStatus]);

  const handleSearch = () => { setPage(1); fetchOrders(); };

  // 计算总金额
  const totalAmount = orders.reduce((sum, o) => sum + (o.amount || 0), 0);

  return (
    <div className="space-y-5">
      {toast && (
        <InlineToast
          message={toast}
          type={toast.includes('失败') ? 'error' : 'success'}
          onClose={() => setToast('')}
        />
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-800">交易明细</h1>
          <p className="text-sm text-slate-500 mt-1">共 {total} 笔交易</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-slate-400">本页合计</p>
          <p className="text-lg font-bold text-red-500">¥{totalAmount.toLocaleString()}</p>
        </div>
      </div>

      {/* 筛选栏 */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative">
          <iconify-icon icon="lucide:search" class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm"></iconify-icon>
          <input
            type="text"
            placeholder="搜索订单号..."
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className="pl-9 pr-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent w-60"
          />
        </div>
        <select
          value={payStatus}
          onChange={(e) => { setPayStatus(e.target.value); setPage(1); }}
          className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">全部状态</option>
          {Object.entries(statusMap).map(([k, v]) => (
            <option key={k} value={k}>{v.label}</option>
          ))}
        </select>
        <button onClick={() => { setKeyword(''); setPayStatus(''); setPage(1); }} className="px-3 py-2 text-sm text-slate-500 hover:text-slate-700 hover:bg-gray-100 rounded-lg transition-colors">重置</button>
        <button onClick={handleSearch} className="px-4 py-2 bg-slate-100 text-slate-600 rounded-lg text-sm hover:bg-slate-200 transition-colors">搜索</button>
      </div>

      {/* 订单列表 */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden overflow-x-auto">
        <div className="hidden md:grid grid-cols-12 gap-4 px-5 py-3 bg-slate-50 border-b border-gray-200 text-xs font-semibold text-slate-500 uppercase tracking-wider min-w-[800px]">
          <div className="col-span-2">订单号</div>
          <div className="col-span-2">课程</div>
          <div className="col-span-1">买家</div>
          <div className="col-span-1">金额</div>
          <div className="col-span-1">支付方式</div>
          <div className="col-span-1">状态</div>
          <div className="col-span-2">下单时间</div>
          <div className="col-span-2">手机号</div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <svg className="animate-spin h-6 w-6 text-indigo-500" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
            </svg>
          </div>
        ) : orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400">
            <iconify-icon icon="lucide:receipt" class="text-5xl mb-3 opacity-30"></iconify-icon>
            <p className="text-sm">暂无订单数据</p>
          </div>
        ) : (
          orders.map((order) => {
            const s = statusMap[order.pay_status] || { color: 'text-slate-500', bg: 'bg-slate-100', label: order.pay_status };
            return (
              <div key={order.id} className="md:grid grid-cols-12 gap-4 px-5 py-3 border-b border-gray-100 hover:bg-slate-50 transition-colors items-center min-w-[800px]">
                <div className="col-span-2 text-xs font-mono text-slate-500 truncate">{order.order_no}</div>
                <div className="col-span-2 text-sm font-medium text-slate-700 truncate">{order.course_title}</div>
                <div className="col-span-1 text-sm text-slate-600">{order.user_name}</div>
                <div className="col-span-1 text-sm font-semibold text-red-500">¥{order.amount}</div>
                <div className="col-span-1 text-sm text-slate-500">{payMethodMap[order.pay_method] || order.pay_method || '-'}</div>
                <div className="col-span-1">
                  <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${s.color} ${s.bg}`}>{s.label}</span>
                </div>
                <div className="col-span-2 text-sm text-slate-500">{order.created_at?.slice(0, 16)}</div>
                <div className="col-span-2 text-sm text-slate-500">{order.user_phone || '-'}</div>
              </div>
            );
          })
        )}
      </div>

      {/* 分页 */}
      {total > 20 && (
        <div className="flex items-center justify-between text-sm text-slate-500">
          <span>共 {total} 条记录</span>
          <div className="flex items-center gap-1">
            <button disabled={page <= 1} onClick={() => setPage(page - 1)} className="px-3 py-1.5 rounded-md hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed">上一页</button>
            <span className="px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-md font-medium">{page}</span>
            <button disabled={page * 20 >= total} onClick={() => setPage(page + 1)} className="px-3 py-1.5 rounded-md hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed">下一页</button>
          </div>
        </div>
      )}
    </div>
  );
}
