'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Icon } from '@iconify/react';
import { courseApi, contentApi } from '@/lib/api';
import { resolveAssetUrl } from '@/lib/asset';

const typeLabels: Record<string, { label: string; color: string }> = {
  recorded: { label: '系统录播', color: 'bg-[#00C4D4]' },
  live: { label: '直播班', color: 'bg-[#6D28D9]' },
  bootcamp: { label: '训练营', color: 'bg-[#059669]' },
  private: { label: '私教陪跑', color: 'bg-[#6D28D9]' },
};

export default function HomePage() {
  const [featuredCourses, setFeaturedCourses] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [lives, setLives] = useState<any[]>([]);
  const [resources, setResources] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [categoryCourses, setCategoryCourses] = useState<Record<number, any[]>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [feat, cat, liv, res, tea] = await Promise.all([
          courseApi.getList({ is_featured: true, page_size: 20 }),
          courseApi.getCategories(),
          contentApi.getLives({ page_size: 3 }),
          contentApi.getResources(),
          courseApi.getTeachers(),
        ]);
        setFeaturedCourses(feat.data.items || []);
        const cats = cat.data || [];
        setCategories(cats);
        setLives(liv.data.items || []);
        setResources(res.data || []);
        setTeachers(tea.data || []);

        // 为每个顶级分类拉取最近上架前 4 门课（包含其子分类）
        // 使用 category_ids 参数（后端支持一次传多个分类 id，按 published_at 倒序）
        const results = await Promise.all(
          cats.map(async (c: any) => {
            const ids = [c.id, ...(c.children || []).map((x: any) => x.id)];
            return courseApi.getList({ category_ids: ids.join(','), page_size: 4, sort_by: 'latest' })
              .then((r) => ({ id: c.id, items: r.data?.items || [] }))
              .catch(() => ({ id: c.id, items: [] }));
          })
        );
        const map: Record<number, any[]> = {};
        results.forEach((r) => { map[r.id] = r.items; });
        setCategoryCourses(map);
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    }
    fetchData();
  }, []);

  const renderCourseCard = (course: any) => {
    const typeInfo = typeLabels[course.course_type] || { label: course.course_type, color: 'bg-[#00C4D4]' };
    return (
      <Link
        key={course.id}
        href={`/course/${course.slug}`}
        className="block bg-white rounded-xl border border-[#E5E7EB] overflow-hidden shadow-sm hover:border-[#00C4D4] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_10px_25px_rgba(0,196,212,0.1)] group"
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
          <div className={`absolute top-2 left-2 md:top-3 md:left-3 ${typeInfo.color} text-white text-[10px] font-bold px-2 py-0.5 rounded`}>{typeInfo.label}</div>
        </div>
        <div className="p-3 md:p-5">
          <h3 className="font-bold mb-2 line-clamp-1 text-sm md:text-base text-[#1A1A2E]">{course.title}</h3>
          {/* 讲师行：移动端隐藏 */}
          <div className="hidden md:flex items-center space-x-2 text-xs text-[#8B8BA0] mb-4">
            <div className="w-5 h-5 rounded-full bg-gradient-to-br from-[#00C4D4] to-[#6D28D9] flex items-center justify-center text-white text-[10px] font-bold">
              {course.teacher?.name?.[0] || 'T'}
            </div>
            <span>{course.teacher?.name || '未知讲师'} · {course.teacher?.title || ''}</span>
          </div>
          <div className="flex justify-between items-center">
            <div className="text-[#DC2626] font-bold text-base md:text-lg">{course.price === 0 ? '免费' : `¥${course.price?.toLocaleString()}`}</div>
            <div className="hidden md:block text-[10px] text-[#8B8BA0]">{course.student_count?.toLocaleString()} 人已学</div>
          </div>
        </div>
      </Link>
    );
  };

  const heroCards = [
    { name: 'IT 技能学院', desc: '全栈开发 · 架构设计 · 算法实训 · 代码实战', color: '#00C4D4', icon: 'mdi:code-tags', link: '/it-academy' },
    { name: 'AI 全媒体运营', desc: 'AIGC 应用 · 短视频运营 · 直播变现', color: '#7C3AED', icon: 'mdi:brain-freeze', link: '/ai-media' },
    { name: '跨境电商', desc: '亚马逊运营 · TikTok 带货 · 海外选品', color: '#10B981', icon: 'mdi:earth', link: '/cross-border' },
  ];

  const stats = [
    { value: '500+', label: '实战课程' },
    { value: '200+', label: '行业大牛讲师' },
    { value: '50K+', label: '学员已就业' },
  ];

  const achStats = [
    { value: '500+', label: '实战课程' },
    { value: '200+', label: '行业大牛讲师' },
    { value: '50,000+', label: '学员已就业' },
    { value: '98.6%', label: '课程满意度' },
  ];

  const priceTiers = [
    { tag: '免费｜拉新', tagColor: 'text-[#059669]', topColor: 'border-t-[#059669]', name: '入门体验', items: ['行业趋势公开课', '千元级干货文档包', '5 节零基础试听课'], btn: '免费学习', btnStyle: 'border border-[#059669] text-[#059669] hover:bg-[#059669]', link: '/courses?price_range=0-0' },
    { tag: '9.9~99元｜首单', tagColor: 'text-[#D97706]', topColor: 'border-t-[#D97706]', name: '专项集训', items: ['3天实战体验营', '单项技术专题突破小课', '讲师 1V1 作业点评'], btn: '立即体验', btnStyle: 'border border-[#D97706] text-[#D97706] hover:bg-[#D97706]', link: '/courses?price_range=1-99' },
    { tag: '核心｜营收', tagColor: 'text-[#00C4D4]', topColor: 'border-t-[#00C4D4]', name: '系统实战班', items: ['100+ 课时系统录播课', '每周 2 次直播深度答疑', '完整项目从 0 到 1 实操'], btn: '查看课程', btnStyle: 'bg-[#00C4D4] text-white hover:bg-[#0099A8]', link: '/courses?price_range=100-5000', hot: true },
    { tag: '高客单｜拔高', tagColor: 'text-[#6D28D9]', topColor: 'border-t-[#6D28D9]', name: '私教陪跑营', items: ['大牛讲师 1V1 深度陪跑', '就业/创业资源内推对接', '终身校友闭门干货会'], btn: '咨询详情', btnStyle: 'border border-[#6D28D9] text-[#6D28D9] hover:bg-[#6D28D9]', link: '/cooperation' },
  ];

  return (
    <div className="overflow-x-hidden" style={{ backgroundColor: '#F5F5F7', color: '#1A1A2E', fontFamily: "'Inter', system-ui, -apple-system, sans-serif" }}>
      {/* ========== Hero 区域 ========== */}
      <section className="relative min-h-[85vh] overflow-hidden" style={{ background: 'linear-gradient(135deg, #0A0A1A 0%, #1A0A2E 40%, #0A1A2E 100%)' }}>
        {/* 背景光晕 */}
        <div className="absolute -top-[200px] -right-[200px] w-[600px] h-[600px] rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(0,196,212,0.15) 0%, transparent 70%)' }} />
        <div className="absolute -bottom-[200px] -left-[200px] w-[500px] h-[500px] rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(124,58,237,0.12) 0%, transparent 70%)' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(0,196,212,0.03) 0%, transparent 50%)' }} />
        {/* 网格线装饰 */}
        <svg className="absolute top-0 left-0 w-full h-full opacity-[0.03] pointer-events-none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern height="60" id="grid" patternUnits="userSpaceOnUse" width="60">
              <path d="M 60 0 L 0 0 0 60" fill="none" stroke="#00C4D4" strokeWidth="1" />
            </pattern>
          </defs>
          <rect fill="url(#grid)" height="100%" width="100%" />
        </svg>
        <div className="max-w-[1440px] mx-auto px-6 relative z-10" style={{ minHeight: '85vh', display: 'flex', alignItems: 'center' }}>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center w-full">
            {/* 左侧：主文案 */}
            <div>
              <div className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 mb-8" style={{ background: 'rgba(0,196,212,0.1)', border: '1px solid rgba(0,196,212,0.25)' }}>
                <span className="w-2 h-2 rounded-full bg-[#00C4D4]" style={{ boxShadow: '0 0 12px rgba(0,196,212,0.6)' }} />
                <span className="text-[#00C4D4] text-[13px] font-semibold tracking-wide">2024 春季实战营 · 火热报名中</span>
              </div>
              <h1 className="font-black leading-[1.1] mb-6 tracking-tight" style={{ fontSize: 'clamp(42px, 5vw, 72px)', letterSpacing: '-0.03em' }}>
                <span className="text-white">让技术驱动</span>
                <br />
                <span style={{ background: 'linear-gradient(135deg, #FFFFFF 0%, #00C4D4 40%, #7C3AED 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>你的职业未来</span>
              </h1>
              <p className="text-[#8888AA] text-lg leading-[1.7] max-w-[520px] mb-10">
                专注 IT 技能 · AI 全媒体 · 跨境电商。一线大牛带队，全栈实战环境与就业辅导，助力 <span className="text-[#00C4D4] font-semibold">50,000+</span> 学员实现职业进阶。
              </p>
              <div className="flex flex-wrap gap-4 items-center">
                <Link href="/courses" className="inline-flex items-center gap-2.5 px-9 py-4 text-white font-bold text-base rounded-xl transition-all" style={{ background: 'linear-gradient(135deg, #00C4D4 0%, #7C3AED 100%)', boxShadow: '0 8px 32px rgba(0,196,212,0.3)' }}>
                  进入实战中心 <Icon icon="mdi:arrow-right" className="w-5 h-5" />
                </Link>
                <Link href="/courses?price_min=0&price_max=0" className="inline-flex items-center gap-2 px-8 py-4 font-semibold text-base rounded-xl transition-all" style={{ background: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.15)', color: '#CCCCE0' }}>
                  <Icon icon="mdi:book-open-page-variant" className="w-4 h-4" /> 领取学习路径图
                </Link>
              </div>
              <div className="flex gap-10 mt-14 pt-8" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                {stats.map((s) => (
                  <div key={s.label}>
                    <div className="text-[32px] font-black" style={{ background: 'linear-gradient(135deg, #00C4D4, #7C3AED)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>{s.value}</div>
                    <div className="text-[#666688] text-[13px] mt-1">{s.label}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* 右侧：科技感卡片组合 */}
            <div className="relative hidden lg:block">
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[450px] h-[450px] rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(0,196,212,0.06) 0%, transparent 60%)' }} />
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-4">
                  {heroCards.slice(0, 2).map((c) => (
                    <Link key={c.name} href={c.link} className="rounded-[20px] p-7 transition-all duration-300 hover:-translate-y-1" style={{ background: 'rgba(255,255,255,0.04)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.08)' }}>
                      <div className="w-12 h-12 rounded-[14px] flex items-center justify-center mb-4" style={{ background: c.color + '26' }}>
                        <Icon icon={c.icon} className="w-6 h-6" style={{ color: c.color }} />
                      </div>
                      <h3 className="text-white text-lg font-bold mb-2">{c.name}</h3>
                      <p className="text-[#666688] text-[13px] leading-[1.5]">{c.desc}</p>
                    </Link>
                  ))}
                </div>
                <div className="flex flex-col gap-4 pt-8">
                  {heroCards.slice(2).map((c) => (
                    <Link key={c.name} href={c.link} className="rounded-[20px] p-7 transition-all duration-300 hover:-translate-y-1" style={{ background: 'rgba(255,255,255,0.04)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.08)' }}>
                      <div className="w-12 h-12 rounded-[14px] flex items-center justify-center mb-4" style={{ background: c.color + '26' }}>
                        <Icon icon={c.icon} className="w-6 h-6" style={{ color: c.color }} />
                      </div>
                      <h3 className="text-white text-lg font-bold mb-2">{c.name}</h3>
                      <p className="text-[#666688] text-[13px] leading-[1.5]">{c.desc}</p>
                    </Link>
                  ))}
                  <div className="rounded-[20px] p-7 text-center transition-all duration-300 hover:-translate-y-1" style={{ background: 'linear-gradient(135deg, rgba(0,196,212,0.1) 0%, rgba(124,58,237,0.1) 100%)', border: '1px solid rgba(0,196,212,0.15)' }}>
                    <div className="text-[42px] font-black mb-1" style={{ background: 'linear-gradient(135deg, #00C4D4, #7C3AED)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>98.6%</div>
                    <div className="text-[#666688] text-[13px]">课程好评率</div>
                    <div className="flex justify-center gap-1 mt-3">
                      {[0, 1, 2, 3, 4].map((i) => <Icon key={i} icon="mdi:star" className="w-4 h-4 text-[#00C4D4]" />)}
                    </div>
                  </div>
                </div>
              </div>
              {/* 底部 floating 标签 */}
              <div className="flex justify-center gap-2 mt-5">
                {[{ label: '前阿里 P8 带队', color: '#10B981' }, { label: 'GPT 应用开发者', color: '#00C4D4' }, { label: '跨境亿级卖家', color: '#7C3AED' }].map((t) => (
                  <span key={t.label} className="inline-flex items-center gap-1 rounded-full px-3.5 py-1.5 text-xs" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#666688' }}>
                    <span className="w-1.5 h-1.5 rounded-full" style={{ background: t.color }} /> {t.label}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========== 成就数据墙 ========== */}
      <section className="bg-[#FAFAFA] py-12" style={{ borderTop: '1px solid #E5E7EB', borderBottom: '1px solid #E5E7EB' }}>
        <div className="max-w-[1440px] mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {achStats.map((s) => (
              <div key={s.label} className="text-center">
                <div className="text-4xl font-black text-[#00C4D4] mb-2">{s.value}</div>
                <div className="text-sm text-[#8B8BA0]">{s.label}</div>
              </div>
            ))}
          </div>
          <div className="mt-12 flex flex-wrap justify-center items-center gap-8 opacity-60">
            <span className="text-sm font-bold tracking-widest text-[#8B8BA0] uppercase">大牛讲师阵容来自</span>
            <div className="flex -space-x-3">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="w-10 h-10 rounded-full border-2 border-white bg-gradient-to-br from-[#00C4D4] to-[#6D28D9]" />
              ))}
            </div>
            <div className="flex gap-4 items-center">
              {['前阿里 P8', 'GPT 应用开发者', '跨境亿级卖家'].map((t) => (
                <span key={t} className="text-xs px-2 py-1 bg-[#F3F4F6] text-[#8B8BA0] rounded">{t}</span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ========== 学习路径规划 ========== */}
      <section className="py-16 max-w-[1440px] mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold mb-4 text-[#1A1A2E]">科学的学习路径规划</h2>
          <p className="text-[#4A4A6A]">从零基础到职场大牛，我们为你规划了每一个进阶台阶</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {priceTiers.map((tier, i) => (
            <div key={i} className={`bg-white rounded-2xl border-x border-b border-[#E5E7EB] border-t-4 ${tier.topColor} p-8 flex flex-col h-full shadow-md relative`}>
              {tier.hot && <div className="absolute top-4 right-4 bg-[#00C4D4] text-white text-[10px] font-black px-2 py-0.5 rounded">HOT</div>}
              <div className={`${tier.tagColor} text-xs font-bold uppercase tracking-widest mb-4`}>{tier.tag}</div>
              <h3 className="text-xl font-bold mb-4 text-[#1A1A2E]">{tier.name}</h3>
              <ul className="space-y-4 mb-8 flex-grow">
                {tier.items.map((item, j) => (
                  <li key={j} className="flex items-start space-x-3 text-sm text-[#4A4A6A]">
                    <Icon icon="mdi:check-circle" className={`mt-0.5 ${tier.tagColor}`} />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              <Link href={tier.link} className={`block w-full py-3 rounded-xl font-bold transition-all text-center ${tier.btnStyle}`}>{tier.btn}</Link>
            </div>
          ))}
        </div>
      </section>

      {/* ========== 分类课程 Section ========== */}
      {categories.map((cat, idx) => {
        const items = categoryCourses[cat.id] || [];
        // 素材中 IT/AI/跨境 三组配色与文案
        const themed = [
          { color: 'text-[#00C4D4]', sub: '代码实训环境 · 项目作业评审 · 简历/面试辅导 · 技术文档库', viewColor: 'text-[#00C4D4]', bg: 'bg-[#FAFAFA]' },
          { color: 'text-[#6D28D9]', sub: 'AI 工具教程库 · 短视频脚本/素材库 · 账号案例拆解 · 直播运营干货', viewColor: 'text-[#6D28D9]', bg: 'bg-transparent' },
          { color: 'text-[#10B981]', sub: '亚马逊运营 · TikTok 带货 · 海外选品 · 物流合规', viewColor: 'text-[#10B981]', bg: 'bg-[#FAFAFA]' },
        ][idx % 3];
        return (
          <section key={cat.id} className={`py-14 ${themed.bg}`}>
            <div className="max-w-[1440px] mx-auto px-6">
              <div className="flex justify-between items-end mb-12">
                <div>
                  <div className={`inline-flex items-center space-x-2 ${themed.color} mb-2`}>
                    <span className={`w-1.5 h-1.5 rounded-full`} style={{ background: 'currentColor' }} />
                    <span className="font-bold tracking-widest uppercase text-sm">{cat.name}</span>
                  </div>
                  <h2 className="text-3xl font-bold text-[#1A1A2E]">{cat.name}</h2>
                  <p className="text-[#8B8BA0] mt-2">{cat.description || themed.sub}</p>
                </div>
                <Link href={`/c/${cat.slug}`} className={`${themed.viewColor} hover:underline flex items-center space-x-1 shrink-0`}>
                  <span>查看全部 {cat.name} 课程</span>
                  <Icon icon="mdi:arrow-right" />
                </Link>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-6">
                {items.length > 0
                  ? items.map((c) => renderCourseCard(c))
                  : Array.from({ length: 4 }).map((_, i) => (
                      <div key={i} className="bg-white rounded-xl border border-[#E5E7EB] aspect-[4/5] animate-pulse" />
                    ))}
              </div>
            </div>
          </section>
        );
      })}

      {/* ========== 直播公开课 ========== */}
      {lives.length > 0 && (
        <section className="py-16 bg-[#FAFAFA]">
          <div className="max-w-[1440px] mx-auto px-6">
            <h2 className="text-3xl font-bold mb-12 text-center text-[#1A1A2E]">近期直播公开课</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {lives.map((live) => (
                <Link key={live.id} href="/live" className="block bg-white rounded-2xl border border-[#E5E7EB] overflow-hidden shadow-md hover:border-[#00C4D4] transition-all duration-300 hover:-translate-y-1">
                  <div className="relative aspect-video bg-[#F3F4F6]">
                    {live.cover ? <img src={resolveAssetUrl(live.cover)} alt={live.title} loading="lazy" decoding="async" width={600} height={400} className="w-full h-full object-cover" /> : (
                      <div className="w-full h-full flex items-center justify-center"><Icon icon="mdi:play-circle" className="w-16 h-16 text-[#D1D5DB]" /></div>
                    )}
                    <div className={`absolute top-4 left-4 ${live.status === 'live' ? 'bg-[#DC2626]' : 'bg-[#D97706]'} text-white px-2 py-1 rounded text-xs font-bold flex items-center space-x-1`}>
                      {live.status === 'live' && <span className="w-2 h-2 bg-white rounded-full animate-pulse" />}
                      <span>{live.status === 'live' ? '正在直播' : live.status === 'upcoming' ? '即将开始' : '回放'}</span>
                    </div>
                  </div>
                  <div className="p-6">
                    <h3 className="text-xl font-bold mb-4 line-clamp-2 text-[#1A1A2E]">{live.title}</h3>
                    <div className="flex items-center space-x-3 mb-6">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#00C4D4] to-[#6D28D9] flex items-center justify-center text-white text-sm font-bold">{live.teacher_name?.[0] || 'T'}</div>
                      <div>
                        <div className="text-sm font-bold text-[#1A1A2E]">{live.teacher_name}</div>
                        <div className="text-xs text-[#8B8BA0]">{live.teacher_title || '讲师'}</div>
                      </div>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <div className="text-[#8B8BA0]">{live.start_time || live.viewer_count + ' 人已预约'}</div>
                      <span className="bg-[#00C4D4] text-white px-6 py-2 rounded-lg font-bold hover:bg-[#0099A8] transition-colors inline-block">进入直播</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ========== 免费资料下载 ========== */}
      {resources.length > 0 && (
        <section className="py-16 max-w-[1440px] mx-auto px-6">
          <div className="flex items-center justify-between mb-12">
            <h2 className="text-3xl font-bold text-[#1A1A2E]">免费资料下载</h2>
            <Link href="/courses" className="text-[#00C4D4] hover:underline">查看更多资料</Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {resources.map((res) => (
              <div key={res.id} className="bg-white p-6 rounded-2xl border border-[#E5E7EB] flex items-center space-x-4 shadow-md hover:border-[#00C4D4] transition-all duration-300 hover:-translate-y-1 cursor-pointer">
                <div className="w-12 h-12 bg-[#00C4D4]/10 rounded-xl flex items-center justify-center text-[#00C4D4] text-2xl shrink-0">
                  <Icon icon={res.file_type === 'pdf' ? 'mdi:file-pdf-box' : res.file_type === 'zip' ? 'mdi:folder-zip' : res.file_type === 'xlsx' ? 'mdi:file-excel-box' : 'mdi:file-document'} />
                </div>
                <div className="flex-grow min-w-0">
                  <div className="font-bold text-sm text-[#1A1A2E] line-clamp-1">{res.title}</div>
                  <div className="text-xs text-[#8B8BA0] mt-1 uppercase">{res.file_type} · {res.download_count?.toLocaleString() || 0} 次下载</div>
                </div>
                <Icon icon="mdi:download" className="text-[#00C4D4] text-2xl shrink-0" />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ========== 明星讲师 ========== */}
      {teachers.length > 0 && (
        <section className="py-16 bg-[#FAFAFA]">
          <div className="max-w-[1440px] mx-auto px-6">
            <h2 className="text-3xl font-bold mb-16 text-center text-[#1A1A2E]">明星讲师阵容</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
              {teachers.slice(0, 4).map((teacher) => (
                <Link key={teacher.id} href={`/teachers/${teacher.id}`} className="block bg-white rounded-2xl border border-[#E5E7EB] p-8 text-center shadow-md hover:border-[#00C4D4] transition-all duration-300 hover:-translate-y-1">
                  <div className="w-24 h-24 rounded-full mx-auto mb-6 border-4 border-[#00C4D4]/20 p-1 bg-gradient-to-br from-[#00C4D4] to-[#6D28D9] flex items-center justify-center text-white text-3xl font-bold">
                    {teacher.name?.[0]}
                  </div>
                  <h3 className="text-xl font-bold mb-2 text-[#1A1A2E]">{teacher.name}</h3>
                  <div className="text-[#00C4D4] text-sm font-medium mb-4">{teacher.title}</div>
                  <div className="flex flex-wrap justify-center gap-2 mb-6">
                    {(teacher.skills || []).slice(0, 3).map((skill: string, i: number) => (
                      <span key={i} className="text-[10px] bg-[#F3F4F6] px-2 py-0.5 rounded text-[#8B8BA0]">{skill}</span>
                    ))}
                  </div>
                  <p className="text-xs text-[#8B8BA0] mb-6">{teacher.description || `已指导 ${teacher.student_count?.toLocaleString() || 0}+ 学员成功进阶`}</p>
                  <span className="text-[#00C4D4] text-sm font-bold hover:underline">进入主页 →</span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
