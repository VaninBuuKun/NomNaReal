import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Globe, ArrowSquareOut, X, Play } from '@phosphor-icons/react';
import { messageApi } from '../../services/messageApi';
import type { LinkPreviewData } from '../../types';

interface LinkPreviewCardProps {
  url: string;
}

const getInstantPreview = (targetUrl: string): Partial<LinkPreviewData> | null => {
  try {
    const parsed = new URL(targetUrl);
    // 1. YouTube instant thumbnail
    const ytMatch = targetUrl.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([\w-]{11})/);
    if (ytMatch) {
      const videoId = ytMatch[1];
      return {
        url: targetUrl,
        siteName: 'YouTube',
        title: 'Video YouTube',
        imageUrl: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
        faviconUrl: 'https://www.youtube.com/favicon.ico',
      };
    }
    // 2. GitHub instant preview
    const ghMatch = targetUrl.match(/github\.com\/([a-zA-Z0-9_.-]+)\/([a-zA-Z0-9_.-]+)/);
    if (ghMatch) {
      return {
        url: targetUrl,
        siteName: 'GitHub',
        title: `${ghMatch[1]}/${ghMatch[2]}`,
        description: 'Kho lưu trữ mã nguồn trên GitHub',
        faviconUrl: 'https://github.githubassets.com/favicons/favicon.png',
      };
    }
    // 3. Direct image preview
    if (/\.(png|jpe?g|webp|gif)($|\?)/i.test(targetUrl)) {
      return {
        url: targetUrl,
        siteName: parsed.hostname,
        title: parsed.pathname.split('/').pop() || 'Hình ảnh',
        imageUrl: targetUrl,
      };
    }
  } catch {}
  return null;
};

export const LinkPreviewCard: React.FC<LinkPreviewCardProps> = ({ url }) => {
  const [isDismissed, setIsDismissed] = useState(false);
  const instantData = useMemo(() => getInstantPreview(url), [url]);

  const { data, isLoading, isError } = useQuery<LinkPreviewData>({
    queryKey: ['linkPreview', url],
    queryFn: () => messageApi.getLinkPreview(url),
    initialData: instantData as LinkPreviewData | undefined,
    staleTime: 1000 * 60 * 60, // 1 hour
    gcTime: 1000 * 60 * 60 * 2, // 2 hours
    retry: 1,
    enabled: !isDismissed && !!url && (url.startsWith('http://') || url.startsWith('https://')),
  });

  const preview = data || instantData;

  if (isDismissed || isError || (!isLoading && (!preview || (!preview.title && !preview.description && !preview.imageUrl)))) {
    return null;
  }

  if (isLoading && !preview) {
    return (
      <div className="flex items-center gap-2 p-2 rounded-lg border border-[var(--border-color)] bg-[var(--bg-surface)]/50 max-w-sm animate-pulse my-1 text-xs text-[var(--text-muted)]">
        <Globe size={14} className="animate-spin text-[var(--accent-primary)] opacity-60" />
        <span>Đang tải thông tin liên kết...</span>
      </div>
    );
  }

  if (!preview) return null;

  const displayHost = (() => {
    try {
      return new URL(preview.url || url).hostname;
    } catch {
      return preview.siteName || 'Liên kết';
    }
  })();

  const isYouTube = preview.siteName?.toLowerCase() === 'youtube' || url.includes('youtube.com') || url.includes('youtu.be');

  return (
    <div className="relative group max-w-md my-1 rounded-r-xl rounded-l-xs border border-[var(--border-color)] border-l-3 border-l-[var(--accent-primary)] bg-[var(--bg-surface)] hover:bg-[var(--bg-surface-active)]/50 transition-all shadow-2xs overflow-hidden select-none">
      {/* Dismiss Button (Slack style) */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setIsDismissed(true);
        }}
        title="Đóng bản xem trước"
        className="absolute top-1.5 right-1.5 p-1 rounded-md text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-chat)] opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer z-10"
      >
        <X size={12} weight="bold" />
      </button>

      <a
        href={preview.url || url}
        target="_blank"
        rel="noreferrer"
        className="block p-2.5 cursor-pointer"
      >
        {/* Header: Favicon + Site Name */}
        <div className="flex items-center gap-1.5 text-xs text-[var(--text-muted)] mb-1">
          {preview.faviconUrl ? (
            <img
              src={preview.faviconUrl}
              alt=""
              className="w-3.5 h-3.5 rounded object-contain shrink-0"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
          ) : (
            <Globe size={13} className="shrink-0 text-[var(--accent-primary)]" />
          )}
          <span className="font-semibold text-[11px] truncate uppercase tracking-wider text-[var(--text-secondary)]">
            {preview.siteName || displayHost}
          </span>
          <ArrowSquareOut size={11} className="opacity-50 shrink-0 ml-0.5" />
        </div>

        {/* Content Body: Horizontal Slack layout for standard links, or banner for YouTube */}
        {isYouTube ? (
          <div className="flex flex-col gap-1.5">
            {preview.title && (
              <h4 className="text-[0.88rem] font-bold text-[var(--accent-primary)] group-hover:underline line-clamp-2 leading-snug">
                {preview.title}
              </h4>
            )}
            {preview.imageUrl && (
              <div className="relative rounded-lg overflow-hidden border border-[var(--border-color)]/60 bg-black/40 max-h-44 group/vid">
                <img
                  src={preview.imageUrl}
                  alt={preview.title || 'Video'}
                  className="w-full h-full object-cover max-h-44"
                />
                <div className="absolute inset-0 flex items-center justify-center bg-black/25 group-hover/vid:bg-black/10 transition-colors">
                  <div className="w-10 h-10 rounded-full bg-red-600 text-white flex items-center justify-center shadow-lg shadow-black/40">
                    <Play size={18} weight="fill" className="ml-0.5" />
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-start gap-3 justify-between">
            <div className="min-w-0 flex-1">
              {preview.title && (
                <h4 className="text-[0.88rem] font-bold text-[var(--accent-primary)] group-hover:underline line-clamp-2 leading-snug">
                  {preview.title}
                </h4>
              )}
              {preview.description && (
                <p className="text-[11.5px] text-[var(--text-muted)] line-clamp-2 mt-0.5 leading-relaxed">
                  {preview.description}
                </p>
              )}
            </div>

            {preview.imageUrl && (
              <div className="w-16 h-16 rounded-lg shrink-0 overflow-hidden border border-[var(--border-color)]/60 bg-black/10">
                <img
                  src={preview.imageUrl}
                  alt={preview.title || 'Preview'}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.currentTarget.parentElement?.remove();
                  }}
                />
              </div>
            )}
          </div>
        )}
      </a>
    </div>
  );
};
