import React from 'react';
import { CaretDown, Plus, Hash, LockSimple, Gear } from '@phosphor-icons/react';
import type { Channel, User, Workspace } from '../types';

interface ChannelSidebarProps {
  currentWorkspace: Workspace | null;
  channels: Channel[];
  activeChannelId: string | null;
  onSelectChannel: (id: string) => void;
  onCreateChannel: () => void;
  currentUser: User | null;
  onOpenSettings: () => void;
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
      className="h-full min-h-0 shrink-0 bg-[var(--bg-sidebar)] border-r border-[var(--border-color)] flex flex-col overflow-hidden min-w-[200px] max-w-[450px]"
      style={{ width: `${width}px` }}
    >
      {/* Workspace Header */}
      <div
        className="h-[54px] px-4 border-b border-[var(--border-color)] flex items-center justify-between font-bold text-[0.95rem] cursor-pointer bg-[var(--bg-sidebar)] hover:bg-[var(--bg-surface)] shrink-0 transition-colors select-none"
        onClick={onOpenSettings}
        title="Cài đặt Workspace"
      >
        <span className="truncate text-[var(--text-primary)]">{currentWorkspace?.name || 'Nexus Hub'}</span>
        <CaretDown size={13} weight="bold" className="text-[var(--text-muted)] shrink-0 ml-1.5" />
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
          <div className="relative w-8.5 h-8.5 rounded-xl bg-[var(--accent-primary)] text-white flex items-center justify-center font-bold text-[0.8rem] shrink-0">
            {currentUser?.displayName.slice(0, 2).toUpperCase() || 'AR'}
            <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-[var(--status-online)] border-2 border-[var(--bg-rail)]" />
          </div>
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
