import React, { useMemo, useEffect } from 'react';
import {
  CheckSquare,
  X,
  Plus,
  MagnifyingGlass,
} from '@phosphor-icons/react';
import { useTaskStore } from '../../stores/useTaskStore';
import { TaskItemStatus } from '../../types/task';
import type { Channel } from '../../types/channel';
import { TaskCard } from './TaskCard';

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
    fetchTasks,
  } = useTaskStore();

  // Fetch tasks from server when sidebar opens or active channel changes
  useEffect(() => {
    if (isOpen && currentChannel?.id) {
      fetchTasks(currentChannel.id);
    }
  }, [isOpen, currentChannel?.id, fetchTasks]);

  // Filter tasks based on current channel, search and active filter tab
  const channelTasks = useMemo(() => {
    if (!currentChannel) return [];

    return tasks.filter((t) => {
      if (t.channelId !== currentChannel.id) {
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
          (currentUserId && t.assigneeId === currentUserId) ||
          t.createdById === currentUserId
        );
      }

      return true;
    });
  }, [tasks, currentChannel, searchKeyword, filter, currentUserId]);

  const pendingCount = currentChannel
    ? tasks.filter(
        (t) => t.channelId === currentChannel.id && t.status !== TaskItemStatus.Done
      ).length
    : 0;

  const completedCount = currentChannel
    ? tasks.filter(
        (t) => t.channelId === currentChannel.id && t.status === TaskItemStatus.Done
      ).length
    : 0;

  if (!isOpen) return null;

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
              currentChannel &&
              openCreateModal({
                channelId: currentChannel.id,
                workspaceId: currentChannel.workspaceId,
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
                  channelId: currentChannel?.id,
                  workspaceId: currentChannel?.workspaceId,
                })
              }
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[var(--accent-primary)] hover:bg-[var(--accent-hover)] text-white text-xs font-semibold shadow transition-colors cursor-pointer"
            >
              <Plus size={14} weight="bold" />
              <span>Tạo việc đầu tiên</span>
            </button>
          </div>
        ) : (
          channelTasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              currentUserId={currentUserId}
              onToggleStatus={toggleTaskStatus}
              onOpenEdit={openEditModal}
              onDelete={deleteTask}
              onJumpToMessage={onJumpToMessage}
            />
          ))
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
            currentChannel &&
            openCreateModal({
              channelId: currentChannel.id,
              workspaceId: currentChannel.workspaceId,
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
