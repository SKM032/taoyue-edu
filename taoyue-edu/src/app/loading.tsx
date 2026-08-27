/**
 * 路由级加载占位（App Router）。
 * 页面切换时立即渲染，给用户明确的"正在加载"反馈，
 * 避免切换路由期间旧页面静止造成的"卡顿"错觉。
 */
export default function Loading() {
  return (
    <div className="flex min-h-[60vh] w-full items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="relative h-10 w-10">
          <div
            className="absolute inset-0 animate-spin rounded-full"
            style={{
              border: '3px solid transparent',
              borderTopColor: '#4f46e5',
              borderRightColor: '#6366f1',
            }}
          />
        </div>
        <p className="text-sm text-gray-500">页面加载中...</p>
      </div>
    </div>
  );
}
