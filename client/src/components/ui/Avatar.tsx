import React from 'react';
import { cn } from '../../utils/cn';
import { DEFAULT_AVATAR, getMediaUrl } from '../../utils/constants';

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
  const [imageError, setImageError] = React.useState(false);
  const effectiveSrc = getMediaUrl(src);

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

  return (
    <div className="relative inline-flex shrink-0">
      <img
        src={effectiveSrc && !imageError ? effectiveSrc : DEFAULT_AVATAR}
        alt={fallback}
        onError={() => setImageError(true)}
        className={cn('object-cover shadow-xs', sizeClasses[size], className)}
      />

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
