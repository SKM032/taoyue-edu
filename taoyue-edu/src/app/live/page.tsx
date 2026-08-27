'use client';

import { useState, useEffect } from 'react';
import { Icon } from '@iconify/react';
import { contentApi } from '@/lib/api';
import { resolveAssetUrl } from '@/lib/asset';

export default function LivePage() {
  const [lives, setLives] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    contentApi.getLives({ page_size: 50 }).then((res) => setLives(res.data.items || [])).catch(() => {}).finally(() => setLoading(false));
  }, []);

  return (
    <div className="overflow-x-hidden pt-16" style={{ backgroundColor: '#F5F5F7', color: '#1A1A2E', fontFamily: "'Inter', system-ui, -apple-system, sans-serif" }}>
      <section className="pt-20 pb-10 max-w-[1440px] mx-auto px-6 text-center">
        <h1 className="text-4xl font-black text-[#1A1A2E] mb-2">直播公开课</h1>
        <p className="text-lg text-[#8B8BA0]">行业大牛在线分享，紧跟技术趋势与实战经验</p>
      </section>

      <section className="max-w-[1440px] mx-auto px-6 pb-14">
        {loading ? (
          <div className="flex justify-center py-20"><Icon icon="mdi:loading" className="w-8 h-8 animate-spin text-[#00C4D4]" /></div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {lives.map((live) => (
              <div key={live.id} className="bg-white rounded-xl border border-[#E5E7EB] overflow-hidden shadow-md hover:border-[#00C4D4] hover:-translate-y-1 transition-all">
                <div className="relative aspect-video bg-[#F3F4F6]">
                  {live.cover ? <img src={resolveAssetUrl(live.cover)} alt={live.title} loading="lazy" decoding="async" width={600} height={400} className="w-full h-full object-cover" /> : (
                    <div className="w-full h-full flex items-center justify-center"><Icon icon="mdi:play-circle" className="w-16 h-16 text-[#D1D5DB]" /></div>
                  )}
                  <span className={`absolute top-3 left-3 text-xs font-bold px-2.5 py-1 rounded ${live.status === 'live' ? 'bg-[#DC2626] text-white animate-pulse' : live.status === 'upcoming' ? 'bg-[#D97706] text-white' : 'bg-[#6B7280] text-white'}`}>
                    {live.status === 'live' ? '正在直播' : live.status === 'upcoming' ? '即将开始' : '回放'}
                  </span>
                </div>
                <div className="p-5">
                  <h3 className="font-bold text-[#1A1A2E] line-clamp-2 mb-2">{live.title}</h3>
                  <p className="text-xs text-[#8B8BA0] line-clamp-2 mb-3">{live.description}</p>
                  <div className="flex items-center justify-between text-xs text-[#8B8BA0]">
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded-full bg-gradient-to-br from-[#00C4D4] to-[#6D28D9] flex items-center justify-center text-white text-[10px] font-bold">{live.teacher_name?.[0] || 'T'}</div>
                      <span>{live.teacher_name}</span>
                    </div>
                    <span>{live.viewer_count}人观看</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
