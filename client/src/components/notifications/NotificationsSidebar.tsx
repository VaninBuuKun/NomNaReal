import React, { useState } from 'react';
import {
  Bell,
  Check,
  At,
  ChatTeardropDots,
  BookOpen,
  CalendarCheck,
} from '@phosphor-icons/react';
import type { AppNotification } from '../../types';

export interface NotificationsSidebarProps {
  notifications: AppNotification[];
  activeNotificationId?: string | null;
  onSelectNotification: (notification: AppNotification) => void;
  onMarkAllRead?: () => void;
}

type TabType = 'all' | 'mention';

export const MOCK_NOTIFICATIONS: AppNotification[] = [
  {
    id: 'notif-mock-1',
    userId: 'user-current',
    actorId: 'user-teacher',
    actorDisplayName: 'TS. Nguyễn Văn A',
    actorUsername: 'nguyenvana',
    actorAvatarUrl: '/default-avatar.png',
    channelId: 'channel-backend',
    channelName: 'backend-dev',
    type: 'Assignment',
    title: 'Hạn nộp: RESTful API với .NET 9 Clean Architecture',
    content:
      'Bài tập Assignment 1 trong kênh #backend-dev sắp đến hạn nộp lúc 23:59 hôm nay. Các bạn nhớ nộp file ZIP mã nguồn kèm tài liệu hướng dẫn.',
    isRead: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 35).toISOString(),
    metadata: {
      dueDate: '23:59 Hôm nay (còn 4 giờ nữa)',
      points: 100,
      assignmentId: 'assign-1',
      priority: 'urgent',
    },
  },
  {
    id: 'notif-mock-2',
    userId: 'user-current',
    actorId: 'user-linh',
    actorDisplayName: 'Lead Designer Linh',
    actorUsername: 'linh.designer',
    actorAvatarUrl: '/default-avatar.png',
    channelId: 'channel-frontend',
    channelName: 'frontend-design',
    type: 'TaskSchedule',
    title: 'Công việc mới: Thiết kế Slide thuyết trình đồ án',
    content:
      'Bạn đã được gán task "Thiết kế Slide thuyết trình đồ án" trong nhóm làm việc. Yêu cầu bám sát Figma design tokens và hỗ trợ Dark/Light mode.',
    isRead: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
    metadata: {
      dueDate: 'Trước 20:00 ngày mai',
      taskStatus: 'in_progress',
      priority: 'urgent',
      taskId: 'task-slide-1',
    },
  },
  {
    id: 'notif-mock-3',
    userId: 'user-current',
    actorId: 'user-hoang',
    actorDisplayName: 'DevOps Hoang',
    actorUsername: 'hoang.devops',
    actorAvatarUrl: '/default-avatar.png',
    channelId: 'channel-general',
    channelName: 'general',
    messageId: 'msg-mock-docker',
    type: 'Mention',
    title: 'DevOps Hoang đã nhắc bạn trong #general',
    content:
      '@vanmuzic Bạn kiểm tra giúp tôi cấu hình Docker Compose production và Nginx SSL vừa deploy trên VPS nhé, đã map port 80/443 hoàn tất.',
    isRead: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 240).toISOString(),
  },
  {
    id: 'notif-mock-4',
    userId: 'user-current',
    actorId: 'user-linh',
    actorDisplayName: 'Lead Designer Linh',
    actorUsername: 'linh.designer',
    actorAvatarUrl: '/default-avatar.png',
    channelId: 'channel-frontend',
    channelName: 'frontend-design',
    messageId: 'msg-mock-thread',
    type: 'ThreadReply',
    title: 'Linh đã trả lời trong thread',
    content:
      'Mình vừa cập nhật bảng màu Tailwind CSS tokens rồi nhé. Đã chỉnh lại biến CSS variables cho tương thích toàn bộ 6 themes.',
    isRead: true,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
  },
  {
    id: 'notif-mock-5',
    userId: 'user-current',
    actorId: 'user-teacher',
    actorDisplayName: 'TS. Nguyễn Văn A',
    actorUsername: 'nguyenvana',
    actorAvatarUrl: '/default-avatar.png',
    channelId: 'channel-frontend',
    channelName: 'frontend-design',
    type: 'Assignment',
    title: 'Đã có điểm: Thiết kế Dark/Light Mode & Activities',
    content:
      'Bài tập của bạn đã được giảng viên chấm điểm. Điểm số: 95/100 (Xuất sắc). Nhận xét: "Giao diện rất mượt mà, phân cấp thông tin rõ ràng".',
    isRead: true,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
    metadata: {
      grade: '95/100 (Xuất sắc)',
      points: 100,
      assignmentId: 'assign-2',
    },
  },
];

