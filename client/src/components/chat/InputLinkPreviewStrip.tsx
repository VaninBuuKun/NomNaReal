import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { X, CircleNotch } from '@phosphor-icons/react';
import { messageApi } from '../../services/messageApi';
import type { LinkPreviewData } from '../../types';

interface InputLinkPreviewStripProps {
  url: string;
  onDismiss: () => void;
}

export const InputLinkPreviewStrip: React.FC<InputLinkPreviewStripProps> = ({ url, onDismiss }) => {
  const { data, isLoading } = useQuery<LinkPreviewData>({
    queryKey: ['inputLinkPreview', url],
    queryFn: () => messageApi.getLinkPreview(url),
    staleTime: 1000 * 60 * 30, // 30 mins
    retry: 1,
    enabled: !!url && (url.startsWith('http://') || url.startsWith('https://')),
  });

  const domain = (() => {
    try {
      return new URL(url).hostname.replace(/^www\./, '');
    } catch {
      return url;
    }
  })();

  const title = data?.title || domain;
  const imageUrl = data?.imageUrl;
  const faviconUrl = data?.faviconUrl || `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;

  return (
    <div className="flex items-center justify-between gap-3 p-2 px-3 rounded-lg bg-[var(--bg-chat)] border border-[var(--border-color)] text-xs text-[var(--text-secondary)] shadow-sm animate-in fade-in slide-in-from-bottom-1 duration-150 mb-1">
      <div className="flex items-center gap-2.5 min-w-0 flex-1">
        {imageUrl ? (
          <div className="w-10 h-10 rounded-md overflow-hidden bg-black/10 shrink-0 border border-[var(--border-color)]">
            <img
              src={imageUrl}
              alt=""
              className="w-full h-full object-cover"
              onError={(e) => {
                e.currentTarget.parentElement?.remove();
              }}
            />
          </div>
        ) : (
          <div className="w-8 h-8 rounded-md bg-[var(--bg-surface)] flex items-center justify-center shrink-0 border border-[var(--border-color)] text-[var(--accent-primary)]">
            {isLoading ? (
              <CircleNotch size={14} className="animate-spin text-[var(--accent-primary)]" />
            ) : (
              <img
                src={faviconUrl}
                alt=""
                className="w-4 h-4 object-contain"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
            )}
          </div>
        )}

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-[var(--text-primary)] truncate text-[12px]">
              {isLoading ? 'Đang lấy thông tin liên kết...' : title}
            </span>
            {isLoading && (
              <CircleNotch size={11} className="animate-spin text-[var(--accent-primary)] shrink-0" />
            )}
          </div>
          <div className="text-[11px] text-[var(--text-muted)] truncate flex items-center gap-1">
            <span className="font-semibold text-[var(--text-secondary)]">{data?.siteName || domain}</span>
            <span>•</span>
            <span className="truncate opacity-75">{url}</span>
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={onDismiss}
        className="p-1 rounded-md text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-active)] transition-colors cursor-pointer shrink-0"
        title="Không đính kèm xem trước này"
      >
        <X size={14} weight="bold" />
      </button>
    </div>
  );
};
export default InputLinkPreviewStrip;
