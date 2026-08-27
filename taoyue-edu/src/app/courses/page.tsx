'use client';

import { useState, useEffect, useCallback, useMemo, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Icon } from '@iconify/react';
import { courseApi } from '@/lib/api';
import { resolveAssetUrl } from '@/lib/asset';

export default function CoursesPage() {
  return (
    <Suspense fallback={<div className="flex justify-center py-20">加载中...</div>}>
      <CoursesContent />
    </Suspense>
  );
}

function CoursesContent() {
  const searchParams = useSearchParams();
  const [courses, setCourses] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  const [categoryId, setCategoryId] = useState<string>(searchParams.get('category') || '');
  const [priceRange, setPriceRange] = useState(searchParams.get('price_range') || '');
  const [sortBy, setSortBy] = useState('latest');

  // 动态获取分类（slug → id 映射）
  useEffect(() => {
    courseApi.getCategories()
      .then((res) => setCategories(res.data || []))
      .catch(() => {});
  }, []);

  const catMap = useMemo(() => {
    const map: Record<string, string> = {};
    const walk = (list: any[]) => {
      list.forEach((c: any) => {
        map[c.slug] = String(c.id);
        if (c.children?.length) walk(c.children);
      });
    };
    walk(categories);
    return map;
  }, [categories]);

  const fetchCourses = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, any> = { page, page_size: 12, sort_by: sortBy };
      if (categoryId) params.category_id = catMap[categoryId] || categoryId;
      if (priceRange) {
        const [min, max] = priceRange.split('-');
        if (min) params.price_min = min;
        if (max) params.price_max = max;
      }
      const res = await courseApi.getList(params);
      setCourses(res.data.items || []);
    } catch (err) {
      console.error('Failed to fetch courses:', err);
    } finally {
      setLoading(false);
    }
  }, [page, categoryId, priceRange, sortBy, catMap]);

  useEffect(() => { fetchCourses(); }, [fetchCourses]);

  const typeLabels: Record<string, { label: string; color: string }> = {
    recorded: { label: '系统录播', color: 'bg-[#00C4D4]' },
    live: { label: '直播班', color: 'bg-[#6D28D9]' },
    bootcamp: { label: '训练营', color: 'bg-[#059669]' },
    private: { label: '私教陪跑', color: 'bg-[#6D28D9]' },
  };

  const categoryOptions = useMemo(() => {
    const opts: { label: string; value: string }[] = [{ label: '全部', value: '' }];
    const walk = (list: any[], depth: number) => {
      list.forEach((c: any) => {
        opts.push({ label: `${depth === 1 ? '　' : ''}${c.name}`, value: c.slug });
        if (c.children?.length) walk(c.children, depth + 1);
      });
    };
    walk(categories, 1);
    return opts;
  }, [categories]);
  const priceOptions = [
    { label: '全部', value: '' },
    { label: '免费', value: '0-0' },
    { label: '低价（¥9.9-99）', value: '1-99' },
    { label: '正价（¥100-5000）', value: '100-5000' },
    { label: '高客单（¥5000+）', value: '5001-999999' },
  ];
  const sortOptions = [
    { label: '最新', value: 'latest' },
    { label: '最热', value: 'popular' },
    { label: '好评', value: 'rating' },
  ];

  const filterSections = [
    { label: '赛道筛选', key: 'categoryId', state: categoryId, setState: setCategoryId, options: categoryOptions },
    { label: '价格筛选', key: 'priceRange', state: priceRange, setState: setPriceRange, options: priceOptions },
    { label: '排序方式', key: 'sortBy', state: sortBy, setState: setSortBy, options: sortOptions },
  ];

  return (
    <div className="overflow-x-hidden pt-16" style={{ backgroundColor: '#F5F5F7', color: '#1A1A2E', fontFamily: "'Inter', system-ui, -apple-system, sans-serif" }}>
      {/* 页面标题 */}
      <section className="pt-20 pb-6 max-w-[1440px] mx-auto px-6">
        <h1 className="text-4xl font-black text-[#1A1A2E] mb-2">全部实战课程</h1>
        <p className="text-lg text-[#4A4A6A]">精选 500+ 门实战课程，覆盖三大热门赛道</p>
      </section>

      {/* 筛选区 */}
      <section className="max-w-[1440px] mx-auto px-6 pb-8">
        <div className="bg-white rounded-2xl shadow-md p-6 space-y-6">
          {filterSections.map((section) => (
            <div key={section.key}>
              <h3 className="font-semibold text-sm text-[#1A1A2E] mb-3">{section.label}</h3>
              <div className="flex flex-wrap gap-2">
                {section.options.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => { section.setState(opt.value); setPage(1); }}
                    className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-colors ${
                      section.state === opt.value
                        ? 'bg-[#00C4D4] text-white'
                        : 'bg-white border border-[#E5E7EB] text-[#4A4A6A] hover:border-[#00C4D4]'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 课程网格 */}
      <section className="max-w-[1440px] mx-auto px-6 pb-14">
        {loading ? (
          <div className="flex justify-center py-20">
            <Icon icon="mdi:loading" className="w-8 h-8 animate-spin text-[#00C4D4]" />
          </div>
        ) : courses.length === 0 ? (
          <div className="text-center py-20 text-[#8B8BA0]">
            <Icon icon="mdi:book-remove" className="w-16 h-16 mx-auto mb-4" />
            <p>暂无课程数据</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-6">
              {courses.map((course) => {
                const typeInfo = typeLabels[course.course_type] || { label: course.course_type, color: 'bg-[#00C4D4]' };
                return (
                  <Link
                    key={course.id}
                    href={`/course/${course.slug}`}
                    className="block bg-white rounded-xl border border-[#E5E7EB] overflow-hidden shadow-sm md:shadow-md hover:border-[#00C4D4] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_10px_25px_rgba(0,196,212,0.1)] group"
                  >
                    <div className="relative aspect-[4/3] bg-[#F3F4F6]">
                      {course.cover ? (
                        <img alt={course.title} loading="lazy" decoding="async" width={800} height={600} className="w-full h-full object-cover" src={resolveAssetUrl(course.cover)} />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Icon icon="mdi:book-education" className="w-10 h-10 text-[#D1D5DB]" />
                        </div>
                      )}
                      <div className="absolute inset-0 hidden md:flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-white/80">
                        <span className="bg-[#00C4D4] text-white px-4 py-2 rounded-lg font-bold text-sm shadow-md">了解详情</span>
                      </div>
                      <div className={`absolute top-2 left-2 md:top-3 md:left-3 ${typeInfo.color} text-white text-[10px] font-bold px-2 py-0.5 rounded`}>
                        {typeInfo.label}
                      </div>
                    </div>
                    <div className="p-3 md:p-5">
                      <h3 className="font-bold mb-2 md:mb-1 line-clamp-1 text-sm md:text-base text-[#1A1A2E]">{course.title}</h3>
                      {/* 讲师行：移动端隐藏 */}
                      <div className="hidden md:flex items-center space-x-2 text-xs text-[#8B8BA0] mb-3">
                        <div className="w-5 h-5 rounded-full bg-gradient-to-br from-[#00C4D4] to-[#6D28D9] flex items-center justify-center text-white text-[10px] font-bold">
                          {course.teacher?.name?.[0] || 'T'}
                        </div>
                        <span>{course.teacher?.name || '未知讲师'} · {course.teacher?.title || ''}</span>
                      </div>
                      {/* 学员/评分：移动端隐藏 */}
                      <div className="hidden md:flex items-center justify-between text-xs text-[#8B8BA0] mb-3">
                        <span className="flex items-center space-x-1">
                          <Icon icon="mdi:account-group" />
                          <span>{course.student_count?.toLocaleString()} 学员</span>
                        </span>
                        <span className="flex items-center space-x-1 text-[#D97706]">
                          <Icon icon="mdi:star" />
                          <span>{course.rating?.toFixed(1) || '5.0'}</span>
                        </span>
                      </div>
                      <div className="text-[#DC2626] font-bold text-base md:text-lg">
                        {course.price === 0 ? '免费' : `¥${course.price?.toLocaleString()}`}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </>
        )}
      </section>
    </div>
  );
}
