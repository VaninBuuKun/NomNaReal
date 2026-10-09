import React, { useState } from 'react';
import { ImageLightboxModal } from './ImageLightboxModal';
import { getMediaUrl } from '../../utils/constants';

export interface GalleryImage {
  url: string;
  alt?: string;
  isGif?: boolean;
}

interface ImageGalleryGridProps {
  images: GalleryImage[];
}

export const ImageGalleryGrid: React.FC<ImageGalleryGridProps> = ({ images }) => {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  if (!images || images.length === 0) return null;

  const count = images.length;

  const openLightbox = (index: number) => {
    setLightboxIndex(index);
  };

  const closeLightbox = () => {
    setLightboxIndex(null);
  };

  // 1 Image: Large hero display
  if (count === 1) {
    const img = images[0];
    return (
      <>
        <div className="relative max-w-md rounded-xl overflow-hidden border border-[var(--border-color)] bg-[var(--bg-surface)] my-1 shadow-xs group">
          <img
            src={getMediaUrl(img.url)}
            alt={img.alt || 'Hình ảnh'}
            loading="lazy"
            onClick={() => openLightbox(0)}
            className="w-full max-h-[380px] object-cover cursor-pointer transition-all duration-200 group-hover:brightness-95"
          />
          {img.isGif && (
            <span className="absolute top-2 left-2 px-2 py-0.5 rounded bg-black/60 backdrop-blur-xs text-[10px] font-bold text-white uppercase tracking-wider">
              GIF
            </span>
          )}
        </div>
        <ImageLightboxModal
          isOpen={lightboxIndex !== null}
          images={images}
          initialIndex={lightboxIndex ?? 0}
          onClose={closeLightbox}
        />
      </>
    );
  }

  // 2 Images: 2 columns side-by-side
  if (count === 2) {
    return (
      <>
        <div className="grid grid-cols-2 gap-2 max-w-lg rounded-xl overflow-hidden my-1">
          {images.map((img, idx) => (
            <div
              key={idx}
              className="relative aspect-[4/3] rounded-lg overflow-hidden border border-[var(--border-color)] bg-[var(--bg-surface)] cursor-pointer group"
              onClick={() => openLightbox(idx)}
            >
              <img
                src={getMediaUrl(img.url)}
                alt={img.alt || `Hình ảnh ${idx + 1}`}
                loading="lazy"
                className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-103"
              />
              {img.isGif && (
                <span className="absolute top-2 left-2 px-2 py-0.5 rounded bg-black/60 backdrop-blur-xs text-[10px] font-bold text-white uppercase tracking-wider">
                  GIF
                </span>
              )}
            </div>
          ))}
        </div>
        <ImageLightboxModal
          isOpen={lightboxIndex !== null}
          images={images}
          initialIndex={lightboxIndex ?? 0}
          onClose={closeLightbox}
        />
      </>
    );
  }

  // 3 Images: 1 large left (takes full height) + 2 stacked right
  if (count === 3) {
    return (
      <>
        <div className="grid grid-cols-2 grid-rows-2 gap-2 max-w-lg aspect-[16/10] rounded-xl overflow-hidden my-1">
          {/* Main big image on left */}
          <div
            className="relative row-span-2 rounded-lg overflow-hidden border border-[var(--border-color)] bg-[var(--bg-surface)] cursor-pointer group"
            onClick={() => openLightbox(0)}
          >
            <img
              src={getMediaUrl(images[0].url)}
              alt={images[0].alt || 'Hình ảnh 1'}
              loading="lazy"
              className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-103"
            />
            {images[0].isGif && (
              <span className="absolute top-2 left-2 px-2 py-0.5 rounded bg-black/60 backdrop-blur-xs text-[10px] font-bold text-white uppercase tracking-wider">
                GIF
              </span>
            )}
          </div>

          {/* 2 stacked images on right */}
          {images.slice(1, 3).map((img, idx) => (
            <div
              key={idx + 1}
              className="relative rounded-lg overflow-hidden border border-[var(--border-color)] bg-[var(--bg-surface)] cursor-pointer group"
              onClick={() => openLightbox(idx + 1)}
            >
              <img
                src={getMediaUrl(img.url)}
                alt={img.alt || `Hình ảnh ${idx + 2}`}
                loading="lazy"
                className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-103"
              />
              {img.isGif && (
                <span className="absolute top-2 left-2 px-2 py-0.5 rounded bg-black/60 backdrop-blur-xs text-[10px] font-bold text-white uppercase tracking-wider">
                  GIF
                </span>
              )}
            </div>
          ))}
        </div>
        <ImageLightboxModal
          isOpen={lightboxIndex !== null}
          images={images}
          initialIndex={lightboxIndex ?? 0}
          onClose={closeLightbox}
        />
      </>
    );
  }

  // 4 or more Images: 2x2 grid (with +N badge if > 4)
  const displayImages = images.slice(0, 4);
  const remainingCount = images.length - 4;

  return (
    <>
      <div className="grid grid-cols-2 grid-rows-2 gap-2 max-w-lg aspect-square rounded-xl overflow-hidden my-1">
        {displayImages.map((img, idx) => {
          const isFourthWithMore = idx === 3 && remainingCount > 0;
          return (
            <div
              key={idx}
              className="relative rounded-lg overflow-hidden border border-[var(--border-color)] bg-[var(--bg-surface)] cursor-pointer group"
              onClick={() => openLightbox(idx)}
            >
              <img
                src={getMediaUrl(img.url)}
                alt={img.alt || `Hình ảnh ${idx + 1}`}
                loading="lazy"
                className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-103"
              />
              {img.isGif && !isFourthWithMore && (
                <span className="absolute top-2 left-2 px-2 py-0.5 rounded bg-black/60 backdrop-blur-xs text-[10px] font-bold text-white uppercase tracking-wider">
                  GIF
                </span>
              )}

              {/* Overlay +N count */}
              {isFourthWithMore && (
                <div className="absolute inset-0 bg-black/65 backdrop-blur-[2px] flex items-center justify-center text-white font-bold text-2xl group-hover:bg-black/75 transition-colors">
                  +{remainingCount + 1}
                </div>
              )}
            </div>
          );
        })}
      </div>
      <ImageLightboxModal
        isOpen={lightboxIndex !== null}
        images={images}
        initialIndex={lightboxIndex ?? 0}
        onClose={closeLightbox}
      />
    </>
  );
};
