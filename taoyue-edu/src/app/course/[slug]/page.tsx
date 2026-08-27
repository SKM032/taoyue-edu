'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Icon } from '@iconify/react';
import { courseApi, orderApi, cartApi } from '@/lib/api';
import { resolveAssetUrl, resolveRichTextImages } from '@/lib/asset';
import { useAuth } from '@/lib/auth';
import { useCart } from '@/lib/cart';
import toast from 'react-hot-toast';

export default function CourseDetailPage() {
  const params = useParams();
  const slug = params.slug as string;
  const router = useRouter();
  const { user, isLoggedIn } = useAuth();
  const { refreshCart } = useCart();

  const [course, setCourse] = useState<any>(null);
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedChapter, setExpandedChapter] = useState<number | null>(1);
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [activeTab, setActiveTab] = useState('outline');
  const [showCartModal, setShowCartModal] = useState(false);
  const [addingToCart, setAddingToCart] = useState(false);

  useEffect(() => {
    if (!slug) return;
    async function fetchData() {
      try {
        const res = await courseApi.getDetail(slug);
        setCourse(res.data);
        const reviewsRes = await courseApi.getReviews(res.data.id);
        setReviews(reviewsRes.data.items || []);
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    }
    fetchData();
  }, [slug]);

  useEffect(() => {
    if (isLoggedIn && course) {
      orderApi.getEnrollments().then((res) => {
        setIsEnrolled((res.data || []).some((e: any) => e.course_id === course.id));
      }).catch(() => {});
    }
  }, [isLoggedIn, course]);

  const handleBuy = () => {
    // 跳转到购买结算页（无需登录即可访问）
    const params = new URLSearchParams({
      course_id: String(course.id),
      slug: String(slug),
    });
    router.push(`/checkout?${params.toString()}`);
  };

  const handleAddToCart = async () => {
    if (!isLoggedIn) {
      toast.error('请先登录');
      router.push('/login');
      return;
    }
    if (isEnrolled) {
      toast('您已购买该课程，无需加购');
      return;
    }
    setAddingToCart(true);
    try {
      const res = await cartApi.add(course.id);
      await refreshCart();
      setShowCartModal(true);
      if (res.data?.already_in_cart) {
        toast('课程已在购物车中');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.detail || '加入购物车失败');
    } finally {
      setAddingToCart(false);
    }
  };

  if (loading) return <div className="flex justify-center py-20"><Icon icon="mdi:loading" className="w-8 h-8 animate-spin text-[#00C4D4]" /></div>;
  if (!course) return <div className="text-center py-20"><h2 className="text-2xl font-bold text-[#8B8BA0]">课程不存在</h2><Link href="/courses" className="text-[#00C4D4] mt-4 inline-block">返回课程列表</Link></div>;

  const displayPrice = course.price;
  const displayOriginalPrice = course.original_price;

  return (
    <div className="overflow-x-hidden pt-16" style={{ backgroundColor: '#F5F5F7', color: '#1A1A2E', fontFamily: "'Inter', system-ui, -apple-system, sans-serif" }}>
      {/* 面包屑 */}
      <div className="max-w-[1440px] mx-auto px-6 pt-6 pb-4">
        <div className="flex items-center gap-2 text-sm text-[#8B8BA0]">
          <Link href="/" className="hover:text-[#00C4D4] transition-colors">首页</Link>
          <Icon icon="mdi:chevron-right" className="w-4 h-4" />
          <Link href="/courses" className="hover:text-[#00C4D4] transition-colors">全部课程</Link>
          <Icon icon="mdi:chevron-right" className="w-4 h-4" />
          <span className="text-[#1A1A2E]">{course.title}</span>
        </div>
      </div>

      <div className="max-w-[1440px] mx-auto px-6 pb-14">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* 左侧主内容 */}
          <div className="lg:col-span-2 space-y-6">
            {/* 课程头图 */}
            <div className="relative aspect-video rounded-2xl bg-gradient-to-br from-[#E0F7FA] to-[#EDE9FE] overflow-hidden">
              {course.cover ? <img src={resolveAssetUrl(course.cover)} alt={course.title} fetchPriority="high" decoding="async" className="w-full h-full object-cover" /> : (
                <div className="w-full h-full flex items-center justify-center"><Icon icon="mdi:book-education" className="w-20 h-20 text-[#D1D5DB]" /></div>
              )}
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-6">
                <div className="flex flex-wrap gap-2 mb-2">
                  {course.tags?.map((tag: string, i: number) => (
                    <span key={i} className="text-xs bg-white/20 text-white px-2 py-0.5 rounded-full">{tag}</span>
                  ))}
                </div>
                <h1 className="text-2xl md:text-3xl font-bold text-white">{course.title}</h1>
                {course.subtitle && <p className="text-white/80 mt-1">{course.subtitle}</p>}
              </div>
            </div>

            {/* 讲师与统计 */}
            <div className="flex flex-wrap items-center gap-6 p-6 bg-white rounded-2xl shadow-md border border-[#E5E7EB]">
              {course.teacher && (
                <Link href={`/teachers/${course.teacher.id}`} className="group flex items-center gap-3 hover:opacity-90 transition-opacity">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#00C4D4] to-[#6D28D9] flex items-center justify-center text-white text-lg font-bold overflow-hidden">
                    {course.teacher.avatar ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={resolveAssetUrl(course.teacher.avatar)} alt={course.teacher.name} className="w-full h-full object-cover" />
                    ) : (
                      course.teacher.name?.[0]
                    )}
                  </div>
                  <div>
                    <div className="font-semibold text-[#1A1A2E] group-hover:text-[#00C4D4]">{course.teacher.name}</div>
                    <div className="text-sm text-[#8B8BA0]">{course.teacher.title}</div>
                    <div className="text-xs text-[#00C4D4] font-medium mt-0.5">查看讲师主页 →</div>
                  </div>
                </Link>
              )}
              <div className="flex flex-wrap gap-6 ml-auto">
                <div className="text-center"><div className="text-lg font-bold text-[#00C4D4]">{course.duration_hours}h</div><div className="text-xs text-[#8B8BA0]">学习时长</div></div>
                <div className="text-center"><div className="text-lg font-bold text-[#00C4D4]">{course.chapter_count}章</div><div className="text-xs text-[#8B8BA0]">章节</div></div>
                <div className="text-center"><div className="text-lg font-bold text-[#00C4D4]">{course.student_count?.toLocaleString()}</div><div className="text-xs text-[#8B8BA0]">学员</div></div>
                <div className="text-center"><div className="text-lg font-bold text-[#D97706]">{course.rating?.toFixed(1)}</div><div className="text-xs text-[#8B8BA0]">{course.review_count}评价</div></div>
              </div>
            </div>

            {/* Tab导航 */}
            <div className="bg-white rounded-2xl shadow-md border border-[#E5E7EB] overflow-hidden">
              <div className="flex border-b border-[#E5E7EB]">
                {[
                  { key: 'outline', label: '课程大纲' },
                  { key: 'description', label: '课程简介' },
                  { key: 'reviews', label: `学员评价 (${course.review_count})` },
                ].map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={`px-6 py-4 font-bold text-sm transition-colors ${
                      activeTab === tab.key ? 'text-[#00C4D4] border-b-2 border-[#00C4D4]' : 'text-[#8B8BA0] hover:text-[#1A1A2E]'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
              <div className="p-6">
                {/* 大纲 Tab */}
                {activeTab === 'outline' && course.chapters?.length > 0 && (
                  <div className="space-y-3">
                    {course.chapters.map((chapter: any) => {
                      const expanded = expandedChapter === chapter.id;
                      return (
                        <div key={chapter.id} className="border border-[#E5E7EB] rounded-xl overflow-hidden">
                          <button
                            onClick={() => setExpandedChapter(expanded ? null : chapter.id)}
                            className="w-full flex items-center justify-between p-4 hover:bg-[#F9FAFB] transition-colors duration-200 text-left"
                          >
                            <div className="flex items-center gap-3">
                              <Icon
                                icon="mdi:chevron-down"
                                className={`w-5 h-5 text-[#8B8BA0] transition-transform duration-300 ease-out ${expanded ? 'rotate-0' : '-rotate-90'}`}
                              />
                              <span className="w-7 h-7 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs font-bold flex-shrink-0">
                                {chapter.sort_order}
                              </span>
                              <span className="font-medium text-[#1A1A2E]">{chapter.title}</span>
                              {chapter.is_free && <span className="text-xs bg-[#D1FAE5] text-[#059669] px-2 py-0.5 rounded-full">免费</span>}
                            </div>
                            <span className="text-sm text-[#8B8BA0]">{chapter.lessons?.length || 0}节</span>
                          </button>
                          {/* 折叠容器：用 grid-template-rows 0fr ↔ 1fr 实现高度动画 */}
                          <div
                            className={`grid transition-[grid-template-rows,opacity] duration-300 ease-out border-t border-[#E5E7EB] ${
                              expanded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
                            }`}
                            style={{ borderTopColor: expanded ? undefined : 'transparent' }}
                          >
                            <div className="overflow-hidden">
                              <div className={`transform-gpu transition-transform duration-300 ease-out ${expanded ? 'translate-y-0' : '-translate-y-2'}`}>
                                {chapter.lessons?.map((lesson: any, lessonIdx: number) => (
                                  <div
                                    key={lesson.id}
                                    className="flex items-center justify-between px-4 py-3 hover:bg-[#F9FAFB] text-sm transition-colors duration-150"
                                  >
                                    <div className="flex items-center gap-3">
                                      <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center text-[10px] font-medium flex-shrink-0">
                                        {lesson.sort_order || lessonIdx + 1}
                                      </span>
                                      <Icon icon={lesson.lesson_type === 'video' ? 'mdi:play-circle-outline' : 'mdi:file-document-outline'} className="w-5 h-5 text-[#8B8BA0]" />
                                      <span className={lesson.is_free ? 'text-[#1A1A2E]' : 'text-[#8B8BA0]'}>{lesson.title}</span>
                                      {lesson.is_free && <span className="text-xs text-[#059669] font-medium">试看</span>}
                                    </div>
                                    <div className="flex items-center gap-3 text-[#8B8BA0]">
                                      {lesson.video_duration > 0 && <span>{Math.floor(lesson.video_duration / 60)}:{String(lesson.video_duration % 60).padStart(2, '0')}</span>}
                                      {!lesson.is_free && !isEnrolled && <Icon icon="mdi:lock" className="w-4 h-4" />}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* 简介 Tab */}
                {activeTab === 'description' && (
                  <div>
                    {course.description && (
                      <div
                        className="rich-text text-[#4A4A6A] leading-relaxed mb-6"
                        dangerouslySetInnerHTML={{ __html: resolveRichTextImages(course.description) }}
                      />
                    )}
                    {course.learning_goals?.length > 0 && (
                      <div className="mb-6">
                        <h3 className="font-bold text-[#1A1A2E] mb-3">学习目标</h3>
                        <ul className="space-y-2">
                          {course.learning_goals.map((goal: string, i: number) => (
                            <li key={i} className="flex items-center gap-2 text-sm text-[#4A4A6A]"><Icon icon="mdi:check-circle" className="w-4 h-4 text-[#059669]" />{goal}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {course.prerequisites?.length > 0 && (
                      <div>
                        <h3 className="font-bold text-[#1A1A2E] mb-3">先修要求</h3>
                        <ul className="space-y-2">
                          {course.prerequisites.map((pre: string, i: number) => (
                            <li key={i} className="flex items-center gap-2 text-sm text-[#4A4A6A]"><Icon icon="mdi:information" className="w-4 h-4 text-[#D97706]" />{pre}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}

                {/* 评价 Tab */}
                {activeTab === 'reviews' && (
                  <div>
                    {reviews.length > 0 ? (
                      <div className="space-y-4">
                        {reviews.map((review: any) => (
                          <div key={review.id} className="border-b border-[#E5E7EB] pb-4 last:border-0">
                            <div className="flex items-center gap-3 mb-2">
                              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#00C4D4] to-[#6D28D9] flex items-center justify-center text-white text-sm font-bold">{review.user_name?.[0] || 'U'}</div>
                              <div>
                                <div className="font-medium text-sm text-[#1A1A2E]">{review.user_name}</div>
                                <div className="flex items-center gap-0.5">
                                  {Array.from({ length: 5 }, (_, i) => (
                                    <Icon key={i} icon={i < review.rating ? 'mdi:star' : 'mdi:star-outline'} className={`w-4 h-4 ${i < review.rating ? 'text-[#D97706]' : 'text-[#D1D5DB]'}`} />
                                  ))}
                                </div>
                              </div>
                            </div>
                            <p className="text-sm text-[#4A4A6A]">{review.content}</p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-center text-[#8B8BA0] py-8">暂无评价</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 右侧侧边栏 */}
          <div className="lg:col-span-1">
            <div className="sticky top-20 space-y-4">
              {/* 课程信息卡片 */}
              <div className="bg-white rounded-2xl shadow-md border border-[#E5E7EB] overflow-hidden">
                {/* 封面 */}
                <div className="relative aspect-video bg-[#F3F4F6]">
                  {course.cover ? (
                    <img src={resolveAssetUrl(course.cover)} alt={course.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#E0F7FA] to-[#EDE9FE]">
                      <Icon icon="mdi:book-open-variant" className="w-12 h-12 text-[#00C4D4]/40" />
                    </div>
                  )}
                </div>
                <div className="p-5 space-y-4">
                  {/* 价格 */}
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-black text-[#DC2626]">¥{Number(displayPrice).toLocaleString()}</span>
                    {displayOriginalPrice && displayOriginalPrice > displayPrice && (
                      <span className="text-sm text-[#8B8BA0] line-through">¥{Number(displayOriginalPrice).toLocaleString()}</span>
                    )}
                  </div>

                  {/* 课程基本信息 */}
                  <div className="space-y-2.5 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-[#8B8BA0] flex items-center gap-1.5"><Icon icon="mdi:chart-line" className="w-4 h-4" />难度</span>
                      <span className="text-[#4A4A6A] font-medium">{course.difficulty === 'beginner' ? '初级' : course.difficulty === 'intermediate' ? '中级' : '高级'}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[#8B8BA0] flex items-center gap-1.5"><Icon icon="mdi:clock-outline" className="w-4 h-4" />时长</span>
                      <span className="text-[#4A4A6A] font-medium">{course.duration_hours ? `${course.duration_hours} 小时` : '-'}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[#8B8BA0] flex items-center gap-1.5"><Icon icon="mdi:account-group" className="w-4 h-4" />学习人数</span>
                      <span className="text-[#4A4A6A] font-medium">{course.student_count ? `${course.student_count} 人` : '-'}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[#8B8BA0] flex items-center gap-1.5"><Icon icon="mdi:star" className="w-4 h-4" />评分</span>
                      <span className="text-[#4A4A6A] font-medium">{course.rating ? `${course.rating} 分` : '-'}</span>
                    </div>
                  </div>

                  {/* 操作按钮 */}
                  {isEnrolled ? (
                    <button className="w-full py-3 bg-[#059669] text-white rounded-lg font-bold hover:bg-[#047857] transition-colors">已购买，开始学习</button>
                  ) : (
                    <div className="space-y-3">
                      <button
                        onClick={handleAddToCart}
                        disabled={addingToCart}
                        className="w-full py-3 border-2 border-[#00C4D4] text-[#00C4D4] rounded-lg font-bold hover:bg-[#E0F7FA] transition-colors disabled:opacity-50"
                      >
                        {addingToCart ? '添加中...' : '加入购物车'}
                      </button>
                      <button onClick={handleBuy} className="w-full py-3 bg-gradient-to-r from-[#00C4D4] to-[#6D28D9] text-white rounded-lg font-bold hover:shadow-lg hover:shadow-[#00C4D4]/25 transition-all">
                        立即购买
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 加购成功弹框 */}
      {showCartModal && course && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowCartModal(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-[90%] max-w-[420px] overflow-hidden animate-[fadeInUp_.2s_ease]">
            <div className="bg-gradient-to-r from-[#00C4D4] to-[#6D28D9] p-6 text-center">
              <div className="w-14 h-14 mx-auto rounded-full bg-white/20 flex items-center justify-center mb-3">
                <Icon icon="mdi:check" className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-white text-lg font-bold">已加入购物车</h3>
              <p className="text-white/80 text-sm mt-1">商品已成功加入购物车</p>
            </div>
            <div className="p-5">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-16 h-11 rounded-lg bg-cover bg-center flex-shrink-0" style={{ backgroundImage: course.cover ? `url(${resolveAssetUrl(course.cover)})` : undefined, backgroundColor: course.cover ? undefined : '#E0F7FA' }} />
                <p className="text-sm text-[#1A1A2E] font-medium line-clamp-2 flex-1">{course.title}</p>
                <span className="text-[#DC2626] font-black shrink-0">¥{Number(displayPrice).toLocaleString()}</span>
              </div>
              <div className="flex gap-3">
                <button onClick={() => setShowCartModal(false)} className="flex-1 py-2.5 border border-[#E5E7EB] text-[#4A4A6A] rounded-lg font-medium hover:bg-[#F9FAFB] transition-colors">继续逛逛</button>
                <button onClick={() => { setShowCartModal(false); router.push('/cart'); }} className="flex-1 py-2.5 bg-gradient-to-r from-[#00C4D4] to-[#6D28D9] text-white rounded-lg font-bold hover:shadow-md transition-all">去购物车结算</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
