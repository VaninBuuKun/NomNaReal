import React, { useState, useEffect, useMemo } from 'react';
import {
  Users,
  ChatDots,
  Phone,
  DotsThreeVertical,
  MagnifyingGlass,
  Check,
  X,
  CircleNotch,
  Sparkle,
  UserCircleMinus,
  Prohibit,
} from '@phosphor-icons/react';
import { Avatar } from '../ui';
import { useFriendStore } from '../../stores';
import type { User } from '../../types';
import type { DirectMessageUser } from '../dm';

type FriendsTab = 'online' | 'all' | 'pending' | 'blocked' | 'add';

interface FriendsDashboardProps {
  currentUser: User | null;
  onStartDm: (user: DirectMessageUser) => void;
  onOpenUserProfile?: (user: DirectMessageUser) => void;
  onToast?: (toast: { id: string; title: string; description?: string }) => void;
}

export const FriendsDashboard: React.FC<FriendsDashboardProps> = ({
  currentUser: _currentUser,
  onStartDm,
  onOpenUserProfile,
  onToast,
}) => {
  const [activeTab, setActiveTab] = useState<FriendsTab>('online');
  const [searchQuery, setSearchQuery] = useState('');
  const [addFriendInput, setAddFriendInput] = useState('');
  const [isSubmittingAdd, setIsSubmittingAdd] = useState(false);
  const [addFeedback, setAddFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [openMenuFriendId, setOpenMenuFriendId] = useState<string | null>(null);

  const {
    friends,
    pendingIncoming,
    pendingOutgoing,
    blocked,
    isLoading,
    fetchFriends,
    sendFriendRequest,
    acceptFriendRequest,
    declineFriendRequest,
    removeFriend,
    blockUser,
    unblockUser,
  } = useFriendStore();

  useEffect(() => {
    fetchFriends();
  }, [fetchFriends]);

  // Map FriendDto to DirectMessageUser for compatibility
  const toDmUser = (f: {
    userId: string;
    displayName: string;
    username: string;
    avatarUrl?: string;
    status: any;
  }): DirectMessageUser => ({
    id: f.userId,
    displayName: f.displayName,
    username: f.username,
    email: '',
    avatarUrl: f.avatarUrl,
    status: typeof f.status === 'number'
      ? f.status === 0 ? 'online' : f.status === 1 ? 'away' : f.status === 2 ? 'dnd' : 'offline'
      : f.status || 'offline',
  });

  // Online friends
  const onlineFriends = useMemo(() => {
    return friends.filter((f) => {
      const s = typeof f.status === 'number'
        ? f.status === 0 ? 'online' : f.status === 1 ? 'away' : f.status === 2 ? 'dnd' : 'offline'
        : f.status;
      return s === 'online' || s === 'away' || s === 'dnd';
    });
  }, [friends]);

  // Filtered friends based on tab & search
  const filteredFriends = useMemo(() => {
    let list = activeTab === 'online' ? onlineFriends : friends;
    if (!searchQuery.trim()) return list;
    const q = searchQuery.toLowerCase();
    return list.filter(
      (f) =>
        f.displayName.toLowerCase().includes(q) ||
        f.username.toLowerCase().includes(q)
    );
  }, [activeTab, onlineFriends, friends, searchQuery]);

  const handleSendFriendRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addFriendInput.trim() || isSubmittingAdd) return;

    setIsSubmittingAdd(true);
    setAddFeedback(null);
    try {
      const res = await sendFriendRequest(addFriendInput.trim());
      if (res.friendshipStatus === 1) {
        setAddFeedback({
          type: 'success',
          message: `Tuyệt vời! Bạn và @${res.username} đã tự động trở thành bạn bè.`,
        });
      } else {
        setAddFeedback({
          type: 'success',
          message: `Thành công! Đã gửi lời mời kết bạn đến @${res.username}.`,
        });
      }
      setAddFriendInput('');
    } catch (err: any) {
      const errMsg =
        err.response?.data?.detail ||
        err.response?.data?.message ||
        'Không thể gửi lời mời kết bạn. Vui lòng kiểm tra lại tên người dùng!';
      setAddFeedback({
        type: 'error',
        message: errMsg,
      });
    } finally {
      setIsSubmittingAdd(false);
    }
  };

  const handleAccept = async (friendshipId: string, displayName: string) => {
    try {
      await acceptFriendRequest(friendshipId);
      onToast?.({
        id: Date.now().toString(),
        title: 'Đã chấp nhận kết bạn',
        description: `Bạn và ${displayName} giờ đây đã là bạn bè!`,
      });
    } catch (err) {
      console.error(err);
    }
  };

  const handleDecline = async (friendshipId: string) => {
    try {
      await declineFriendRequest(friendshipId);
    } catch (err) {
      console.error(err);
    }
  };

  const handleRemoveFriend = async (friendshipId: string, displayName: string) => {
    try {
      await removeFriend(friendshipId);
      setOpenMenuFriendId(null);
      onToast?.({
        id: Date.now().toString(),
        title: 'Đã hủy kết bạn',
        description: `Đã xóa ${displayName} khỏi danh sách bạn bè.`,
      });
    } catch (err) {
      console.error(err);
    }
  };

  const handleBlockUser = async (userId: string, displayName: string) => {
    try {
      await blockUser(userId);
      setOpenMenuFriendId(null);
      onToast?.({
        id: Date.now().toString(),
        title: 'Đã chặn người dùng',
        description: `Đã chặn ${displayName}. Họ sẽ không thể nhắn tin hoặc kết bạn với bạn.`,
      });
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div
      className="flex-1 min-h-0 h-full flex flex-col bg-[var(--bg-chat)] overflow-hidden select-none"
      onClick={() => setOpenMenuFriendId(null)}
    >
      {/* 1. Discord Friends Top Navigation Bar */}
      <header className="h-[54px] border-b border-[var(--border-color)] px-4 flex items-center justify-between shrink-0 bg-[var(--bg-chat)] z-10">
        <div className="flex items-center gap-4 overflow-x-auto no-scrollbar">
          {/* Friends Header Icon + Title */}
          <div className="flex items-center gap-2 text-[var(--text-secondary)] font-bold text-sm shrink-0 pr-2 border-r border-[var(--border-color)]">
            <Users size={20} weight="bold" className="text-[var(--text-muted)]" />
            <span className="text-[var(--text-primary)]">Bạn bè</span>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center gap-1.5 shrink-0 text-[13px] font-semibold">
            <button
              type="button"
              onClick={() => {
                setActiveTab('online');
                setAddFeedback(null);
              }}
              className={`px-2.5 py-1 rounded-[4px] transition-colors cursor-pointer ${
                activeTab === 'online'
                  ? 'bg-[var(--bg-surface-active)] text-[var(--text-primary)] font-semibold'
                  : 'text-[var(--text-secondary)] hover:bg-[var(--bg-surface)] hover:text-[var(--text-primary)]'
              }`}
            >
              Trực tuyến
              {onlineFriends.length > 0 && (
                <span className="ml-1.5 text-xs text-[var(--text-muted)]">
                  {onlineFriends.length}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('all');
                setAddFeedback(null);
              }}
              className={`px-2.5 py-1 rounded-[4px] transition-colors cursor-pointer ${
                activeTab === 'all'
                  ? 'bg-[var(--bg-surface-active)] text-[var(--text-primary)] font-semibold'
                  : 'text-[var(--text-secondary)] hover:bg-[var(--bg-surface)] hover:text-[var(--text-primary)]'
              }`}
            >
              Tất cả
              {friends.length > 0 && (
                <span className="ml-1.5 text-xs text-[var(--text-muted)]">
                  {friends.length}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('pending');
                setAddFeedback(null);
              }}
              className={`px-2.5 py-1 rounded-[4px] transition-colors cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'pending'
                  ? 'bg-[var(--bg-surface-active)] text-[var(--text-primary)] font-semibold'
                  : 'text-[var(--text-secondary)] hover:bg-[var(--bg-surface)] hover:text-[var(--text-primary)]'
              }`}
            >
              <span>Chờ xử lý</span>
              {pendingIncoming.length > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-[#f23f43] text-white">
                  {pendingIncoming.length}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('blocked');
                setAddFeedback(null);
              }}
              className={`px-2.5 py-1 rounded-[4px] transition-colors cursor-pointer ${
                activeTab === 'blocked'
                  ? 'bg-[var(--bg-surface-active)] text-[var(--text-primary)] font-semibold'
                  : 'text-[var(--text-secondary)] hover:bg-[var(--bg-surface)] hover:text-[var(--text-primary)]'
              }`}
            >
              Đã chặn
              {blocked.length > 0 && (
                <span className="ml-1.5 text-xs text-[var(--text-muted)]">
                  {blocked.length}
                </span>
              )}
            </button>

            {/* Iconic Green Discord "Thêm bạn" tab */}
            <button
              type="button"
              onClick={() => {
                setActiveTab('add');
                setAddFeedback(null);
              }}
              className={`px-2.5 py-1 rounded-[4px] transition-all cursor-pointer font-bold ${
                activeTab === 'add'
                  ? 'bg-transparent text-[#23a55a]'
                  : 'bg-[#23a55a] text-white hover:bg-[#1f9350]'
              }`}
            >
              Thêm bạn
            </button>
          </div>
        </div>

      </header>


      {/* 2. Main Content Body */}
      <div className="flex-1 min-h-0 flex flex-row overflow-hidden">
        {/* Left Area: List or Add View */}
        <div className="flex-1 min-h-0 flex flex-col p-6 overflow-y-auto">
          {/* TAB: THÊM BẠN (Add Friend) */}
          {activeTab === 'add' ? (
            <div className="max-w-2xl w-full mx-auto flex flex-col gap-5 pt-2 animate-in fade-in duration-150">
              <div>
                <h2 className="text-base font-extrabold uppercase tracking-wide text-[var(--text-primary)] mb-1">
                  Thêm bạn bè
                </h2>
                <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                  Bạn có thể thêm bạn bè bằng tên người dùng NomNa (ví dụ: <code className="bg-[var(--bg-surface)] px-1 py-0.5 rounded text-[var(--accent-primary)] font-mono">alexrivers</code> hoặc <code className="bg-[var(--bg-surface)] px-1 py-0.5 rounded text-[var(--accent-primary)] font-mono">minhdev</code>).
                </p>
              </div>

              {/* Form Input Box */}
              <form onSubmit={handleSendFriendRequest} className="flex flex-col gap-3">
                <div className="relative flex items-center bg-[var(--bg-sidebar)] border border-[var(--border-color)] focus-within:border-[var(--accent-primary)] rounded-[8px] p-3 px-4 transition-all shadow-xs">
                  <input
                    type="text"
                    value={addFriendInput}
                    onChange={(e) => setAddFriendInput(e.target.value)}
                    placeholder="Bạn có thể thêm bạn bằng tên người dùng NomNa"
                    className="w-full bg-transparent text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] outline-none"
                    autoFocus
                  />
                  <button
                    type="submit"
                    disabled={!addFriendInput.trim() || isSubmittingAdd}
                    className="ml-2 px-4 py-1.5 rounded-[4px] text-xs font-bold text-white bg-[var(--accent-primary)] hover:bg-[var(--accent-hover)] disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer shrink-0 shadow-xs flex items-center gap-1.5"
                  >
                    {isSubmittingAdd && <CircleNotch size={14} className="animate-spin" />}
                    <span>Gửi yêu cầu</span>
                  </button>
                </div>

                {/* Feedback Message */}
                {addFeedback && (
                  <div
                    className={`text-xs font-semibold px-3 py-2 rounded-[6px] transition-all flex items-center gap-2 ${
                      addFeedback.type === 'success'
                        ? 'bg-[#23a55a]/15 text-[#23a55a] border border-[#23a55a]/30'
                        : 'bg-[#f23f43]/15 text-[#f23f43] border border-[#f23f43]/30'
                    }`}
                  >
                    {addFeedback.type === 'success' ? (
                      <Check size={16} weight="bold" />
                    ) : (
                      <X size={16} weight="bold" />
                    )}
                    <span>{addFeedback.message}</span>
                  </div>
                )}
              </form>

              {/* Decorative Empty state art */}
              <div className="py-14 flex flex-col items-center justify-center text-center gap-3 select-none opacity-80">
                <div className="w-16 h-16 rounded-2xl bg-[var(--bg-surface)] flex items-center justify-center text-[var(--accent-primary)] shadow-sm">
                  <Sparkle size={32} weight="duotone" />
                </div>
                <p className="text-xs text-[var(--text-muted)] max-w-sm">
                  Wumpus đang chờ bạn bè mới. Hãy nhập tên tài khoản của đồng đội để bắt đầu kết nối!
                </p>
              </div>
            </div>
          ) : activeTab === 'pending' ? (
            /* TAB: CHỜ XỬ LÝ (Pending Friend Requests) */
            <div className="flex flex-col gap-6 max-w-4xl w-full mx-auto">
              {/* 1. Lời mời đã nhận (Incoming) */}
              <div>
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-[var(--text-muted)] mb-3">
                  Lời mời đã nhận — {pendingIncoming.length}
                </h3>
                {pendingIncoming.length === 0 ? (
                  <p className="text-xs text-[var(--text-muted)] italic">
                    Không có lời mời kết bạn nào đang chờ xử lý.
                  </p>
                ) : (
                  <div className="divide-y divide-[var(--border-color)]/50">
                    {pendingIncoming.map((req) => (
                      <div
                        key={req.friendshipId}
                        className="group flex items-center justify-between py-2.5 px-3 rounded-[6px] hover:bg-[var(--bg-surface)] transition-all"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <Avatar
                            src={req.avatarUrl}
                            fallback={req.displayName}
                            size="md"
                            status="online"
                          />
                          <div className="min-w-0 leading-tight">
                            <div className="text-sm font-bold text-[var(--text-primary)] truncate">
                              {req.displayName}
                              <span className="text-xs text-[var(--text-muted)] font-normal ml-1.5">
                                @{req.username}
                              </span>
                            </div>
                            <div className="text-[11px] text-[var(--text-muted)] mt-0.5">
                              Lời mời kết bạn đã nhận
                            </div>
                          </div>
                        </div>

                        {/* Accept / Decline Action buttons */}
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleAccept(req.friendshipId, req.displayName)}
                            title="Chấp nhận"
                            className="w-9 h-9 rounded-full bg-[var(--bg-surface-active)] hover:bg-[#23a55a] text-[var(--text-secondary)] hover:text-white flex items-center justify-center transition-all cursor-pointer shadow-xs"
                          >
                            <Check size={18} weight="bold" />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDecline(req.friendshipId)}
                            title="Từ chối"
                            className="w-9 h-9 rounded-full bg-[var(--bg-surface-active)] hover:bg-[#f23f43] text-[var(--text-secondary)] hover:text-white flex items-center justify-center transition-all cursor-pointer shadow-xs"
                          >
                            <X size={18} weight="bold" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* 2. Lời mời đã gửi (Outgoing) */}
              <div>
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-[var(--text-muted)] mb-3">
                  Lời mời đã gửi — {pendingOutgoing.length}
                </h3>
                {pendingOutgoing.length === 0 ? (
                  <p className="text-xs text-[var(--text-muted)] italic">
                    Bạn chưa gửi lời mời kết bạn nào.
                  </p>
                ) : (
                  <div className="divide-y divide-[var(--border-color)]/50">
                    {pendingOutgoing.map((req) => (
                      <div
                        key={req.friendshipId}
                        className="group flex items-center justify-between py-2.5 px-3 rounded-[6px] hover:bg-[var(--bg-surface)] transition-all"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <Avatar
                            src={req.avatarUrl}
                            fallback={req.displayName}
                            size="md"
                            status="offline"
                          />
                          <div className="min-w-0 leading-tight">
                            <div className="text-sm font-bold text-[var(--text-primary)] truncate">
                              {req.displayName}
                              <span className="text-xs text-[var(--text-muted)] font-normal ml-1.5">
                                @{req.username}
                              </span>
                            </div>
                            <div className="text-[11px] text-[var(--text-muted)] mt-0.5">
                              Lời mời kết bạn đã gửi
                            </div>
                          </div>
                        </div>

                        {/* Cancel request button */}
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleDecline(req.friendshipId)}
                            title="Hủy lời mời"
                            className="w-9 h-9 rounded-full bg-[var(--bg-surface-active)] hover:bg-[#f23f43] text-[var(--text-secondary)] hover:text-white flex items-center justify-center transition-all cursor-pointer shadow-xs"
                          >
                            <X size={18} weight="bold" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : activeTab === 'blocked' ? (
            /* TAB: ĐÃ CHẶN (Blocked Users) */
            <div className="max-w-4xl w-full mx-auto flex flex-col gap-4">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-[var(--text-muted)] mb-1">
                Người dùng đã chặn — {blocked.length}
              </h3>
              {blocked.length === 0 ? (
                <div className="py-16 text-center text-xs text-[var(--text-muted)] flex flex-col items-center gap-3">
                  <div className="w-14 h-14 rounded-2xl bg-[var(--bg-surface)] flex items-center justify-center text-[var(--text-muted)]">
                    <Prohibit size={28} weight="duotone" />
                  </div>
                  <p>Bạn chưa chặn người dùng nào.</p>
                </div>
              ) : (
                <div className="divide-y divide-[var(--border-color)]/50">
                  {blocked.map((b) => (
                    <div
                      key={b.userId}
                      className="group flex items-center justify-between py-2.5 px-3 rounded-[6px] hover:bg-[var(--bg-surface)] transition-all"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <Avatar
                          src={b.avatarUrl}
                          fallback={b.displayName}
                          size="md"
                          status="offline"
                        />
                        <div className="min-w-0 leading-tight">
                          <div className="text-sm font-bold text-[var(--text-primary)] truncate">
                            {b.displayName}
                            <span className="text-xs text-[var(--text-muted)] font-normal ml-1.5">
                              @{b.username}
                            </span>
                          </div>
                          <div className="text-[11px] text-[#f23f43] mt-0.5">
                            Đã chặn
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => unblockUser(b.userId)}
                        className="px-3 py-1.5 rounded-[4px] text-xs font-bold text-[var(--text-secondary)] hover:text-white bg-[var(--bg-surface-active)] hover:bg-[var(--accent-primary)] transition-all cursor-pointer"
                      >
                        Bỏ chặn
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            /* TAB: TRỰC TUYẾN & TẤT CẢ (Online & All Friends) */
            <div className="flex flex-col gap-4 max-w-4xl w-full mx-auto">
              {/* Search Bar */}
              <div className="relative flex items-center">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Tìm kiếm bạn bè..."
                  className="w-full bg-[var(--bg-sidebar)] border border-[var(--border-color)] text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] rounded-[4px] py-2 pl-9 pr-4 outline-none focus:border-[var(--accent-primary)] transition-colors"
                />
                <MagnifyingGlass
                  size={15}
                  weight="bold"
                  className="absolute left-3 text-[var(--text-muted)] pointer-events-none"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 text-[var(--text-muted)] hover:text-[var(--text-primary)] text-xs cursor-pointer"
                  >
                    <X size={13} weight="bold" />
                  </button>
                )}
              </div>

              {/* Title & Counter */}
              <div className="text-xs font-extrabold uppercase tracking-wider text-[var(--text-muted)] pt-2">
                {activeTab === 'online' ? 'Trực tuyến' : 'Tất cả bạn bè'} — {filteredFriends.length}
              </div>

              {/* Friends List */}
              {isLoading && filteredFriends.length === 0 ? (
                <div className="py-16 text-center text-xs text-[var(--text-muted)] flex items-center justify-center gap-2">
                  <CircleNotch size={18} className="animate-spin text-[var(--accent-primary)]" />
                  <span>Đang tải danh sách bạn bè...</span>
                </div>
              ) : filteredFriends.length === 0 ? (
                <div className="py-16 text-center text-xs text-[var(--text-muted)] flex flex-col items-center gap-3">
                  <div className="w-14 h-14 rounded-2xl bg-[var(--bg-surface)] flex items-center justify-center text-[var(--text-muted)]">
                    <Users size={28} weight="duotone" />
                  </div>
                  <p>
                    {searchQuery
                      ? `Không tìm thấy bạn bè nào khớp với "${searchQuery}"`
                      : activeTab === 'online'
                      ? 'Hiện tại không có bạn bè nào đang trực tuyến.'
                      : 'Chưa có bạn bè nào trong danh sách. Bấm "Thêm bạn" để kết nối!'}
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-[var(--border-color)]/50">
                  {filteredFriends.map((friend) => {
                    const dmUser = toDmUser(friend);
                    const isOnline =
                      dmUser.status === 'online' ||
                      dmUser.status === 'dnd' ||
                      dmUser.status === 'away';

                    return (
                      <div
                        key={friend.friendshipId}
                        className="group relative flex items-center justify-between py-2.5 px-3 rounded-[6px] hover:bg-[var(--bg-surface)] transition-all cursor-pointer select-none"
                        onClick={() => onOpenUserProfile?.(dmUser)}
                      >
                        {/* Avatar & Names */}
                        <div className="flex items-center gap-3 min-w-0">
                          <Avatar
                            src={friend.avatarUrl}
                            fallback={friend.displayName}
                            size="md"
                            status={dmUser.status}
                          />

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

                        {/* Action Buttons */}
                        <div
                          className="flex items-center gap-2 shrink-0"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            type="button"
                            onClick={() => onStartDm(dmUser)}
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

                          <div className="relative">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setOpenMenuFriendId(
                                  openMenuFriendId === friend.friendshipId ? null : friend.friendshipId
                                );
                              }}
                              title="Tùy chọn khác"
                              className="w-9 h-9 rounded-full bg-[var(--bg-surface-active)] hover:bg-[var(--bg-sidebar)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] flex items-center justify-center transition-all cursor-pointer shadow-xs"
                            >
                              <DotsThreeVertical size={18} weight="bold" />
                            </button>

                            {/* Dropdown Menu */}
                            {openMenuFriendId === friend.friendshipId && (
                              <div
                                onClick={(e) => e.stopPropagation()}
                                className="absolute right-0 top-full mt-1.5 w-48 bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-[6px] shadow-xl p-1.5 z-50 flex flex-col gap-0.5 animate-in fade-in duration-100"
                              >
                                <button
                                  type="button"
                                  onClick={() => handleRemoveFriend(friend.friendshipId, friend.displayName)}
                                  className="w-full text-left px-2.5 py-1.5 text-xs rounded text-[#f23f43] hover:bg-[#f23f43]/15 font-medium flex items-center gap-2 cursor-pointer transition-colors"
                                >
                                  <UserCircleMinus size={15} />
                                  <span>Hủy kết bạn</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleBlockUser(friend.userId, friend.displayName)}
                                  className="w-full text-left px-2.5 py-1.5 text-xs rounded text-[#f23f43] hover:bg-[#f23f43]/15 font-medium flex items-center gap-2 cursor-pointer transition-colors"
                                >
                                  <Prohibit size={15} />
                                  <span>Chặn người dùng</span>
                                </button>
                              </div>
                            )}
                          </div>
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
        <aside className="w-[280px] shrink-0 border-l border-[var(--border-color)] p-4 hidden xl:flex flex-col gap-3.5 bg-[var(--bg-sidebar)]/30 select-none">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-black uppercase tracking-wider text-[var(--text-primary)]">
              Đang hoạt động
            </h3>
            {onlineFriends.length > 0 && (
              <span className="flex items-center gap-1.5 text-[10px] font-bold text-[#23a55a]">
                <span className="w-2 h-2 rounded-full bg-[#23a55a] animate-pulse" />
                {onlineFriends.length} trực tuyến
              </span>
            )}
          </div>

          {onlineFriends.length > 0 ? (
            <div className="space-y-1.5 overflow-y-auto pr-0.5 no-scrollbar max-h-[calc(100vh-140px)]">
              {onlineFriends.map((f) => {
                const dmUser = toDmUser(f);
                return (
                  <div
                    key={f.friendshipId}
                    onClick={() => onOpenUserProfile?.(dmUser)}
                    className="p-2 rounded-[6px] bg-[var(--bg-surface)] hover:bg-[var(--bg-surface-active)] border border-[var(--border-color)]/60 hover:border-[var(--accent-primary)]/40 transition-all cursor-pointer group flex items-center justify-between gap-2 shadow-2xs"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Avatar
                        src={f.avatarUrl}
                        fallback={f.displayName}
                        size="sm"
                        status="online"
                      />
                      <div className="min-w-0 flex-1 leading-tight">
                        <div className="text-xs font-semibold text-[var(--text-primary)] truncate group-hover:text-[var(--accent-primary)] transition-colors">
                          {f.displayName}
                        </div>
                        <div className="text-[10px] text-[var(--text-muted)] truncate mt-0.5 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#23a55a] shrink-0" />
                          <span>Đang trực tuyến</span>
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onStartDm(dmUser);
                      }}
                      title="Nhắn tin"
                      className="opacity-0 group-hover:opacity-100 p-1.5 rounded-[4px] hover:bg-[var(--bg-sidebar)] text-[var(--text-muted)] hover:text-white transition-all cursor-pointer"
                    >
                      <ChatDots size={15} weight="bold" />
                    </button>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-4 rounded-[8px] bg-[var(--bg-surface)]/60 border border-[var(--border-color)]/50 text-center flex flex-col items-center gap-2 my-auto">
              <div className="w-8 h-8 rounded-full bg-[var(--bg-surface-active)] flex items-center justify-center text-[var(--text-muted)]">
                <Sparkle size={16} weight="fill" className="text-[var(--accent-primary)]" />
              </div>
              <div className="text-xs font-bold text-[var(--text-primary)]">
                Hiện tại yên ắng...
              </div>
              <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">
                Khi bạn bè trực tuyến hoặc tham gia trò chuyện, hoạt động sẽ xuất hiện ngay tại đây!
              </p>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
};