export const NotificationsSidebar: React.FC<NotificationsSidebarProps> = ({
  notifications,
  activeNotificationId,
  onSelectNotification,
  onMarkAllRead,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('all');

  const displayedNotifications = notifications.filter((n) => {
    if (activeTab === 'mention') return n.type === 'Mention' || n.type === 1;
    return true;
  });

  const unreadCount = notifications.filter((n) => !n.isRead).length;

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
        <span className="w-4 h-4 rounded-full bg-amber-500 text-black flex items-center justify-center text-[9px] font-black shrink-0 border border-[var(--bg-sidebar)] shadow-xs">
          <At size={10} weight="bold" />
        </span>
      );
    }
    if (type === 'ThreadReply' || type === 2) {
      return (
        <span className="w-4 h-4 rounded-full bg-[var(--accent-primary)] text-white flex items-center justify-center text-[9px] font-black shrink-0 border border-[var(--bg-sidebar)] shadow-xs">
          <ChatTeardropDots size={10} weight="bold" />
        </span>
      );
    }
    if (type === 'Assignment' || type === 3) {
      return (
        <span className="w-4 h-4 rounded-full bg-rose-500 text-white flex items-center justify-center text-[9px] font-black shrink-0 border border-[var(--bg-sidebar)] shadow-xs">
          <BookOpen size={10} weight="bold" />
        </span>
      );
    }
    return (
      <span className="w-4 h-4 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[9px] font-black shrink-0 border border-[var(--bg-sidebar)] shadow-xs">
        <CalendarCheck size={10} weight="bold" />
      </span>
    );
  };

  return (
    <aside
      id="notificationsSidebar"
      className="h-full min-h-0 flex-1 shrink-0 bg-[var(--bg-sidebar)] border-r border-[var(--border-color)] flex flex-col overflow-visible min-w-[310px] relative z-30 select-none"
    >
      {/* 1. Header (Exact 54px matching ChannelSidebar & DirectMessagesSidebar) */}
      <div className="h-[54px] px-3.5 border-b border-[var(--border-color)] flex items-center justify-between gap-2 font-bold text-[0.95rem] bg-[var(--bg-sidebar)] shrink-0">
        <div className="flex items-center gap-2 text-[var(--text-primary)] min-w-0 flex-1">
          <div className="w-7 h-7 rounded-[4px] bg-[var(--accent-soft)] flex items-center justify-center text-[var(--accent-primary)] shrink-0">
            <Bell size={18} weight="fill" />
          </div>
          <span className="truncate font-bold text-[0.95rem]">Thông báo</span>
          {unreadCount > 0 && (
            <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-[var(--accent-soft)] text-[var(--accent-primary)] border border-[var(--accent-primary)]/20 min-w-[18px] text-center leading-none">
              {unreadCount}
            </span>
          )}
        </div>

        {onMarkAllRead && unreadCount > 0 && (
          <button
            type="button"
            onClick={onMarkAllRead}
            title="Đánh dấu tất cả là đã đọc"
            className="w-7 h-7 rounded-md bg-[var(--bg-surface)] hover:bg-[var(--accent-soft)] text-[var(--text-muted)] hover:text-[var(--accent-primary)] border border-[var(--border-color)]/60 flex items-center justify-center transition-all active:scale-95 cursor-pointer shrink-0"
          >
            <Check size={14} weight="bold" />
          </button>
        )}
      </div>

      {/* 2. Minimalist Tabs (Tất cả / @Nhắc đến) */}
      <div className="px-3.5 py-2 border-b border-[var(--border-color)]/60 bg-[var(--bg-sidebar)] shrink-0">
        <div className="flex items-center gap-1.5 text-xs">
          <button
            type="button"
            onClick={() => setActiveTab('all')}
            className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer font-semibold ${
              activeTab === 'all'
                ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-xs'
                : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
            }`}
          >
            Tất cả
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('mention')}
            className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer font-semibold flex items-center gap-1 ${
              activeTab === 'mention'
                ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-xs'
                : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
            }`}
          >
            <At size={13} weight="bold" className="text-amber-500" />
            <span>Nhắc đến</span>
          </button>
        </div>
      </div>

      {/* 3. Notification List Items (Matching app font sizes & padding) */}
      <div className="flex-1 overflow-y-auto min-h-0 p-1.5 space-y-1">
        {displayedNotifications.length === 0 ? (
          <div className="py-16 px-4 text-center text-xs text-[var(--text-muted)]">
            <p className="font-medium text-[var(--text-secondary)]">Không có thông báo nào</p>
          </div>
        ) : (
          displayedNotifications.map((notif) => {
            const isSelected = activeNotificationId === notif.id;
            return (
              <div
                key={notif.id}
                onClick={() => onSelectNotification(notif)}
                className={`px-3 py-2.5 rounded-lg flex items-start gap-2.5 transition-colors cursor-pointer group relative ${
                  isSelected
                    ? 'bg-[var(--accent-soft)] text-[var(--text-primary)]'
                    : 'hover:bg-[var(--bg-surface)] text-[var(--text-secondary)]'
                }`}
              >
                {/* Unread indicator dot: Hiện dấu chấm nếu chưa đọc, đọc rồi thì ẩn */}
                <div className="w-2 shrink-0 flex items-center justify-center pt-2">
                  {!notif.isRead && (
                    <span className="w-2 h-2 rounded-full bg-[var(--accent-primary)] shadow-xs" />
                  )}
                </div>

                {/* Avatar with type badge */}
                <div className="relative shrink-0">
                  <img
                    src={notif.actorAvatarUrl || '/default-avatar.png'}
                    alt=""
                    className="w-10 h-10 rounded-full object-cover border border-[var(--border-color)]/70 shadow-xs"
                    onError={(e) => {
                      e.currentTarget.src = '/default-avatar.png';
                    }}
                  />
                  <div className="absolute -bottom-0.5 -right-0.5">
                    {getTypeIcon(notif.type)}
                  </div>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <span
                      className={`text-[13px] truncate ${
                        !notif.isRead
                          ? 'font-bold text-[var(--text-primary)]'
                          : 'font-semibold text-[var(--text-secondary)]'
                      }`}
                    >
                      {notif.actorDisplayName || notif.actorUsername || 'Hệ thống'}
                    </span>
                    <span className="text-[11px] text-[var(--text-muted)] shrink-0">
                      {formatTimeAgo(notif.createdAt)}
                    </span>
                  </div>

                  <p className="text-[12px] text-[var(--text-muted)] truncate leading-snug mt-0.5">
                    {notif.title}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>
    </aside>
  );
};
