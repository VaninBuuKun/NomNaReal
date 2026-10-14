import React, { useState, useEffect } from 'react';
import {
  Bell,
  Checks,
  At,
  ChatCircleDots,
  Users,
  CircleNotch,
  ChatTeardropText,
  EnvelopeOpen,
} from '@phosphor-icons/react';
import type { AppNotification } from '../../types';
import { notificationApi } from '../../services';
import { getMediaUrl } from '../../utils/constants';

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
          activeTab === 'mention' && n.type !== 'Mention' && n.type !== 1
            ? n
            : { ...n, isRead: true }
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
      if (diffMins < 60) return `${diffMins} phút trước`;
      if (diffHours < 24) return `${diffHours} giờ trước`;
      if (diffDays === 1) return 'Hôm qua';
      if (diffDays < 7) return `${diffDays} ngày trước`;
      return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
    } catch {
      return '';
    }
  };

  const getTypeBadge = (type: any) => {
    if (type === 'Mention' || type === 1) {
      return (
        <span className="w-4 h-4 rounded-full bg-warning text-on-accent flex items-center justify-center ring-2 ring-surface">
          <At size={10} weight="bold" />
        </span>
      );
    }
    if (type === 'ThreadReply' || type === 2) {
      return (
        <span className="w-4 h-4 rounded-full bg-accent-primary text-on-accent flex items-center justify-center ring-2 ring-surface">
          <ChatCircleDots size={10} weight="bold" />
        </span>
      );
    }
    if (type === 'DirectMessage' || type === 7) {
      return (
        <span className="w-4 h-4 rounded-full bg-accent-primary text-on-accent flex items-center justify-center ring-2 ring-surface">
          <ChatTeardropText size={10} weight="bold" />
        </span>
      );
    }
    return (
      <span className="w-4 h-4 rounded-full bg-success text-on-accent flex items-center justify-center ring-2 ring-surface">
        <Users size={10} weight="bold" />
      </span>
    );
  };

  const renderNotificationHeader = (notif: AppNotification) => {
    const actorName = notif.actorDisplayName || notif.actorUsername || 'Thành viên';
    const channelName = notif.channelName;
    const isMention = notif.type === 'Mention' || notif.type === 1;
    const isThread = notif.type === 'ThreadReply' || notif.type === 2;
    const isDm = notif.type === 'DirectMessage' || notif.type === 7;

    if (isMention) {
      return (
        <p className="text-xs leading-snug text-text-secondary truncate">
          <span className="font-semibold text-text-primary">{actorName}</span>{' '}
          <span>đã nhắc đến bạn trong</span>{' '}
          <span className="font-medium text-accent-primary">#{channelName || 'kênh'}</span>
        </p>
      );
    }

    if (isThread) {
      return (
        <p className="text-xs leading-snug text-text-secondary truncate">
          <span className="font-semibold text-text-primary">{actorName}</span>{' '}
          <span>đã trả lời chủ đề trong</span>{' '}
          <span className="font-medium text-accent-primary">#{channelName || 'kênh'}</span>
        </p>
      );
    }

    if (isDm) {
      return (
        <p className="text-xs leading-snug text-text-secondary truncate">
          <span className="font-semibold text-text-primary">{actorName}</span>{' '}
          <span>đã gửi tin nhắn riêng cho bạn</span>
        </p>
      );
    }

    return (
      <p className="text-xs leading-snug font-semibold text-text-primary truncate">
        {notif.title || actorName}
      </p>
    );
  };

  return (
    <>
      <div className="fixed inset-0 z-40 bg-transparent" onClick={onClose} />
      <div
        onClick={(e) => e.stopPropagation()}
        className={`absolute ${
          align === 'bottom-left'
            ? 'bottom-full left-3 mb-2'
            : 'top-full right-0 mt-2'
        } w-[380px] max-w-[calc(100vw-24px)] bg-surface border border-border shadow-floating rounded-card overflow-hidden z-50 flex flex-col select-none animate-in fade-in duration-150`}
        style={{ maxHeight: '480px' }}
      >
        {/* 1. Header */}
        <div className="px-4 py-3 border-b border-border flex items-center justify-between shrink-0 bg-surface">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-control bg-accent-soft text-accent-primary flex items-center justify-center">
              <Bell size={16} weight="fill" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-[13px] text-text-primary">Thông báo</h3>
                {unreadCount > 0 && (
                  <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1.5 rounded-full text-[10px] font-bold bg-danger text-on-accent leading-none">
                    {unreadCount}
                  </span>
                )}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={handleMarkAllRead}
            disabled={isMarkingAll || unreadCount === 0}
            className="inline-flex items-center gap-1.5 px-2 py-1 rounded-control text-xs font-medium text-text-muted hover:text-text-primary hover:bg-surface-active disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-text-muted transition-colors cursor-pointer"
            title="Đánh dấu tất cả là đã đọc"
          >
            {isMarkingAll ? (
              <CircleNotch size={13} className="animate-spin text-accent-primary" />
            ) : (
              <Checks size={14} weight="bold" />
            )}
            <span>Đã đọc tất cả</span>
          </button>
        </div>

        {/* 2. Tabs Segmented Control */}
        <div className="px-3 pt-2.5 pb-2 bg-rail/40 border-b border-border shrink-0">
          <div className="flex items-center p-0.5 bg-chat rounded-control border border-border/60 text-xs">
            <button
              type="button"
              onClick={() => setActiveTab('all')}
              className={`flex-1 py-1 rounded-control font-medium transition-all text-center cursor-pointer ${
                activeTab === 'all'
                  ? 'bg-surface text-text-primary font-semibold shadow-raised'
                  : 'text-text-muted hover:text-text-primary'
              }`}
            >
              Tất cả
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('unread')}
              className={`flex-1 py-1 rounded-control font-medium transition-all text-center cursor-pointer ${
                activeTab === 'unread'
                  ? 'bg-surface text-text-primary font-semibold shadow-raised'
                  : 'text-text-muted hover:text-text-primary'
              }`}
            >
              Chưa đọc
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('mention')}
              className={`flex-1 py-1 rounded-control font-medium transition-all text-center cursor-pointer flex items-center justify-center gap-1 ${
                activeTab === 'mention'
                  ? 'bg-surface text-text-primary font-semibold shadow-raised'
                  : 'text-text-muted hover:text-text-primary'
              }`}
            >
              <At size={12} weight="bold" className="text-warning" />
              <span>Nhắc đến</span>
            </button>
          </div>
        </div>

        {/* 3. Notification Items List */}
        <div className="flex-1 overflow-y-auto min-h-0 divide-y divide-border/60 no-scrollbar">
          {isLoading ? (
            <div className="py-12 flex flex-col items-center justify-center gap-2 text-xs text-text-muted">
              <CircleNotch size={20} className="animate-spin text-accent-primary" />
              <span>Đang tải thông báo...</span>
            </div>
          ) : notifications.length === 0 ? (
            <div className="py-12 px-6 flex flex-col items-center justify-center text-center gap-2">
              <div className="w-12 h-12 rounded-control bg-surface-active flex items-center justify-center text-text-muted mb-1">
                {activeTab === 'unread' ? (
                  <EnvelopeOpen size={24} weight="duotone" />
                ) : activeTab === 'mention' ? (
                  <At size={24} weight="bold" className="text-warning" />
                ) : (
                  <Bell size={24} weight="duotone" />
                )}
              </div>
              <p className="text-sm font-semibold text-text-primary">
                {activeTab === 'unread'
                  ? 'Đã đọc hết mọi thông báo'
                  : activeTab === 'mention'
                  ? 'Chưa có lượt nhắc nào'
                  : 'Không có thông báo'}
              </p>
              <p className="text-xs text-text-muted max-w-[240px] leading-relaxed">
                {activeTab === 'unread'
                  ? 'Hộp thư đến của bạn hoàn toàn trống. Bạn đã cập nhật mọi tin tức mới nhất!'
                  : activeTab === 'mention'
                  ? 'Khi có ai đó nhắc đến bạn bằng @tên trong các kênh, thông báo sẽ hiển thị ở đây.'
                  : 'Các hoạt động, phản hồi chủ đề và tin nhắn mới sẽ xuất hiện tại đây.'}
              </p>
            </div>
          ) : (
            notifications.map((notif) => (
              <div
                key={notif.id}
                onClick={() => handleItemClick(notif)}
                className={`px-3.5 py-3 flex items-start gap-3 transition-colors cursor-pointer group text-xs relative ${
                  !notif.isRead
                    ? 'bg-accent-soft/25 hover:bg-accent-soft/40'
                    : 'hover:bg-surface-active'
                }`}
              >
                {/* Visual Unread Left Accent Bar */}
                {!notif.isRead && (
                  <span className="absolute left-0 top-2 bottom-2 w-1 bg-accent-primary rounded-r" />
                )}

                {/* Actor Avatar with Type Badge */}
                <div className="relative shrink-0 mt-0.5">
                  <img
                    src={getMediaUrl(notif.actorAvatarUrl)}
                    alt=""
                    className="w-8 h-8 rounded-full object-cover border border-border"
                    onError={(e) => {
                      e.currentTarget.src = '/default-avatar.png';
                    }}
                  />
                  <div className="absolute -bottom-1 -right-1">{getTypeBadge(notif.type)}</div>
                </div>

                {/* Notification Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <div className="flex-1 min-w-0 pr-1">
                      {renderNotificationHeader(notif)}
                    </div>
                    <span className="text-[10px] text-text-muted shrink-0 font-medium">
                      {formatTimeAgo(notif.createdAt)}
                    </span>
                  </div>

                  {notif.content && (
                    <p className="text-xs text-text-muted line-clamp-2 leading-relaxed group-hover:text-text-secondary transition-colors">
                      {notif.content}
                    </p>
                  )}
                </div>

                {/* Glowing Unread Indicator Dot */}
                {!notif.isRead && (
                  <div className="shrink-0 mt-2 w-2 h-2 rounded-full bg-accent-primary ring-2 ring-accent-primary/20" />
                )}
              </div>
            ))
          )}
        </div>

        {/* 4. Footer Note */}
        <div className="px-3 py-2 border-t border-border bg-rail/30 flex items-center justify-center shrink-0">
          <span className="text-[11px] text-text-muted">
            Nhấn vào thông báo để chuyển nhanh tới cuộc trò chuyện
          </span>
        </div>
      </div>
    </>
  );
};
