import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ReactEChartsCore from 'echarts-for-react/lib/core';
import * as echarts from 'echarts/core';
import { LineChart } from 'echarts/charts';
import { GridComponent, TooltipComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import { adminApi } from '../lib/api';

echarts.use([LineChart, GridComponent, TooltipComponent, CanvasRenderer]);

interface DashboardData {
  stats: {
    total_courses: number;
    total_users: number;
    total_orders: number;
    period_revenue: number;
    revenue_growth: number;
  };
  trend: { date: string; amount: number }[];
  hot_courses: { id: number; title: string; price: number; student_count: number; rating: number }[];
}

const StatCard = ({ title, value, icon, color, suffix }: {
  title: string; value: string | number; icon: string; color: string; suffix?: React.ReactNode;
}) => (
  <div className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow">
    <div className="flex items-start justify-between">
      <div className="flex-1">
        <p className="text-sm text-slate-500 font-medium mb-1">{title}</p>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold text-slate-800">{value}</span>
          {suffix}
        </div>
      </div>
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${color}`}>
        <iconify-icon icon={icon} class="text-white text-lg"></iconify-icon>
      </div>
    </div>
  </div>
);

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('week');
  const navigate = useNavigate();

  useEffect(() => {
    setLoading(true);
    adminApi.getDashboard(period)
      .then((res) => setData(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [period]);

  const stats = data?.stats || { total_courses: 0, total_users: 0, total_orders: 0, period_revenue: 0, revenue_growth: 0 };
  const trend = data?.trend || [];
  const hotCourses = data?.hot_courses || [];

  const trendOption = {
    tooltip: {
      trigger: 'axis' as const,
      backgroundColor: '#1e293b',
      borderColor: '#334155',
      textStyle: { color: '#e2e8f0', fontSize: 12 },
    },
    grid: { left: 45, right: 20, top: 20, bottom: 30 },
    xAxis: {
      type: 'category' as const,
      data: trend.map((t) => t.date),
      axisLine: { lineStyle: { color: '#e2e8f0' } },
      axisTick: { show: false },
      axisLabel: { color: '#94a3b8', fontSize: 11 },
    },
    yAxis: {
      type: 'value' as const,
      axisLine: { show: false },
      axisTick: { show: false },
      splitLine: { lineStyle: { color: '#f1f5f9' } },
      axisLabel: { color: '#94a3b8', fontSize: 11 },
    },
    series: [{
      data: trend.map((t) => t.amount),
      type: 'line' as const,
      smooth: true,
      symbol: 'circle',
      symbolSize: 4,
      areaStyle: {
        color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
          { offset: 0, color: 'rgba(99,102,241,0.2)' },
          { offset: 1, color: 'rgba(99,102,241,0)' },
        ]),
      },
      lineStyle: { color: '#6366f1', width: 2 },
      itemStyle: { color: '#6366f1' },
    }],
  };

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

  return (
    <div className="space-y-6">
      {/* 页头 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-800">工作台</h1>
          <p className="text-sm text-slate-500 mt-1">欢迎回来，查看平台运营概览</p>
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
                period === p.key
                  ? 'bg-white text-slate-800 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="在营课程" value={stats.total_courses} icon="lucide:book-open" color="bg-indigo-500" />
        <StatCard title="总用户数" value={stats.total_users} icon="lucide:users" color="bg-purple-500" />
        <StatCard title="总订单数" value={stats.total_orders} icon="lucide:shopping-cart" color="bg-blue-500" />
        <StatCard
          title="周期交易额"
          value={`¥${(stats.period_revenue || 0).toLocaleString()}`}
          icon="lucide:dollar-sign"
          color="bg-emerald-500"
          suffix={
            <span className={`text-xs font-medium ${stats.revenue_growth >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
              {stats.revenue_growth >= 0 ? '+' : ''}{stats.revenue_growth}%
            </span>
          }
        />
      </div>

      {/* 图表 + 快捷操作 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 销售趋势 */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-slate-700 mb-4">销售趋势</h3>
          {trend.length > 0 ? (
            <ReactEChartsCore echarts={echarts} option={trendOption} style={{ height: 280 }} />
          ) : (
            <div className="flex items-center justify-center h-[280px] text-slate-400 text-sm">
              <div className="text-center">
                <iconify-icon icon="lucide:bar-chart-3" class="text-4xl mb-2 opacity-30"></iconify-icon>
                <p>暂无销售数据</p>
              </div>
            </div>
          )}
        </div>

        {/* 快捷操作 + 热门课程 */}
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="text-sm font-semibold text-slate-700 mb-3">快捷操作</h3>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => navigate('/courses/create')}
                className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-indigo-50 text-indigo-600 text-sm font-medium hover:bg-indigo-100 transition-colors"
              >
                <iconify-icon icon="lucide:plus-circle" class="text-base"></iconify-icon>
                创建课程
              </button>
              <button
                onClick={() => navigate('/courses')}
                className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-slate-50 text-slate-600 text-sm font-medium hover:bg-slate-100 transition-colors"
              >
                <iconify-icon icon="lucide:book-open" class="text-base"></iconify-icon>
                课程管理
              </button>
              <button
                onClick={() => navigate('/orders')}
                className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-slate-50 text-slate-600 text-sm font-medium hover:bg-slate-100 transition-colors"
              >
                <iconify-icon icon="lucide:receipt" class="text-base"></iconify-icon>
                交易查询
              </button>
              <button
                onClick={() => navigate('/users')}
                className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-slate-50 text-slate-600 text-sm font-medium hover:bg-slate-100 transition-colors"
              >
                <iconify-icon icon="lucide:users" class="text-base"></iconify-icon>
                用户管理
              </button>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="text-sm font-semibold text-slate-700 mb-3">热门课程</h3>
            {hotCourses.length > 0 ? (
              <div className="space-y-2 max-h-[200px] overflow-y-auto">
                {hotCourses.map((course) => (
                  <div key={course.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 transition-colors">
                    <div className="w-9 h-9 rounded-lg bg-indigo-100 flex items-center justify-center flex-shrink-0">
                      <iconify-icon icon="lucide:book-open" class="text-indigo-500 text-sm"></iconify-icon>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-700 truncate">{course.title}</p>
                      <p className="text-xs text-slate-400">{course.student_count} 学员</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm font-semibold text-slate-700">¥{course.price}</p>
                      <p className="text-xs text-amber-500">★ {course.rating?.toFixed(1)}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-center py-8 text-slate-400 text-sm">
                <div className="text-center">
                  <iconify-icon icon="lucide:inbox" class="text-3xl mb-1 opacity-30"></iconify-icon>
                  <p>暂无数据</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
