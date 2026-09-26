import React from 'react';
import { cn } from '@/shared/utils/cn';

export interface AvatarProps {
  src?: string | null;
  fallback: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  status?: 'online' | 'away' | 'dnd' | 'offline';
  className?: string;
}

export const Avatar: React.FC<AvatarProps> = ({
  src,
  fallback,
  size = 'md',
  status,
  className,
}) => {
  const sizeClasses = {
    sm: 'w-7 h-7 text-xs rounded-lg',
    md: 'w-9 h-9 text-sm rounded-xl',
    lg: 'w-12 h-12 text-base rounded-2xl',
    xl: 'w-16 h-16 text-xl rounded-2xl',
  };

  const statusDotSizes = {
    sm: 'w-2 h-2 -bottom-0.5 -right-0.5 border',
    md: 'w-2.5 h-2.5 -bottom-0.5 -right-0.5 border-2',
    lg: 'w-3 h-3 bottom-0 right-0 border-2',
    xl: 'w-3.5 h-3.5 bottom-0 right-0 border-2',
  };

  const statusColors = {
    online: 'bg-emerald-500',
    away: 'bg-amber-500',
    dnd: 'bg-rose-500',
    offline: 'bg-zinc-400',
  };

  const initials = fallback.slice(0, 2).toUpperCase();

  return (
    <div className="relative inline-flex shrink-0">
      {src ? (
        <img
          src={src}
          alt={fallback}
          className={cn('object-cover shadow-xs', sizeClasses[size], className)}
        />
      ) : (
        <div
          className={cn(
            'bg-[var(--accent-primary)] text-white font-bold flex items-center justify-center shadow-xs select-none',
            sizeClasses[size],
            className
          )}
        >
          {initials}
        </div>
      )}

      {status && (
        <span
          className={cn(
            'absolute rounded-full border-[var(--bg-chat)]',
            statusDotSizes[size],
            statusColors[status]
          )}
        />
      )}
    </div>
  );
};
