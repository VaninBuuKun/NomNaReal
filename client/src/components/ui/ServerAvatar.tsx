import React, { useState, useEffect } from 'react';
import { getMediaUrl } from '../../utils/constants';

export interface ServerAvatarProps {
  name?: string;
  iconUrl?: string | null;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  roundedClassName?: string;
  onClick?: (e: React.MouseEvent<HTMLDivElement>) => void;
}

const sizeClasses: Record<string, { container: string; text: string }> = {
  xs: { container: 'w-5 h-5', text: 'text-[10px]' },
  sm: { container: 'w-6 h-6', text: 'text-[11px]' },
  md: { container: 'w-10 h-10', text: 'text-[14px]' },
  lg: { container: 'w-12 h-12', text: 'text-[17px]' },
  xl: { container: 'w-14 h-14', text: 'text-[20px]' },
};

// Cache of already loaded server icon URLs across component lifecycles
const loadedServerIconsCache = new Set<string>();

export const ServerAvatar: React.FC<ServerAvatarProps> = ({
  name,
  iconUrl,
  size = 'md',
  className = '',
  roundedClassName = 'rounded-[8px]',
  onClick,
}) => {
  const targetSrc = getMediaUrl(iconUrl);
  const hasValidUrl = Boolean(iconUrl && targetSrc && !targetSrc.includes('default-avatar.png'));
  const alreadyCached = !hasValidUrl || loadedServerIconsCache.has(targetSrc);

  const [isLoading, setIsLoading] = useState(!alreadyCached);
  const [hasError, setHasError] = useState(false);
  const sizeStyle = sizeClasses[size] || sizeClasses.md;
  const initial = (name || "S").trim().charAt(0).toUpperCase();

  useEffect(() => {
    if (!hasValidUrl || alreadyCached) {
      setIsLoading(false);
      setHasError(false);
      return;
    }
    setIsLoading(true);
    setHasError(false);
  }, [iconUrl, alreadyCached, hasValidUrl]);

  const shouldShowLetter = !hasValidUrl || hasError;

  return (
    <div
      onClick={onClick}
      className={`relative shrink-0 select-none ${roundedClassName} ${sizeStyle.container} ${className}`}
    >
      <div className={`w-full h-full ${roundedClassName} overflow-hidden bg-[var(--bg-surface)] border border-[var(--border-color)]/60 relative flex items-center justify-center font-bold text-white`}>
        {isLoading && !alreadyCached && (
          <div className="absolute inset-0 z-10 animate-pulse bg-[var(--bg-surface-active)]" />
        )}

        {shouldShowLetter ? (
          <span className={`select-none leading-none ${sizeStyle.text}`}>
            {initial}
          </span>
        ) : (
          <img
            src={targetSrc}
            alt=""
            aria-label={name || "Server"}
            className={`w-full h-full object-cover text-transparent ${
              isLoading && !alreadyCached ? 'opacity-0' : 'opacity-100'
            }`}
            onLoad={() => {
              loadedServerIconsCache.add(targetSrc);
              setIsLoading(false);
            }}
            onError={() => {
              setHasError(true);
              setIsLoading(false);
            }}
          />
        )}
      </div>
    </div>
  );
};

export default ServerAvatar;

// Compatibility alias
export { ServerAvatar as WorkspaceAvatar };
export type { ServerAvatarProps as WorkspaceAvatarProps };
