import React from 'react';
import {
  Circle,
  CheckCircle,
  Clock,
  WarningCircle,
  Trash,
  PencilSimple,
  ArrowUpRight,
  Link as LinkIcon,
  ChatText,
} from '@phosphor-icons/react';
import { type TaskItem, TaskItemStatus, TaskPriority } from '../../types/task';

interface TaskCardProps {
  task: TaskItem;
  currentUserId?: string;
  onToggleStatus: (taskId: string) => void;
  onOpenEdit: (task: TaskItem) => void;
  onDelete: (taskId: string) => void;
  onJumpToMessage?: (messageId: string) => void;
}

export const TaskCard: React.FC<TaskCardProps> = ({
  task,
  currentUserId: _currentUserId,
  onToggleStatus,
  onOpenEdit,
  onDelete,
  onJumpToMessage,
}) => {
  const isDone = task.status === TaskItemStatus.Done;

  const formatDueDate = (dateString?: string | null) => {
    if (!dateString) return null;
    try {
      const due = new Date(dateString);
      const now = new Date();
      const isPast = due.getTime() < now.getTime();
      const isToday =
        due.getDate() === now.getDate() &&
        due.getMonth() === now.getMonth() &&
        due.getFullYear() === now.getFullYear();

      const timeText = due.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
      const dateText = due.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });

      return {
        text: isToday ? `Hôm nay, ${timeText}` : `${dateText}, ${timeText}`,
        isPast,
        isToday,
      };
    } catch {
      return { text: dateString, isPast: false, isToday: false };
    }
  };

  const dueInfo = formatDueDate(task.dueDate);

  const getPriorityBadge = (priority: TaskPriority) => {
    switch (priority) {
      case TaskPriority.High:
        return (
          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-500 border border-rose-500/20">
            Cao
          </span>
        );
      case TaskPriority.Low:
        return (
          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-slate-500/10 text-slate-400 border border-slate-500/20">
            Thấp
          </span>
        );
      case TaskPriority.Normal:
      default:
        return (
          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-sky-500/10 text-sky-400 border border-sky-500/20">
            Bình thường
          </span>
        );
    }
  };

  return (
    <div
      className={`group relative p-3 rounded-lg border transition-all duration-150 ${
        isDone
          ? 'bg-[var(--bg-surface)]/60 border-[var(--border-color)]/60 opacity-85'
          : 'bg-[var(--bg-surface)] border-[var(--border-color)] hover:border-[var(--accent-primary)]/50 hover:shadow-sm'
      }`}
    >
      <div className="flex items-start gap-2.5">
        {/* Checkbox button */}
        <button
          type="button"
          onClick={() => onToggleStatus(task.id)}
          className="mt-0.5 text-[var(--text-muted)] hover:text-[var(--accent-primary)] transition-colors flex-shrink-0 cursor-pointer"
          title={isDone ? 'Đánh dấu chưa xong' : 'Đánh dấu hoàn thành'}
        >
          {isDone ? (
            <CheckCircle size={19} weight="fill" className="text-[var(--accent-primary)]" />
          ) : (
            <Circle size={19} className="hover:scale-110 transition-transform" />
          )}
        </button>

        {/* Task Content */}
        <div className="flex-1 min-w-0 cursor-pointer" onClick={() => onOpenEdit(task)}>
          <div className="flex items-center gap-1.5 flex-wrap mb-1">
            <h4
              className={`text-xs font-medium leading-snug break-words ${
                isDone ? 'line-through text-[var(--text-muted)]' : 'text-[var(--text-primary)]'
              }`}
            >
              {task.title}
            </h4>
          </div>

          {task.note && (
            <p className="text-[11px] text-[var(--text-secondary)] line-clamp-2 mb-1.5 leading-relaxed">
              {task.note}
            </p>
          )}

          {/* Attachment Link Pill if exists */}
          {task.attachmentUrl && (
            <div className="mb-2">
              <a
                href={task.attachmentUrl}
                target="_blank"
                rel="noreferrer noopener"
                onClick={(e) => e.stopPropagation()}
                className="inline-flex items-center gap-1 text-[10px] text-[var(--accent-primary)] bg-[var(--accent-soft)] hover:bg-[var(--accent-primary)]/20 px-2 py-0.5 rounded border border-[var(--accent-primary)]/30 transition-colors"
                title={task.attachmentUrl}
              >
                <LinkIcon size={11} />
                <span className="truncate max-w-[170px]">Tài liệu liên quan</span>
                <span className="text-[9px]">↗</span>
              </a>
            </div>
          )}

          {/* Completion Note Callout if task is done and has feedback */}
          {task.completionNote && (
            <div className="mb-2 p-1.5 rounded bg-[var(--bg-chat)] border border-[var(--border-color)]/70 text-[10.5px] text-[var(--text-secondary)] flex items-start gap-1.5">
              <ChatText size={13} className="text-[var(--accent-primary)] shrink-0 mt-0.5" />
              <div className="min-w-0 flex-1">
                <span className="font-semibold text-[var(--accent-primary)]">Báo cáo: </span>
                <span className="italic">{task.completionNote}</span>
              </div>
            </div>
          )}

          {/* Metadata line: priority, deadline, assignee */}
          <div className="flex items-center gap-2 flex-wrap text-[11px] mt-1 pt-1.5 border-t border-[var(--border-color)]/50">
            {getPriorityBadge(task.priority)}

            {dueInfo && (
              <div
                className={`inline-flex items-center gap-1 ${
                  isDone
                    ? 'text-[var(--text-muted)]'
                    : dueInfo.isPast
                    ? 'text-rose-500 font-semibold'
                    : dueInfo.isToday
                    ? 'text-amber-500 font-medium'
                    : 'text-[var(--text-muted)]'
                }`}
                title={`Hạn chót: ${dueInfo.text}`}
              >
                {dueInfo.isPast && !isDone ? (
                  <WarningCircle size={12} weight="fill" />
                ) : (
                  <Clock size={12} />
                )}
                <span>{dueInfo.text}</span>
              </div>
            )}

            {task.assignee && (
              <div
                className="inline-flex items-center gap-1 text-[var(--text-secondary)] ml-auto"
                title={`Người làm: ${task.assignee.displayName}`}
              >
                <div className="w-4 h-4 rounded-full bg-[var(--accent-soft)] text-[var(--accent-primary)] flex items-center justify-center text-[9px] font-bold">
                  {task.assignee.displayName.charAt(0).toUpperCase()}
                </div>
                <span className="text-[10px] truncate max-w-[80px]">
                  {task.assignee.displayName}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Actions on hover */}
        <div className="opacity-0 group-hover:opacity-100 flex items-center gap-0.5 transition-opacity ml-1 flex-shrink-0">
          {task.sourceMessageId && onJumpToMessage && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onJumpToMessage(task.sourceMessageId!);
              }}
              className="p-1 rounded text-[var(--text-muted)] hover:text-[var(--accent-primary)] hover:bg-[var(--bg-surface-active)]"
              title="Đi tới tin nhắn gốc"
            >
              <ArrowUpRight size={14} />
            </button>
          )}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onOpenEdit(task);
            }}
            className="p-1 rounded text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-active)]"
            title="Chỉnh sửa công việc"
          >
            <PencilSimple size={14} />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(task.id);
            }}
            className="p-1 rounded text-[var(--text-muted)] hover:text-rose-500 hover:bg-rose-500/10"
            title="Xóa công việc"
          >
            <Trash size={14} />
          </button>
        </div>
      </div>
    </div>
  );
};
