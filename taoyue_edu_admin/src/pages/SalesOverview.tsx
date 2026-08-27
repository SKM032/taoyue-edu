import { useEffect, useState } from 'react';
import ReactEChartsCore from 'echarts-for-react/lib/core';
import * as echarts from 'echarts/core';
import { PieChart } from 'echarts/charts';
import { TooltipComponent, LegendComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import { adminApi } from '../lib/api';

echarts.use([PieChart, TooltipComponent, LegendComponent, CanvasRenderer]);

export default function SalesOverview() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('month');

  useEffect(() => {
    setLoading(true);
    adminApi.getSalesOverview(period)
      .then((res) => setData(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [period]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="flex flex-col items-center gap-3">
          <svg className="animate-spin h-8 w-8 text-indigo-500" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
          </svg>
          <span className="text-sm text-slate-400">加载中...</span>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-slate-400">
        <iconify-icon icon="lucide:bar-chart-3" class="text-5xl mb-3 opacity-30"></iconify-icon>
        <p className="text-sm">暂无销售数据</p>
      </div>
    );
  }

  const paymentChannels = data.payment_channels || {};

  const pieOption = {
    tooltip: { trigger: 'item' as const, backgroundColor: '#1e293b', borderColor: '#334155', textStyle: { color: '#e2e8f0' } },
    legend: { bottom: 0, textStyle: { color: '#94a3b8' } },
    series: [{
      type: 'pie' as const,
      radius: ['45%', '72%'],
      center: ['50%', '45%'],
      itemStyle: { borderColor: '#fff', borderWidth: 2 },
      label: { show: false },
      emphasis: { label: { show: true, fontSize: 14, fontWeight: 'bold' } },
      data: [
        { name: '微信支付', value: paymentChannels.wechat?.count || 0, itemStyle: { color: '#6366f1' } },
        { name: '支付宝', value: paymentChannels.alipay?.count || 0, itemStyle: { color: '#8b5cf6' } },
      ],
    }],
  };

  const stats = [
    { label: '总交易额', value: `¥${(data.total_revenue || 0).toLocaleString()}`, icon: 'lucide:dollar-sign', color: 'bg-indigo-500' },
    { label: '周期交易额', value: `¥${(data.period_revenue || 0).toLocaleString()}`, icon: 'lucide:trending-up', color: 'bg-emerald-500' },
    { label: '总订单数', value: data.total_orders || 0, icon: 'lucide:shopping-cart', color: 'bg-blue-500' },
    { label: '周期订单数', value: data.period_orders || 0, icon: 'lucide:receipt', color: 'bg-purple-500' },
  ];

  return (
    <div className="space-y-6">
      {/* 页头 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-800">销售概览</h1>
          <p className="text-sm text-slate-500 mt-1">交易数据与关键指标</p>
        </div>
        <div className="flex bg-gray-100 rounded-lg p-1 gap-0.5">
          {[
            { key: 'today', label: '今日' },
            { key: 'week', label: '本周' },
            { key: 'month', label: '本月' },
          ].map((p) => (
            <button
              key={p.key}
              onClick={() => setPeriod(p.key)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                period === p.key ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => (
          <div key={s.label} className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className={`w-9 h-9 rounded-lg ${s.color} flex items-center justify-center`}>
                <iconify-icon icon={s.icon} class="text-white text-sm"></iconify-icon>
              </div>
              <span className="text-sm text-slate-500">{s.label}</span>
            </div>
            <p className="text-2xl font-bold text-slate-800">{s.value}</p>
          </div>
        ))}
      </div>

      {/* 图表 + 关键指标 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-slate-700 mb-2">支付渠道占比</h3>
          <ReactEChartsCore echarts={echarts} option={pieOption} style={{ height: 260 }} />
        </div>

        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-slate-700 mb-4">关键指标</h3>
          <div className="grid grid-cols-2 gap-6">
            <div className="p-4 bg-slate-50 rounded-xl">
              <p className="text-sm text-slate-500 mb-1">平均客单价</p>
              <p className="text-2xl font-bold text-slate-800">¥{(data.avg_price || 0).toFixed(2)}</p>
            </div>
            <div className="p-4 bg-slate-50 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-indigo-500"></span>
                  <span className="text-sm text-slate-600">微信支付</span>
                </div>
                <span className="text-sm font-semibold text-indigo-600">{paymentChannels.wechat?.percent || 0}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-indigo-500 h-2 rounded-full" style={{ width: `${paymentChannels.wechat?.percent || 0}%` }}></div>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-purple-500"></span>
                  <span className="text-sm text-slate-600">支付宝</span>
                </div>
                <span className="text-sm font-semibold text-purple-600">{paymentChannels.alipay?.percent || 0}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-purple-500 h-2 rounded-full" style={{ width: `${paymentChannels.alipay?.percent || 0}%` }}></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
