import React from 'react';
import {
  Bell,
  ArrowSquareOut,
  Clock,
  BookOpen,
  CalendarCheck,
  At,
  ChatTeardropDots,
} from '@phosphor-icons/react';
import type { AppNotification } from '../../types';

interface NotificationDetailPaneProps {
  notification: AppNotification | null;
  onNavigateToTarget: (notification: AppNotification) => void;
}

export const NotificationDetailPane: React.FC<NotificationDetailPaneProps> = ({
  notification,
  onNavigateToTarget,
}) => {
  if (!notification) {
    return (
      <div className="flex-1 min-h-0 flex flex-col items-center justify-center bg-[var(--bg-chat)] p-8 text-center select-none">
        <div className="w-14 h-14 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-color)] flex items-center justify-center text-[var(--text-muted)] mb-3 shadow-xs">
          <Bell size={28} weight="duotone" className="opacity-40" />
        </div>
        <p className="text-sm font-semibold text-[var(--text-primary)] mb-1">
          Chưa chọn thông báo nào
        </p>
        <p className="text-xs text-[var(--text-muted)] max-w-xs leading-relaxed">
          Chọn một thông báo ở danh sách bên trái để xem nội dung và điều hướng.
        </p>
      </div>
    );
  }

  const isMention = notification.type === 'Mention' || notification.type === 1;
  const isThread = notification.type === 'ThreadReply' || notification.type === 2;
  const isAssignment = notification.type === 'Assignment' || notification.type === 3;
  const isTask = notification.type === 'TaskSchedule' || notification.type === 4;

  const getActionLabel = () => {
    if (isAssignment) return 'Đi đến bài tập';
    if (isTask) return 'Mở bảng công việc';
    if (isThread) return 'Mở Thread trò chuyện';
    return 'Đi tới tin nhắn';
  };

  const getHeaderIconAndTitle = () => {
    if (isAssignment) {
      return (
        <div className="flex items-center gap-2">
          <BookOpen size={18} weight="bold" className="text-rose-500" />
          <span className="font-bold text-[0.95rem] text-[var(--text-primary)]">Bài tập</span>
        </div>
      );
    }
    if (isTask) {
      return (
        <div className="flex items-center gap-2">
          <CalendarCheck size={18} weight="bold" className="text-emerald-500" />
          <span className="font-bold text-[0.95rem] text-[var(--text-primary)]">Công việc</span>
        </div>
      );
    }
    if (isThread) {
      return (
        <div className="flex items-center gap-2">
          <ChatTeardropDots size={18} weight="bold" className="text-[var(--accent-primary)]" />
          <span className="font-bold text-[0.95rem] text-[var(--text-primary)]">Phản hồi Thread</span>
        </div>
      );
    }
    if (isMention) {
      return (
        <div className="flex items-center gap-2">
          <At size={18} weight="bold" className="text-amber-500" />
          <span className="font-bold text-[0.95rem] text-[var(--text-primary)]">
            {notification.channelName ? `Nhắc đến • #${notification.channelName}` : 'Nhắc đến'}
          </span>
        </div>
      );
    }
    return (
      <div className="flex items-center gap-2">
        <Bell size={18} weight="bold" className="text-[var(--accent-primary)]" />
        <span className="font-bold text-[0.95rem] text-[var(--text-primary)]">Thông báo</span>
      </div>
    );
  };

  const getSenderContextDesc = () => {
    if (isAssignment) {
      return notification.channelName
        ? `Đã giao bài tập mới trong #${notification.channelName}`
        : 'Đã giao bài tập mới';
    }
    if (isTask) {
      return 'Đã phân công một công việc mới cho bạn';
    }
    if (isThread) {
      return notification.channelName
        ? `Đã trả lời câu hỏi của bạn trong #${notification.channelName}`
        : 'Đã trả lời trong thread';
    }
    if (isMention) {
      return notification.channelName
        ? `Đã nhắc đến bạn trong #${notification.channelName}`
        : 'Đã nhắc đến bạn';
    }
    return 'Thông báo hệ thống';
  };

  const formatSimpleTime = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      const hours = date.getHours().toString().padStart(2, '0');
      const minutes = date.getMinutes().toString().padStart(2, '0');
      const day = date.getDate().toString().padStart(2, '0');
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const year = date.getFullYear();
      return `${hours}:${minutes} - ${day}/${month}/${year}`;
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="flex-1 min-h-0 flex flex-col bg-[var(--bg-chat)] overflow-y-auto select-none">
      {/* 1. Header Toolbar (matching ChatArea h-[54px] & border-b) */}
      <div className="h-[54px] px-6 border-b border-[var(--border-color)] bg-[var(--bg-chat)] flex items-center justify-between shrink-0 sticky top-0 z-20">
        <div className="flex items-center gap-2">
          {getHeaderIconAndTitle()}
        </div>
      </div>

      {/* 2. Content Container with 3 clearly divided sections (Xuỵt ngang) */}
      <div className="p-8 max-w-3xl w-full">
        {/* PHẦN 1: Tác giả & Tiêu đề thông báo */}
        <div>
          <div className="flex items-center gap-3.5">
            <img
              src={notification.actorAvatarUrl || '/default-avatar.png'}
              alt=""
              className="w-12 h-12 rounded-2xl object-cover border border-[var(--border-color)] shadow-xs shrink-0"
              onError={(e) => {
                e.currentTarget.src = '/default-avatar.png';
              }}
            />
            <div className="min-w-0 flex-1 flex flex-col justify-center">
              <span className="font-semibold text-[14px] text-[var(--accent-primary)] block leading-tight">
                {notification.actorDisplayName || notification.actorUsername || 'Hệ thống'}
              </span>
              <p className="text-[12px] text-[var(--text-muted)] mt-0.5 leading-tight">
                {getSenderContextDesc()}
              </p>
            </div>
          </div>

          <h2 className="text-[1.15rem] font-bold text-[var(--text-primary)] mt-3.5 leading-snug">
            {notification.title}
          </h2>
        </div>

        {/* XUỴT NGANG 1 */}
        <div className="border-t border-[var(--border-color)] my-5" />

        {/* PHẦN 2: Nội dung (Body) & Metadata */}
        <div className="space-y-3">
          <p className="text-sm text-[var(--text-secondary)] leading-relaxed select-text">
            {notification.content}
          </p>

          {/* Metadata Bài tập */}
          {isAssignment && notification.metadata && (
            <div className="flex flex-wrap items-center gap-3 text-xs text-[var(--text-secondary)] pt-2">
              <span className="text-[var(--text-muted)]">
                Hạn nộp:{' '}
                <b className="text-rose-500 font-semibold">
                  {notification.metadata.dueDate || 'Hôm nay lúc 23:59'}
                </b>
              </span>
              <span className="text-[var(--border-color)]">•</span>
              <span className="text-[var(--text-muted)]">
                Thang điểm:{' '}
                <b className="text-[var(--text-primary)] font-semibold">
                  {notification.metadata.points || 100} điểm
                </b>
              </span>
              {notification.metadata.grade && (
                <>
                  <span className="text-[var(--border-color)]">•</span>
                  <span className="text-[var(--text-muted)]">
                    Điểm đạt được:{' '}
                    <b className="text-emerald-500 font-bold">
                      {notification.metadata.grade}
                    </b>
                  </span>
                </>
              )}
            </div>
          )}

          {/* Metadata Công việc */}
          {isTask && notification.metadata && (
            <div className="flex flex-wrap items-center gap-3 text-xs text-[var(--text-secondary)] pt-2">
              <span className="text-[var(--text-muted)]">
                Hạn hoàn thành:{' '}
                <b className="text-emerald-500 font-semibold">
                  {notification.metadata.dueDate || 'Trước 20:00 ngày mai'}
                </b>
              </span>
              <span className="text-[var(--border-color)]">•</span>
              <span className="text-[var(--text-muted)]">
                Trạng thái:{' '}
                <b className="text-[var(--text-primary)] font-semibold">
                  {notification.metadata.taskStatus === 'done'
                    ? 'Đã xong'
                    : notification.metadata.taskStatus === 'in_progress'
                      ? 'Đang thực hiện'
                      : 'Cần làm'}
                </b>
              </span>
            </div>
          )}
        </div>

        {/* XUỴT NGANG 2 */}
        <div className="border-t border-[var(--border-color)] my-5" />

        {/* PHẦN 3: Thời gian gửi + Nút Action đi tới trang */}
        <div className="flex items-center justify-between gap-4 flex-wrap pt-1">
          <div className="flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
            <Clock size={14} className="shrink-0" />
            <span>Gửi lúc {formatSimpleTime(notification.createdAt)}</span>
          </div>

          <button
            type="button"
            onClick={() => onNavigateToTarget(notification)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold text-white bg-[var(--accent-primary)] hover:bg-[var(--accent-hover)] transition-all cursor-pointer shadow-xs"
          >
            <span>{getActionLabel()}</span>
            <ArrowSquareOut size={13} weight="bold" />
          </button>
        </div>
      </div>
    </div>
  );
};
