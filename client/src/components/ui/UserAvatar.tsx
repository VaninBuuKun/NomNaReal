import React, { useState, useEffect } from 'react';
import { getMediaUrl } from '../../utils/constants';

export interface UserAvatarProps {
  name?: string;
  avatarUrl?: string | null;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  className?: string;
  roundedClassName?: string;
  status?: 'online' | 'offline' | 'away' | 'dnd' | string;
  onClick?: (e: React.MouseEvent<HTMLDivElement>) => void;
}

const sizeClasses: Record<string, { container: string; dot: string; text: string }> = {
  xs: { container: 'w-5 h-5', dot: 'w-1.5 h-1.5', text: 'text-[10px]' },
  sm: { container: 'w-7 h-7', dot: 'w-2 h-2', text: 'text-[11px]' },
  md: { container: 'w-10 h-10', dot: 'w-2.5 h-2.5', text: 'text-[14px]' },
  lg: { container: 'w-12 h-12', dot: 'w-3 h-3', text: 'text-[17px]' },
  xl: { container: 'w-16 h-16', dot: 'w-3.5 h-3.5', text: 'text-[22px]' },
  '2xl': { container: 'w-20 h-20 sm:w-24 sm:h-24', dot: 'w-4 h-4', text: 'text-[28px] sm:text-[34px]' },
};

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

// Cache of already loaded image URLs across component lifecycles to avoid blinking on re-render
const loadedImagesCache = new Set<string>();

export const UserAvatar: React.FC<UserAvatarProps> = ({
  name,
  avatarUrl,
  size = 'md',
  className = '',
  roundedClassName = 'rounded-full',
  status,
  onClick,
}) => {
  const targetSrc = getMediaUrl(avatarUrl);
  const hasValidUrl = Boolean(avatarUrl && targetSrc && !targetSrc.includes('default-avatar.png'));
  const alreadyCached = !hasValidUrl || loadedImagesCache.has(targetSrc);

  const [isLoading, setIsLoading] = useState(!alreadyCached);
  const [hasError, setHasError] = useState(false);
  const sizeStyle = sizeClasses[size] || sizeClasses.md;
  const initial = (name || "U").trim().charAt(0).toUpperCase();

  useEffect(() => {
    if (!hasValidUrl || alreadyCached) {
      setIsLoading(false);
      setHasError(false);
      return;
    }
    setIsLoading(true);
    setHasError(false);
  }, [avatarUrl, alreadyCached, hasValidUrl]);

  const statusBg =
    status === 'online'
      ? 'bg-emerald-500'
      : status === 'away'
        ? 'bg-amber-500'
        : status === 'dnd'
          ? 'bg-rose-500'
          : 'bg-zinc-400';

  const shouldShowLetter = !hasValidUrl || hasError;

  return (
    <div
      onClick={onClick}
      className={`relative shrink-0 select-none ${roundedClassName} ${sizeStyle.container} ${className}`}
    >
      <div className={`w-full h-full ${roundedClassName} overflow-hidden border border-[var(--border-color)]/60 relative flex items-center justify-center ${
        shouldShowLetter ? `${getAvatarBg(name)} text-white` : 'bg-[var(--bg-surface)]'
      }`}>
        {/* Loading shimmer skeleton only when loading an uncached remote image */}
        {isLoading && !alreadyCached && (
          <div className="absolute inset-0 z-10 animate-pulse bg-[var(--bg-surface-active)]" />
        )}

        {shouldShowLetter ? (
          <span className={`font-bold select-none text-white leading-none ${sizeStyle.text}`}>
            {initial}
          </span>
        ) : (
          <img
            src={targetSrc}
            alt=""
            aria-label={name || "User Avatar"}
            className={`w-full h-full object-cover text-transparent ${
              isLoading && !alreadyCached ? 'opacity-0' : 'opacity-100'
            }`}
            onLoad={() => {
              loadedImagesCache.add(targetSrc);
              setIsLoading(false);
            }}
            onError={() => {
              setHasError(true);
              setIsLoading(false);
            }}
          />
        )}
      </div>

      {status && (
        <span
          className={`absolute bottom-0 right-0 ${sizeStyle.dot} rounded-full ring-2 ring-[var(--bg-chat)] ${statusBg} z-20`}
        />
      )}
    </div>
  );
};

export default UserAvatar;
