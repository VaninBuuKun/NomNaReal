import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  CaretDown,
  CaretRight,
  Plus,
  Hash,
  SpeakerHigh,
  Key,
  Gear,
  UserPlus,
  SignOut,
} from '@phosphor-icons/react';
import { ChannelType, type Channel, type Workspace } from '../../types';
import { InviteMemberModal } from '../workspace';

interface ChannelSidebarProps {
  currentWorkspace: Workspace | null;
  channels: Channel[];
  activeChannelId: string | null;
  onSelectChannel: (id: string) => void;
  onCreateChannel: (type: ChannelType) => void;
  onOpenSettings?: () => void;
}

export const ChannelSidebar: React.FC<ChannelSidebarProps> = ({
  currentWorkspace,
  channels,
  activeChannelId,
  onSelectChannel,
  onCreateChannel,
  onOpenSettings,
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
      className="h-full min-h-0 flex-1 shrink-0 bg-[var(--bg-sidebar)] border-r border-[var(--border-color)] flex flex-col overflow-visible min-w-[200px] relative z-30"
    >
      {/* Workspace Header with Dropdown */}
      <div className="relative shrink-0 z-50">
        <div className="h-[54px] px-3.5 border-b border-[var(--border-color)] flex items-center justify-between gap-2 font-bold text-[0.95rem] bg-[var(--bg-sidebar)] select-none">
          <button
            ref={buttonRef}
            type="button"
            onClick={() => setIsMenuOpen((prev) => !prev)}
            className="flex items-center gap-2 min-w-0 flex-1 px-2 py-1.5 rounded-lg hover:bg-[var(--bg-surface)] transition-colors cursor-pointer text-left group"
            title="Tùy chọn Workspace"
          >
            <span className="truncate text-[var(--text-primary)] font-bold text-[0.95rem]">
              {currentWorkspace?.name || 'Nexus Hub'}
            </span>
            <CaretDown
              size={13}
              weight="bold"
              className={`text-[var(--text-muted)] group-hover:text-[var(--text-primary)] shrink-0 transition-transform duration-200 ${isMenuOpen ? 'rotate-180 text-[var(--accent-primary)]' : ''
                }`}
            />
          </button>

          {/* Quick Invite Member button */}
          <button
            type="button"
            onClick={() => setIsInviteModalOpen(true)}
            title="Mời thêm thành viên vào không gian làm việc"
            className="w-8 h-8 rounded-[4px] bg-[var(--accent-soft)] hover:bg-[var(--accent-primary)] text-[var(--accent-primary)] hover:text-white flex items-center justify-center shadow-2xs transition-all active:scale-95 cursor-pointer shrink-0"
          >
            <UserPlus size={17} weight="bold" />
          </button>
        </div>

        {/* Fullscreen Backdrop & Dropdown Menu Portaled to document.body */}
        {isMenuOpen &&
          createPortal(
            <>
              <div
                className="fixed inset-0 z-[999] bg-black/20 backdrop-blur-[1px]"
                onClick={() => setIsMenuOpen(false)}
              />

              <div
                ref={menuRef}
                className="fixed top-[52px] left-[76px] w-[280px] z-[1000] bg-[var(--bg-chat)] border border-[var(--border-color)] rounded-[4px] shadow-2xl p-1.5 flex flex-col gap-0.5"
              >
                <div className="flex items-center gap-2.5 p-2 rounded-[3px] bg-[var(--bg-surface)] border border-[var(--border-color)]/60">
                  <div className="w-9 h-9 rounded-[4px] border border-[var(--border-color)] overflow-hidden shrink-0 bg-[var(--bg-chat)] flex items-center justify-center">
                    <img
                      src={currentWorkspace?.iconUrl || '/default-avatar.png'}
                      alt={currentWorkspace?.name || 'Workspace'}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.currentTarget.src = '/default-avatar.png';
                      }}
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-extrabold text-sm text-[var(--text-primary)] leading-tight truncate">
                      {currentWorkspace?.name || 'Nexus Hub'}
                    </div>
                    <div className="text-[0.68rem] text-[var(--text-muted)] font-normal truncate mt-0.5">
                      {currentWorkspace?.memberCount ? `${currentWorkspace.memberCount} thành viên` : 'Không gian làm việc'}
                    </div>
                  </div>
                </div>

                <div className="h-px bg-[var(--border-color)]/70 my-1" />

                <button
                  type="button"
                  onClick={() => {
                    setIsMenuOpen(false);
                    setIsInviteModalOpen(true);
                  }}
                  className="w-full flex items-center gap-2 px-2.5 py-1.75 rounded-[3px] text-xs font-semibold text-[var(--text-secondary)] hover:bg-[var(--bg-surface)] hover:text-[var(--text-primary)] transition-colors cursor-pointer text-left"
                >
                  <UserPlus size={16} weight="bold" className="shrink-0 text-[var(--text-muted)]" />
                  <span>Mời thêm thành viên</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsMenuOpen(false);
                    onOpenSettings?.();
                  }}
                  className="w-full flex items-center gap-2 px-2.5 py-1.75 rounded-[3px] text-xs font-semibold text-[var(--text-secondary)] hover:bg-[var(--bg-surface)] hover:text-[var(--text-primary)] transition-colors cursor-pointer text-left"
                >
                  <Gear size={16} weight="bold" className="shrink-0 text-[var(--text-muted)]" />
                  <span>Cài đặt ứng dụng</span>
                </button>

                <div className="h-px bg-[var(--border-color)]/70 my-1" />

                <button
                  type="button"
                  onClick={() => {
                    setIsMenuOpen(false);
                    if (confirm('Bạn có chắc chắn muốn rời khỏi nhóm này không?')) {
                      alert('Đã rời khỏi nhóm thành công.');
                    }
                  }}
                  className="w-full flex items-center gap-2 px-2.5 py-1.75 rounded-[3px] text-xs font-bold text-red-500 hover:bg-red-500/10 transition-colors cursor-pointer text-left"
                >
                  <SignOut size={16} weight="bold" className="shrink-0 text-red-500" />
                  <span>Rời nhóm</span>
                </button>
              </div>
            </>,
            document.body
          )}
      </div>

      {/* Scroll Area */}
      <div className="flex-1 min-h-0 px-2 py-3.5 overflow-y-auto flex flex-col gap-4 select-none">
        {/* 1. Text Channels Section (Kênh thảo luận) */}
        <div>
          <div className="flex items-center justify-between px-2 mb-1 group">
            <button
              type="button"
              onClick={() => setIsTextCollapsed((prev) => !prev)}
              className="flex items-center gap-1.5 text-[0.68rem] font-bold uppercase tracking-wider text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
            >
              {isTextCollapsed ? (
                <CaretRight size={12} weight="bold" />
              ) : (
                <CaretDown size={12} weight="bold" />
              )}
              <span>Kênh thảo luận</span>
              <span className="text-[10px] text-[var(--text-muted)] font-normal">({textChannels.length})</span>
            </button>
            <button
              type="button"
              className="p-1 hover:text-[var(--accent-primary)] hover:bg-[var(--bg-surface)] rounded-[3px] transition-colors cursor-pointer"
              title="Tạo kênh thảo luận mới"
              onClick={() => onCreateChannel(ChannelType.Text)}
            >
              <Plus size={13} weight="bold" />
            </button>
          </div>

          {!isTextCollapsed && (
            <ul className="list-none flex flex-col gap-0.5 m-0 p-0">
              {textChannels.map((ch) => {
                const isActive = activeChannelId === ch.id;
                return (
                  <li
                    key={ch.id}
                    onClick={() => onSelectChannel(ch.id)}
                    className={`flex items-center justify-between px-2.5 py-1.5 rounded-[4px] text-[0.88rem] font-medium cursor-pointer transition-all duration-150 border-none w-full text-left ${
                      isActive
                        ? 'bg-[var(--accent-soft)] text-[var(--accent-primary)] font-semibold'
                        : 'text-[var(--text-secondary)] hover:bg-[var(--bg-surface)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    <span className="flex items-center gap-2 min-w-0">
                      {ch.isPrivate ? (
                        <Key size={15} weight="bold" className="text-amber-500/90 shrink-0" />
                      ) : (
                        <Hash size={16} weight="bold" className="opacity-65 font-semibold shrink-0" />
                      )}
                      <span className="truncate">{ch.name}</span>
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* 2. Voice Channels Section (Kênh thoại) */}
        <div>
          <div className="flex items-center justify-between px-2 mb-1 group">
            <button
              type="button"
              onClick={() => setIsVoiceCollapsed((prev) => !prev)}
              className="flex items-center gap-1.5 text-[0.68rem] font-bold uppercase tracking-wider text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
            >
              {isVoiceCollapsed ? (
                <CaretRight size={12} weight="bold" />
              ) : (
                <CaretDown size={12} weight="bold" />
              )}
              <span>Kênh thoại</span>
              <span className="text-[10px] text-[var(--text-muted)] font-normal">({voiceChannels.length})</span>
            </button>
            <button
              type="button"
              className="p-1 hover:text-[var(--accent-primary)] hover:bg-[var(--bg-surface)] rounded-[3px] transition-colors cursor-pointer"
              title="Tạo kênh thoại mới"
              onClick={() => onCreateChannel(ChannelType.Voice)}
            >
              <Plus size={13} weight="bold" />
            </button>
          </div>

          {!isVoiceCollapsed && (
            <ul className="list-none flex flex-col gap-0.5 m-0 p-0">
              {voiceChannels.map((ch) => {
                const isActive = activeChannelId === ch.id;
                return (
                  <li
                    key={ch.id}
                    onClick={() => onSelectChannel(ch.id)}
                    className={`flex items-center justify-between px-2.5 py-1.5 rounded-[4px] text-[0.88rem] font-medium cursor-pointer transition-all duration-150 border-none w-full text-left ${
                      isActive
                        ? 'bg-[var(--accent-soft)] text-[var(--accent-primary)] font-semibold'
                        : 'text-[var(--text-secondary)] hover:bg-[var(--bg-surface)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    <span className="flex items-center gap-2 min-w-0">
                      {ch.isPrivate ? (
                        <Key size={15} weight="bold" className="text-amber-500/90 shrink-0" />
                      ) : (
                        <SpeakerHigh size={16} weight="bold" className="opacity-75 text-[var(--accent-primary)] shrink-0" />
                      )}
                      <span className="truncate">{ch.name}</span>
                    </span>
                  </li>
                );
              })}
            </ul>
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
