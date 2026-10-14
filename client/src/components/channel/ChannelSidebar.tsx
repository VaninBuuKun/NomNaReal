import React, { useState, useRef, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  Hash,
  SpeakerHigh,
  CaretDown,
  CaretRight,
  Plus,
  PlusCircle,
  FolderPlus,
  Gear,
  UserPlus,
  SignOut,
  Lock,
} from '@phosphor-icons/react';
import { ChannelType, type Channel, type Workspace } from '../../types';
import { InviteMemberModal, ServerSettingsModal } from '../server';

interface ChannelSidebarProps {
  currentWorkspace: Workspace | null;
  channels: Channel[];
  activeChannelId: string | null;
  onSelectChannel: (id: string) => void;
  onCreateChannel: (type: ChannelType, categoryId?: string) => void;
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
  onOpenSettings: _onOpenSettings,
  isOwner,
  onOpenEditWorkspace: _onOpenEditWorkspace,
  onLeaveWorkspace,
  onOpenEditChannel,
  onOpenAddChannelMember: _onOpenAddChannelMember,
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [isServerSettingsOpen, setIsServerSettingsOpen] = useState(false);
  const [isTextCollapsed, setIsTextCollapsed] = useState(false);
  const [isVoiceCollapsed, setIsVoiceCollapsed] = useState(false);
  const [collapsedCategories, setCollapsedCategories] = useState<Record<string, boolean>>({});

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

  // Extract Categories
  const categories = useMemo(() => {
    return channels
      .filter((c) => c.type === ChannelType.Category)
      .sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
  }, [channels]);

  const hasCategories = categories.length > 0;

  // Uncategorized channels
  const uncategorizedChannels = useMemo(() => {
    return channels.filter(
      (c) => c.type !== ChannelType.Category && !c.categoryId
    );
  }, [channels]);

  // Fallback Text & Voice channels (used when no categories exist)
  const legacyTextChannels = useMemo(() => {
    return channels.filter(
      (c) => c.type === ChannelType.Text || c.type === 0 || c.type === undefined
    );
  }, [channels]);

  const legacyVoiceChannels = useMemo(() => {
    return channels.filter((c) => c.type === ChannelType.Voice || c.type === 1);
  }, [channels]);

  const toggleCategory = (catId: string) => {
    setCollapsedCategories((prev) => ({
      ...prev,
      [catId]: !prev[catId],
    }));
  };

