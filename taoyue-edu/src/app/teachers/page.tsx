'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Icon } from '@iconify/react';
import { courseApi } from '@/lib/api';
import { resolveAssetUrl } from '@/lib/asset';

export default function TeachersPage() {
  const [teachers, setTeachers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    courseApi.getTeachers().then((res) => setTeachers(res.data || [])).catch(() => {}).finally(() => setLoading(false));
  }, []);

  return (
    <div className="overflow-x-hidden pt-16" style={{ backgroundColor: '#F5F5F7', color: '#1A1A2E', fontFamily: "'Inter', system-ui, -apple-system, sans-serif" }}>
      <section className="pt-20 pb-10 max-w-[1440px] mx-auto px-6 text-center">
        <h1 className="text-4xl font-black text-[#1A1A2E] mb-2">明星讲师阵容</h1>
        <p className="text-lg text-[#8B8BA0]">一线大牛讲师阵容，用实战经验赋能你的职业成长</p>
      </section>

      <section className="max-w-[1440px] mx-auto px-6 pb-14">
        {loading ? (
          <div className="flex justify-center py-20"><Icon icon="mdi:loading" className="w-8 h-8 animate-spin text-[#00C4D4]" /></div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {teachers.map((teacher) => (
              <Link
                key={teacher.id}
                href={`/teachers/${teacher.id}`}
                className="block bg-white rounded-2xl p-6 shadow-sm border border-[#E5E7EB] text-center hover:border-[#6D28D9] hover:-translate-y-1 transition-all"
              >
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#00C4D4] to-[#6D28D9] flex items-center justify-center text-white text-2xl font-bold mx-auto mb-4">
                  {teacher.avatar ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={resolveAssetUrl(teacher.avatar)} alt={teacher.name} loading="lazy" decoding="async" width={200} height={200} className="w-full h-full object-cover rounded-full" />
                  ) : (
                    teacher.name?.[0]
                  )}
                </div>
                <h3 className="font-bold text-lg text-[#1A1A2E]">{teacher.name}</h3>
                <p className="text-sm text-[#00C4D4] font-medium mt-1">{teacher.title}</p>
                <p className="text-sm text-[#4A4A6A] mt-2 line-clamp-2">{teacher.description}</p>
                <div className="flex flex-wrap justify-center gap-1.5 mt-3">
                  {(teacher.skills || []).slice(0, 4).map((skill: string, i: number) => (
                    <span key={i} className="text-xs bg-[#EDE9FE] text-[#6D28D9] px-2 py-0.5 rounded-full font-medium">{skill}</span>
                  ))}
                </div>
                <div className="flex justify-center gap-6 mt-4 text-xs text-[#8B8BA0]">
                  <span>{teacher.course_count}门课程</span>
                  <span>{teacher.student_count}学员</span>
                  <span>评分 {teacher.rating?.toFixed(1)}</span>
                </div>
                <span className="block text-[#00C4D4] text-sm font-bold mt-4 hover:underline">进入主页 →</span>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
