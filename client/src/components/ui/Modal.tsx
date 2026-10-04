import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { cn } from '../../utils/cn';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';
  showCloseButton?: boolean;
  children: React.ReactNode;
  className?: string;
  bodyClassName?: string;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  size = 'md',
  showCloseButton = true,
  children,
  className,
  bodyClassName,
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-2xl',
    '2xl': 'max-w-4xl h-[680px]',
    full: 'max-w-[95vw] h-[92vh]',
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className={cn(
          'w-full bg-[var(--bg-chat)] border border-[var(--border-color)] rounded-[4px] shadow-2xl flex flex-col overflow-hidden relative',
          'animate-in zoom-in-95 duration-200',
          sizeClasses[size],
          className
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {(title || showCloseButton) && (
          <header className="flex items-center justify-between px-6 py-4 border-b border-[var(--border-color)] bg-[var(--bg-chat)] shrink-0">
            <div>
              {typeof title === 'string' ? (
                <h2 className="text-base font-bold text-[var(--text-primary)]">{title}</h2>
              ) : (
                title
              )}
              {subtitle && (
                <p className="text-xs text-[var(--text-muted)] mt-0.5">{subtitle}</p>
              )}
            </div>

            {showCloseButton && (
              <button
                type="button"
                onClick={onClose}
                className="w-8 h-8 rounded-[3px] flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-active)] transition-colors cursor-pointer border border-transparent hover:border-[var(--border-color)]"
                title="Đóng (Esc)"
              >
                <X size={16} />
              </button>
            )}
          </header>
        )}

        <div className={cn('flex-1 overflow-y-auto', bodyClassName)}>{children}</div>
      </div>
    </div>
  );
};