  const renderChannelItem = (ch: Channel) => {
    const isActive = activeChannelId === ch.id;
    const isUnread = !!ch.hasUnread && !isActive;
    const isVoice = ch.type === ChannelType.Voice;

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
          ) : isVoice ? (
            <SpeakerHigh size={15} weight="bold" className="text-[var(--text-muted)] shrink-0" />
          ) : (
            <Hash
              size={16}
              weight="bold"
              className={`shrink-0 ${isUnread ? 'text-white' : 'text-[var(--text-muted)]'}`}
            />
          )}
          <span className="truncate">{ch.name}</span>
        </div>

        {/* Channel Hover Actions: SINGLE unified Gear button */}
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
          {isUnread && (
            <span className="w-2 h-2 rounded-full bg-white shrink-0 shadow-xs" />
          )}
        </div>
      </div>
    );
  };

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
                className="fixed inset-0 z-[999] bg-black/20"
                onClick={() => setIsMenuOpen(false)}
              />

              <div
                ref={menuRef}
                className="fixed top-[52px] left-[78px] w-[220px] z-[1000] bg-[var(--bg-surface)] border border-[var(--border-color)] shadow-2xl rounded-[6px] p-1.5 flex flex-col gap-0.5 text-xs select-none backdrop-blur-md animate-in fade-in zoom-in-95 duration-100"
              >
                {/* 1. Mời mọi người */}
                <button
                  type="button"
                  onClick={() => {
                    setIsMenuOpen(false);
                    setIsInviteModalOpen(true);
                  }}
                  className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-[3px] font-semibold text-[var(--accent-primary)] hover:bg-[var(--accent-primary)] hover:text-white transition-colors cursor-pointer group"
                >
                  <span>Mời mọi người</span>
                  <UserPlus size={16} weight="bold" className="text-current opacity-80 group-hover:opacity-100" />
                </button>

                {/* 2. Cài đặt máy chủ */}
                <button
                  type="button"
                  onClick={() => {
                    setIsMenuOpen(false);
                    setIsServerSettingsOpen(true);
                  }}
                  className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-[3px] font-medium text-[var(--text-secondary)] hover:bg-[var(--accent-primary)] hover:text-white transition-colors cursor-pointer group"
                >
                  <span>Cài đặt máy chủ</span>
                  <Gear size={16} weight="bold" className="text-current opacity-70 group-hover:opacity-100" />
                </button>

                {/* 3. Tạo kênh */}
                <button
                  type="button"
                  onClick={() => {
                    setIsMenuOpen(false);
                    onCreateChannel(ChannelType.Text);
                  }}
                  className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-[3px] font-medium text-[var(--text-secondary)] hover:bg-[var(--accent-primary)] hover:text-white transition-colors cursor-pointer group"
                >
                  <span>Tạo kênh</span>
                  <PlusCircle size={16} weight="bold" className="text-current opacity-70 group-hover:opacity-100" />
                </button>

                {/* 4. Tạo danh mục */}
                <button
                  type="button"
                  onClick={() => {
                    setIsMenuOpen(false);
                    onCreateChannel(ChannelType.Category);
                  }}
                  className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-[3px] font-medium text-[var(--text-secondary)] hover:bg-[var(--accent-primary)] hover:text-white transition-colors cursor-pointer group"
                >
                  <span>Tạo danh mục</span>
                  <FolderPlus size={16} weight="bold" className="text-current opacity-70 group-hover:opacity-100" />
                </button>

                <div className="h-px bg-[var(--border-color)]/60 my-1 mx-1" />

                {/* 5. Rời khỏi máy chủ */}
                <button
                  type="button"
                  onClick={() => {
                    setIsMenuOpen(false);
                    onLeaveWorkspace?.();
                  }}
                  className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-[3px] font-semibold text-rose-500 hover:bg-rose-500 hover:text-white transition-colors cursor-pointer group"
                >
                  <span>Rời khỏi máy chủ</span>
                  <SignOut size={16} weight="bold" className="text-current opacity-80 group-hover:opacity-100" />
                </button>
              </div>
            </>,
            document.body
          )}
      </div>

      {/* 2. Channel List (Scrollable Area) */}
      <div className="flex-1 min-h-0 px-2 py-3 overflow-y-auto space-y-4 no-scrollbar">
        {hasCategories ? (
          <>
            {/* Uncategorized channels (if any) */}
            {uncategorizedChannels.length > 0 && (
              <div className="space-y-0.5 mb-2">
                {uncategorizedChannels.map((ch) => renderChannelItem(ch))}
              </div>
            )}

            {/* Dynamic Categories */}
            {categories.map((cat) => {
              const isCollapsed = !!collapsedCategories[cat.id];
              const childChannels = channels
                .filter((c) => c.categoryId === cat.id && c.type !== ChannelType.Category)
                .sort((a, b) => (a.position ?? 0) - (b.position ?? 0));

              return (
                <div key={cat.id}>
                  {/* Category Header */}
                  <div className="flex items-center justify-between px-1.5 mb-1 group">
                    <button
                      type="button"
                      onClick={() => toggleCategory(cat.id)}
                      className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer truncate"
                    >
                      {isCollapsed ? (
                        <CaretRight size={11} weight="bold" className="shrink-0" />
                      ) : (
                        <CaretDown size={11} weight="bold" className="shrink-0" />
                      )}
                      <span className="truncate">{cat.name}</span>
                      <span className="text-[10px] opacity-70 shrink-0">
                        ({childChannels.length})
                      </span>
                    </button>

                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        type="button"
                        className="p-1 hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)] rounded-[3px] transition-colors cursor-pointer text-[var(--text-muted)]"
                        title="Tạo kênh trong danh mục"
                        onClick={() => onCreateChannel(ChannelType.Text, cat.id)}
                      >
                        <Plus size={13} weight="bold" />
                      </button>
                      {onOpenEditChannel && (
                        <button
                          type="button"
                          className="p-1 hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)] rounded-[3px] transition-colors cursor-pointer text-[var(--text-muted)]"
                          title="Cài đặt danh mục"
                          onClick={() => onOpenEditChannel(cat)}
                        >
                          <Gear size={13} weight="bold" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Child Channels */}
                  {!isCollapsed && (
                    <div className="space-y-0.5">
                      {childChannels.map((ch) => renderChannelItem(ch))}
                    </div>
                  )}
                </div>
              );
            })}
          </>
        ) : (
          /* Legacy Fallback for servers without categories */
          <>
            {/* Category: KÊNH CHAT */}
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
                  <span className="text-[10px] opacity-70">({legacyTextChannels.length})</span>
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
                  {legacyTextChannels.map((ch) => renderChannelItem(ch))}
                </div>
              )}
            </div>

            {/* Category: KÊNH THOẠI */}
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
                  <span className="text-[10px] opacity-70">({legacyVoiceChannels.length})</span>
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
                  {legacyVoiceChannels.map((ch) => renderChannelItem(ch))}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Invite Member Modal */}
      <InviteMemberModal
        isOpen={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
        workspace={currentWorkspace}
      />

      {/* Unified Server Settings Modal */}
      {currentWorkspace && (
        <ServerSettingsModal
          isOpen={isServerSettingsOpen}
          onClose={() => setIsServerSettingsOpen(false)}
          workspace={currentWorkspace}
          isOwner={isOwner ?? false}
          onWorkspaceDeleted={() => onLeaveWorkspace?.()}
        />
      )}
    </aside>
  );
};
