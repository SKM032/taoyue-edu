interface InlineToastProps {
  message: string;
  type?: 'success' | 'error' | 'info';
  onClose?: () => void;
}

/**
 * 统一提示条（脱离文档流）
 * - fixed 固定定位居中，不占文档流、不影响页面布局、无跳动
 * - pointer-events-none 不拦截页面点击
 * - 成功/失败用统一卡片样式 + 图标区分
 */
export default function InlineToast({ message, type = 'info', onClose }: InlineToastProps) {
  const styles: Record<string, { bg: string; border: string; text: string; icon: string }> = {
    success: { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', icon: 'lucide:check-circle' },
    error: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700', icon: 'lucide:alert-circle' },
    info: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700', icon: 'lucide:info' },
  };
  const s = styles[type] || styles.info;

  return (
    <div
      className={`fixed top-4 left-1/2 -translate-x-1/2 z-[80] px-5 py-3 rounded-xl border shadow-lg text-sm flex items-center gap-2.5 animate-[toastIn_0.25s_ease-out] pointer-events-none ${s.bg} ${s.border} ${s.text}`}
    >
      <iconify-icon icon={s.icon} class="text-lg flex-shrink-0"></iconify-icon>
      <span className="font-medium">{message}</span>
      {onClose && (
        <button
          onClick={onClose}
          className="opacity-60 hover:opacity-100 transition-opacity flex-shrink-0 cursor-pointer pointer-events-auto"
        >
          <iconify-icon icon="lucide:x" class="text-base"></iconify-icon>
        </button>
      )}
    </div>
  );
}