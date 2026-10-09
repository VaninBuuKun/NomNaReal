import React, { useState, useMemo } from 'react';
import {
  Users,
  ChatDots,
  Phone,
  DotsThreeVertical,
  MagnifyingGlass,
  Check,
  SmileySad,
  Sparkle,
} from '@phosphor-icons/react';
import { Avatar } from '../ui';
import type { User } from '../../types';
import type { DirectMessageUser } from '../dm';

type FriendsTab = 'online' | 'all' | 'pending' | 'blocked' | 'add';

interface FriendsDashboardProps {
  currentUser: User | null;
  friends: DirectMessageUser[];
  onStartDm: (user: DirectMessageUser) => void;
  onOpenUserProfile?: (user: DirectMessageUser) => void;
  onToast?: (toast: { id: string; title: string; description?: string }) => void;
}

export const FriendsDashboard: React.FC<FriendsDashboardProps> = ({
  currentUser: _currentUser,
  friends,
  onStartDm,
  onOpenUserProfile,
  onToast,
}) => {
  const [activeTab, setActiveTab] = useState<FriendsTab>('online');
  const [searchQuery, setSearchQuery] = useState('');
  const [addFriendInput, setAddFriendInput] = useState('');
  const [addFriendSuccess, setAddFriendSuccess] = useState(false);

  // Filter friends based on tab
  const onlineFriends = useMemo(
    () => friends.filter((f) => f.status === 'online' || f.status === 'dnd' || f.status === 'away'),
    [friends]
  );

  const displayedFriends = useMemo(() => {
    let list = friends;
    if (activeTab === 'online') {
      list = onlineFriends;
    } else if (activeTab === 'all') {
      list = friends;
    } else if (activeTab === 'pending' || activeTab === 'blocked') {
      list = [];
    }

    if (!searchQuery.trim()) return list;

    const q = searchQuery.toLowerCase();
    return list.filter(
      (f) =>
        f.displayName.toLowerCase().includes(q) ||
        f.username.toLowerCase().includes(q)
    );
  }, [friends, onlineFriends, activeTab, searchQuery]);

  const handleSendFriendRequest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!addFriendInput.trim()) return;

    // Simulate sending friend request
    setAddFriendSuccess(true);
    onToast?.({
      id: Date.now().toString(),
      title: 'Đã gửi lời mời kết bạn',
      description: `Đã gửi lời mời kết bạn tới "${addFriendInput.trim()}".`,
    });
    setAddFriendInput('');
    setTimeout(() => setAddFriendSuccess(false), 3000);
  };

  return (
    <div className="flex-1 min-h-0 h-full flex flex-col bg-[var(--bg-chat)] select-none">
      {/* 1. Discord Friends Header Bar */}
      <div className="h-[54px] px-4 border-b border-[var(--border-color)] flex items-center justify-between gap-4 bg-[var(--bg-chat)] shrink-0">
        <div className="flex items-center gap-4 overflow-x-auto no-scrollbar">
          {/* Friends Title */}
          <div className="flex items-center gap-2 text-[var(--text-primary)] font-bold text-sm shrink-0 pr-2 border-r border-[var(--border-color)]">
            <Users size={20} weight="bold" className="text-[var(--text-muted)]" />
            <span>Bạn bè</span>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center gap-2 text-xs font-semibold shrink-0">
            <button
              type="button"
              onClick={() => setActiveTab('online')}
              className={`px-2.5 py-1 rounded-[4px] transition-colors cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'online'
                  ? 'bg-[var(--bg-surface-active)] text-white font-bold'
                  : 'text-[var(--text-muted)] hover:bg-[var(--bg-surface)] hover:text-[var(--text-primary)]'
              }`}
            >
              <span>Trực tuyến</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-[var(--bg-surface)] text-[var(--text-muted)]">
                {onlineFriends.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('all')}
              className={`px-2.5 py-1 rounded-[4px] transition-colors cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'all'
                  ? 'bg-[var(--bg-surface-active)] text-white font-bold'
                  : 'text-[var(--text-muted)] hover:bg-[var(--bg-surface)] hover:text-[var(--text-primary)]'
              }`}
            >
              <span>Tất cả</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-[var(--bg-surface)] text-[var(--text-muted)]">
                {friends.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('pending')}
              className={`px-2.5 py-1 rounded-[4px] transition-colors cursor-pointer ${
                activeTab === 'pending'
                  ? 'bg-[var(--bg-surface-active)] text-white font-bold'
                  : 'text-[var(--text-muted)] hover:bg-[var(--bg-surface)] hover:text-[var(--text-primary)]'
              }`}
            >
              <span>Đang chờ</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('blocked')}
              className={`px-2.5 py-1 rounded-[4px] transition-colors cursor-pointer ${
                activeTab === 'blocked'
                  ? 'bg-[var(--bg-surface-active)] text-white font-bold'
                  : 'text-[var(--text-muted)] hover:bg-[var(--bg-surface)] hover:text-[var(--text-primary)]'
              }`}
            >
              <span>Đã chặn</span>
            </button>

            {/* Add Friend Highlighted Button */}
            <button
              type="button"
              onClick={() => setActiveTab('add')}
              className={`px-3 py-1 rounded-[4px] font-bold transition-all cursor-pointer ${
                activeTab === 'add'
                  ? 'bg-transparent text-[#23a55a] border border-[#23a55a]'
                  : 'bg-[#23a55a] text-white hover:bg-[#1f9250] shadow-sm'
              }`}
            >
              Thêm bạn bè
            </button>
          </div>
        </div>
      </div>

      {/* 2. Main Content Area */}
      <div className="flex-1 min-h-0 flex flex-row overflow-hidden">
        {/* Left Column: Friends List or Add Friend Form */}
        <div className="flex-1 min-h-0 flex flex-col p-6 overflow-y-auto">
          {activeTab === 'add' ? (
            /* Tab: Add Friend */
            <div className="max-w-xl space-y-6">
              <div>
                <h2 className="text-base font-extrabold uppercase tracking-wide text-[var(--text-primary)]">
                  Thêm bạn bè
                </h2>
                <p className="text-xs text-[var(--text-muted)] mt-1">
                  Bạn có thể thêm bạn bè bằng tên người dùng NomNa của họ.
                </p>
              </div>

              <form onSubmit={handleSendFriendRequest} className="space-y-3">
                <div className="flex items-center gap-2 p-3 bg-[var(--bg-sidebar)] border border-[var(--border-color)] rounded-[6px] focus-within:border-[var(--accent-primary)] focus-within:ring-1 focus-within:ring-[var(--accent-primary)] transition-all">
                  <input
                    type="text"
                    value={addFriendInput}
                    onChange={(e) => setAddFriendInput(e.target.value)}
                    placeholder="Bạn có thể thêm bạn bè bằng tên người dùng..."
                    className="flex-1 min-w-0 bg-transparent text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none"
                  />
                  <button
                    type="submit"
                    disabled={!addFriendInput.trim()}
                    className="px-4 py-1.5 rounded-[4px] bg-[var(--accent-primary)] text-white text-xs font-bold hover:bg-[var(--accent-hover)] disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer shrink-0"
                  >
                    Gửi yêu cầu kết bạn
                  </button>
                </div>

                {addFriendSuccess && (
                  <div className="text-xs text-[#23a55a] flex items-center gap-1.5 font-medium animate-fadeIn">
                    <Check size={16} weight="bold" />
                    <span>Yêu cầu kết bạn đã được gửi thành công!</span>
                  </div>
                )}
              </form>

              {/* Decorative Guide */}
              <div className="pt-8 border-t border-[var(--border-color)]/70 flex flex-col items-center justify-center text-center p-8 gap-3">
                <div className="w-16 h-16 rounded-full bg-[var(--bg-surface)] flex items-center justify-center text-[var(--accent-primary)] shadow-sm">
                  <Sparkle size={32} weight="duotone" />
                </div>
                <h3 className="text-sm font-bold text-[var(--text-primary)]">
                  Chờ đợi bạn bè tham gia
                </h3>
                <p className="text-xs text-[var(--text-muted)] max-w-sm leading-relaxed">
                  Khi bạn bè chấp nhận lời mời, họ sẽ xuất hiện trong danh sách và bạn có thể trò chuyện trực tiếp hoặc gọi thoại bất cứ lúc nào!
                </p>
              </div>
            </div>
          ) : activeTab === 'pending' ? (
            /* Tab: Pending */
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 gap-3">
              <div className="w-16 h-16 rounded-2xl bg-[var(--bg-surface)] flex items-center justify-center text-[var(--text-muted)]">
                <Users size={32} weight="duotone" />
              </div>
              <h3 className="text-sm font-bold text-[var(--text-primary)]">
                Không có yêu cầu kết bạn nào đang chờ
              </h3>
              <p className="text-xs text-[var(--text-muted)] max-w-xs">
                Mọi yêu cầu kết bạn bạn đã gửi hoặc nhận sẽ hiển thị ở đây.
              </p>
            </div>
          ) : activeTab === 'blocked' ? (
            /* Tab: Blocked */
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 gap-3">
              <div className="w-16 h-16 rounded-2xl bg-[var(--bg-surface)] flex items-center justify-center text-[var(--text-muted)]">
                <SmileySad size={32} weight="duotone" />
              </div>
              <h3 className="text-sm font-bold text-[var(--text-primary)]">
                Bạn chưa chặn ai cả
              </h3>
              <p className="text-xs text-[var(--text-muted)] max-w-xs">
                Danh sách những người bạn đã chặn sẽ xuất hiện ở đây.
              </p>
            </div>
          ) : (
            /* Tab: Online or All */
            <div className="space-y-4">
              {/* Search Box */}
              <div className="relative flex items-center">
                <MagnifyingGlass
                  size={16}
                  weight="bold"
                  className="absolute left-3 text-[var(--text-muted)] pointer-events-none"
                />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Tìm kiếm bạn bè..."
                  className="w-full pl-9 pr-4 py-2 text-xs rounded-[4px] border border-[var(--border-color)] bg-[var(--bg-sidebar)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-primary)] transition-all"
                />
              </div>

              {/* Friends Count Label */}
              <div className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)] px-1">
                {activeTab === 'online' ? 'Trực tuyến' : 'Tất cả bạn bè'} — {displayedFriends.length}
              </div>

              {/* Friends List */}
              {displayedFriends.length === 0 ? (
                <div className="py-16 text-center text-xs text-[var(--text-muted)] flex flex-col items-center gap-3">
                  <div className="w-14 h-14 rounded-2xl bg-[var(--bg-surface)] flex items-center justify-center text-[var(--text-muted)]">
                    <Users size={28} weight="duotone" />
                  </div>
                  <p>
                    {searchQuery
                      ? `Không tìm thấy bạn bè nào khớp với "${searchQuery}"`
                      : activeTab === 'online'
                      ? 'Hiện tại không có bạn bè nào đang trực tuyến.'
                      : 'Chưa có bạn bè nào trong danh sách.'}
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-[var(--border-color)]/50">
                  {displayedFriends.map((friend) => {
                    const isOnline =
                      friend.status === 'online' ||
                      friend.status === 'dnd' ||
                      friend.status === 'away';

                    return (
                      <div
                        key={friend.id}
                        className="group flex items-center justify-between py-2.5 px-3 rounded-[6px] hover:bg-[var(--bg-surface)] transition-all cursor-pointer select-none"
                        onClick={() => onOpenUserProfile?.(friend)}
                      >
                        {/* Avatar & Names */}
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="relative shrink-0">
                            <Avatar
                              src={friend.avatarUrl}
                              fallback={friend.displayName}
                              size="md"
                              status={
                                friend.status === 'online'
                                  ? 'online'
                                  : friend.status === 'dnd'
                                  ? 'dnd'
                                  : friend.status === 'away'
                                  ? 'away'
                                  : 'offline'
                              }
                            />
                          </div>

                          <div className="min-w-0 leading-tight">
                            <div className="text-sm font-bold text-[var(--text-primary)] truncate group-hover:text-[var(--accent-primary)] transition-colors">
                              {friend.displayName}
                              <span className="text-xs text-[var(--text-muted)] font-normal ml-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                @{friend.username}
                              </span>
                            </div>
                            <div className="text-[11px] text-[var(--text-muted)] truncate mt-0.5">
                              {isOnline ? (
                                <span className="text-[#23a55a] font-medium">Trực tuyến</span>
                              ) : (
                                <span>Ngoại tuyến</span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Quick Action Buttons */}
                        <div
                          className="flex items-center gap-2 shrink-0"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            type="button"
                            onClick={() => onStartDm(friend)}
                            title="Bắt đầu nhắn tin"
                            className="w-9 h-9 rounded-full bg-[var(--bg-surface-active)] hover:bg-[var(--accent-primary)] text-[var(--text-secondary)] hover:text-white flex items-center justify-center transition-all cursor-pointer shadow-xs"
                          >
                            <ChatDots size={18} weight="bold" />
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              onToast?.({
                                id: Date.now().toString(),
                                title: 'Gọi thoại',
                                description: `Tính năng gọi thoại với ${friend.displayName} đang được phát triển.`,
                              })
                            }
                            title="Gọi thoại"
                            className="w-9 h-9 rounded-full bg-[var(--bg-surface-active)] hover:bg-[var(--accent-primary)] text-[var(--text-secondary)] hover:text-white flex items-center justify-center transition-all cursor-pointer shadow-xs"
                          >
                            <Phone size={18} weight="bold" />
                          </button>

                          <button
                            type="button"
                            onClick={() => onOpenUserProfile?.(friend)}
                            title="Tùy chọn khác"
                            className="w-9 h-9 rounded-full bg-[var(--bg-surface-active)] hover:bg-[var(--bg-sidebar)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] flex items-center justify-center transition-all cursor-pointer shadow-xs"
                          >
                            <DotsThreeVertical size={18} weight="bold" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Column: Discord "Đang hoạt động" (Active Now) Rail */}
        <div className="w-[340px] shrink-0 border-l border-[var(--border-color)] p-5 hidden lg:flex flex-col gap-4 bg-[var(--bg-sidebar)]/50 select-none">
          <h3 className="text-sm font-extrabold uppercase tracking-wide text-[var(--text-primary)]">
            Đang hoạt động
          </h3>

          {onlineFriends.length > 0 ? (
            <div className="space-y-3">
              {onlineFriends.slice(0, 5).map((f) => (
                <div
                  key={f.id}
                  onClick={() => onOpenUserProfile?.(f)}
                  className="p-3 rounded-[6px] bg-[var(--bg-chat)] border border-[var(--border-color)] hover:border-[var(--accent-primary)] transition-all cursor-pointer shadow-2xs group"
                >
                  <div className="flex items-center gap-2.5">
                    <Avatar
                      src={f.avatarUrl}
                      fallback={f.displayName}
                      size="sm"
                      status="online"
                    />
                    <div className="min-w-0 flex-1 leading-tight">
                      <div className="text-xs font-bold text-[var(--text-primary)] truncate group-hover:text-[var(--accent-primary)]">
                        {f.displayName}
                      </div>
                      <div className="text-[10px] text-[#23a55a] font-medium truncate mt-0.5">
                        Đang hoạt động trên NomNa
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-4 gap-2">
              <p className="text-xs font-bold text-[var(--text-primary)]">
                Hiện tại yên ắng...
              </p>
              <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">
                Khi bạn bè có hoạt động hoặc đang trò chuyện, họ sẽ xuất hiện tại đây!
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
