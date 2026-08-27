import { useState } from 'react';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message?: React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  danger?: boolean;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * 统一企业级确认对话框
 * - 遮罩层 + 居中卡片，无视觉跳动
 */
export default function ConfirmDialog({
  open,
  title,
  message,
  confirmText = '确认',
  cancelText = '取消',
  danger = false,
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const [localLoading, setLocalLoading] = useState(false);
  const busy = loading ?? localLoading;

  if (!open) return null;

  const handleConfirm = () => {
    if (busy) return;
    onConfirm();
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => !busy && onCancel()}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden animate-[fadeIn_0.2s_ease-out]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 头部 */}
        <div className="flex items-center gap-3 px-6 pt-6 pb-4">
          <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${
            danger ? 'bg-red-50' : 'bg-indigo-50'
          }`}>
            <iconify-icon
              icon={danger ? 'lucide:trash-2' : 'lucide:help-circle'}
              class={`text-xl ${danger ? 'text-red-500' : 'text-indigo-500'}`}
            ></iconify-icon>
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-800">{title}</h3>
            <p className="text-sm text-slate-500 mt-0.5">此操作不可撤销，请谨慎操作</p>
          </div>
        </div>

        {/* 内容 */}
        {message && (
          <div className="px-6 py-4">
            <div className="bg-slate-50 rounded-lg px-4 py-3 border border-slate-100 text-sm text-slate-700">
              {message}
            </div>
          </div>
        )}

        {/* 底部操作 */}
        <div className="flex items-center justify-end gap-3 px-6 py-5 bg-slate-50 border-t border-slate-100">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-200 rounded-lg transition-colors disabled:opacity-50"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={busy}
            className={`px-5 py-2.5 text-white text-sm font-medium rounded-lg transition-colors shadow-sm flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed ${
              danger ? 'bg-red-500 hover:bg-red-600' : 'bg-indigo-500 hover:bg-indigo-600'
            }`}
          >
            {busy ? (
              <>
                <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                </svg>
                处理中...
              </>
            ) : (
              confirmText
            )}
          </button>
        </div>
      </div>
    </div>
  );
}