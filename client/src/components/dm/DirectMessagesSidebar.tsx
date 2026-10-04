import React, { useState, useMemo } from 'react';
import {
  MagnifyingGlass,
  UserPlus,
  PaperPlaneTilt,
  X,
  WechatLogoIcon,
} from '@phosphor-icons/react';
import type { DirectMessageUser } from './NewDirectMessageModal';
import { useChatStore } from '../../stores';

export interface DirectMessageItem {
  id: string; // DM channel ID or temporary conversation ID
  workspaceId?: string;
  user: DirectMessageUser;
  lastMessage?: string;
  lastMessageTime?: string;
  unreadCount?: number;
  isPending?: boolean;
}

interface DirectMessagesSidebarProps {
  conversations: DirectMessageItem[];
  activeConversationId: string | null;
  onSelectConversation: (conversation: DirectMessageItem) => void;
  onOpenNewDm: () => void;
  onRemoveConversation?: (id: string, e: React.MouseEvent) => void;
}

export const DirectMessagesSidebar: React.FC<DirectMessagesSidebarProps> = ({
  conversations,
  activeConversationId,
  onSelectConversation,
  onOpenNewDm,
  onRemoveConversation: _onRemoveConversation,
}) => {
  const [filterQuery, setFilterQuery] = useState('');
  const drafts = useChatStore((state) => state.drafts);

  const filteredConversations = useMemo(() => {
    const term = filterQuery.trim().toLowerCase();
    if (!term) return conversations;
    return conversations.filter(
      (c) =>
        c.user.displayName.toLowerCase().includes(term) ||
        c.user.username.toLowerCase().includes(term) ||
        (c.lastMessage && c.lastMessage.toLowerCase().includes(term))
    );
  }, [conversations, filterQuery]);

  const getStatusColor = (status: DirectMessageUser['status']) => {
    switch (status) {
      case 'online':
        return 'bg-[var(--status-online)] shadow-[0_0_6px_rgba(22,163,74,0.4)]';
      case 'away':
        return 'bg-[var(--status-away)]';
      case 'dnd':
        return 'bg-[var(--status-dnd)]';
      case 'offline':
      default:
        return 'bg-neutral-400';
    }
  };

  return (
    <aside
      id="directMessagesSidebar"
      className="h-full min-h-0 flex-1 shrink-0 bg-[var(--bg-sidebar)] border-r border-[var(--border-color)] flex flex-col overflow-visible min-w-[200px] relative z-30"
    >
      {/* 1. Header (Fixed 54px matching ChannelSidebar, fully responsive) */}
      <div className="h-[54px] px-3.5 border-b border-[var(--border-color)] flex items-center justify-between gap-2 font-bold text-[0.95rem] bg-[var(--bg-sidebar)] select-none shrink-0">
        <div className="flex items-center gap-2 text-[var(--text-primary)] min-w-0 flex-1">
          <div className="w-7 h-7 rounded-[4px] bg-[var(--accent-soft)] flex items-center justify-center text-[var(--accent-primary)] shrink-0">
            <WechatLogoIcon size={20} weight="fill" />
          </div>
          <span className="truncate font-bold text-[0.95rem]">Tin nhắn trực tiếp</span>
        </div>

        {/* Quick New DM button */}
        <button
          type="button"
          onClick={onOpenNewDm}
          title="Nhắn tin với thành viên mới"
          className="w-7 h-7 rounded-[4px] bg-[var(--bg-surface)] hover:bg-[var(--accent-soft)] text-[var(--text-secondary)] hover:text-[var(--accent-primary)] border border-[var(--border-color)]/70 flex items-center justify-center transition-all duration-150 active:scale-95 cursor-pointer shrink-0 shadow-2xs"
        >
          <UserPlus size={15} weight="bold" />
        </button>
      </div>

      {/* 2. Messenger-style Search Bar */}
      <div className="p-3 border-b border-[var(--border-color)] bg-[var(--bg-sidebar)] shrink-0">
        <div className="flex items-center gap-2">
          {/* Search Input Box */}
          <div className="relative flex-1 flex items-center min-w-0">
            <MagnifyingGlass
              size={14}
              weight="bold"
              className="absolute left-2.5 text-[var(--text-muted)] pointer-events-none"
            />
            <input
              type="text"
              value={filterQuery}
              onChange={(e) => setFilterQuery(e.target.value)}
              placeholder="Tìm kiếm tin nhắn..."
              className="w-full pl-8 pr-2.5 py-1.5 text-xs rounded-[3px] border border-[var(--border-color)] bg-[var(--bg-surface)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-primary)] focus:ring-1 focus:ring-[var(--accent-primary)] transition-all"
            />
            {filterQuery && (
              <button
                type="button"
                onClick={() => setFilterQuery('')}
                className="absolute right-2 text-[var(--text-muted)] hover:text-[var(--text-primary)] text-xs cursor-pointer"
              >
                <X size={12} weight="bold" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 3. Conversation List */}
      <div className="flex-1 min-h-0 overflow-y-auto p-2 space-y-1">
        <div className="flex items-center justify-between px-2 pt-1 pb-1.5 text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)] select-none">
          <span>Hộp thư cá nhân</span>
          <span>{filteredConversations.length}</span>
        </div>

        {filteredConversations.length === 0 ? (
          <div className="p-6 text-center text-xs text-[var(--text-muted)] flex flex-col items-center gap-2">
            <div className="w-10 h-10 rounded-[4px] bg-[var(--bg-surface)] border border-[var(--border-color)] flex items-center justify-center text-[var(--text-muted)]">
              <PaperPlaneTilt size={20} className="opacity-60" />
            </div>
            {filterQuery ? (
              <span>Không có tin nhắn nào khớp với &quot;{filterQuery}&quot;</span>
            ) : (
              <>
                <span className="font-medium text-[var(--text-secondary)]">Chưa có tin nhắn nào</span>
                <span className="text-[11px]">Bấm dấu + ở trên để tìm thành viên và bắt đầu trò chuyện</span>
              </>
            )}
          </div>
        ) : (
          filteredConversations.map((item) => {
            const isActive = activeConversationId === item.id;
            const avatarSrc = item.user.avatarUrl || '/default-avatar.png';

            return (
              <div
                key={item.id}
                onClick={() => onSelectConversation(item)}
                className={`group relative flex items-center gap-3 px-2.5 py-2 rounded-[4px] cursor-pointer transition-all select-none ${isActive
                  ? 'bg-[var(--accent-soft)] text-[var(--accent-primary)] font-medium shadow-2xs'
                  : 'text-[var(--text-secondary)] hover:bg-[var(--bg-surface)] hover:text-[var(--text-primary)]'
                  }`}
              >
                {/* User Avatar with Status Indicator */}
                <div className="relative shrink-0">
                  <div className="w-9 h-9 rounded-[4px] bg-[var(--bg-surface)] flex items-center justify-center border border-[var(--border-color)] overflow-hidden shadow-2xs">
                    <img
                      src={avatarSrc}
                      alt={item.user.displayName}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.currentTarget.src = '/default-avatar.png';
                      }}
                    />
                  </div>
                  {/* Status dot */}
                  <span
                    className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-[var(--bg-sidebar)] ${getStatusColor(
                      item.user.status
                    )}`}
                  />
                </div>

                {/* Conversation Details */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-1 leading-tight">
                    <span
                      className={`text-xs truncate ${isActive
                        ? 'font-bold text-[var(--accent-primary)]'
                        : 'font-semibold text-[var(--text-primary)]'
                        }`}
                    >
                      {item.user.displayName}
                    </span>
                    {item.lastMessageTime && (
                      <span className="text-[10px] text-[var(--text-muted)] shrink-0">
                        {item.lastMessageTime}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between gap-1 mt-0.5">
                    <span className="text-[11px] text-[var(--text-muted)] truncate">
                      {(() => {
                        const draft = (drafts[item.id] || '').trim();
                        if (draft) {
                          return (
                            <span className="text-amber-500 italic">
                              <span className="font-semibold not-italic">Bản nháp: </span>
                              {draft}
                            </span>
                          );
                        }
                        return item.lastMessage || 'Bắt đầu cuộc trò chuyện';
                      })()}
                    </span>

                    {/* Unread badge */}
                    {item.unreadCount !== undefined && item.unreadCount > 0 && (
                      <span className="px-1.5 py-0.2 rounded-full bg-[var(--accent-primary)] text-white text-[9px] font-bold shrink-0">
                        {item.unreadCount}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </aside>
  );
};
