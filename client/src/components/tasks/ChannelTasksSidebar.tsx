import React, { useMemo } from 'react';
import {
  CheckSquare,
  X,
  Plus,
  MagnifyingGlass,
  Circle,
  CheckCircle,
  Clock,
  WarningCircle,
  Trash,
  PencilSimple,
  ArrowUpRight,
} from '@phosphor-icons/react';
import { useTaskStore } from '../../stores/useTaskStore';
import { TaskItemStatus, TaskPriority } from '../../types/task';
import type { Channel } from '../../types/channel';

interface ChannelTasksSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  width?: number;
  currentChannel: Channel | null;
  workspaceMembers?: { id: string; displayName?: string; username?: string; avatarUrl?: string }[];
  onJumpToMessage?: (messageId: string) => void;
  currentUserId?: string;
}

export const ChannelTasksSidebar: React.FC<ChannelTasksSidebarProps> = ({
  isOpen,
  onClose,
  width = 380,
  currentChannel,
  workspaceMembers: _workspaceMembers = [],
  onJumpToMessage,
  currentUserId,
}) => {
  const {
    tasks,
    filter,
    searchKeyword,
    setFilter,
    setSearchKeyword,
    openCreateModal,
    openEditModal,
    toggleTaskStatus,
    deleteTask,
  } = useTaskStore();

  if (!isOpen) return null;

  // Filter tasks based on current channel, search and active filter tab
  const channelTasks = useMemo(() => {
    return tasks.filter((t) => {
      // In demo mode, show all demo tasks or channel-matched tasks
      if (currentChannel && t.channelId !== currentChannel.id && t.channelId !== 'demo-channel') {
        return false;
      }

      // Search keyword filter
      if (searchKeyword.trim()) {
        const query = searchKeyword.toLowerCase();
        const matchTitle = t.title.toLowerCase().includes(query);
        const matchNote = t.note?.toLowerCase().includes(query);
        const matchAssignee = t.assignee?.displayName?.toLowerCase().includes(query);
        if (!matchTitle && !matchNote && !matchAssignee) return false;
      }

      // Filter tabs
      if (filter === 'pending') {
        return t.status !== TaskItemStatus.Done;
      }
      if (filter === 'completed') {
        return t.status === TaskItemStatus.Done;
      }
      if (filter === 'my') {
        return (
          t.assigneeId === 'user-me' ||
          (currentUserId && t.assigneeId === currentUserId) ||
          t.createdById === currentUserId
        );
      }

      return true;
    });
  }, [tasks, currentChannel, searchKeyword, filter, currentUserId]);

  const pendingCount = tasks.filter(
    (t) =>
      (!currentChannel || t.channelId === currentChannel.id || t.channelId === 'demo-channel') &&
      t.status !== TaskItemStatus.Done
  ).length;

  const completedCount = tasks.filter(
    (t) =>
      (!currentChannel || t.channelId === currentChannel.id || t.channelId === 'demo-channel') &&
      t.status === TaskItemStatus.Done
  ).length;

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
    <aside
      style={{ width }}
      className="flex-shrink-0 border-l border-[var(--border-color)] bg-[var(--bg-sidebar)] flex flex-col h-full z-20 select-none transition-all duration-150 animate-in slide-in-from-right-4"
    >
      {/* 1. Header (Unified with MemberListPanel) */}
      <div className="h-[54px] border-b border-[var(--border-color)] px-3.5 flex items-center justify-between shrink-0 bg-[var(--bg-sidebar)]">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <span className="font-bold text-sm text-[var(--text-primary)] truncate">
            Công việc
          </span>
          {pendingCount > 0 && (
            <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-[var(--accent-soft)] text-[var(--accent-primary)] shrink-0">
              {pendingCount}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={() =>
              openCreateModal({
                channelId: currentChannel?.id || 'demo-channel',
                workspaceId: currentChannel?.workspaceId || 'demo-workspace',
              })
            }
            className="p-1.5 rounded-md text-[var(--accent-primary)] hover:bg-[var(--accent-soft)] transition-colors cursor-pointer inline-flex items-center gap-1 text-xs font-semibold"
            title="Thêm công việc mới"
          >
            <Plus size={15} weight="bold" />
            <span>Thêm việc</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-md text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)] transition-colors cursor-pointer"
            title="Đóng danh sách công việc"
          >
            <X size={15} />
          </button>
        </div>
      </div>

      {/* 2. Search & Filter Bar (Unified with MemberListPanel) */}
      <div className="p-2.5 pb-2 border-b border-[var(--border-color)]/50 shrink-0 bg-[var(--bg-sidebar)] flex flex-col gap-2">
        <div className="relative flex items-center">
          <MagnifyingGlass
            size={13}
            className="absolute left-2.5 text-[var(--text-muted)] pointer-events-none"
          />
          <input
            type="text"
            placeholder="Lọc công việc..."
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
            className="w-full bg-[var(--bg-surface)] text-xs text-[var(--text-primary)] placeholder:text-[var(--text-muted)] pl-7 pr-7 py-1.5 rounded-md border border-[var(--border-color)] focus:outline-none focus:border-[var(--accent-primary)] transition-colors"
          />
          {searchKeyword && (
            <button
              type="button"
              onClick={() => setSearchKeyword('')}
              className="absolute right-2 text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
            >
              <X size={12} />
            </button>
          )}
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar text-xs">
          {(
            [
              { key: 'all', label: 'Tất cả' },
              { key: 'pending', label: 'Cần làm' },
              { key: 'my', label: 'Của tôi' },
              { key: 'completed', label: 'Đã xong' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setFilter(tab.key)}
              className={`px-2 py-0.5 rounded text-[11px] whitespace-nowrap transition-colors font-medium cursor-pointer ${
                filter === tab.key
                  ? 'bg-[var(--accent-primary)] text-white shadow-2xs'
                  : 'bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border-color)]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Task List */}
      <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2 min-h-0">
        {channelTasks.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-[var(--text-muted)]">
            <div className="w-12 h-12 rounded-full bg-[var(--bg-surface)] border border-[var(--border-color)] flex items-center justify-center mb-3 text-[var(--accent-primary)]">
              <CheckSquare size={26} weight="duotone" />
            </div>
            <p className="font-medium text-sm text-[var(--text-primary)] mb-1">
              {filter === 'completed'
                ? 'Chưa có công việc nào hoàn thành'
                : filter === 'pending'
                ? 'Tuyệt vời! Không còn việc tồn đọng'
                : 'Chưa có công việc nào trong kênh'}
            </p>
            <p className="text-xs text-[var(--text-muted)] max-w-[240px] mb-4">
              Giao việc nhanh chóng hoặc chuyển bất kỳ tin nhắn chat nào thành công việc.
            </p>
            <button
              type="button"
              onClick={() =>
                openCreateModal({
                  channelId: currentChannel?.id || 'demo-channel',
                  workspaceId: currentChannel?.workspaceId || 'demo-workspace',
                })
              }
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[var(--accent-primary)] hover:bg-[var(--accent-hover)] text-white text-xs font-semibold shadow transition-colors cursor-pointer"
            >
              <Plus size={14} weight="bold" />
              <span>Tạo việc đầu tiên</span>
            </button>
          </div>
        ) : (
          channelTasks.map((task) => {
            const isDone = task.status === TaskItemStatus.Done;
            const dueInfo = formatDueDate(task.dueDate);

            return (
              <div
                key={task.id}
                className={`group relative p-3 rounded-lg border transition-all duration-150 ${
                  isDone
                    ? 'bg-[var(--bg-surface)]/60 border-[var(--border-color)]/60 opacity-80'
                    : 'bg-[var(--bg-surface)] border-[var(--border-color)] hover:border-[var(--accent-primary)]/50 hover:shadow-sm'
                }`}
              >
                <div className="flex items-start gap-2.5">
                  {/* Checkbox button */}
                  <button
                    type="button"
                    onClick={() => toggleTaskStatus(task.id)}
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
                  <div className="flex-1 min-w-0 cursor-pointer" onClick={() => openEditModal(task)}>
                    <div className="flex items-center gap-1.5 flex-wrap mb-1">
                      <h4
                        className={`text-xs font-medium leading-snug break-words ${
                          isDone
                            ? 'line-through text-[var(--text-muted)]'
                            : 'text-[var(--text-primary)]'
                        }`}
                      >
                        {task.title}
                      </h4>
                    </div>

                    {task.note && (
                      <p className="text-[11px] text-[var(--text-secondary)] line-clamp-2 mb-2 leading-relaxed">
                        {task.note}
                      </p>
                    )}

                    {/* Metadata line: priority, deadline, assignee */}
                    <div className="flex items-center gap-2 flex-wrap text-[11px] mt-1.5 pt-1.5 border-t border-[var(--border-color)]/50">
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
                        openEditModal(task);
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
                        deleteTask(task.id);
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
          })
        )}
      </div>

      {/* Footer Info */}
      <div className="p-3 border-t border-[var(--border-color)] bg-[var(--bg-surface)] text-[11px] text-[var(--text-muted)] flex items-center justify-between flex-shrink-0">
        <span>
          Hoàn thành {completedCount} / {tasks.length} việc
        </span>
        <button
          type="button"
          onClick={() =>
            openCreateModal({
              channelId: currentChannel?.id || 'demo-channel',
              workspaceId: currentChannel?.workspaceId || 'demo-workspace',
            })
          }
          className="text-[var(--accent-primary)] hover:underline font-medium cursor-pointer"
        >
          + Tạo nhanh
        </button>
      </div>
    </aside>
  );
};
