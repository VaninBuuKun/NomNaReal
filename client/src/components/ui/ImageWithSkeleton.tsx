import React, { useState, useEffect } from "react";
import { cn } from "../../utils/cn";

export interface ImageWithSkeletonProps
  extends React.ImgHTMLAttributes<HTMLImageElement> {
  skeletonClassName?: string;
  containerClassName?: string;
  fallbackSrc?: string;
}

export const ImageWithSkeleton: React.FC<ImageWithSkeletonProps> = ({
  src,
  alt = "",
  className,
  skeletonClassName,
  containerClassName,
  fallbackSrc = "/default-avatar.png",
  ...props
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [currentSrc, setCurrentSrc] = useState(src || fallbackSrc);

  useEffect(() => {
    setIsLoading(true);
    setHasError(false);
    setCurrentSrc(src || fallbackSrc);
  }, [src, fallbackSrc]);

  return (
    <div
      className={cn(
        "relative overflow-hidden shrink-0 flex items-center justify-center",
        containerClassName
      )}
    >
      {/* Shimmer / Pulse Skeleton while loading */}
      {isLoading && (
        <div
          className={cn(
            "absolute inset-0 z-10 animate-pulse bg-[var(--bg-surface-active)]/70",
            skeletonClassName
          )}
        />
      )}

      {/* Actual image */}
      <img
        src={currentSrc}
        alt={alt}
        className={cn(
          "w-full h-full object-cover transition-opacity duration-300",
          isLoading ? "opacity-0" : "opacity-100",
          className
        )}
        onLoad={() => {
          setIsLoading(false);
        }}
        onError={() => {
          if (!hasError && fallbackSrc && currentSrc !== fallbackSrc) {
            setHasError(true);
            setCurrentSrc(fallbackSrc);
          } else {
            setIsLoading(false);
          }
        }}
        {...props}
      />
    </div>
  );
};
