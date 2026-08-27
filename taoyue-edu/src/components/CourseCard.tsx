import Link from 'next/link';
import { Icon } from '@iconify/react';
import { resolveAssetUrl } from '@/lib/asset';

interface CourseCardProps {
  id: number;
  title: string;
  subtitle: string;
  slug: string;
  cover: string;
  category_name: string;
  teacher?: { name: string; avatar: string; title: string } | null;
  course_type: string;
  price: number;
  original_price: number;
  student_count: number;
  rating: number;
  review_count: number;
  tags: string[];
  duration_hours: number;
}

const typeLabels: Record<string, string> = {
  recorded: '系统录播',
  live: '直播班',
  bootcamp: '训练营',
  private: '私教陪跑',
};

const typeColors: Record<string, string> = {
  recorded: 'bg-blue-100 text-blue-700',
  live: 'bg-red-100 text-red-700',
  bootcamp: 'bg-orange-100 text-orange-700',
  private: 'bg-purple-100 text-purple-700',
};

export default function CourseCard({ course }: { course: CourseCardProps }) {
  return (
    <Link href={`/course/${course.slug}`} className="card group">
      {/* 封面 */}
      <div className="relative aspect-[4/3] bg-gradient-to-br from-gray-100 to-gray-200 overflow-hidden">
        {course.cover ? (
          <img
            src={resolveAssetUrl(course.cover)}
            alt={course.title}
            loading="lazy"
            decoding="async"
            width={800}
            height={600}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-primary-400/20 to-secondary-400/20 flex items-center justify-center">
            <Icon icon="mdi:book-education" className="w-12 h-12 text-primary-300" />
          </div>
        )}
        {/* 类型标签 */}
        <span className={`absolute top-3 left-3 text-xs font-medium px-2.5 py-1 rounded-full ${typeColors[course.course_type] || 'bg-gray-100 text-gray-600'}`}>
          {typeLabels[course.course_type] || course.course_type}
        </span>
        {/* 价格标签 */}
        <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm rounded-full px-3 py-1">
          <span className="text-sm font-bold text-primary-500">
            {course.price === 0 ? '免费' : `¥${course.price}`}
          </span>
          {course.original_price > course.price && (
            <span className="text-xs text-gray-400 line-through ml-1">¥{course.original_price}</span>
          )}
        </div>
        {/* Hover遮罩 */}
        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <span className="text-white font-medium px-6 py-2.5 rounded-full border-2 border-white hover:bg-white hover:text-gray-900 transition-colors">
            了解详情
          </span>
        </div>
      </div>

      {/* 信息 */}
      <div className="p-4">
        <h3 className="font-semibold text-gray-800 line-clamp-2 mb-1.5 group-hover:text-primary-500 transition-colors">
          {course.title}
        </h3>
        {course.subtitle && (
          <p className="text-xs text-gray-400 line-clamp-1 mb-3">{course.subtitle}</p>
        )}

        {/* 讲师 */}
        {course.teacher && (
          <div className="flex items-center gap-2 mb-3">
            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-primary-400 to-secondary-400 flex items-center justify-center text-white text-xs font-bold">
              {course.teacher.name?.[0] || 'T'}
            </div>
            <span className="text-xs text-gray-500">{course.teacher.name}</span>
          </div>
        )}

        {/* 统计 */}
        <div className="flex items-center justify-between text-xs text-gray-400">
          <div className="flex items-center gap-1">
            <Icon icon="mdi:account-group" className="w-3.5 h-3.5" />
            <span>{course.student_count.toLocaleString()}人学习</span>
          </div>
          <div className="flex items-center gap-1">
            <Icon icon="mdi:star" className="w-3.5 h-3.5 text-yellow-400" />
            <span>{course.rating.toFixed(1)}</span>
          </div>
          {course.duration_hours > 0 && (
            <div className="flex items-center gap-1">
              <Icon icon="mdi:clock-outline" className="w-3.5 h-3.5" />
              <span>{course.duration_hours}h</span>
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
