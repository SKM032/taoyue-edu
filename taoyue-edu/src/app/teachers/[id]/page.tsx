'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Icon } from '@iconify/react';
import { courseApi } from '@/lib/api';
import { resolveAssetUrl, resolveRichTextImages } from '@/lib/asset';

export default function TeacherDetailPage() {
  const params = useParams();
  const teacherId = Number(params.id);

  const [teacher, setTeacher] = useState<any>(null);
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!teacherId) return;
    async function fetchData() {
      try {
        const res = await courseApi.getTeacher(teacherId);
        setTeacher(res.data);
        // 获取该讲师的课程
        const courseRes = await courseApi.getList({ teacher_id: teacherId, page_size: 20 });
        setCourses(courseRes.data?.items || []);
      } catch (err) {
        console.error(err);
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [teacherId]);

  // 简介纯文本预览
  const descriptionText = teacher?.description
    ? teacher.description.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').trim()
    : '';

  if (loading) {
    return (
      <div className="overflow-x-hidden pt-16" style={{ backgroundColor: '#F5F5F7', color: '#1A1A2E', fontFamily: "'Inter', system-ui, sans-serif" }}>
        <div className="flex justify-center py-20">
          <Icon icon="mdi:loading" className="w-8 h-8 animate-spin text-[#00C4D4]" />
        </div>
      </div>
    );
  }

  if (notFound || !teacher) {
    return (
      <div className="overflow-x-hidden pt-16" style={{ backgroundColor: '#F5F5F7', color: '#1A1A2E' }}>
        <div className="text-center py-24">
          <h1 className="text-2xl font-bold text-[#1A1A2E]">讲师不存在</h1>
          <Link href="/teachers" className="inline-block mt-4 text-[#00C4D4] font-medium hover:underline">
            ← 返回讲师列表
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-x-hidden pt-16" style={{ backgroundColor: '#F5F5F7', color: '#1A1A2E', fontFamily: "'Inter', system-ui, -apple-system, sans-serif" }}>
      {/* 讲师头部 */}
      <section className="bg-gradient-to-br from-[#00C4D4] to-[#6D28D9] py-14">
        <div className="max-w-[1200px] mx-auto px-6 flex flex-col md:flex-row items-center md:items-start gap-8">
          {/* 头像 */}
          <div className="w-32 h-32 rounded-full overflow-hidden bg-white/20 border-4 border-white/40 flex items-center justify-center flex-shrink-0">
            {teacher.avatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={resolveAssetUrl(teacher.avatar)} alt={teacher.name} loading="lazy" decoding="async" width={300} height={300} className="w-full h-full object-cover" />
            ) : (
              <span className="text-white text-5xl font-black">{teacher.name?.[0] || '师'}</span>
            )}
          </div>

          {/* 基本信息 */}
          <div className="text-center md:text-left flex-1">
            <h1 className="text-4xl font-black text-white">{teacher.name}</h1>
            <p className="text-lg text-white/90 mt-1">{teacher.title || '资深讲师'}</p>
            <p className="text-white/80 mt-3 max-w-2xl line-clamp-2">
              {descriptionText || '暂无简介'}
            </p>
            {/* 技能标签 */}
            {(teacher.skills || []).length > 0 && (
              <div className="flex flex-wrap justify-center md:justify-start gap-2 mt-4">
                {(teacher.skills || []).slice(0, 6).map((s: string, i: number) => (
                  <span key={i} className="text-xs bg-white/20 text-white px-3 py-1 rounded-full font-medium">
                    {s}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* 数据统计 */}
          <div className="flex md:flex-col gap-6 md:gap-4 md:text-right flex-shrink-0">
            <div>
              <div className="text-3xl font-black text-white">{teacher.course_count || 0}</div>
              <div className="text-white/80 text-sm">门课程</div>
            </div>
            <div>
              <div className="text-3xl font-black text-white">{teacher.student_count || 0}</div>
              <div className="text-white/80 text-sm">名学员</div>
            </div>
            <div>
              <div className="text-3xl font-black text-white">{Number(teacher.rating).toFixed(1)}</div>
              <div className="text-white/80 text-sm">综合评分</div>
            </div>
          </div>
        </div>
      </section>

      {/* 讲师简介 */}
      <section className="max-w-[1200px] mx-auto px-6 py-12">
        <div className="bg-white rounded-2xl p-8 shadow-sm border border-[#E5E7EB]">
          <h2 className="text-2xl font-bold mb-4">讲师简介</h2>
          {teacher.description ? (
            <div
              className="prose prose-slate max-w-none text-[#4A4A6A] leading-relaxed"
              dangerouslySetInnerHTML={{ __html: resolveRichTextImages(teacher.description) }}
            />
          ) : (
            <p className="text-[#8B8BA0]">暂无简介</p>
          )}

          {/* 职业经历 */}
          {(teacher.experience || []).length > 0 && (
            <div className="mt-8 pt-6 border-t border-[#E5E7EB]">
              <h3 className="text-lg font-bold mb-4">职业经历</h3>
              <div className="space-y-4">
                {(teacher.experience || []).map((exp: any, i: number) => (
                  <div key={i} className="flex gap-4">
                    <div className="w-2 h-2 rounded-full bg-[#00C4D4] mt-2 flex-shrink-0" />
                    <div>
                      {typeof exp === 'string' ? (
                        <p className="text-[#4A4A6A]">{exp}</p>
                      ) : (
                        <>
                          <p className="font-medium text-[#1A1A2E]">{exp.title || exp.company}</p>
                          <p className="text-sm text-[#8B8BA0]">{exp.period || exp.description || ''}</p>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* 讲师课程 */}
      <section className="max-w-[1200px] mx-auto px-6 pb-16">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold">TA 的课程</h2>
          <Link href="/courses" className="text-[#00C4D4] font-medium hover:underline">
            查看全部课程 →
          </Link>
        </div>

        {courses.length === 0 ? (
          <div className="bg-white rounded-2xl p-10 text-center text-[#8B8BA0]">
            该讲师暂未发布课程
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {courses.map((course) => (
              <Link
                key={course.id}
                href={`/course/${course.slug}`}
                className="bg-white rounded-2xl overflow-hidden shadow-sm border border-[#E5E7EB] hover:border-[#6D28D9] hover:-translate-y-1 transition-all"
              >
                <div className="relative h-44 bg-gradient-to-br from-[#00C4D4] to-[#6D28D9]">
                  {course.cover ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={resolveAssetUrl(course.cover)} alt={course.title} loading="lazy" decoding="async" width={800} height={600} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Icon icon="mdi:play-circle" className="w-14 h-14 text-white/80" />
                    </div>
                  )}
                  {Number(course.price) > 0 ? (
                    <span className="absolute top-3 right-3 bg-white text-[#DC2626] text-sm font-bold px-2 py-0.5 rounded-lg shadow">
                      ¥{course.price}
                    </span>
                  ) : (
                    <span className="absolute top-3 right-3 bg-[#059669] text-white text-sm font-bold px-2 py-0.5 rounded-lg shadow">
                      免费
                    </span>
                  )}
                </div>
                <div className="p-5">
                  <h3 className="font-bold text-[#1A1A2E] line-clamp-2">{course.title}</h3>
                  <div className="flex items-center justify-between mt-3 text-xs text-[#8B8BA0]">
                    <span>{course.student_count || 0} 人在学</span>
                    <span className="flex items-center gap-1">
                      <Icon icon="mdi:star" className="text-yellow-400 w-4 h-4" />
                      {Number(course.rating || 0).toFixed(1)}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
