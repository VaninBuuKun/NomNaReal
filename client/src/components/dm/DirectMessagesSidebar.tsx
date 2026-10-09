import React, { useState } from 'react';
import {
  Users,
  Plus,
  X,
  MagnifyingGlass,
  WechatLogoIcon,
} from '@phosphor-icons/react';
import { useChatStore } from '../../stores';
import type { DirectMessageItem } from './types';

interface DirectMessagesSidebarProps {
  conversations: DirectMessageItem[];
  activeConversationId: string | null;
  isFriendsActive?: boolean;
  onSelectFriends?: () => void;
  onSelectConversation: (item: DirectMessageItem) => void;
  onOpenNewDm: () => void;
  onRemoveConversation?: (id: string, e: React.MouseEvent) => void;
  onlineFriendsCount?: number;
}

export const DirectMessagesSidebar: React.FC<DirectMessagesSidebarProps> = ({
  conversations,
  activeConversationId,
  isFriendsActive = false,
  onSelectFriends,
  onSelectConversation,
  onOpenNewDm,
  onRemoveConversation,
  onlineFriendsCount = 0,
}) => {
  const [filterQuery] = useState('');
  const drafts = useChatStore((state) => state.drafts);

  const filteredConversations = conversations.filter((item) => {
    if (!filterQuery.trim()) return true;
    const q = filterQuery.toLowerCase();
    return (
      item.user.displayName.toLowerCase().includes(q) ||
      item.user.username.toLowerCase().includes(q)
    );
  });

  const getStatusColor = (status?: string) => {
    switch (status?.toLowerCase()) {
      case 'online':
        return 'bg-[#23a55a]';
      case 'away':
      case 'idle':
        return 'bg-[#f0b232]';
      case 'dnd':
        return 'bg-[#f23f43]';
      case 'offline':
      default:
        return 'bg-neutral-500';
    }
  };

  return (
    <aside
      id="directMessagesSidebar"
      className="h-full min-h-0 flex-1 shrink-0 bg-[var(--bg-sidebar)] flex flex-col overflow-hidden min-w-[200px] select-none"
    >
      {/* 1. Discord-style Search / Find DM bar */}
      <div className="h-[54px] px-2.5 border-b border-[var(--border-color)] flex items-center shrink-0">
        <button
          type="button"
          onClick={onOpenNewDm}
          className="w-full h-7 px-2 rounded-[4px] bg-[var(--bg-chat)] hover:bg-[var(--bg-surface)] text-[var(--text-muted)] hover:text-[var(--text-primary)] text-xs flex items-center justify-between transition-colors cursor-pointer border border-[var(--border-color)]/60"
        >
          <span className="truncate">Tìm hoặc bắt đầu trò chuyện</span>
          <MagnifyingGlass size={13} weight="bold" />
        </button>
      </div>

      {/* 2. Top Navigation: Friends Button (Iconic Discord top tab) */}
      <div className="p-2 shrink-0">
        <button
          type="button"
          onClick={onSelectFriends}
          className={`w-full flex items-center justify-between px-3 py-2 rounded-[4px] text-[13px] font-semibold cursor-pointer transition-colors ${
            isFriendsActive && !activeConversationId
              ? 'bg-[var(--bg-surface-active)] text-white'
              : 'text-[var(--text-secondary)] hover:bg-[var(--bg-surface)] hover:text-[var(--text-primary)]'
          }`}
        >
          <div className="flex items-center gap-3">
            <Users size={18} weight={isFriendsActive ? 'fill' : 'bold'} />
            <span>Bạn bè</span>
          </div>
          {onlineFriendsCount > 0 && (
            <span className="text-[11px] font-bold px-1.5 py-0.2 rounded-full bg-[var(--accent-primary)] text-white">
              {onlineFriendsCount}
            </span>
          )}
        </button>
      </div>

      {/* 3. Section Title: TIN NHẮN TRỰC TIẾP */}
      <div className="flex items-center justify-between px-4 pt-2 pb-1 text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)] shrink-0 group">
        <span>Tin nhắn trực tiếp</span>
        <button
          type="button"
          onClick={onOpenNewDm}
          title="Tạo tin nhắn trực tiếp mới"
          className="p-0.5 hover:text-[var(--text-primary)] transition-colors cursor-pointer"
        >
          <Plus size={14} weight="bold" />
        </button>
      </div>

      {/* 4. DM Conversation List */}
      <div className="flex-1 min-h-0 overflow-y-auto px-2 py-1 space-y-0.5 no-scrollbar">
        {filteredConversations.length === 0 ? (
          <div className="p-6 text-center text-xs text-[var(--text-muted)] flex flex-col items-center gap-2">
            <div className="w-10 h-10 rounded-[4px] bg-[var(--bg-surface)] flex items-center justify-center text-[var(--text-muted)]">
              <WechatLogoIcon size={20} weight="fill" className="opacity-60" />
            </div>
            {filterQuery ? (
              <span>Không tìm thấy &quot;{filterQuery}&quot;</span>
            ) : (
              <span>Chưa có tin nhắn trực tiếp nào</span>
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
                className={`group relative flex items-center justify-between px-2.5 py-2 rounded-[4px] cursor-pointer transition-colors ${
                  isActive
                    ? 'bg-[var(--bg-surface-active)] text-white'
                    : 'text-[var(--text-secondary)] hover:bg-[var(--bg-surface)] hover:text-[var(--text-primary)]'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  {/* Avatar + Status Indicator */}
                  <div className="relative shrink-0">
                    <div className="w-8 h-8 rounded-full bg-[var(--bg-surface)] flex items-center justify-center overflow-hidden">
                      <img
                        src={avatarSrc}
                        alt={item.user.displayName}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.currentTarget.src = '/default-avatar.png';
                        }}
                      />
                    </div>
                    <span
                      className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-[var(--bg-sidebar)] ${getStatusColor(
                        item.user.status
                      )}`}
                    />
                  </div>

                  {/* Name and last message / draft */}
                  <div className="min-w-0 flex-1 leading-tight">
                    <div className="text-[13px] font-medium truncate">
                      {item.user.displayName}
                    </div>
                    <div className="text-[11px] text-[var(--text-muted)] truncate">
                      {(() => {
                        const draft = (drafts[item.id] || '').trim();
                        if (draft) {
                          return (
                            <span className="text-amber-400 italic">
                              Bản nháp: {draft}
                            </span>
                          );
                        }
                        return item.lastMessage || `@${item.user.username}`;
                      })()}
                    </div>
                  </div>
                </div>

                {/* Right badges & Close button on hover */}
                <div className="flex items-center gap-1 shrink-0 ml-1">
                  {item.unreadCount !== undefined && item.unreadCount > 0 && (
                    <span className="px-1.5 py-0.2 rounded-full bg-[var(--accent-primary)] text-white text-[9px] font-bold">
                      {item.unreadCount}
                    </span>
                  )}
                  {onRemoveConversation && (
                    <button
                      type="button"
                      onClick={(e) => onRemoveConversation(item.id, e)}
                      title="Đóng cuộc trò chuyện"
                      className="opacity-0 group-hover:opacity-100 p-0.5 hover:text-white rounded transition-opacity cursor-pointer text-[var(--text-muted)]"
                    >
                      <X size={13} weight="bold" />
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </aside>
  );
};
