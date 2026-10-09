import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  Hash,
  SpeakerHigh,
  CaretDown,
  CaretRight,
  Plus,
  Gear,
  UserPlus,
  SignOut,
  Lock,
} from '@phosphor-icons/react';
import { ChannelType, type Channel, type Workspace } from '../../types';
import { WorkspaceAvatar } from '../ui';
import { InviteMemberModal } from '../workspace';

interface ChannelSidebarProps {
  currentWorkspace: Workspace | null;
  channels: Channel[];
  activeChannelId: string | null;
  onSelectChannel: (id: string) => void;
  onCreateChannel: (type: ChannelType) => void;
  onOpenSettings?: () => void;
  isOwner?: boolean;
  onOpenEditWorkspace?: () => void;
  onLeaveWorkspace?: () => void;
  onOpenEditChannel?: (ch: Channel) => void;
  onOpenAddChannelMember?: (ch: Channel) => void;
}

export const ChannelSidebar: React.FC<ChannelSidebarProps> = ({
  currentWorkspace,
  channels,
  activeChannelId,
  onSelectChannel,
  onCreateChannel,
  isOwner,
  onOpenEditWorkspace,
  onLeaveWorkspace,
  onOpenEditChannel,
  onOpenAddChannelMember,
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [isTextCollapsed, setIsTextCollapsed] = useState(false);
  const [isVoiceCollapsed, setIsVoiceCollapsed] = useState(false);

  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

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

  const textChannels = channels.filter(
    (c) => c.type === ChannelType.Text || c.type === 0 || c.type === undefined
  );
  const voiceChannels = channels.filter(
    (c) => c.type === ChannelType.Voice || c.type === 1
  );

  return (
    <aside
      id="channelSidebar"
      className="h-full min-h-0 flex-1 shrink-0 bg-[var(--bg-sidebar)] flex flex-col overflow-hidden min-w-[200px] select-none"
    >
      {/* 1. Server Header with Discord Dropdown */}
      <div className="relative shrink-0">
        <button
          ref={buttonRef}
          type="button"
          onClick={() => setIsMenuOpen((prev) => !prev)}
          className="w-full h-[54px] px-4 border-b border-[var(--border-color)] flex items-center justify-between gap-2 font-bold text-[15px] text-[var(--text-primary)] hover:bg-[var(--bg-surface)] transition-colors cursor-pointer text-left shadow-xs"
          title="Tùy chọn Server"
        >
          <span className="truncate">{currentWorkspace?.name || 'Discord Server'}</span>
          <CaretDown
            size={14}
            weight="bold"
            className={`text-[var(--text-muted)] shrink-0 transition-transform duration-200 ${
              isMenuOpen ? 'rotate-180 text-white' : ''
            }`}
          />
        </button>

        {/* Dropdown Menu */}
        {isMenuOpen &&
          createPortal(
            <>
              <div
                className="fixed inset-0 z-[999] bg-black/30"
                onClick={() => setIsMenuOpen(false)}
              />

              <div
                ref={menuRef}
                className="fixed top-[52px] left-[78px] w-[240px] z-[1000] bg-[var(--bg-rail)] border border-[var(--border-color)] rounded-[6px] shadow-2xl p-1.5 flex flex-col gap-0.5 text-xs select-none"
              >
                {/* Header Info */}
                <div className="flex items-center gap-2 p-2 rounded-[4px] bg-[var(--bg-surface)]">
                  <WorkspaceAvatar
                    name={currentWorkspace?.name || 'Server'}
                    iconUrl={currentWorkspace?.iconUrl}
                    size="sm"
                    roundedClassName="rounded-[4px]"
                  />
                  <div className="min-w-0 flex-1 leading-tight">
                    <div className="font-bold text-[var(--text-primary)] truncate">
                      {currentWorkspace?.name || 'Server'}
                    </div>
                    <div className="text-[10px] text-[var(--text-muted)] truncate mt-0.5">
                      {currentWorkspace?.memberCount ? `${currentWorkspace.memberCount} thành viên` : 'Server'}
                    </div>
                  </div>
                </div>

                <div className="h-px bg-[var(--border-color)] my-1" />

                <button
                  type="button"
                  onClick={() => {
                    setIsMenuOpen(false);
                    setIsInviteModalOpen(true);
                  }}
                  className="w-full flex items-center justify-between px-2.5 py-2 rounded-[4px] font-semibold text-[var(--accent-primary)] hover:bg-[var(--accent-primary)] hover:text-white transition-colors cursor-pointer"
                >
                  <span>Mời bạn bè</span>
                  <UserPlus size={16} weight="bold" />
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsMenuOpen(false);
                    onCreateChannel(ChannelType.Text);
                  }}
                  className="w-full flex items-center justify-between px-2.5 py-2 rounded-[4px] font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-surface)] hover:text-white transition-colors cursor-pointer"
                >
                  <span>Tạo kênh</span>
                  <Plus size={16} weight="bold" />
                </button>

                {onOpenEditWorkspace && (isOwner === undefined || isOwner) && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsMenuOpen(false);
                      onOpenEditWorkspace();
                    }}
                    className="w-full flex items-center justify-between px-2.5 py-2 rounded-[4px] font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-surface)] hover:text-white transition-colors cursor-pointer"
                  >
                    <span>Cài đặt máy chủ</span>
                    <Gear size={16} weight="bold" />
                  </button>
                )}

                <div className="h-px bg-[var(--border-color)] my-1" />

                <button
                  type="button"
                  onClick={() => {
                    setIsMenuOpen(false);
                    onLeaveWorkspace?.();
                  }}
                  className="w-full flex items-center justify-between px-2.5 py-2 rounded-[4px] font-bold text-rose-500 hover:bg-rose-500 hover:text-white transition-colors cursor-pointer"
                >
                  <span>Rời khỏi máy chủ</span>
                  <SignOut size={16} weight="bold" />
                </button>
              </div>
            </>,
            document.body
          )}
      </div>

      {/* 2. Channel List (Scrollable Area) */}
      <div className="flex-1 min-h-0 px-2 py-3 overflow-y-auto space-y-4 no-scrollbar">
        {/* Category: KÊNH VĂN BẢN (Text Channels) */}
        <div>
          <div className="flex items-center justify-between px-1.5 mb-1 group">
            <button
              type="button"
              onClick={() => setIsTextCollapsed((prev) => !prev)}
              className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
            >
              {isTextCollapsed ? (
                <CaretRight size={11} weight="bold" />
              ) : (
                <CaretDown size={11} weight="bold" />
              )}
              <span>Kênh chat</span>
              <span className="text-[10px] opacity-70">({textChannels.length})</span>
            </button>
            <button
              type="button"
              className="p-1 hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)] rounded-[3px] transition-colors cursor-pointer text-[var(--text-muted)]"
              title="Tạo kênh chat"
              onClick={() => onCreateChannel(ChannelType.Text)}
            >
              <Plus size={13} weight="bold" />
            </button>
          </div>

          {!isTextCollapsed && (
            <div className="space-y-0.5">
              {textChannels.map((ch) => {
                const isActive = activeChannelId === ch.id;
                const isUnread = !!ch.hasUnread && !isActive;

                return (
                  <div
                    key={ch.id}
                    onClick={() => onSelectChannel(ch.id)}
                    className={`group/ch relative flex items-center justify-between px-2 py-1.5 rounded-[4px] text-[13px] cursor-pointer transition-colors ${
                      isActive
                        ? 'bg-[var(--bg-surface-active)] text-white font-medium'
                        : isUnread
                        ? 'text-white font-bold hover:bg-[var(--bg-surface)]'
                        : 'text-[var(--text-secondary)] hover:bg-[var(--bg-surface)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 min-w-0 flex-1">
                      {isUnread && (
                        <span className="absolute -left-1.5 w-1 h-2 rounded-r-full bg-white shadow-xs" />
                      )}
                      {ch.isPrivate ? (
                        <Lock size={15} weight="bold" className="text-[var(--text-muted)] shrink-0" />
                      ) : (
                        <Hash size={16} weight="bold" className={`shrink-0 ${isUnread ? 'text-white' : 'text-[var(--text-muted)]'}`} />
                      )}
                      <span className="truncate">{ch.name}</span>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      {ch.isPrivate && onOpenAddChannelMember && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onOpenAddChannelMember(ch);
                          }}
                          title="Thêm thành viên"
                          className="opacity-0 group-hover/ch:opacity-100 p-0.5 hover:text-white rounded transition-opacity cursor-pointer text-[var(--text-muted)]"
                        >
                          <UserPlus size={13} weight="bold" />
                        </button>
                      )}
                      {onOpenEditChannel && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onOpenEditChannel(ch);
                          }}
                          title="Cài đặt kênh"
                          className="opacity-0 group-hover/ch:opacity-100 p-0.5 hover:text-white rounded transition-opacity cursor-pointer text-[var(--text-muted)]"
                        >
                          <Gear size={13} weight="bold" />
                        </button>
                      )}
                      {isUnread && (
                        <span className="w-2 h-2 rounded-full bg-white shrink-0 shadow-xs" />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Category: KÊNH THOẠI (Voice Channels) */}
        <div>
          <div className="flex items-center justify-between px-1.5 mb-1 group">
            <button
              type="button"
              onClick={() => setIsVoiceCollapsed((prev) => !prev)}
              className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
            >
              {isVoiceCollapsed ? (
                <CaretRight size={11} weight="bold" />
              ) : (
                <CaretDown size={11} weight="bold" />
              )}
              <span>Kênh thoại</span>
              <span className="text-[10px] opacity-70">({voiceChannels.length})</span>
            </button>
            <button
              type="button"
              className="p-1 hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)] rounded-[3px] transition-colors cursor-pointer text-[var(--text-muted)]"
              title="Tạo kênh thoại"
              onClick={() => onCreateChannel(ChannelType.Voice)}
            >
              <Plus size={13} weight="bold" />
            </button>
          </div>

          {!isVoiceCollapsed && (
            <div className="space-y-0.5">
              {voiceChannels.map((ch) => {
                const isActive = activeChannelId === ch.id;

                return (
                  <div
                    key={ch.id}
                    onClick={() => onSelectChannel(ch.id)}
                    className={`group/ch relative flex items-center justify-between px-2 py-1.5 rounded-[4px] text-[13px] cursor-pointer transition-colors ${
                      isActive
                        ? 'bg-[var(--bg-surface-active)] text-white font-medium'
                        : 'text-[var(--text-secondary)] hover:bg-[var(--bg-surface)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 min-w-0 flex-1">
                      {ch.isPrivate ? (
                        <Lock size={15} weight="bold" className="text-[var(--text-muted)] shrink-0" />
                      ) : (
                        <SpeakerHigh size={16} weight="bold" className="text-[var(--text-muted)] shrink-0" />
                      )}
                      <span className="truncate">{ch.name}</span>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      {onOpenEditChannel && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onOpenEditChannel(ch);
                          }}
                          title="Cài đặt kênh"
                          className="opacity-0 group-hover/ch:opacity-100 p-0.5 hover:text-white rounded transition-opacity cursor-pointer text-[var(--text-muted)]"
                        >
                          <Gear size={13} weight="bold" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Invite Member Modal */}
      <InviteMemberModal
        isOpen={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
        workspace={currentWorkspace}
      />
    </aside>
  );
};
