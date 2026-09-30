import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { SquaresFour, House, Plus, Check, WechatLogoIcon } from '@phosphor-icons/react';
import type { Workspace } from '../../types';

interface WorkspaceRailProps {
  workspaces: Workspace[];
  activeWorkspaceId: string | null;
  activeSidebarView?: 'channels' | 'dms';
  onSelectView?: (view: 'channels' | 'dms') => void;
  onSelectWorkspace: (id: string) => void;
  onCreateWorkspace?: () => void;
  onGoHome?: () => void;
}

export const WorkspaceRail: React.FC<WorkspaceRailProps> = ({
  workspaces,
  activeWorkspaceId,
  activeSidebarView = 'channels',
  onSelectView,
  onSelectWorkspace,
  onCreateWorkspace,
  onGoHome,
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    if (!isMenuOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        menuRef.current &&
        !menuRef.current.contains(target) &&
        buttonRef.current &&
        !buttonRef.current.contains(target)
      ) {
        setIsMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isMenuOpen]);

  const activeWorkspace =
    workspaces.find((w) => w.id === activeWorkspaceId) || workspaces[0] || null;

  return (
    <aside className="w-[68px] h-full min-h-0 shrink-0 bg-[var(--bg-rail)] border-r border-[var(--border-color)] py-3 flex flex-col items-center gap-2.5 overflow-visible select-none relative z-30">
      {/* 1. Hub / Switcher Icon Button */}
      <button
        ref={buttonRef}
        type="button"
        title="Danh sách Workspace & Điều hướng"
        onClick={() => setIsMenuOpen((prev) => !prev)}
        className={`w-11 h-11 rounded-[14px] flex items-center justify-center font-bold text-sm cursor-pointer transition-all duration-200 border shadow-xs ${isMenuOpen
          ? 'bg-[var(--accent-primary)] text-white border-transparent shadow-[0_4px_14px_var(--accent-glow)]'
          : 'bg-[var(--bg-surface)] text-[var(--text-secondary)] border-[var(--border-color)] hover:bg-[var(--accent-soft)] hover:text-[var(--accent-primary)] hover:border-[var(--accent-primary)]'
          }`}
      >
        <SquaresFour size={22} weight={isMenuOpen ? 'fill' : 'duotone'} />
      </button>

      {/* Divider */}
      <div className="w-8 h-px bg-[var(--border-color)] my-0.5" />

      {/* 2. Active Main Workspace Logo (Switches to Channels) */}
      {activeWorkspace && (
        <div className="relative">
          {activeSidebarView === 'channels' && (
            <div className="absolute -left-[14px] top-1/2 -translate-y-1/2 w-[3.5px] h-7 bg-[var(--accent-primary)] rounded-[2px] shadow-[0_0_8px_var(--accent-glow)]" />
          )}

          <div
            title={`Workspace: ${activeWorkspace.name}`}
            onClick={() => onSelectView?.('channels')}
            className={`w-11 h-11 rounded-[14px] flex items-center justify-center cursor-pointer transition-all duration-200 border overflow-hidden shadow-xs ${activeSidebarView === 'channels'
              ? 'border-[var(--accent-primary)] shadow-[0_4px_14px_var(--accent-glow)] ring-2 ring-[var(--accent-primary)]/40'
              : 'border-[var(--border-color)] hover:border-[var(--accent-primary)]'
              }`}
          >
            <img
              src={activeWorkspace.iconUrl || '/default-avatar.png'}
              alt={activeWorkspace.name}
              className="w-full h-full object-cover"
              onError={(e) => {
                e.currentTarget.src = '/default-avatar.png';
              }}
            />
          </div>
        </div>
      )}

      {/* Divider */}
      {/* <div className="w-8 h-px bg-[var(--border-color)] my-0.5" /> */}

      {/* 3. Direct Messages Icon Button */}
      <div className="relative">
        {activeSidebarView === 'dms' && (
          <div className="absolute -left-[14px] top-1/2 -translate-y-1/2 w-[3.5px] h-7 bg-[var(--accent-primary)] rounded-[2px] shadow-[0_0_8px_var(--accent-glow)]" />
        )}

        <button
          type="button"
          title="Tin nhắn trực tiếp (Direct Messages)"
          onClick={() => onSelectView?.('dms')}
          className={`w-11 h-11 rounded-[14px] flex items-center justify-center font-bold text-sm cursor-pointer transition-all duration-200 border shadow-xs ${activeSidebarView === 'dms'
            ? 'bg-[var(--accent-primary)] text-white border-transparent shadow-[0_4px_14px_var(--accent-glow)]'
            : 'bg-[var(--bg-surface)] text-[var(--text-secondary)] border-[var(--border-color)] hover:bg-[var(--accent-soft)] hover:text-[var(--accent-primary)] hover:border-[var(--accent-primary)]'
            }`}
        >
          <WechatLogoIcon size={22} weight={activeSidebarView === 'dms' ? 'fill' : 'duotone'} />
        </button>
      </div>

      {/* Dropdown Menu Portal */}
      {isMenuOpen &&
        createPortal(
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 z-[999] bg-black/20 backdrop-blur-[1px]"
              onClick={() => setIsMenuOpen(false)}
            />

            {/* Menu Popover */}
            <div
              ref={menuRef}
              className="fixed top-[16px] left-[76px] w-[270px] z-[1000] bg-[var(--bg-chat)] border border-[var(--border-color)] rounded-[4px] shadow-2xl p-1.5 flex flex-col gap-0.5"
            >
              {/* Item 1: Về trang chủ */}
              <button
                type="button"
                onClick={() => {
                  setIsMenuOpen(false);
                  onGoHome?.();
                }}
                className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-[3px] text-xs font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-surface)] transition-colors cursor-pointer text-left"
              >
                <House size={16} weight="duotone" className="text-[var(--accent-primary)] shrink-0" />
                <span>Về trang chủ</span>
              </button>

              {/* Divider */}
              <div className="h-px bg-[var(--border-color)]/70 my-1" />

              {/* Label */}
              <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                Workspace ({workspaces.length})
              </div>

              {/* Workspaces List */}
              <div className="max-h-[220px] overflow-y-auto flex flex-col gap-0.5 py-0.5">
                {workspaces.map((ws) => {
                  const isActive = ws.id === activeWorkspace?.id;
                  return (
                    <button
                      key={ws.id}
                      type="button"
                      onClick={() => {
                        setIsMenuOpen(false);
                        onSelectWorkspace(ws.id);
                      }}
                      className={`w-full flex items-center gap-2.5 px-2 py-1.5 rounded-[3px] text-xs transition-colors cursor-pointer text-left ${isActive
                        ? 'bg-[var(--accent-soft)] text-[var(--accent-primary)] font-semibold'
                        : 'text-[var(--text-primary)] hover:bg-[var(--bg-surface)]'
                        }`}
                    >
                      <div className="w-6 h-6 rounded-[3px] overflow-hidden border border-[var(--border-color)] bg-[var(--bg-chat)] flex items-center justify-center shrink-0">
                        <img
                          src={ws.iconUrl || '/default-avatar.png'}
                          alt={ws.name}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.currentTarget.src = '/default-avatar.png';
                          }}
                        />
                      </div>

                      <span className="truncate flex-1 font-medium">{ws.name}</span>

                      {isActive && (
                        <Check size={14} weight="bold" className="text-[var(--accent-primary)] shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Divider */}
              <div className="h-px bg-[var(--border-color)]/70 my-1" />

              {/* Item Bottom: Thêm workspace */}
              <button
                type="button"
                onClick={() => {
                  setIsMenuOpen(false);
                  if (onCreateWorkspace) {
                    onCreateWorkspace();
                  } else {
                    onGoHome?.();
                  }
                }}
                className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-[3px] text-xs font-semibold text-[var(--accent-primary)] hover:bg-[var(--accent-soft)] transition-colors cursor-pointer text-left"
              >
                <Plus size={16} weight="bold" className="shrink-0" />
                <span>Thêm Workspace mới</span>
              </button>
            </div>
          </>,
          document.body
        )}
    </aside>
  );
};
