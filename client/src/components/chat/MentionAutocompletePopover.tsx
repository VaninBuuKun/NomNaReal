import React, { useState, useEffect, useRef } from 'react';
import { Users, Lightning, Hash, Megaphone } from '@phosphor-icons/react';

export interface MentionUser {
  id: string;
  displayName?: string;
  username?: string;
  avatarUrl?: string;
  status?: string;
}

interface MentionAutocompletePopoverProps {
  isOpen: boolean;
  query: string;
  members: MentionUser[];
  onSelect: (username: string) => void;
  onClose: () => void;
}

export const MentionAutocompletePopover: React.FC<MentionAutocompletePopoverProps> = ({
  isOpen,
  query,
  members,
  onSelect,
  onClose,
}) => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);

  // Prepare special mentions + filtered member list
  const cleanQuery = query.toLowerCase().trim();

  const specialMentions = [
    {
      id: 'special-all',
      username: 'all',
      displayName: 'all',
      description: 'Thông báo cho tất cả thành viên trong kênh này',
      badgeColor: 'bg-amber-500/20 text-amber-500 border border-amber-500/30',
      icon: <Users size={16} weight="bold" className="text-amber-500" />,
    },
    {
      id: 'special-channel',
      username: 'channel',
      displayName: 'channel',
      description: 'Nhắc toàn bộ mọi người có mặt trong kênh',
      badgeColor: 'bg-amber-500/20 text-amber-500 border border-amber-500/30',
      icon: <Hash size={16} weight="bold" className="text-amber-500" />,
    },
    {
      id: 'special-everyone',
      username: 'everyone',
      displayName: 'everyone',
      description: 'Nhắc toàn bộ thành viên trong Workspace',
      badgeColor: 'bg-amber-500/20 text-amber-500 border border-amber-500/30',
      icon: <Megaphone size={16} weight="bold" className="text-amber-500" />,
    },
    {
      id: 'special-here',
      username: 'here',
      displayName: 'here',
      description: 'Chỉ nhắc những thành viên đang trực tuyến (Online)',
      badgeColor: 'bg-emerald-500/20 text-emerald-500 border border-emerald-500/30',
      icon: <Lightning size={16} weight="bold" className="text-emerald-500" />,
    },
  ].filter(
    (s) =>
      s.username.toLowerCase().includes(cleanQuery) ||
      s.description.toLowerCase().includes(cleanQuery)
  );

  const filteredMembers = members
    .filter((m) => {
      const u = (m.username || '').toLowerCase();
      const d = (m.displayName || '').toLowerCase();
      return u.includes(cleanQuery) || d.includes(cleanQuery);
    })
    .slice(0, 15);

  const combinedItems = [
    ...specialMentions.map((s) => ({ type: 'special' as const, data: s })),
    ...filteredMembers.map((m) => ({ type: 'user' as const, data: m })),
  ];

  // Reset selected index when query changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % Math.max(1, combinedItems.length));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + combinedItems.length) % Math.max(1, combinedItems.length));
      } else if (e.key === 'Enter' || e.key === 'Tab') {
        if (combinedItems.length > 0) {
          e.preventDefault();
          const item = combinedItems[selectedIndex];
          if (item) {
            onSelect(item.type === 'special' ? item.data.username : (item.data.username || item.data.displayName || ''));
          }
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [isOpen, selectedIndex, combinedItems, onSelect, onClose]);

  if (!isOpen || combinedItems.length === 0) return null;

  return (
    <div
      ref={listRef}
      className="absolute bottom-full left-4 mb-2 w-[420px] max-h-80 bg-[var(--bg-surface)] border border-[var(--border-color)] shadow-2xl rounded-xl overflow-hidden z-50 select-none animate-in fade-in slide-in-from-bottom-2 duration-150 flex flex-col"
    >
      <div className="px-3.5 py-2 bg-[var(--bg-chat)]/90 border-b border-[var(--border-color)] text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider flex items-center justify-between shrink-0">
        <span>Gợi ý nhắc tên (@mentions)</span>
        <span className="font-normal lowercase text-[10px]">↑↓ duyệt • ↵ chọn</span>
      </div>

      <div className="overflow-y-auto divide-y divide-[var(--border-color)]/30 p-1.5 flex-1">
        {combinedItems.map((item, idx) => {
          const isSelected = idx === selectedIndex;

          if (item.type === 'special') {
            const s = item.data;
            return (
              <div
                key={s.id}
                onClick={() => onSelect(s.username)}
                className={`px-3 py-2 rounded-lg flex items-center gap-3 cursor-pointer transition-colors text-xs ${
                  isSelected
                    ? 'bg-[var(--accent-soft)] text-[var(--text-primary)] font-semibold'
                    : 'hover:bg-[var(--bg-surface-active)] text-[var(--text-primary)]'
                }`}
              >
                <div className="w-8 h-8 rounded-lg bg-[var(--bg-chat)] border border-[var(--border-color)] flex items-center justify-center shrink-0 shadow-2xs">
                  {s.icon}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-[13px] text-amber-500">
                      @{s.displayName}
                    </span>
                    <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-amber-500/15 text-amber-500">
                      Thông báo toàn kênh
                    </span>
                  </div>
                  <div className="text-[11px] text-[var(--text-muted)] truncate mt-0.5">
                    {s.description}
                  </div>
                </div>
              </div>
            );
          }

          const m = item.data;
          return (
            <div
              key={m.id}
              onClick={() => onSelect(m.username || m.displayName || '')}
              className={`px-3 py-2 rounded-lg flex items-center gap-3 cursor-pointer transition-colors text-xs ${
                isSelected
                  ? 'bg-[var(--accent-soft)] text-[var(--text-primary)] font-semibold'
                  : 'hover:bg-[var(--bg-surface-active)] text-[var(--text-primary)]'
              }`}
            >
              <div className="relative shrink-0">
                <img
                  src={m.avatarUrl || '/default-avatar.png'}
                  alt=""
                  className="w-8 h-8 rounded-full object-cover border border-[var(--border-color)]/70 shadow-2xs"
                  onError={(e) => {
                    e.currentTarget.src = '/default-avatar.png';
                  }}
                />
                {m.status && (
                  <span
                    className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full ring-2 ring-[var(--bg-surface)] ${
                      m.status === 'online'
                        ? 'bg-emerald-500'
                        : m.status === 'away'
                        ? 'bg-amber-500'
                        : m.status === 'dnd'
                        ? 'bg-rose-500'
                        : 'bg-neutral-400'
                    }`}
                  />
                )}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-[13px] text-[var(--text-primary)] truncate">
                    {m.displayName || m.username}
                  </span>
                  {m.username && (
                    <span className="text-[11px] text-[var(--text-muted)] font-normal truncate">
                      @{m.username}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
