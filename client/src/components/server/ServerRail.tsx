import React from 'react';
import {
  Plus,
} from '@phosphor-icons/react';
import { getMediaUrl } from '../../utils/constants';
import type { Workspace } from '../../types';

interface WorkspaceRailProps {
  workspaces: Workspace[];
  activeWorkspaceId: string | null;
  activeSidebarView?: 'channels' | 'dms' | 'notifications';
  unreadDmCount?: number;
  onSelectView?: (view: 'channels' | 'dms' | 'notifications') => void;
  onSelectWorkspace: (id: string) => void;
  onCreateWorkspace?: () => void;
  onGoHome?: () => void;
}

// Single letter fallback as requested
const getServerInitials = (name: string) => {
  if (!name) return 'S';
  return name.trim().charAt(0).toUpperCase();
};

export const WorkspaceRail: React.FC<WorkspaceRailProps> = ({
  workspaces,
  activeWorkspaceId,
  activeSidebarView = 'channels',
  unreadDmCount = 0,
  onSelectView,
  onSelectWorkspace,
  onCreateWorkspace,
}) => {
  const isHomeActive = activeSidebarView === 'dms';

  return (
    <aside className="w-[72px] h-full min-h-0 shrink-0 bg-[var(--bg-rail,#1e1f22)] py-3 flex flex-col items-center gap-2.5 overflow-y-auto overflow-x-hidden no-scrollbar select-none z-30">
      {/* 1. Discord Home / Direct Messages button (Image 1 Style: squircle by default, left pill indicator, badge) */}
      <div className="relative group flex items-center justify-center w-full">
        {/* Left Indicator Pill */}
        <div
          className={`absolute left-0 w-1.5 bg-white rounded-r-full transition-all duration-200 pointer-events-none ${
            isHomeActive
              ? 'h-10 opacity-100'
              : 'h-0 group-hover:h-5 opacity-0 group-hover:opacity-100'
          }`}
        />

        <button
          type="button"
          title="Tin nhắn trực tiếp & Bạn bè (NomNa Home)"
          onClick={() => onSelectView?.('dms')}
          className={`relative w-12 h-12 rounded-[16px] flex items-center justify-center cursor-pointer transition-all duration-200 select-none ${
            isHomeActive
              ? 'bg-[var(--accent-primary)] ring-2 ring-[var(--accent-primary)] ring-offset-2 ring-offset-[var(--bg-rail)] shadow-[0_0_16px_var(--accent-glow)] scale-105'
              : 'bg-[var(--bg-surface)] hover:bg-[var(--accent-primary)] shadow-sm hover:scale-105 active:scale-95'
          }`}
        >
          <img
            src="/mascot.png"
            alt="NomNa Mascot"
            className="w-8 h-8 object-contain drop-shadow transition-transform duration-200"
          />

          {unreadDmCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 bg-danger text-white text-[11px] font-bold rounded-full min-w-5 h-5 px-1.5 flex items-center justify-center border-[3px] border-[var(--bg-rail,#1e1f22)] shadow-xs pointer-events-none select-none z-20">
              {unreadDmCount > 99 ? '99+' : unreadDmCount}
            </span>
          )}
        </button>
      </div>

      {/* Divider */}
      <div className="w-8 h-[2px] bg-[var(--border-color,#35363c)] rounded my-0.5 shrink-0" />

      {/* 2. List of Servers (Image 1 Style: Squircle rounded-[16px] by default, left indicator pill, badge) */}
      <div className="flex flex-col items-center gap-2.5 w-full">
        {workspaces.map((ws) => {
          const isActive = ws.id === activeWorkspaceId && activeSidebarView === 'channels';
          const hasValidIcon = Boolean(
            ws.iconUrl &&
            ws.iconUrl.trim() !== '' &&
            !ws.iconUrl.includes('default-avatar.png')
          );
          const badgeCount = (ws as any).unreadCount || (ws as any).mentionCount || 0;

          return (
            <div key={ws.id} className="relative group flex items-center justify-center w-full">
              {/* Left Indicator Pill */}
              <div
                className={`absolute left-0 w-1.5 bg-white rounded-r-full transition-all duration-200 pointer-events-none ${
                  isActive
                    ? 'h-10 opacity-100'
                    : 'h-0 group-hover:h-5 opacity-0 group-hover:opacity-100'
                }`}
              />

              <button
                type="button"
                title={ws.name}
                onClick={() => {
                  onSelectWorkspace(ws.id);
                  onSelectView?.('channels');
                }}
                className={`relative w-12 h-12 rounded-[16px] flex items-center justify-center cursor-pointer transition-all duration-200 overflow-hidden group select-none ${
                  isActive
                    ? 'bg-[var(--accent-primary)] text-white ring-2 ring-[var(--accent-primary)] ring-offset-2 ring-offset-[var(--bg-rail)] shadow-[0_0_16px_var(--accent-glow)] scale-105'
                    : 'bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:bg-[var(--accent-primary)] hover:text-white shadow-xs hover:scale-105 active:scale-95'
                }`}
              >
                {hasValidIcon ? (
                  <>
                    <img
                      src={getMediaUrl(ws.iconUrl!)}
                      alt=""
                      className="w-full h-full object-cover select-none pointer-events-none"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                        const fallback = e.currentTarget.parentElement?.querySelector('.server-initial');
                        if (fallback) fallback.classList.remove('hidden');
                      }}
                    />
                    <span className="server-initial hidden text-[17px] font-bold tracking-wide text-white select-none">
                      {getServerInitials(ws.name)}
                    </span>
                  </>
                ) : (
                  <span className="text-[17px] font-bold tracking-wide text-[var(--text-primary)] group-hover:text-white select-none">
                    {getServerInitials(ws.name)}
                  </span>
                )}

                {badgeCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 bg-danger text-white text-[11px] font-bold rounded-full min-w-5 h-5 px-1.5 flex items-center justify-center border-[3px] border-[var(--bg-rail,#1e1f22)] shadow-xs pointer-events-none select-none z-20">
                    {badgeCount > 99 ? '99+' : badgeCount}
                  </span>
                )}
              </button>
            </div>
          );
        })}
      </div>

      {/* 3. Add Server Button (Squircle rounded-[16px], purple accent, subtle glow) */}
      <div className="relative group flex items-center justify-center w-full mt-0.5">
        <button
          type="button"
          title="Thêm Server mới"
          onClick={onCreateWorkspace}
          className="w-12 h-12 rounded-[16px] flex items-center justify-center cursor-pointer transition-all duration-200 bg-[var(--bg-surface)] hover:bg-[var(--accent-primary)] text-[var(--accent-primary)] hover:text-white border border-[var(--border-color)] hover:border-[var(--accent-primary)] hover:shadow-[0_0_14px_var(--accent-glow)] shadow-xs hover:scale-105 active:scale-95"
        >
          <Plus size={20} weight="bold" />
        </button>
      </div>
    </aside>
  );
};

export const ServerRail = WorkspaceRail;
