import React from 'react';
import { cn } from '../../utils/cn';
import { getMediaUrl } from '../../utils/constants';

export interface AvatarProps {
  src?: string | null;
  fallback: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  status?: 'online' | 'away' | 'dnd' | 'offline';
  className?: string;
}

const AVATAR_COLORS = [
  'bg-violet-600',
  'bg-indigo-600',
  'bg-blue-600',
  'bg-emerald-600',
  'bg-teal-600',
  'bg-amber-600',
  'bg-rose-600',
  'bg-pink-600',
];

function getAvatarBg(name?: string) {
  if (!name) return 'bg-violet-600';
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

// Global memory cache of loaded avatar URLs to avoid flickering on re-render
const loadedAvatarCache = new Set<string>();

export const Avatar: React.FC<AvatarProps> = ({
  src,
  fallback,
  size = 'md',
  status,
  className,
}) => {
  const [imageError, setImageError] = React.useState(false);
  const effectiveSrc = getMediaUrl(src);
  const hasValidSrc = Boolean(src && effectiveSrc && !effectiveSrc.includes('default-avatar.png'));
  const initial = (fallback || 'U').trim().charAt(0).toUpperCase();

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

  const shouldShowLetter = !hasValidSrc || imageError;

  return (
    <div className="relative inline-flex shrink-0 select-none">
      <div
        className={cn(
          'flex items-center justify-center font-bold text-white shadow-xs overflow-hidden',
          shouldShowLetter ? getAvatarBg(fallback) : 'bg-[var(--bg-surface)]',
          sizeClasses[size],
          className
        )}
      >
        {shouldShowLetter ? (
          <span className="select-none leading-none">{initial}</span>
        ) : (
          <img
            src={effectiveSrc}
            alt=""
            aria-label={fallback}
            onLoad={() => {
              if (effectiveSrc) loadedAvatarCache.add(effectiveSrc);
            }}
            onError={() => setImageError(true)}
            className="w-full h-full object-cover text-transparent"
          />
        )}
      </div>

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
