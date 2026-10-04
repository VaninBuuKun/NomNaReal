import React, { useState, useEffect } from 'react';
import { getMediaUrl } from '../../utils/constants';

export interface UserAvatarProps {
  name?: string;
  avatarUrl?: string | null;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  roundedClassName?: string;
  status?: 'online' | 'offline' | 'away' | 'dnd' | string;
  onClick?: (e: React.MouseEvent<HTMLDivElement>) => void;
}

const sizeClasses: Record<string, { container: string; dot: string }> = {
  xs: { container: 'w-5 h-5', dot: 'w-1.5 h-1.5' },
  sm: { container: 'w-7 h-7', dot: 'w-2 h-2' },
  md: { container: 'w-10 h-10', dot: 'w-2.5 h-2.5' },
  lg: { container: 'w-12 h-12', dot: 'w-3 h-3' },
  xl: { container: 'w-16 h-16', dot: 'w-3.5 h-3.5' },
};

export const UserAvatar: React.FC<UserAvatarProps> = ({
  name,
  avatarUrl,
  size = 'md',
  className = '',
  roundedClassName = 'rounded-full',
  status,
  onClick,
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const sizeStyle = sizeClasses[size] || sizeClasses.md;

  const targetSrc = getMediaUrl(avatarUrl);

  useEffect(() => {
    setIsLoading(true);
    setHasError(false);
  }, [avatarUrl]);

  const statusBg =
    status === 'online'
      ? 'bg-emerald-500'
      : status === 'away'
        ? 'bg-amber-500'
        : status === 'dnd'
          ? 'bg-rose-500'
          : 'bg-zinc-400';

  return (
    <div
      onClick={onClick}
      className={`relative shrink-0 select-none ${roundedClassName} ${sizeStyle.container} ${className}`}
    >
      <div className={`w-full h-full ${roundedClassName} overflow-hidden bg-[var(--bg-surface)] border border-[var(--border-color)]/60 relative`}>
        {/* Loading shimmer skeleton while S3 or remote image is loading */}
        {isLoading && (
          <div className="absolute inset-0 z-10 animate-pulse bg-[var(--bg-surface-active)]" />
        )}

        {/* Real image or fallback image with explicit alt and text-transparent to prevent broken text leak */}
        <img
          src={hasError ? '/default-avatar.png' : targetSrc}
          alt={name || "User Avatar"}
          className={`w-full h-full object-cover transition-opacity duration-200 text-transparent ${
            isLoading ? 'opacity-0' : 'opacity-100'
          }`}
          onLoad={() => setIsLoading(false)}
          onError={() => {
            if (!hasError) {
              setHasError(true);
              setIsLoading(true);
            } else {
              setIsLoading(false);
            }
          }}
        />
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
