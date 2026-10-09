import React from 'react';
import {
  Plus,
  WechatLogoIcon,
  Bell,
} from '@phosphor-icons/react';
import { WorkspaceAvatar } from '../ui';
import type { Workspace } from '../../types';

interface WorkspaceRailProps {
  workspaces: Workspace[];
  activeWorkspaceId: string | null;
  activeSidebarView?: 'channels' | 'dms' | 'notifications';
  onSelectView?: (view: 'channels' | 'dms' | 'notifications') => void;
  onSelectWorkspace: (id: string) => void;
  onCreateWorkspace?: () => void;
  onGoHome?: () => void;
  unreadNotificationCount?: number;
}

export const WorkspaceRail: React.FC<WorkspaceRailProps> = ({
  workspaces,
  activeWorkspaceId,
  activeSidebarView = 'channels',
  onSelectView,
  onSelectWorkspace,
  onCreateWorkspace,
  unreadNotificationCount = 0,
}) => {
  return (
    <aside className="w-[72px] h-full min-h-0 shrink-0 bg-[var(--bg-rail,#1e1f22)] py-3 flex flex-col items-center gap-2 overflow-y-auto overflow-x-hidden no-scrollbar select-none z-30">
      {/* 1. Discord Home / Direct Messages button */}
      <div className="relative group flex items-center justify-center w-full">
        <div
          className={`absolute left-0 w-1 bg-white rounded-r transition-all duration-200 ${
            activeSidebarView === 'dms'
              ? 'h-10 opacity-100'
              : 'h-0 opacity-0 group-hover:h-5 group-hover:opacity-100'
          }`}
        />
        <button
          type="button"
          title="Tin nhắn trực tiếp (Direct Messages)"
          onClick={() => onSelectView?.('dms')}
          className={`w-12 h-12 flex items-center justify-center font-bold text-sm cursor-pointer transition-all duration-200 shadow-md ${
            activeSidebarView === 'dms'
              ? 'rounded-[16px] bg-[var(--accent-primary,#5865f2)] text-white'
              : 'rounded-[24px] hover:rounded-[16px] bg-[var(--bg-surface,#313338)] text-[var(--text-secondary,#dbdee1)] hover:bg-[var(--accent-primary,#5865f2)] hover:text-white'
          }`}
        >
          <WechatLogoIcon size={26} weight="fill" />
        </button>
      </div>

      {/* Divider */}
      <div className="w-8 h-[2px] bg-[var(--border-color,#35363c)] rounded my-1 shrink-0" />

      {/* 2. List of Discord Servers */}
      <div className="flex flex-col items-center gap-2 w-full">
        {workspaces.map((ws) => {
          const isActive = ws.id === activeWorkspaceId && activeSidebarView === 'channels';
          return (
            <div key={ws.id} className="relative group flex items-center justify-center w-full">
              {/* Discord-like pill indicator */}
              <div
                className={`absolute left-0 w-1 bg-white rounded-r transition-all duration-200 ${
                  isActive
                    ? 'h-10 opacity-100'
                    : 'h-0 opacity-0 group-hover:h-5 group-hover:opacity-100'
                }`}
              />
              <button
                type="button"
                title={ws.name}
                onClick={() => {
                  onSelectWorkspace(ws.id);
                  onSelectView?.('channels');
                }}
                className={`w-12 h-12 flex items-center justify-center cursor-pointer transition-all duration-200 overflow-hidden shadow-md group ${
                  isActive
                    ? 'rounded-[16px] ring-2 ring-[var(--accent-primary,#5865f2)] bg-[var(--accent-soft)]'
                    : 'rounded-[24px] hover:rounded-[16px] bg-[var(--bg-surface,#313338)] hover:bg-[var(--accent-primary,#5865f2)]'
                }`}
              >
                {ws.iconUrl ? (
                  <img src={ws.iconUrl} alt={ws.name} className="w-full h-full object-cover" />
                ) : (
                  <WorkspaceAvatar
                    name={ws.name}
                    iconUrl={ws.iconUrl}
                    size="lg"
                    roundedClassName="rounded-none"
                    className="w-full h-full font-bold text-sm"
                  />
                )}
              </button>
            </div>
          );
        })}
      </div>

      {/* 3. Add Server Button */}
      <div className="relative group flex items-center justify-center w-full mt-1">
        <div className="absolute left-0 w-1 bg-white rounded-r h-0 opacity-0 group-hover:h-5 group-hover:opacity-100 transition-all duration-200" />
        <button
          type="button"
          title="Thêm Server mới"
          onClick={onCreateWorkspace}
          className="w-12 h-12 rounded-[24px] hover:rounded-[16px] flex items-center justify-center cursor-pointer transition-all duration-200 bg-[var(--bg-surface,#313338)] hover:bg-[#23a55a] text-[#23a55a] hover:text-white shadow-md"
        >
          <Plus size={22} weight="bold" />
        </button>
      </div>

      {/* 4. Notifications Button */}
      <div className="relative group flex items-center justify-center w-full mt-auto mb-2">
        <div
          className={`absolute left-0 w-1 bg-white rounded-r transition-all duration-200 ${
            activeSidebarView === 'notifications'
              ? 'h-10 opacity-100'
              : 'h-0 opacity-0 group-hover:h-5 group-hover:opacity-100'
          }`}
        />
        <button
          type="button"
          title={
            unreadNotificationCount > 0
              ? `Thông báo (${unreadNotificationCount} chưa đọc)`
              : 'Thông báo'
          }
          onClick={() => onSelectView?.('notifications')}
          className={`w-12 h-12 flex items-center justify-center cursor-pointer transition-all duration-200 relative shadow-md ${
            activeSidebarView === 'notifications'
              ? 'rounded-[16px] bg-[var(--accent-primary,#5865f2)] text-white'
              : 'rounded-[24px] hover:rounded-[16px] bg-[var(--bg-surface,#313338)] text-[var(--text-secondary,#dbdee1)] hover:bg-[var(--accent-soft)] hover:text-white'
          }`}
        >
          <Bell
            size={22}
            weight={
              activeSidebarView === 'notifications' || unreadNotificationCount > 0
                ? 'fill'
                : 'bold'
            }
          />
          {unreadNotificationCount > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-500 text-white font-black text-[10px] flex items-center justify-center shadow-md ring-2 ring-[var(--bg-rail)]">
              {unreadNotificationCount > 9 ? '9+' : unreadNotificationCount}
            </span>
          )}
        </button>
      </div>
    </aside>
  );
};
