'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Icon } from '@iconify/react';
import toast from 'react-hot-toast';
import { courseApi } from '@/lib/api';
import { resolveAssetUrl } from '@/lib/asset';

interface Category {
  id: number;
  name: string;
  slug: string;
  icon?: string;
  description?: string;
  course_count?: number;
  children?: Category[];
}

const typeLabels: Record<string, { label: string; color: string }> = {
  recorded: { label: '系统录播', color: 'bg-[#00C4D4]' },
  live: { label: '直播班', color: 'bg-[#6D28D9]' },
  bootcamp: { label: '训练营', color: 'bg-[#059669]' },
  private: { label: '私教陪跑', color: 'bg-[#6D28D9]' },
};

const PAGE_SIZE = 12;

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

export default function CategoryPage() {
  const params = useParams();
  const slug = params.slug as string;

  const [categories, setCategories] = useState<Category[]>([]);
  const [current, setCurrent] = useState<Category | null>(null);
  const [childCats, setChildCats] = useState<Category[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  // 筛选状态
  const [activeCat, setActiveCat] = useState('all');
  const [priceRange, setPriceRange] = useState('');
  const [sortBy, setSortBy] = useState('latest');
  const [page, setPage] = useState(1);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  useEffect(() => {
    setLoading(true);
    courseApi.getCategories()
      .then((res) => {
        const all: Category[] = res.data || [];
        setCategories(all);
        let matched: Category | null = null;
        let matchedChildren: Category[] = [];
        let ids: number[] = [];

        const found = all.find((c) => c.slug === slug);
        if (found) {
          matched = found;
          matchedChildren = found.children || [];
          ids = [found.id, ...matchedChildren.map((c) => c.id)];
        } else {
          for (const p of all) {
            const child = (p.children || []).find((c) => c.slug === slug);
            if (child) {
              matched = child;
              ids = [child.id];
              break;
            }
          }
        }

        if (matched) {
          setCurrent(matched);
          setChildCats(matchedChildren);
        }
      })
      .catch(() => toast.error('分类信息加载失败'));
  }, [slug]);

  // 拉取课程
  const fetchCourses = useCallback(async () => {
    if (!current) return;
    setLoading(true);
    try {
      const params: Record<string, any> = { page, page_size: PAGE_SIZE, sort_by: sortBy };
      const ids = [current.id, ...childCats.map((c) => c.id)];
      params.category_ids = ids.join(',');
      if (activeCat !== 'all') params.category_id = activeCat;
      if (priceRange) {
        const [min, max] = priceRange.split('-');
        if (min) params.price_min = min;
        if (max) params.price_max = max;
      }
      const res = await courseApi.getList(params);
      setCourses(res.data?.items || []);
      setTotal(res.data?.total || 0);
    } catch (err) {
      toast.error('课程加载失败');
    } finally {
      setLoading(false);
    }
  }, [current, childCats, activeCat, priceRange, sortBy, page]);

  useEffect(() => {
    if (current) fetchCourses();
  }, [current, activeCat, priceRange, sortBy, page]);

  // 赛道筛选选项（顶级分类）
  const catOptions = useMemo(() => {
    const opts: { label: string; value: string }[] = [{ label: '全部', value: 'all' }];
    categories.forEach((c) => {
      opts.push({ label: c.name, value: String(c.id) });
    });
    return opts;
  }, [categories]);

  // 当前是否有活跃筛选
  const hasFilters = activeCat !== 'all' || priceRange !== '';

  if (loading && !current) {
    return (
      <div className="flex justify-center items-center py-40" style={{ backgroundColor: '#F5F5F7', minHeight: '60vh' }}>
        <Icon icon="mdi:loading" className="w-10 h-10 animate-spin text-[#00C4D4]" />
      </div>
    );
  }

  if (!current) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-32 text-center" style={{ backgroundColor: '#F5F5F7', minHeight: '60vh' }}>
        <div className="inline-flex w-20 h-20 items-center justify-center rounded-full bg-white shadow-md border border-[#E5E7EB] mb-6">
          <Icon icon="mdi:alert-circle-outline" className="w-10 h-10 text-[#D1D5DB]" />
        </div>
        <h2 className="text-2xl font-bold text-[#1A1A2E] mb-2">分类不存在</h2>
        <p className="text-[#8B8BA0] mb-6">找不到 slug 为「{slug}」的分类</p>
        <Link href="/" className="inline-block px-6 py-3 bg-gradient-to-r from-[#00C4D4] to-[#6D28D9] text-white rounded-xl font-bold shadow-lg shadow-[#00C4D4]/20">
          返回首页
        </Link>
      </div>
    );
  }

  return (
    <div className="overflow-x-hidden" style={{ backgroundColor: '#F5F5F7', color: '#1A1A2E', fontFamily: "'Inter', system-ui, -apple-system, sans-serif" }}>
      {/* ===== 分类头部 ===== */}
      <section className="bg-white border-b border-[#E5E7EB]">
        <div className="max-w-[1440px] mx-auto px-6 pt-24 pb-10">
          {/* 面包屑 */}
          <nav className="flex items-center gap-2 mb-6 text-sm">
            <Link href="/" className="text-[#8B8BA0] hover:text-[#00C4D4] transition-colors">首页</Link>
            <span className="text-[#D1D5DB]">/</span>
            <span className="text-[#1A1A2E] font-bold">{current.name}</span>
          </nav>

          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
              <h1 className="text-4xl md:text-5xl font-black text-[#1A1A2E] mb-3 tracking-tight">{current.name}</h1>
              <p className="text-lg text-[#4A4A6A] max-w-2xl leading-relaxed">{current.description || '精选该分类下的优质实战课程，助你快速掌握行业技能'}</p>
            </div>
            <div className="flex items-center gap-4 shrink-0">
              <div className="bg-[#F5F5F7] rounded-xl px-6 py-3 text-center">
                <div className="text-2xl font-black text-[#00C4D4]">{total}</div>
                <div className="text-xs text-[#8B8BA0] mt-0.5">门实战课程</div>
              </div>
              <div className="bg-gradient-to-br from-[#00C4D4]/10 to-[#6D28D9]/10 rounded-xl px-6 py-3 text-center border border-[#00C4D4]/10">
                <div className="text-2xl font-black text-[#6D28D9]">{childCats.length || categories.length}</div>
                <div className="text-xs text-[#8B8BA0] mt-0.5">个子分类</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== 课程网格 ===== */}
      <section className="max-w-[1440px] mx-auto px-6 pt-6 pb-20">
        {/* 结果统计条 */}
        <div className="flex items-center justify-between mb-10">
          <div className="flex items-center gap-2 text-sm text-[#8B8BA0]">
            <Icon icon="mdi:library-shelves" className="w-4 h-4" />
            共找到 <span className="font-bold text-[#1A1A2E]">{total}</span> 门课程
            {hasFilters && (
              <span className="text-xs bg-[#E0F7FA] text-[#00C4D4] px-2 py-0.5 rounded-full font-bold ml-1">已筛选</span>
            )}
          </div>
          {loading && <Icon icon="mdi:loading" className="w-4 h-4 animate-spin text-[#00C4D4]" />}
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-24">
            <Icon icon="mdi:loading" className="w-8 h-8 animate-spin text-[#00C4D4]" />
            <p className="mt-3 text-sm text-[#8B8BA0]">正在加载课程...</p>
          </div>
        ) : courses.length === 0 ? (
          <div className="bg-white rounded-2xl border border-[#E5E7EB] flex flex-col items-center justify-center py-24">
            <div className="w-20 h-20 rounded-full bg-[#F5F5F7] flex items-center justify-center mb-5">
              <Icon icon="mdi:book-off-outline" className="w-10 h-10 text-[#D1D5DB]" />
            </div>
            <p className="text-[#8B8BA0] text-lg font-medium">该筛选条件下暂无课程</p>
            <p className="text-xs text-[#B0B3C0] mt-2 mb-5">试试调整筛选条件或清除筛选</p>
            <button
              onClick={() => { setActiveCat('all'); setPriceRange(''); setPage(1); }}
              className="px-5 py-2.5 text-sm font-bold text-white bg-gradient-to-r from-[#00C4D4] to-[#6D28D9] rounded-xl shadow-md shadow-[#00C4D4]/20 hover:shadow-lg transition-all"
            >
              清除筛选
            </button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-6">
              {courses.map((course) => {
                const typeInfo = typeLabels[course.course_type] || { label: course.course_type, color: 'bg-[#00C4D4]' };
                return (
                  <Link
                    key={course.id}
                    href={`/course/${course.slug || course.id}`}
                    className="block bg-white rounded-xl border border-[#E5E7EB] overflow-hidden shadow-sm md:shadow-md hover:border-[#00C4D4] transition-all duration-300 hover:-translate-y-1.5 hover:shadow-[0_12px_30px_rgba(0,196,212,0.12)] group"
                  >
                    {/* 封面 */}
                    <div className="relative aspect-[4/3] bg-[#F3F4F6] overflow-hidden">
                      {course.cover ? (
                        <img alt={course.title} loading="lazy" decoding="async" width={800} height={600} className="w-full h-full object-cover md:opacity-80 md:group-hover:opacity-100 group-hover:scale-105 transition-all duration-500" src={resolveAssetUrl(course.cover)} />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#00C4D4]/5 to-[#6D28D9]/5">
                          <Icon icon="mdi:book-open-variant" className="w-12 h-12 text-[#00C4D4]/30" />
                        </div>
                      )}
                      <div className={`absolute top-2 left-2 md:top-3 md:left-3 ${typeInfo.color} text-white text-[10px] font-bold px-2 py-0.5 rounded-md shadow-sm`}>{typeInfo.label}</div>
                      <div className="absolute inset-0 hidden md:block bg-gradient-to-t from-black/0 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="bg-white text-[#00C4D4] px-5 py-2 rounded-lg font-bold text-sm shadow-lg">了解详情</span>
                        </div>
                      </div>
                    </div>

                    {/* 信息区 */}
                    <div className="p-3 md:p-5">
                      <h3 className="font-bold mb-2 md:mb-3 line-clamp-1 text-sm md:text-base text-[#1A1A2E] group-hover:text-[#00C4D4] transition-colors">{course.title}</h3>
                      {/* 讲师行：移动端隐藏 */}
                      <div className="hidden md:flex items-center space-x-2 text-xs text-[#8B8BA0] mb-3">
                        <div className="w-5 h-5 rounded-full bg-gradient-to-br from-[#00C4D4] to-[#6D28D9] flex items-center justify-center text-white text-[10px] font-bold">
                          {course.teacher?.name?.[0] || 'T'}
                        </div>
                        <span>{course.teacher?.name || '未知讲师'} · {course.teacher?.title || ''}</span>
                      </div>
                      <div className="hidden md:flex items-center justify-between text-xs text-[#8B8BA0] mb-4 pb-4 border-b border-dashed border-[#E5E7EB]">
                        <span className="flex items-center space-x-1">
                          <Icon icon="mdi:account-group" className="w-3.5 h-3.5" />
                          <span>{(course.student_count || 0).toLocaleString()} 学员</span>
                        </span>
                        <span className="flex items-center space-x-1 text-[#D97706]">
                          <Icon icon="mdi:star" className="w-3.5 h-3.5" />
                          <span>{(course.rating || 5).toFixed(1)}</span>
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="text-[#DC2626] font-black text-base md:text-xl">
                          {course.price === 0 ? '免费' : `¥${course.price?.toLocaleString()}`}
                          <span className="hidden md:inline">
                            {course.original_price && course.original_price > course.price && (
                              <span className="ml-2 text-xs font-normal text-[#8B8BA0] line-through">¥{course.original_price?.toLocaleString()}</span>
                            )}
                          </span>
                        </div>
                        <span className="hidden md:flex text-xs text-[#00C4D4] font-bold items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          查看详情 <Icon icon="mdi:arrow-right" className="w-3.5 h-3.5" />
                        </span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>

            {/* 分页器 */}
            {totalPages > 1 && (
              <div className="flex flex-col items-center mt-12 gap-3">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="w-10 h-10 rounded-lg border border-[#E5E7EB] bg-white text-[#8B8BA0] flex items-center justify-center hover:border-[#00C4D4] hover:text-[#00C4D4] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <Icon icon="mdi:chevron-left" className="w-5 h-5" />
                  </button>
                  {/* 智能分页：始终显示首页、最后一页、当前页前后各 1 页，其他用省略号 */}
                  {(() => {
                    const pages: (number | 'ellipsis')[] = [];
                    const set = new Set<number>();
                    const candidates = [1, page - 1, page, page + 1, totalPages];
                    for (let i = 1; i <= totalPages; i++) {
                      if (i === 1 || i === totalPages || (i >= page - 1 && i <= page + 1)) set.add(i);
                    }
                    const sorted = Array.from(set).sort((a, b) => a - b);
                    sorted.forEach((p, i) => {
                      if (i > 0 && sorted[i - 1] !== undefined && p - (sorted[i - 1] as number) > 1) pages.push('ellipsis');
                      pages.push(p);
                    });
                    return pages.map((p, i) =>
                      p === 'ellipsis' ? (
                        <span key={`e-${i}`} className="w-10 h-10 flex items-center justify-center text-[#8B8BA0] text-sm select-none">···</span>
                      ) : (
                        <button
                          key={p}
                          onClick={() => setPage(p)}
                          className={`w-10 h-10 rounded-lg font-bold flex items-center justify-center transition-all ${
                            page === p
                              ? 'bg-gradient-to-r from-[#00C4D4] to-[#6D28D9] text-white shadow-md shadow-[#00C4D4]/20'
                              : 'border border-[#E5E7EB] bg-white text-[#4A4A6A] hover:border-[#00C4D4] hover:text-[#00C4D4]'
                          }`}
                        >
                          {p}
                        </button>
                      )
                    );
                  })()}
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="w-10 h-10 rounded-lg border border-[#E5E7EB] bg-white text-[#8B8BA0] flex items-center justify-center hover:border-[#00C4D4] hover:text-[#00C4D4] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <Icon icon="mdi:chevron-right" className="w-5 h-5" />
                  </button>
                </div>
                <div className="text-xs text-[#8B8BA0]">
                  第 <span className="font-bold text-[#1A1A2E]">{page}</span> / {totalPages} 页
                  <span className="mx-2">·</span>
                  共 <span className="font-bold text-[#1A1A2E]">{total}</span> 门课程
                </div>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}
