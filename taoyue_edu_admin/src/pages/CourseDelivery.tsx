import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ReactEChartsCore from 'echarts-for-react/lib/core';
import * as echarts from 'echarts/core';
import { PieChart } from 'echarts/charts';
import { TooltipComponent, LegendComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import { adminApi } from '../lib/api';

echarts.use([PieChart, TooltipComponent, LegendComponent, CanvasRenderer]);

export default function CourseDelivery() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    adminApi.getDeliveryStats(Number(id))
      .then((res) => setData(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

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
      <div className="space-y-5">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/courses')} className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-500 hover:bg-gray-100 transition-colors">
            <iconify-icon icon="lucide:arrow-left" class="text-base"></iconify-icon>
          </button>
          <h1 className="text-xl font-bold text-slate-800">交付监控</h1>
        </div>
        <div className="flex flex-col items-center justify-center py-16 text-slate-400">
          <iconify-icon icon="lucide:inbox" class="text-5xl mb-3 opacity-30"></iconify-icon>
          <p className="text-sm">暂无数据</p>
        </div>
      </div>
    );
  }

  const pieOption = {
    tooltip: { trigger: 'item' as const, backgroundColor: '#1e293b', borderColor: '#334155', textStyle: { color: '#e2e8f0' } },
    legend: { bottom: 0, textStyle: { color: '#94a3b8' } },
    series: [{
      type: 'pie' as const,
      radius: ['45%', '72%'],
      center: ['50%', '45%'],
      itemStyle: { borderColor: '#fff', borderWidth: 2 },
      label: { show: false },
      data: Object.entries(data.progress_distribution || {}).map(([k, v], i) => ({
        name: `进度 ${k}%`,
        value: v as number,
        itemStyle: { color: ['#6366f1', '#8b5cf6', '#a78bfa', '#c4b5fd', '#e0e7ff'][i % 5] },
      })),
    }],
  };

  return (
    <div className="space-y-6">
      {/* 页头 */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/courses')} className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-500 hover:bg-gray-100 transition-colors">
          <iconify-icon icon="lucide:arrow-left" class="text-base"></iconify-icon>
        </button>
        <div>
          <h1 className="text-xl font-bold text-slate-800">交付监控</h1>
          <p className="text-sm text-slate-500 mt-0.5">{data.course_title}</p>
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-5 flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-indigo-500 flex items-center justify-center">
            <iconify-icon icon="lucide:users" class="text-white text-lg"></iconify-icon>
          </div>
          <div>
            <p className="text-sm text-slate-500">累计学员</p>
            <p className="text-2xl font-bold text-slate-800">{data.total_students || 0}</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5 flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-purple-500 flex items-center justify-center">
            <iconify-icon icon="lucide:trending-up" class="text-white text-lg"></iconify-icon>
          </div>
          <div>
            <p className="text-sm text-slate-500">平均进度</p>
            <p className="text-2xl font-bold text-slate-800">{Math.round(data.avg_progress || 0)}%</p>
          </div>
        </div>
      </div>

      {/* 图表 + 学员列表 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-slate-700 mb-2">学习进度分布</h3>
          <ReactEChartsCore echarts={echarts} option={pieOption} style={{ height: 280 }} />
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-slate-700 mb-3">学员学习进度</h3>
          <div className="space-y-2 max-h-[280px] overflow-y-auto">
            {(data.students || []).length > 0 ? (
              (data.students || []).map((student: any, idx: number) => (
                <div key={idx} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-slate-50 transition-colors">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center flex-shrink-0">
                    <span className="text-white text-xs font-bold">{student.user_name?.[0] || '?'}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-700 truncate">{student.user_name}</p>
                    <div className="mt-1 w-full bg-gray-200 rounded-full h-1.5">
                      <div
                        className="bg-indigo-500 h-1.5 rounded-full transition-all"
                        style={{ width: `${Math.round(student.progress || 0)}%` }}
                      ></div>
                    </div>
                  </div>
                  <span className="text-xs font-medium text-slate-500 flex-shrink-0">{Math.round(student.progress || 0)}%</span>
                </div>
              ))
            ) : (
              <div className="flex items-center justify-center py-10 text-slate-400 text-sm">
                <div className="text-center">
                  <iconify-icon icon="lucide:users" class="text-3xl mb-1 opacity-30"></iconify-icon>
                  <p>暂无学员数据</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
