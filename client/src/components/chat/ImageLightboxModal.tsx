import React, { useState, useEffect } from 'react';
import { getMediaUrl } from '../../utils/constants';
import {
  X,
  CaretLeft,
  CaretRight,
  DownloadSimple,
  ArrowSquareOut,
} from '@phosphor-icons/react';

interface ImageLightboxModalProps {
  isOpen: boolean;
  images: { url: string; alt?: string }[];
  initialIndex?: number;
  onClose: () => void;
}

export const ImageLightboxModal: React.FC<ImageLightboxModalProps> = ({
  isOpen,
  images,
  initialIndex = 0,
  onClose,
}) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);

  useEffect(() => {
    setCurrentIndex(initialIndex);
  }, [initialIndex, isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowLeft') {
        setCurrentIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1));
      } else if (e.key === 'ArrowRight') {
        setCurrentIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, images.length, onClose]);

  if (!isOpen || images.length === 0) return null;

  const currentImage = images[currentIndex] || images[0];

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1));
  };

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0));
  };

  const handleDownload = (e: React.MouseEvent) => {
    e.stopPropagation();
    const link = document.createElement('a');
    link.href = getMediaUrl(currentImage.url);
    link.download = currentImage.alt || 'image';
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div
      className="fixed inset-0 z-100 flex items-center justify-center bg-black/85 backdrop-blur-md animate-in fade-in duration-200 select-none"
      onClick={onClose}
    >
      {/* Top Controls Bar */}
      <div
        className="absolute top-0 inset-x-0 h-14 px-6 flex items-center justify-between z-10 bg-gradient-to-b from-black/70 to-transparent"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 text-white text-xs font-medium">
          <span className="truncate max-w-sm text-zinc-300">
            {currentImage.alt || 'Hình ảnh'}
          </span>
          {images.length > 1 && (
            <span className="px-2 py-0.5 rounded-full bg-white/10 text-[11px] font-mono">
              {currentIndex + 1} / {images.length}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleDownload}
            className="p-2 rounded-lg text-zinc-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            title="Tải ảnh về máy"
          >
            <DownloadSimple size={18} weight="bold" />
          </button>
          <button
            type="button"
            onClick={() => window.open(getMediaUrl(currentImage.url), '_blank')}
            className="p-2 rounded-lg text-zinc-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            title="Mở ảnh gốc trong tab mới"
          >
            <ArrowSquareOut size={18} weight="bold" />
          </button>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-zinc-300 hover:text-white hover:bg-white/15 transition-colors cursor-pointer ml-2"
            title="Đóng (Esc)"
          >
            <X size={20} weight="bold" />
          </button>
        </div>
      </div>

      {/* Main Image Stage */}
      <div
        className="relative max-w-[92vw] max-h-[85vh] flex items-center justify-center p-4"
        onClick={(e) => e.stopPropagation()}
      >
        <img
          src={getMediaUrl(currentImage.url)}
          alt={currentImage.alt || 'Xem ảnh'}
          className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl animate-in zoom-in-95 duration-150"
        />
      </div>

      {/* Previous Arrow Button */}
      {images.length > 1 && (
        <button
          type="button"
          onClick={handlePrev}
          className="absolute left-4 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-black/50 hover:bg-black/80 text-white flex items-center justify-center transition-all cursor-pointer backdrop-blur-sm border border-white/10 shadow-lg hover:scale-105 active:scale-95"
          title="Ảnh trước (Mũi tên trái)"
        >
          <CaretLeft size={22} weight="bold" />
        </button>
      )}

      {/* Next Arrow Button */}
      {images.length > 1 && (
        <button
          type="button"
          onClick={handleNext}
          className="absolute right-4 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-black/50 hover:bg-black/80 text-white flex items-center justify-center transition-all cursor-pointer backdrop-blur-sm border border-white/10 shadow-lg hover:scale-105 active:scale-95"
          title="Ảnh kế tiếp (Mũi tên phải)"
        >
          <CaretRight size={22} weight="bold" />
        </button>
      )}
    </div>
  );
};
