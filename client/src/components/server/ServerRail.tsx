import React from 'react';
import {
  Plus,
  WechatLogoIcon,
} from '@phosphor-icons/react';
import { getMediaUrl } from '../../utils/constants';
import type { Workspace } from '../../types';

interface WorkspaceRailProps {
  workspaces: Workspace[];
  activeWorkspaceId: string | null;
  activeSidebarView?: 'channels' | 'dms' | 'notifications';
  onSelectView?: (view: 'channels' | 'dms' | 'notifications') => void;
  onSelectWorkspace: (id: string) => void;
  onCreateWorkspace?: () => void;
  onGoHome?: () => void;
}

const getServerInitials = (name: string) => {
  if (!name) return 'S';
  const clean = name.trim();
  const words = clean.split(/\s+/).filter(Boolean);
  if (words.length === 1) {
    return clean.slice(0, 1).toUpperCase();
  }
  return (words[0][0] + words[1][0]).toUpperCase();
};

export const WorkspaceRail: React.FC<WorkspaceRailProps> = ({
  workspaces,
  activeWorkspaceId,
  activeSidebarView = 'channels',
  onSelectView,
  onSelectWorkspace,
  onCreateWorkspace,
}) => {
  return (
    <aside className="w-[72px] h-full min-h-0 shrink-0 bg-[var(--bg-rail,#1e1f22)] py-3 flex flex-col items-center gap-2 overflow-y-auto overflow-x-hidden no-scrollbar select-none z-30">
      {/* 1. Discord Home / Direct Messages button */}
      <div className="relative group flex items-center justify-center w-full">
        <div
          className={`absolute left-0 w-[4px] bg-[var(--text-primary)] rounded-r-full pointer-events-none transition-all duration-200 ${
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
          const hasValidIcon = Boolean(
            ws.iconUrl &&
            ws.iconUrl.trim() !== '' &&
            !ws.iconUrl.includes('default-avatar.png')
          );

          return (
            <div key={ws.id} className="relative group flex items-center justify-center w-full">
              {/* Discord-like pill indicator */}
              <div
                className={`absolute left-0 w-[4px] bg-[var(--text-primary)] rounded-r-full transition-all duration-200 pointer-events-none ${
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
                className={`w-12 h-12 flex items-center justify-center cursor-pointer transition-all duration-200 overflow-hidden shadow-sm group select-none ${
                  isActive
                    ? 'rounded-[16px] bg-[var(--accent-primary,#5865f2)] text-white shadow-md'
                    : 'rounded-[24px] hover:rounded-[16px] bg-[var(--bg-surface,#313338)] text-[var(--text-secondary,#dbdee1)] hover:bg-[var(--accent-primary,#5865f2)] hover:text-white'
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
                        const fallback = e.currentTarget.parentElement?.querySelector('.server-initials');
                        if (fallback) fallback.classList.remove('hidden');
                      }}
                    />
                    <span className="server-initials hidden text-[15px] font-bold tracking-wide text-white select-none">
                      {getServerInitials(ws.name)}
                    </span>
                  </>
                ) : (
                  <span className="text-[15px] font-bold tracking-wide text-[var(--text-primary)] group-hover:text-white select-none">
                    {getServerInitials(ws.name)}
                  </span>
                )}
              </button>
            </div>
          );
        })}
      </div>

      {/* 3. Add Server Button */}
      <div className="relative group flex items-center justify-center w-full mt-1">
        <div className="absolute left-0 w-[4px] bg-[var(--text-primary)] rounded-r-full pointer-events-none h-0 opacity-0 group-hover:h-5 group-hover:opacity-100 transition-all duration-200" />
        <button
          type="button"
          title="Thêm Server mới"
          onClick={onCreateWorkspace}
          className="w-12 h-12 rounded-[24px] hover:rounded-[16px] flex items-center justify-center cursor-pointer transition-all duration-200 bg-[var(--bg-surface,#313338)] hover:bg-[#23a55a] text-[#23a55a] hover:text-white shadow-md"
        >
          <Plus size={22} weight="bold" />
        </button>
      </div>

      </aside>
  );
};
export const ServerRail = WorkspaceRail;
