import React, { useState, useEffect } from 'react';
import {
  Bell,
  Checks,
  At,
  ChatTeardropDots,
  Users,
  CircleNotch,
} from '@phosphor-icons/react';
import type { AppNotification } from '../../types';
import { notificationApi } from '../../services';

interface NotificationPopoverProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectNotification: (notification: AppNotification) => void;
  unreadCount: number;
  onUnreadCountChange?: (newCount: number) => void;
  align?: 'top-right' | 'bottom-left';
}

type TabType = 'all' | 'unread' | 'mention';

export const NotificationPopover: React.FC<NotificationPopoverProps> = ({
  isOpen,
  onClose,
  onSelectNotification,
  unreadCount,
  onUnreadCountChange,
  align = 'top-right',
}) => {
  // Tab order as requested: 1. Tất cả (All), 2. Chưa đọc (Unread), 3. Nhắc đến (Mention)
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isMarkingAll, setIsMarkingAll] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    const fetchNotifications = async () => {
      try {
        setIsLoading(true);
        const data = await notificationApi.getNotifications(activeTab, 1, 30);
        if (isMounted) {
          setNotifications(data || []);
        }
      } catch (err) {
        console.error('Failed to fetch notifications:', err);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchNotifications();

    return () => {
      isMounted = false;
    };
  }, [isOpen, activeTab]);

  if (!isOpen) return null;

  const handleMarkAllRead = async () => {
    try {
      setIsMarkingAll(true);
      const filter = activeTab === 'mention' ? 'mention' : undefined;
      await notificationApi.markAllAsRead(filter);
      setNotifications((prev) =>
        prev.map((n) =>
          activeTab === 'mention' && n.type !== 'Mention' ? n : { ...n, isRead: true }
        )
      );
      const unreadData = await notificationApi.getUnreadCount();
      onUnreadCountChange?.(unreadData.totalUnread);
    } catch (err) {
      console.error('Failed to mark all as read:', err);
    } finally {
      setIsMarkingAll(false);
    }
  };

  const handleItemClick = async (notif: AppNotification) => {
    if (!notif.isRead) {
      try {
        await notificationApi.markAsRead(notif.id);
        setNotifications((prev) =>
          prev.map((n) => (n.id === notif.id ? { ...n, isRead: true } : n))
        );
        onUnreadCountChange?.(Math.max(0, unreadCount - 1));
      } catch (err) {
        console.error('Failed to mark notification as read:', err);
      }
    }
    onSelectNotification(notif);
    onClose();
  };

  const formatTimeAgo = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffSecs = Math.floor(diffMs / 1000);
      const diffMins = Math.floor(diffSecs / 60);
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);

      if (diffSecs < 60) return 'Vừa xong';
      if (diffMins < 60) return `${diffMins}p`;
      if (diffHours < 24) return `${diffHours}h`;
      if (diffDays === 1) return 'Hôm qua';
      if (diffDays < 7) return `${diffDays}d`;
      return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
    } catch {
      return '';
    }
  };

  const getTypeIcon = (type: any) => {
    if (type === 'Mention' || type === 1) {
      return (
        <span className="w-3.5 h-3.5 rounded-full bg-amber-500 text-black flex items-center justify-center text-[8px] font-black shadow-xs ring-1 ring-[var(--bg-surface)]">
          <At size={9} weight="bold" />
        </span>
      );
    }
    if (type === 'ThreadReply' || type === 2) {
      return (
        <span className="w-3.5 h-3.5 rounded-full bg-[var(--accent-primary)] text-white flex items-center justify-center text-[8px] font-black shadow-xs ring-1 ring-[var(--bg-surface)]">
          <ChatTeardropDots size={9} weight="bold" />
        </span>
      );
    }
    return (
      <span className="w-3.5 h-3.5 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[8px] font-black shadow-xs ring-1 ring-[var(--bg-surface)]">
        <Users size={9} weight="bold" />
      </span>
    );
  };

  const renderNotificationHeader = (notif: AppNotification) => {
    const actorName = notif.actorDisplayName || notif.actorUsername || 'Thành viên';
    const channelName = notif.channelName;
    const isMention = notif.type === 'Mention' || notif.type === 1;
    const isThread = notif.type === 'ThreadReply' || notif.type === 2;

    if (isMention) {
      return (
        <p className="text-[11.5px] leading-tight text-[var(--text-secondary)] truncate">
          <span className="font-semibold text-[var(--text-primary)]">{actorName}</span>{' '}
          <span className="opacity-80">nhắc bạn trong</span>{' '}
          <span className="font-medium text-[var(--accent-primary)]">#{channelName || 'kênh'}</span>
        </p>
      );
    }

    if (isThread) {
      return (
        <p className="text-[11.5px] leading-tight text-[var(--text-secondary)] truncate">
          <span className="font-semibold text-[var(--text-primary)]">{actorName}</span>{' '}
          <span className="opacity-80">trả lời trong</span>{' '}
          <span className="font-medium text-[var(--accent-primary)]">#{channelName || 'kênh'}</span>
        </p>
      );
    }

    return (
      <p className="text-[11.5px] leading-tight text-[var(--text-secondary)] truncate">
        {notif.title}
      </p>
    );
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-40 bg-transparent" onClick={onClose} />
      <div
        onClick={(e) => e.stopPropagation()}
        className={`absolute ${
          align === "bottom-left"
            ? "bottom-full left-3 mb-2 slide-in-from-bottom-2"
            : "top-full right-0 mt-2 slide-in-from-top-2"
        } w-[360px] max-w-[calc(100vw-24px)] bg-[var(--bg-surface)] border border-[var(--border-color)] shadow-2xl rounded-xl overflow-hidden z-50 animate-in fade-in duration-150 select-none flex flex-col`}
        style={{ maxHeight: "440px" }}
      >
      {/* 1. Header (Gọn gàng, tối giản) */}
      <div className="px-3.5 py-2.5 border-b border-[var(--border-color)]/70 flex items-center justify-between shrink-0 bg-[var(--bg-surface)]">
        <div className="flex items-center gap-1.5">
          <Bell size={15} weight="fill" className="text-[var(--accent-primary)]" />
          <h3 className="font-semibold text-xs text-[var(--text-primary)]">Thông báo</h3>
          {unreadCount > 0 && (
            <span className="px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-rose-500 text-white leading-tight">
              {unreadCount}
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={handleMarkAllRead}
          disabled={isMarkingAll || unreadCount === 0}
          className="inline-flex items-center gap-1 text-[11px] text-[var(--text-muted)] hover:text-[var(--accent-primary)] disabled:opacity-30 disabled:hover:text-[var(--text-muted)] transition-colors cursor-pointer"
          title="Đánh dấu tất cả là đã đọc"
        >
          {isMarkingAll ? (
            <CircleNotch size={11} className="animate-spin" />
          ) : (
            <Checks size={12} weight="bold" />
          )}
          <span>Đã đọc</span>
        </button>
      </div>

      {/* 2. Tabs Segmented Control: 1. Tất cả -> 2. Chưa đọc -> 3. Nhắc đến */}
      <div className="px-2.5 pt-2 pb-1.5 bg-[var(--bg-rail)]/60 border-b border-[var(--border-color)]/50 shrink-0">
        <div className="flex items-center p-0.5 bg-[var(--bg-chat)]/70 rounded-lg border border-[var(--border-color)]/40 text-[11px]">
          <button
            type="button"
            onClick={() => setActiveTab('all')}
            className={`flex-1 py-1 rounded-md font-medium transition-all text-center cursor-pointer ${
              activeTab === 'all'
                ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-xs font-semibold'
                : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
            }`}
          >
            Tất cả
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('unread')}
            className={`flex-1 py-1 rounded-md font-medium transition-all text-center cursor-pointer ${
              activeTab === 'unread'
                ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-xs font-semibold'
                : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
            }`}
          >
            Chưa đọc
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('mention')}
            className={`flex-1 py-1 rounded-md font-medium transition-all text-center cursor-pointer flex items-center justify-center gap-1 ${
              activeTab === 'mention'
                ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-xs font-semibold'
                : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
            }`}
          >
            <At size={11} weight="bold" className="text-amber-500" />
            <span>Nhắc đến</span>
          </button>
        </div>
      </div>

      {/* 3. List of Notifications */}
      <div className="flex-1 overflow-y-auto min-h-0 divide-y divide-[var(--border-color)]/40">
        {isLoading ? (
          <div className="py-10 flex flex-col items-center justify-center gap-2 text-xs text-[var(--text-muted)]">
            <CircleNotch size={16} className="animate-spin text-[var(--accent-primary)]" />
            <span className="text-[11px]">Đang tải...</span>
          </div>
        ) : notifications.length === 0 ? (
          <div className="py-8 px-4 flex flex-col items-center justify-center text-center gap-1 text-[var(--text-muted)]">
            <Bell size={22} className="opacity-25 mb-1" />
            <p className="text-xs font-medium text-[var(--text-secondary)]">Không có thông báo nào</p>
            <p className="text-[11px] opacity-70">
              {activeTab === 'unread'
                ? 'Bạn đã đọc hết mọi thông báo'
                : activeTab === 'mention'
                ? 'Chưa có ai nhắc đến bạn'
                : 'Hoạt động mới sẽ xuất hiện ở đây'}
            </p>
          </div>
        ) : (
          notifications.map((notif) => {
            return (
              <div
                key={notif.id}
                onClick={() => handleItemClick(notif)}
                className={`px-3 py-2 flex items-start gap-2.5 transition-colors cursor-pointer group text-xs ${
                  !notif.isRead
                    ? 'bg-[var(--accent-soft)]/20 hover:bg-[var(--accent-soft)]/35'
                    : 'hover:bg-[var(--bg-surface-active)]'
                }`}
              >
                {/* Mini Actor Avatar with small badge */}
                <div className="relative shrink-0 mt-0.5">
                  <img
                    src={notif.actorAvatarUrl || '/default-avatar.png'}
                    alt=""
                    className="w-6 h-6 rounded-full object-cover border border-[var(--border-color)]"
                    onError={(e) => {
                      e.currentTarget.src = '/default-avatar.png';
                    }}
                  />
                  <div className="absolute -bottom-1 -right-1">{getTypeIcon(notif.type)}</div>
                </div>

                {/* Content Area */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1 mb-0.5">
                    <div className="flex-1 min-w-0 pr-1">
                      {renderNotificationHeader(notif)}
                    </div>
                    <span className="text-[10px] text-[var(--text-muted)] shrink-0 opacity-80">
                      {formatTimeAgo(notif.createdAt)}
                    </span>
                  </div>

                  {notif.content && (
                    <p className="text-[11px] text-[var(--text-muted)] line-clamp-1 truncate opacity-90">
                      {notif.content}
                    </p>
                  )}
                </div>

                {/* Unread Indicator Dot */}
                {!notif.isRead && (
                  <div className="shrink-0 mt-2 w-1.5 h-1.5 rounded-full bg-[var(--accent-primary)] shadow-xs" />
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
    </>
  );
};
