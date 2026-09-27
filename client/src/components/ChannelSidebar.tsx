import React, { useState, useRef, useEffect } from 'react';
import { CaretDown, Plus, Hash, LockSimple, Gear, Sparkle, UserPlus, SignOut } from '@phosphor-icons/react';
import { Avatar } from '@/shared/ui';
import type { Channel, User, Workspace } from '../types';

interface ChannelSidebarProps {
  currentWorkspace: Workspace | null;
  channels: Channel[];
  activeChannelId: string | null;
  onSelectChannel: (id: string) => void;
  onCreateChannel: () => void;
  currentUser: User | null;
  onOpenSettings: () => void;
  onLogout?: () => void;
  width?: number;
}

export const ChannelSidebar: React.FC<ChannelSidebarProps> = ({
  currentWorkspace,
  channels,
  activeChannelId,
  onSelectChannel,
  onCreateChannel,
  currentUser,
  onOpenSettings,
  width = 240,
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    if (isMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isMenuOpen]);

  const directMessages = [
    { id: '1', name: 'Alex Rivers', status: 'online' },
    { id: '2', name: 'Minh Dev', status: 'online' },
    { id: '3', name: 'Sarah Miller', status: 'away' },
    { id: '4', name: 'Duc Nguyen', status: 'dnd' },
  ];

  const displayChannels: Channel[] =
    channels.length > 0
      ? channels
      : [
          {
            id: '1',
            workspaceId: currentWorkspace?.id || 'ws-nexus',
            name: 'general',
            topic: 'Kênh trao đổi chung cho toàn bộ thành viên',
            type: 0,
            isPrivate: false,
          },
          {
            id: '2',
            workspaceId: currentWorkspace?.id || 'ws-nexus',
            name: 'backend-net9',
            topic: 'Kiến trúc .NET 9, SignalR Hub & Performance',
            type: 0,
            isPrivate: false,
          },
          {
            id: '3',
            workspaceId: currentWorkspace?.id || 'ws-nexus',
            name: 'react-frontend',
            topic: 'React + Vite UI with Warm White Orange Theme',
            type: 0,
            isPrivate: false,
          },
          {
            id: '4',
            workspaceId: currentWorkspace?.id || 'ws-nexus',
            name: 'devops-cloud',
            topic: 'Docker, CI/CD và triển khai ứng dụng',
            type: 1,
            isPrivate: true,
          },
        ];

  return (
    <aside
      id="channelSidebar"
      className="h-full min-h-0 shrink-0 bg-[var(--bg-sidebar)] border-r border-[var(--border-color)] flex flex-col overflow-visible min-w-[200px] max-w-[450px] relative z-30"
      style={{ width: `${width}px` }}
    >
      {/* Workspace Header with Dropdown */}
      <div className="relative shrink-0 z-50">
        <div className="h-[54px] px-3.5 border-b border-[var(--border-color)] flex items-center justify-between font-bold text-[0.95rem] bg-[var(--bg-sidebar)] select-none">
          {/* Only clicking from name to caret icon toggles dropdown; the rest of the header does not */}
          <button
            type="button"
            onClick={() => setIsMenuOpen((prev) => !prev)}
            className="flex items-center gap-2 max-w-[calc(100%-8px)] px-2 py-1.5 rounded-lg hover:bg-[var(--bg-surface)] transition-colors cursor-pointer text-left group"
            title="Tùy chọn Workspace"
          >
            <span className="truncate text-[var(--text-primary)] font-bold text-[0.95rem]">
              {currentWorkspace?.name || 'Nexus Hub'}
            </span>
            <CaretDown
              size={13}
              weight="bold"
              className={`text-[var(--text-muted)] group-hover:text-[var(--text-primary)] shrink-0 transition-transform duration-200 ${
                isMenuOpen ? 'rotate-180 text-[var(--accent-primary)]' : ''
              }`}
            />
          </button>
        </div>

        {/* Fullscreen Backdrop Overlay: Click outside to dismiss first without triggering other actions */}
        {isMenuOpen && (
          <div
            className="fixed inset-0 z-40 bg-black/10 backdrop-blur-[0.5px]"
            onClick={(e) => {
              e.stopPropagation();
              setIsMenuOpen(false);
            }}
          />
        )}

        {/* Dropdown Menu (on top of everything z-50) */}
        {isMenuOpen && (
          <div
            ref={menuRef}
            className="absolute top-[46px] left-2 min-w-[275px] z-50 bg-[var(--card-glass-bg)] backdrop-blur-xl border border-[var(--card-glass-border)] rounded-xl shadow-2xl p-1.5 animate-in fade-in zoom-in-95 duration-150 flex flex-col gap-0.5"
          >
            {/* Header: Avatar, Name (Bự), Creator (Nhỏ, không có chữ Tạo bởi) */}
            <div className="flex items-center gap-2.5 p-2 rounded-lg bg-[var(--bg-chat)] border border-[var(--border-color)]/60">
              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-white font-extrabold text-sm shadow-xs shrink-0">
                {(currentWorkspace?.name || 'N').charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-extrabold text-sm text-[var(--text-primary)] leading-tight truncate">
                  {currentWorkspace?.name || 'Nexus Hub'}
                </div>
                <div className="text-[0.68rem] text-[var(--text-muted)] font-normal truncate mt-0.5">
                  Alex Rivers
                </div>
              </div>
            </div>

            {/* Divider */}
            <div className="h-px bg-[var(--border-color)]/70 my-1" />

            {/* Action: Upgrade Plan */}
            <button
              type="button"
              onClick={() => {
                setIsMenuOpen(false);
                alert('Tính năng nâng cấp gói Pro: Đang chuẩn bị ra mắt!');
              }}
              className="w-full flex items-center gap-2 px-2.5 py-1.75 rounded-lg text-xs font-semibold text-[var(--text-primary)] hover:bg-[var(--accent-soft)] hover:text-[var(--accent-primary)] transition-all cursor-pointer text-left group"
            >
              <Sparkle size={16} weight="fill" className="text-amber-500 group-hover:scale-110 transition-transform shrink-0" />
              <span className="font-bold">Nâng cấp gói</span>
              <span className="ml-auto text-[0.62rem] font-extrabold px-1.5 py-0.5 rounded-md bg-amber-500/15 text-amber-600 dark:text-amber-400">
                PRO
              </span>
            </button>

            {/* Action: Invite Members */}
            <button
              type="button"
              onClick={() => {
                setIsMenuOpen(false);
                alert(`Mã mời tham gia Workspace: ${currentWorkspace?.inviteCode || 'NEXUS123'}`);
              }}
              className="w-full flex items-center gap-2 px-2.5 py-1.75 rounded-lg text-xs font-semibold text-[var(--text-secondary)] hover:bg-[var(--bg-chat)] hover:text-[var(--text-primary)] transition-colors cursor-pointer text-left"
            >
              <UserPlus size={16} weight="bold" className="shrink-0 text-[var(--text-muted)]" />
              <span>Mời thêm thành viên</span>
            </button>

            {/* Action: Workspace Settings */}
            <button
              type="button"
              onClick={() => {
                setIsMenuOpen(false);
                onOpenSettings();
              }}
              className="w-full flex items-center gap-2 px-2.5 py-1.75 rounded-lg text-xs font-semibold text-[var(--text-secondary)] hover:bg-[var(--bg-chat)] hover:text-[var(--text-primary)] transition-colors cursor-pointer text-left"
            >
              <Gear size={16} weight="bold" className="shrink-0 text-[var(--text-muted)]" />
              <span>Cài đặt ứng dụng</span>
            </button>

            {/* Divider */}
            <div className="h-px bg-[var(--border-color)]/70 my-1" />

            {/* Action: Leave Workspace ("Rời nhóm", NOT "Đăng xuất") */}
            <button
              type="button"
              onClick={() => {
                setIsMenuOpen(false);
                if (confirm('Bạn có chắc chắn muốn rời khỏi nhóm này không?')) {
                  alert('Đã rời khỏi nhóm thành công.');
                }
              }}
              className="w-full flex items-center gap-2 px-2.5 py-1.75 rounded-lg text-xs font-bold text-red-500 hover:bg-red-500/10 transition-colors cursor-pointer text-left"
            >
              <SignOut size={16} weight="bold" className="shrink-0 text-red-500" />
              <span>Rời nhóm</span>
            </button>
          </div>
        )}
      </div>

      {/* Scroll Area */}
      <div className="flex-1 min-h-0 px-2 py-3.5 overflow-y-auto flex flex-col gap-4 select-none">
        {/* Text Channels Section */}
        <div>
          <div className="text-[0.68rem] font-bold uppercase tracking-wider text-[var(--text-muted)] px-2 flex items-center justify-between mb-1">
            <span>Kênh thảo luận</span>
            <button
              type="button"
              className="p-1 hover:text-[var(--accent-primary)] hover:bg-[var(--bg-surface)] rounded transition-colors cursor-pointer"
              title="Tạo kênh mới"
              onClick={onCreateChannel}
            >
              <Plus size={13} weight="bold" />
            </button>
          </div>

          <ul className="list-none flex flex-col gap-0.5 m-0 p-0">
            {displayChannels.map((ch) => {
              const isActive = activeChannelId === ch.id || (!activeChannelId && ch.id === displayChannels[0].id);
              return (
                <li
                  key={ch.id}
                  onClick={() => onSelectChannel(ch.id)}
                  className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-[0.88rem] font-medium cursor-pointer transition-all duration-150 border-none w-full text-left ${
                    isActive
                      ? 'bg-[var(--accent-soft)] text-[var(--accent-primary)] font-semibold'
                      : 'text-[var(--text-secondary)] hover:bg-[var(--bg-surface)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  <span className="flex items-center gap-1.5 min-w-0">
                    {ch.isPrivate ? (
                      <LockSimple size={15} weight="bold" className="mr-2 opacity-65 font-semibold shrink-0" />
                    ) : (
                      <Hash size={16} weight="bold" className="mr-2 opacity-65 font-semibold shrink-0" />
                    )}
                    <span className="truncate">{ch.name}</span>
                  </span>
                  {ch.name === 'backend-net9' && !isActive && (
                    <span className="bg-[var(--accent-primary)] text-white text-[0.68rem] font-bold px-1.75 py-0.5 rounded-full shrink-0">
                      2
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        </div>

        {/* Direct Messages Section */}
        <div>
          <div className="text-[0.68rem] font-bold uppercase tracking-wider text-[var(--text-muted)] px-2 flex items-center justify-between mb-1">
            <span>Tin nhắn trực tiếp</span>
            <button
              type="button"
              className="p-1 hover:text-[var(--accent-primary)] hover:bg-[var(--bg-surface)] rounded transition-colors cursor-pointer"
              title="Nhắn tin trực tiếp mới"
            >
              <Plus size={13} weight="bold" />
            </button>
          </div>

          <ul className="list-none flex flex-col gap-0.5 m-0 p-0">
            {directMessages.map((dm) => (
              <li
                key={dm.id}
                className="flex items-center justify-between px-2.5 py-1.5 rounded-lg text-[0.88rem] font-medium cursor-pointer transition-all duration-150 text-[var(--text-secondary)] hover:bg-[var(--bg-surface)] hover:text-[var(--text-primary)]"
              >
                <span className="flex items-center min-w-0">
                  <span
                    className={`w-2 h-2 rounded-full inline-block mr-2 shrink-0 ${
                      dm.status === 'online'
                        ? 'bg-[var(--status-online)] shadow-[0_0_6px_rgba(22,163,74,0.4)]'
                        : dm.status === 'away'
                        ? 'bg-[var(--status-away)]'
                        : 'bg-[var(--status-dnd)]'
                    }`}
                  />
                  <span className="truncate">{dm.name}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* User Account Footer */}
      <div className="h-14 bg-[var(--bg-rail)] border-t border-[var(--border-color)] px-3 flex items-center justify-between shrink-0 select-none">
        <div className="flex items-center gap-2.5 cursor-pointer min-w-0 flex-1 hover:opacity-90 transition-opacity" onClick={onOpenSettings} title="Mở Cài đặt">
          <Avatar
            src={currentUser?.avatarUrl}
            fallback={currentUser?.displayName || 'User'}
            size="sm"
            status="online"
          />
          <div className="min-w-0">
            <div className="text-[0.85rem] font-bold truncate text-[var(--text-primary)]">
              {currentUser?.displayName || 'Alex Rivers'}
            </div>
            <div className="text-[0.7rem] text-[var(--text-muted)]">Online</div>
          </div>
        </div>
        <button
          type="button"
          className="p-1.5 rounded-md text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-active)] transition-colors cursor-pointer inline-flex items-center justify-center"
          onClick={onOpenSettings}
          title="Cài đặt & Đổi theme"
        >
          <Gear size={17} weight="bold" />
        </button>
      </div>
    </aside>
  );
};
