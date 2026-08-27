'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Icon } from '@iconify/react';
import { orderApi } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { resolveAssetUrl } from '@/lib/asset';

export default function MyCoursesPage() {
  const { isLoggedIn } = useAuth();
  const [enrollments, setEnrollments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isLoggedIn) return;
    orderApi.getEnrollments()
      .then((res) => setEnrollments(res.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [isLoggedIn]);

  if (!isLoggedIn) {
    return (
      <div className="text-center py-20">
        <Icon icon="mdi:lock" className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-gray-400">请先登录</h2>
        <Link href="/login" className="text-primary-500 mt-2 inline-block">前往登录</Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold mb-8">我的课程</h1>
      {loading ? (
        <div className="flex justify-center py-20">
          <Icon icon="mdi:loading" className="w-8 h-8 animate-spin text-primary-500" />
        </div>
      ) : enrollments.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <Icon icon="mdi:book-open-blank-variant" className="w-16 h-16 mx-auto mb-4" />
          <p>还没有购买任何课程</p>
          <Link href="/courses" className="text-primary-500 mt-2 inline-block">去逛逛</Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {enrollments.map((e) => (
            <Link key={e.id} href={`/course/${e.course_id}`} className="card p-4">
              <div className="flex gap-4">
                <div className="w-24 h-16 rounded-lg bg-gradient-to-br from-primary-100 to-secondary-100 flex items-center justify-center shrink-0">
                  {e.course_cover ? (
                    <img src={resolveAssetUrl(e.course_cover)} alt="" loading="lazy" decoding="async" width={600} height={400} className="w-full h-full object-cover rounded-lg" />
                  ) : (
                    <Icon icon="mdi:book-education" className="w-8 h-8 text-primary-300" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-sm line-clamp-2">{e.course_title}</h3>
                  <div className="mt-2">
                    <div className="flex items-center justify-between text-xs text-gray-400 mb-1">
                      <span>学习进度</span>
                      <span>{e.progress || 0}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-primary-500 to-secondary-500 rounded-full transition-all"
                        style={{ width: `${e.progress || 0}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
