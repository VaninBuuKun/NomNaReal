import React from 'react';
import { Gear } from '@phosphor-icons/react';
import { Avatar } from '../ui';
import type { User } from '../../types';

interface UserFooterBarProps {
  currentUser: User | null;
  onOpenSettings: () => void;
  unreadCount?: number;
  onSelectNotification?: any;
  onUnreadCountChange?: any;
}

export const UserFooterBar: React.FC<UserFooterBarProps> = ({
  currentUser,
  onOpenSettings,
}) => {
  return (
    <div
      className="h-14 bg-[var(--bg-rail)] border-t border-r border-[var(--border-color)] flex items-center shrink-0 select-none relative z-30"
      title="Tài khoản cá nhân & Cài đặt"
    >
      {/* 1. Left Area (aligned with 68px Workspace Rail) */}
      <div
        className="w-[68px] shrink-0 flex items-center justify-center cursor-pointer group"
        onClick={onOpenSettings}
        title="Mở Cài đặt tài khoản"
      >
        <div className="relative group-hover:scale-105 transition-transform">
          <Avatar
            src={currentUser?.avatarUrl}
            fallback={currentUser?.displayName || 'User'}
            size="sm"
            status="online"
          />
        </div>
      </div>

      {/* 2. Right Area (aligned with Channel Sidebar) */}
      <div className="flex-1 min-w-0 pr-2 flex items-center justify-between gap-1">
        <div
          className="min-w-0 flex-1 cursor-pointer group py-1"
          onClick={onOpenSettings}
          title="Mở Cài đặt tài khoản"
        >
          <div className="text-[0.82rem] font-bold truncate text-[var(--text-primary)] group-hover:text-[var(--accent-primary)] transition-colors">
            {currentUser?.displayName || 'Alex Rivers'}
          </div>
          <div className="text-[0.68rem] text-[var(--text-muted)] flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--status-online)] shadow-[0_0_4px_rgba(22,163,74,0.6)] shrink-0" />
            <span className="truncate">Online</span>
          </div>
        </div>

        {/* Action Button: Gear / Settings */}
        <div className="flex items-center gap-0.5 shrink-0">
          <button
            type="button"
            className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-active)] transition-colors cursor-pointer inline-flex items-center justify-center"
            onClick={onOpenSettings}
            title="Cài đặt & Giao diện"
          >
            <Gear size={18} weight="bold" />
          </button>
        </div>
      </div>
    </div>
  );
};
