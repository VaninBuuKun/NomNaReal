import React, { useEffect } from 'react';
import { X, Lock } from '@phosphor-icons/react';

export interface ToastProps {
  id: string;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  onClose: () => void;
  duration?: number;
}

export const Toast: React.FC<ToastProps> = ({
  title,
  description,
  actionLabel,
  onAction,
  onClose,
  duration = 4000,
}) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, duration);
    return () => clearTimeout(timer);
  }, [duration, onClose]);

  return (
    <div className="fixed bottom-6 right-6 z-[9999] max-w-sm w-full bg-[var(--bg-chat)]/95 backdrop-blur-md border border-[var(--border-color)] rounded-[6px] shadow-2xl p-3.5 flex items-start gap-3 transition-all duration-300 animate-in fade-in slide-in-from-bottom-4">
      {/* Icon */}
      <div className="w-8 h-8 rounded-[4px] bg-[var(--accent-soft)] flex items-center justify-center text-[var(--accent-primary)] shrink-0 mt-0.5">
        <Lock size={16} weight="bold" />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="text-xs font-bold text-[var(--text-primary)] leading-tight">
          {title}
        </div>
        {description && (
          <div className="text-[11px] text-[var(--text-secondary)] mt-0.5 leading-snug line-clamp-2">
            {description}
          </div>
        )}

        {actionLabel && onAction && (
          <button
            type="button"
            onClick={onAction}
            className="mt-2 text-[11px] font-bold text-[var(--accent-primary)] hover:underline inline-flex items-center gap-1 cursor-pointer"
          >
            {actionLabel} &rarr;
          </button>
        )}
      </div>

      {/* Close button */}
      <button
        type="button"
        onClick={onClose}
        className="p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] rounded-[3px] hover:bg-[var(--bg-surface)] transition-colors cursor-pointer shrink-0"
        title="Đóng thông báo"
      >
        <X size={13} weight="bold" />
      </button>
    </div>
  );
};
