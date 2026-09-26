import React from 'react';
import { cn } from '@/shared/utils/cn';

export interface BadgeProps {
  variant?: 'primary' | 'neutral' | 'success' | 'warning' | 'danger';
  size?: 'sm' | 'md';
  children: React.ReactNode;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  variant = 'neutral',
  size = 'sm',
  children,
  className,
}) => {
  const variants = {
    primary: 'bg-[var(--accent-soft)] text-[var(--accent-primary)] font-bold',
    neutral: 'bg-[var(--bg-surface)] text-[var(--text-secondary)] border border-[var(--border-color)]',
    success: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold',
    warning: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold',
    danger: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 font-bold',
  };

  const sizes = {
    sm: 'text-[0.68rem] px-2 py-0.5 rounded-md',
    md: 'text-xs px-2.5 py-1 rounded-lg',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center justify-center tracking-wide uppercase select-none',
        variants[variant],
        sizes[size],
        className
      )}
    >
      {children}
    </span>
  );
};
