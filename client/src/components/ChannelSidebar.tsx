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
}

export const ChannelSidebar: React.FC<ChannelSidebarProps> = ({
  currentWorkspace,
  channels,
  activeChannelId,
  onSelectChannel,
  onCreateChannel,
  currentUser,
  onOpenSettings,
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
    <aside className="channels-sidebar">
      {/* Workspace Header */}
      <div className="sidebar-header" onClick={onOpenSettings} title="Cài đặt Workspace">
        <span>{currentWorkspace?.name || 'Nexus Hub'}</span>
        <CaretDown size={13} weight="bold" className="text-[var(--text-muted)]" />
      </div>

      {/* Scroll Area */}
      <div className="sidebar-scroll-area">
        {/* Text Channels Section */}
        <div>
          <div className="section-label">
            <span>Kênh thảo luận</span>
            <button
              type="button"
              className="p-1 hover:text-[var(--accent-primary)] transition-colors cursor-pointer"
              title="Tạo kênh mới"
              onClick={onCreateChannel}
            >
              <Plus size={13} weight="bold" />
            </button>
          </div>

          <ul className="nav-list">
            {displayChannels.map((ch) => {
              const isActive = activeChannelId === ch.id || (!activeChannelId && ch.id === displayChannels[0].id);
              return (
                <li
                  key={ch.id}
                  onClick={() => onSelectChannel(ch.id)}
                  className={`nav-item ${isActive ? 'active' : ''}`}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {ch.isPrivate ? (
                      <LockSimple size={15} weight="bold" className="nav-prefix" />
                    ) : (
                      <Hash size={16} weight="bold" className="nav-prefix" />
                    )}
                    <span>{ch.name}</span>
                  </span>
                  {ch.name === 'backend-net9' && !isActive && (
                    <span className="unread-pill">2</span>
                  )}
                </li>
              );
            })}
          </ul>
        </div>

        {/* Direct Messages Section */}
        <div>
          <div className="section-label">
            <span>Tin nhắn trực tiếp</span>
            <button
              type="button"
              className="p-1 hover:text-[var(--accent-primary)] transition-colors cursor-pointer"
              title="Nhắn tin trực tiếp mới"
            >
              <Plus size={13} weight="bold" />
            </button>
          </div>

          <ul className="nav-list">
            {directMessages.map((dm) => (
              <li key={dm.id} className="nav-item">
                <span style={{ display: 'flex', alignItems: 'center' }}>
                  <span
                    className={`presence-dot ${
                      dm.status === 'online'
                        ? 'dot-online'
                        : dm.status === 'away'
                        ? 'dot-away'
                        : 'dot-dnd'
                    }`}
                  />
                  <span>{dm.name}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* User Account Footer */}
      <div className="user-account-bar">
        <div className="user-profile-meta" onClick={onOpenSettings} title="Mở Cài đặt">
          <div className="avatar-box">
            {currentUser?.displayName.slice(0, 2).toUpperCase() || 'AR'}
            <div className="avatar-badge-online" />
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: '0.85rem', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {currentUser?.displayName || 'Alex Rivers'}
            </div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Online</div>
          </div>
        </div>
        <button
          type="button"
          className="icon-tool-btn"
          onClick={onOpenSettings}
          title="Cài đặt & Đổi theme"
        >
          <Gear size={17} weight="bold" />
        </button>
      </div>
    </aside>
  );
};
