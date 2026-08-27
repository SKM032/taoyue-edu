'use client';

import { useState, useEffect } from 'react';
import { Icon } from '@iconify/react';
import { contentApi } from '@/lib/api';
import { resolveAssetUrl } from '@/lib/asset';

export default function BootcampPage() {
  const [bootcamps, setBootcamps] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    contentApi.getBootcamps({ page_size: 50 }).then((res) => setBootcamps(res.data.items || [])).catch(() => {}).finally(() => setLoading(false));
  }, []);

  return (
    <div className="overflow-x-hidden pt-16" style={{ backgroundColor: '#F5F5F7', color: '#1A1A2E', fontFamily: "'Inter', system-ui, -apple-system, sans-serif" }}>
      <section className="pt-20 pb-10 max-w-[1440px] mx-auto px-6 text-center">
        <h1 className="text-4xl font-black text-[#1A1A2E] mb-2">热门训练营</h1>
        <p className="text-lg text-[#8B8BA0]">高强度集训，大牛带队，快速掌握核心实战技能</p>
      </section>

      <section className="max-w-[1440px] mx-auto px-6 pb-14">
        {loading ? (
          <div className="flex justify-center py-20"><Icon icon="mdi:loading" className="w-8 h-8 animate-spin text-[#00C4D4]" /></div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {bootcamps.map((bc) => (
              <div key={bc.id} className="bg-white rounded-xl border border-[#E5E7EB] overflow-hidden shadow-md hover:border-[#059669] hover:-translate-y-1 transition-all">
                <div className="relative aspect-video bg-gradient-to-br from-[#D1FAE5] to-[#A7F3D0]">
                  {bc.cover ? <img src={resolveAssetUrl(bc.cover)} alt={bc.title} loading="lazy" decoding="async" width={600} height={400} className="w-full h-full object-cover" /> : (
                    <div className="w-full h-full flex items-center justify-center"><Icon icon="mdi:school" className="w-16 h-16 text-[#059669]/40" /></div>
                  )}
                  <span className="absolute top-3 left-3 text-xs font-bold px-2.5 py-1 rounded bg-[#059669] text-white">训练营</span>
                </div>
                <div className="p-5">
                  <h3 className="font-bold text-[#1A1A2E] mb-2">{bc.title}</h3>
                  <p className="text-xs text-[#8B8BA0] line-clamp-2 mb-3">{bc.description}</p>
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-lg font-bold text-[#DC2626]">¥{bc.price}</div>
                    <span className="text-xs text-[#8B8BA0]">{bc.enrolled_count}/{bc.max_students}人</span>
                  </div>
                  <div className="w-full h-2 bg-[#F3F4F6] rounded-full overflow-hidden mb-3">
                    <div className="h-full bg-[#059669] rounded-full" style={{ width: `${Math.min(100, (bc.enrolled_count / bc.max_students) * 100)}%` }} />
                  </div>
                  <div className="flex items-center justify-between text-xs text-[#8B8BA0]">
                    <span>{bc.teacher_name}</span>
                    <span className="font-bold text-[#059669]">{bc.status === 'enrolling' ? '报名中' : bc.status === 'in_progress' ? '进行中' : '已结束'}</span>
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
