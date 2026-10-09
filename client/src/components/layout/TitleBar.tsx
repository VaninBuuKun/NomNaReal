import React, { useState } from 'react';
import { Tray, Users, At } from '@phosphor-icons/react';
import { NotificationPopover } from '../notifications/NotificationPopover';
import { getMediaUrl } from '../../utils/constants';
import type { AppNotification } from '../../types';

export type TitleBarContext =
  | { kind: 'friends' }
  | { kind: 'dm'; name: string }
  | { kind: 'server'; name: string; iconUrl?: string | null };

interface TitleBarProps {
  context: TitleBarContext;
  unreadNotificationCount?: number;
  onSelectNotification?: (notification: AppNotification) => void;
}

const hasRealIcon = (url?: string | null) =>
  Boolean(url && url.trim() !== '' && !url.includes('default-avatar.png'));

export const TitleBar: React.FC<TitleBarProps> = ({
  context,
  unreadNotificationCount = 0,
  onSelectNotification,
}) => {
  const [isInboxOpen, setIsInboxOpen] = useState(false);

  return (
    <header className="h-[30px] shrink-0 relative flex items-center justify-center bg-[var(--bg-rail)] border-b border-[var(--border-color)] select-none z-40">
      {/* Centered context title: Bạn bè / Server (icon + name) / DM */}
      <div className="flex items-center gap-1.5 max-w-[50%] min-w-0 text-xs font-semibold text-[var(--text-secondary)]">
        {context.kind === 'friends' && (
          <>
            <Users size={14} weight="fill" className="shrink-0" />
            <span className="truncate">Bạn bè</span>
          </>
        )}
        {context.kind === 'dm' && (
          <>
            <At size={14} weight="bold" className="shrink-0" />
            <span className="truncate">{context.name}</span>
          </>
        )}
        {context.kind === 'server' && (
          <>
            {hasRealIcon(context.iconUrl) ? (
              <img
                src={getMediaUrl(context.iconUrl)}
                alt=""
                className="w-4 h-4 rounded-[4px] object-cover shrink-0"
              />
            ) : (
              <span className="w-4 h-4 rounded-[4px] bg-[var(--bg-surface)] text-[10px] font-bold text-[var(--text-primary)] flex items-center justify-center shrink-0">
                {context.name.slice(0, 1).toUpperCase()}
              </span>
            )}
            <span className="truncate">{context.name}</span>
          </>
        )}
      </div>

      {/* Right actions: Inbox */}
      <div className="absolute right-2 top-0 h-full flex items-center">
        <div className="relative">
          <button
            type="button"
            onClick={() => setIsInboxOpen((prev) => !prev)}
            title="Hộp thư đến"
            className={`relative p-1 rounded-[4px] transition-colors cursor-pointer ${
              isInboxOpen
                ? 'text-[var(--text-primary)] bg-[var(--bg-surface-active)]'
                : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)]'
            }`}
          >
            <Tray size={17} weight={isInboxOpen ? 'fill' : 'bold'} />
            {unreadNotificationCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[14px] h-[14px] px-1 bg-[var(--status-dnd)] text-white text-[9px] font-bold rounded-full flex items-center justify-center leading-none">
                {unreadNotificationCount > 99 ? '99+' : unreadNotificationCount}
              </span>
            )}
          </button>
          <NotificationPopover
            isOpen={isInboxOpen}
            onClose={() => setIsInboxOpen(false)}
            onSelectNotification={(notif) => {
              setIsInboxOpen(false);
              onSelectNotification?.(notif);
            }}
            unreadCount={unreadNotificationCount}
            align="top-right"
          />
        </div>
      </div>
    </header>
  );
};
