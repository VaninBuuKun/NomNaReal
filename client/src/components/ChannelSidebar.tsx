import React from 'react';
import { Hash, Lock, Plus, Settings, ChevronDown } from 'lucide-react';
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
  // Demo online users
  const directMessages = [
    { id: '1', name: 'Alex Rivers', status: 'online' },
    { id: '2', name: 'Minh Dev', status: 'online' },
    { id: '3', name: 'Duc Nguyen', status: 'away' },
  ];

  return (
    <aside style={{
      width: '240px',
      backgroundColor: 'var(--bg-sidebar)',
      borderRight: '1px solid var(--border-color)',
      display: 'flex',
      flexDirection: 'column',
      flexShrink: 0,
      overflow: 'hidden'
    }}>
      {/* Workspace Header */}
      <div style={{
        height: '54px',
        padding: '0 16px',
        borderBottom: '1px solid var(--border-color)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        fontWeight: 700,
        fontSize: '0.95rem',
        cursor: 'pointer',
        background: 'var(--bg-sidebar)'
      }}>
        <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {currentWorkspace?.name || 'NomNa Workspace'}
        </span>
        <ChevronDown size={16} color="var(--text-muted)" />
      </div>

      {/* Channels & DMs Scrollable Area */}
      <div style={{
        flex: 1,
        padding: '14px 8px',
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: '18px'
      }}>
        {/* Text Channels Section */}
        <div>
          <div style={{
            fontSize: '0.7rem',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            color: 'var(--text-muted)',
            padding: '0 8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '4px'
          }}>
            <span>Kênh thảo luận</span>
            <button
              onClick={onCreateChannel}
              title="Tạo kênh mới"
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                display: 'flex',
                padding: '2px',
                borderRadius: '4px'
              }}
            >
              <Plus size={14} />
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            {channels.map((ch) => {
              const isActive = activeChannelId === ch.id;
              return (
                <div
                  key={ch.id}
                  onClick={() => onSelectChannel(ch.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '7px 10px',
                    borderRadius: '8px',
                    backgroundColor: isActive ? 'var(--accent-soft)' : 'transparent',
                    color: isActive ? 'var(--accent-primary)' : 'var(--text-secondary)',
                    fontWeight: isActive ? 600 : 500,
                    fontSize: '0.88rem',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                  onMouseOver={(e) => {
                    if (!isActive) e.currentTarget.style.backgroundColor = 'var(--bg-surface)';
                  }}
                  onMouseOut={(e) => {
                    if (!isActive) e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {ch.isPrivate ? <Lock size={15} opacity={0.7} /> : <Hash size={15} opacity={0.7} />}
                    <span>{ch.name}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Direct Messages Section */}
        <div>
          <div style={{
            fontSize: '0.7rem',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            color: 'var(--text-muted)',
            padding: '0 8px',
            marginBottom: '4px'
          }}>
            <span>Tin nhắn trực tiếp</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            {directMessages.map((dm) => (
              <div
                key={dm.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '7px 10px',
                  borderRadius: '8px',
                  color: 'var(--text-secondary)',
                  fontSize: '0.88rem',
                  fontWeight: 500,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
                onMouseOver={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-surface)')}
                onMouseOut={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
              >
                <div style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  backgroundColor: dm.status === 'online' ? 'var(--status-online)' : 'var(--status-away)',
                  boxShadow: dm.status === 'online' ? '0 0 6px rgba(22, 163, 74, 0.4)' : 'none'
                }} />
                <span>{dm.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* User Status Bar with Settings Trigger */}
      <div style={{
        height: '56px',
        backgroundColor: 'var(--bg-rail)',
        borderTop: '1px solid var(--border-color)',
        padding: '0 12px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexShrink: 0
      }}>
        <div 
          onClick={onOpenSettings}
          title="Mở Cài đặt & Tuỳ chọn Theme"
          style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', flex: 1 }}
        >
          <div style={{ position: 'relative' }}>
            <div style={{
              width: '34px',
              height: '34px',
              borderRadius: '10px',
              background: 'var(--accent-primary)',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700,
              fontSize: '0.82rem'
            }}>
              {currentUser?.displayName.slice(0, 2).toUpperCase() || 'ME'}
            </div>
            <div style={{
              position: 'absolute',
              bottom: '-2px',
              right: '-2px',
              width: '10px',
              height: '10px',
              borderRadius: '50%',
              backgroundColor: 'var(--status-online)',
              border: '2px solid var(--bg-rail)'
            }} />
          </div>

          <div style={{ overflow: 'hidden' }}>
            <div style={{
              fontSize: '0.84rem',
              fontWeight: 700,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis'
            }}>
              {currentUser?.displayName || 'Khách'}
            </div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Online</div>
          </div>
        </div>

        <button
          onClick={onOpenSettings}
          title="Cài đặt (Tuỳ chọn Theme)"
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--text-muted)',
            cursor: 'pointer',
            padding: '6px',
            borderRadius: '6px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.color = 'var(--text-primary)';
            e.currentTarget.style.backgroundColor = 'var(--bg-surface)';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.color = 'var(--text-muted)';
            e.currentTarget.style.backgroundColor = 'transparent';
          }}
        >
          <Settings size={18} />
        </button>
      </div>
    </aside>
  );
};
