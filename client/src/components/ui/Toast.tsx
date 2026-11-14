import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Info,
  CheckCircle,
  Warning,
  Prohibit,
} from '@phosphor-icons/react';
import { useToastStore, type ToastVariant } from '../../stores/useToastStore';

export interface ToastProps {
  id: string;
  title: string;
  description?: string;
  variant?: ToastVariant;
  actionLabel?: string;
  onAction?: () => void;
  onClose: () => void;
  duration?: number;
}

const VARIANT_CONFIGS: Record<
  ToastVariant,
  {
    icon: React.ReactNode;
    iconBoxClass: string;
    cardBorderClass: string;
  }
> = {
  warning: {
    icon: <Warning size={16} weight="bold" />,
    iconBoxClass: 'bg-amber-500/15 text-amber-500 border border-amber-500/30',
    cardBorderClass: 'border-amber-500/40 shadow-[0_8px_24px_rgba(245,158,11,0.15)]',
  },
  error: {
    icon: <Prohibit size={16} weight="bold" />,
    iconBoxClass: 'bg-danger/15 text-danger border border-danger/30',
    cardBorderClass: 'border-danger/40 shadow-[0_8px_24px_rgba(239,68,68,0.15)]',
  },
  success: {
    icon: <CheckCircle size={16} weight="bold" />,
    iconBoxClass: 'bg-success/15 text-success border border-success/30',
    cardBorderClass: 'border-success/40 shadow-[0_8px_24px_rgba(34,197,94,0.15)]',
  },
  info: {
    icon: <Info size={16} weight="bold" />,
    iconBoxClass: 'bg-[var(--accent-soft)] text-[var(--accent-primary)] border border-[var(--accent-primary)]/20',
    cardBorderClass: 'border-[var(--border-color)] shadow-2xl',
  },
};

export const Toast: React.FC<ToastProps> = ({
  title,
  description,
  variant = 'info',
  actionLabel,
  onAction,
  onClose,
  duration = 4500,
}) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, duration);
    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const config = VARIANT_CONFIGS[variant] || VARIANT_CONFIGS.info;

  return (
    <div
      className={`pointer-events-auto max-w-sm w-full bg-[var(--bg-chat)]/95 backdrop-blur-md border rounded-[6px] p-3.5 flex items-start gap-3 transition-all duration-300 animate-in fade-in slide-in-from-bottom-4 ${config.cardBorderClass}`}
    >
      {/* Semantic Icon Box */}
      <div
        className={`w-8 h-8 rounded-[4px] flex items-center justify-center shrink-0 mt-0.5 ${config.iconBoxClass}`}
      >
        {config.icon}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="text-xs font-bold text-[var(--text-primary)] leading-tight">
          {title}
        </div>
        {description && (
          <div className="text-[11px] text-[var(--text-secondary)] mt-0.5 leading-snug line-clamp-3">
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

/**
 * Global Portal container that renders the active Toast stack from useToastStore.
 */
export const ToastContainer: React.FC = () => {
  const { toasts, dismissToast } = useToastStore();

  if (toasts.length === 0 || typeof document === 'undefined') {
    return null;
  }

  return createPortal(
    <aside
      aria-label="Thông báo hệ thống"
      className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-2.5 pointer-events-none select-none max-w-sm w-full"
    >
      {toasts.map((item) => (
        <Toast
          key={item.id}
          id={item.id}
          title={item.title}
          description={item.description}
          variant={item.variant}
          actionLabel={item.actionLabel}
          onAction={item.onAction}
          duration={item.duration}
          onClose={() => dismissToast(item.id)}
        />
      ))}
    </aside>,
    document.body
  );
};
