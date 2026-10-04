import React, { useState, useEffect } from 'react';
import { getMediaUrl } from '../../utils/constants';

export interface WorkspaceAvatarProps {
  name?: string;
  iconUrl?: string | null;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  roundedClassName?: string;
  onClick?: (e: React.MouseEvent<HTMLDivElement>) => void;
}

const sizeClasses: Record<string, string> = {
  xs: 'w-5 h-5',
  sm: 'w-6 h-6',
  md: 'w-10 h-10',
  lg: 'w-12 h-12',
  xl: 'w-14 h-14',
};

export const WorkspaceAvatar: React.FC<WorkspaceAvatarProps> = ({
  name,
  iconUrl,
  size = 'md',
  className = '',
  roundedClassName = 'rounded-[8px]',
  onClick,
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const sizeStyle = sizeClasses[size] || sizeClasses.md;

  const targetSrc = getMediaUrl(iconUrl);

  useEffect(() => {
    setIsLoading(true);
    setHasError(false);
  }, [iconUrl]);

  return (
    <div
      onClick={onClick}
      className={`relative shrink-0 select-none ${roundedClassName} ${sizeStyle} ${className}`}
    >
      <div className={`w-full h-full ${roundedClassName} overflow-hidden bg-[var(--bg-surface)] border border-[var(--border-color)]/60 relative`}>
        {/* Loading shimmer skeleton while S3 or remote image is loading */}
        {isLoading && (
          <div className="absolute inset-0 z-10 animate-pulse bg-[var(--bg-surface-active)]" />
        )}

        {/* Real image or fallback image with explicit alt and text-transparent to prevent broken text leak */}
        <img
          src={hasError ? '/default-avatar.png' : targetSrc}
          alt={name || "Workspace"}
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
    </div>
  );
};

export default WorkspaceAvatar;
