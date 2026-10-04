import React, { useState } from "react";
import { Trash, WarningCircle, X } from "@phosphor-icons/react";

interface DeleteMessageModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (dontAskAgain: boolean) => Promise<void> | void;
  messagePreview?: string;
  isDeleting?: boolean;
}

export const DeleteMessageModal: React.FC<DeleteMessageModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  messagePreview,
  isDeleting = false,
}) => {
  const [dontAskAgain, setDontAskAgain] = useState(false);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/50 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-[var(--bg-chat)] border border-[var(--border-color)] rounded-[4px] shadow-2xl flex flex-col overflow-hidden relative animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-[var(--border-color)] bg-[var(--bg-chat)]">
          <div className="flex items-center gap-2 text-rose-500 font-bold text-sm">
            <Trash size={18} weight="bold" />
            <span>Xác nhận xoá tin nhắn</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-active)] transition-colors cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 flex flex-col gap-3.5 text-xs text-[var(--text-primary)]">
          <div className="flex items-start gap-2.5 text-[var(--text-secondary)] leading-relaxed">
            <WarningCircle size={20} className="shrink-0 text-amber-500 mt-0.5" weight="fill" />
            <p>
              Bạn có chắc chắn muốn xoá tin nhắn này? Hành động này sẽ gỡ bỏ tin nhắn vĩnh viễn và không thể hoàn tác.
            </p>
          </div>

          {/* Snippet preview */}
          {messagePreview && (
            <div className="p-3 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-color)] font-mono text-[0.8rem] text-[var(--text-muted)] line-clamp-3 select-none">
              &quot;{messagePreview}&quot;
            </div>
          )}

          {/* Don't ask again checkbox */}
          <label className="flex items-center gap-2.5 pt-1 text-[var(--text-secondary)] cursor-pointer select-none group">
            <input
              type="checkbox"
              checked={dontAskAgain}
              onChange={(e) => setDontAskAgain(e.target.checked)}
              className="w-4 h-4 rounded border-[var(--border-color)] text-[var(--accent-primary)] focus:ring-[var(--accent-primary)] cursor-pointer"
            />
            <span className="group-hover:text-[var(--text-primary)] transition-colors">
              Không hỏi lại trên trình duyệt này
            </span>
          </label>
        </div>

        {/* Footer Actions */}
        <div className="px-5 py-3 border-t border-[var(--border-color)] bg-[var(--bg-surface)] flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-[var(--text-secondary)] hover:bg-[var(--bg-surface-active)] hover:text-[var(--text-primary)] transition-colors cursor-pointer disabled:opacity-50"
          >
            Huỷ bỏ
          </button>
          <button
            type="button"
            onClick={() => onConfirm(dontAskAgain)}
            disabled={isDeleting}
            className="px-4 py-1.5 rounded-lg text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-md shadow-rose-600/20 transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
          >
            {isDeleting ? "Đang xoá..." : "Xoá tin nhắn"}
          </button>
        </div>
      </div>
    </div>
  );
};
