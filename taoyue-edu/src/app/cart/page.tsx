'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Icon } from '@iconify/react';
import { cartApi } from '@/lib/api';
import { resolveAssetUrl } from '@/lib/asset';
import { useAuth } from '@/lib/auth';
import { useCart } from '@/lib/cart';
import toast from 'react-hot-toast';

export default function CartPage() {
  const router = useRouter();
  const { isLoggedIn, loading: authLoading } = useAuth();
  const { refreshCart } = useCart();

  const [items, setItems] = useState<any[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);

  const loadCart = async () => {
    setLoading(true);
    try {
      const res = await cartApi.getCart();
      const data = res.data || { items: [] };
      setItems(data.items || []);
      // 默认全选
      setSelected(new Set((data.items || []).map((i: any) => i.course_id)));
    } catch {
      toast.error('购物车加载失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (authLoading) return;
    if (!isLoggedIn) {
      router.replace('/login');
      return;
    }
    loadCart();
  }, [authLoading, isLoggedIn]);

  const toggleSelect = (courseId: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(courseId)) next.delete(courseId);
      else next.add(courseId);
      return next;
    });
  };

  const toggleSelectAll = () => {
    setSelected((prev) => (prev.size === items.length ? new Set() : new Set(items.map((i) => i.course_id))));
  };

  const removeItem = async (courseId: number) => {
    try {
      await cartApi.remove(courseId);
      setItems((prev) => prev.filter((i) => i.course_id !== courseId));
      setSelected((prev) => {
        const next = new Set(prev);
        next.delete(courseId);
        return next;
      });
      refreshCart();
      toast.success('已移除');
    } catch {
      toast.error('移除失败');
    }
  };

  const selectedItems = items.filter((i) => selected.has(i.course_id));
  const totalPrice = selectedItems.reduce((sum, i) => sum + Number(i.price || 0), 0);

  const handleCheckout = async () => {
    if (selectedItems.length === 0) {
      toast('请先选择要结算的课程');
      return;
    }
    // 携带所有选中课程 ID 跳转结算页，多门课程合并成一个订单支付
    const ids = selectedItems.map((i) => i.course_id);
    const query = ids.map((id) => `course_id=${id}`).join('&');
    router.push(`/checkout?${query}`);
  };

  if (authLoading) {
    return <div className="flex justify-center py-32"><Icon icon="mdi:loading" className="w-8 h-8 animate-spin text-[#00C4D4]" /></div>;
  }

  return (
    <div className="min-h-screen pt-16" style={{ backgroundColor: '#F5F5F7', color: '#1A1A2E', fontFamily: "'Inter', system-ui, -apple-system, sans-serif" }}>
      <div className="max-w-[1200px] mx-auto px-6 py-8">
        {/* 页头 */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#00C4D4] to-[#6D28D9] flex items-center justify-center">
            <Icon icon="mdi:cart-outline" className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[#1A1A2E]">我的购物车</h1>
            <p className="text-sm text-[#8B8BA0]">共 {items.length} 门课程</p>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-24"><Icon icon="mdi:loading" className="w-8 h-8 animate-spin text-[#00C4D4]" /></div>
        ) : items.length === 0 ? (
          // 空购物车
          <div className="bg-white rounded-2xl border border-[#E5E7EB] py-20 text-center">
            <Icon icon="mdi:cart-off" className="w-16 h-16 text-[#C7C9D1] mx-auto mb-4" />
            <h2 className="text-lg font-bold text-[#4A4A6A]">购物车是空的</h2>
            <p className="text-sm text-[#8B8BA0] mt-1 mb-6">快去挑选心仪的课程吧</p>
            <Link href="/courses" className="inline-block px-6 py-2.5 bg-gradient-to-r from-[#00C4D4] to-[#6D28D9] text-white rounded-lg font-bold hover:shadow-md transition-all">
              去选课
            </Link>
          </div>
        ) : (
          <>
            {/* 列表 */}
            <div className="bg-white rounded-2xl border border-[#E5E7EB] overflow-hidden mb-6">
              {/* 表头 */}
              <div className="flex items-center gap-3 px-5 py-3 bg-[#FAFAFC] border-b border-[#E5E7EB]">
                <button onClick={toggleSelectAll} className="flex items-center gap-2 text-sm text-[#4A4A6A] hover:text-[#00C4D4]">
                  <span className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${selected.size === items.length ? 'bg-[#00C4D4] border-[#00C4D4]' : 'border-[#D1D5DB]'}`}>
                    {selected.size === items.length && <Icon icon="mdi:check" className="w-3.5 h-3.5 text-white" />}
                  </span>
                  全选
                </button>
              </div>

              {/* 课程项 */}
              {items.map((item) => {
                const isSelected = selected.has(item.course_id);
                return (
                  <div key={item.course_id} className={`flex items-center gap-4 px-5 py-4 border-b border-[#F3F4F6] transition-colors ${isSelected ? 'bg-[#F0FDFA]/40' : ''}`}>
                    {/* 选择 */}
                    <button onClick={() => toggleSelect(item.course_id)} className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${isSelected ? 'bg-[#00C4D4] border-[#00C4D4]' : 'border-[#D1D5DB]'}`}>
                      {isSelected && <Icon icon="mdi:check" className="w-3.5 h-3.5 text-white" />}
                    </button>

                    {/* 封面 + 信息 */}
                    <Link href={`/course/${item.slug}`} className="flex-1 flex items-center gap-4 min-w-0 group">
                      <div className="w-28 h-[4.5rem] rounded-lg bg-cover bg-center flex-shrink-0" style={{ backgroundImage: item.cover ? `url(${resolveAssetUrl(item.cover)})` : undefined, backgroundColor: item.cover ? undefined : '#E0F7FA' }} />
                      <div className="min-w-0">
                        <p className="font-bold text-[#1A1A2E] truncate group-hover:text-[#00C4D4] transition-colors">{item.title}</p>
                        <p className="text-xs text-[#8B8BA0] mt-1">{item.difficulty === 'beginner' ? '初级' : item.difficulty === 'intermediate' ? '中级' : '高级'}{item.student_count ? ` · ${item.student_count}人已学` : ''}</p>
                      </div>
                    </Link>

                    {/* 价格 */}
                    <div className="text-right shrink-0">
                      <div className="font-black text-[#DC2626]">¥{Number(item.price).toLocaleString()}</div>
                      {item.original_price > item.price && <div className="text-xs text-[#8B8BA0] line-through">¥{Number(item.original_price).toLocaleString()}</div>}
                    </div>

                    {/* 移除 */}
                    <button onClick={() => removeItem(item.course_id)} className="p-2 text-[#8B8BA0] hover:text-[#DC2626] hover:bg-[#FEF2F2] rounded-lg transition-colors shrink-0" aria-label="移除">
                      <Icon icon="mdi:trash-can-outline" className="w-5 h-5" />
                    </button>
                  </div>
                );
              })}
            </div>

            {/* 底部结算栏 */}
            <div className="bg-white rounded-2xl border border-[#E5E7EB] px-5 py-4 sticky bottom-4 flex items-center justify-between shadow-lg">
              <div className="flex items-center gap-2">
                <button onClick={toggleSelectAll} className="flex items-center gap-2 text-sm text-[#4A4A6A] hover:text-[#00C4D4]">
                  <span className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${selected.size === items.length ? 'bg-[#00C4D4] border-[#00C4D4]' : 'border-[#D1D5DB]'}`}>
                    {selected.size === items.length && <Icon icon="mdi:check" className="w-3.5 h-3.5 text-white" />}
                  </span>
                  全选
                </button>
                <span className="text-sm text-[#8B8BA0]">已选 <span className="text-[#00C4D4] font-bold">{selectedItems.length}</span> 门课程</span>
              </div>
              <div className="flex items-center gap-6">
                <div className="text-right">
                  <div className="text-sm text-[#8B8BA0]">合计：<span className="text-2xl font-black text-[#DC2626]">¥{totalPrice.toLocaleString()}</span></div>
                </div>
                <button
                  onClick={handleCheckout}
                  disabled={selectedItems.length === 0}
                  className="px-8 py-3 bg-gradient-to-r from-[#00C4D4] to-[#6D28D9] text-white rounded-lg font-bold hover:shadow-lg hover:shadow-[#00C4D4]/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  去结算({selectedItems.length})
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
