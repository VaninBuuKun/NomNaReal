import React, { useState, useEffect } from 'react';
import {
  User as UserIcon,
  CalendarBlank,
  Flag,
  Quotes,
  CheckSquare,
} from '@phosphor-icons/react';
import { Modal, Button } from '../ui';
import { useTaskStore } from '../../stores/useTaskStore';
import { TaskPriority, TaskItemStatus } from '../../types/task';
import type { Channel } from '../../types/channel';

interface CreateTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  workspaceMembers?: { id: string; displayName?: string; username?: string; avatarUrl?: string }[];
  currentChannel?: Channel | null;
  currentUserId?: string;
}

export const CreateTaskModal: React.FC<CreateTaskModalProps> = ({
  isOpen,
  onClose,
  workspaceMembers = [],
  currentChannel,
  currentUserId,
}) => {
  const { isCreateModalOpen, createInitialData, closeCreateModal, addTask } = useTaskStore();

  const isModalOpen = isOpen || isCreateModalOpen;

  const [title, setTitle] = useState('');
  const [note, setNote] = useState('');
  const [assigneeId, setAssigneeId] = useState<string>('');
  const [dueDate, setDueDate] = useState<string>('');
  const [priority, setPriority] = useState<TaskPriority>(TaskPriority.Normal);
  const [sourceMessageId, setSourceMessageId] = useState<string | null>(null);

  useEffect(() => {
    if (createInitialData) {
      setTitle(createInitialData.title || '');
      setNote(createInitialData.note || '');
      setAssigneeId(createInitialData.assigneeId || currentUserId || 'user-me');
      setDueDate(createInitialData.dueDate ? createInitialData.dueDate.slice(0, 16) : '');
      setPriority(createInitialData.priority ?? TaskPriority.Normal);
      setSourceMessageId(createInitialData.sourceMessageId || null);
    } else {
      setTitle('');
      setNote('');
      setAssigneeId(currentUserId || 'user-me');
      setDueDate('');
      setPriority(TaskPriority.Normal);
      setSourceMessageId(null);
    }
  }, [createInitialData, currentUserId, isModalOpen]);

  if (!isModalOpen) return null;

  const handleClose = () => {
    closeCreateModal();
    onClose();
  };

  const handleQuickDue = (daysToAdd: number) => {
    const target = new Date();
    target.setDate(target.getDate() + daysToAdd);
    target.setHours(23, 59, 0, 0);
    const offset = target.getTimezoneOffset();
    const localDate = new Date(target.getTime() - offset * 60 * 1000);
    setDueDate(localDate.toISOString().slice(0, 16));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const selectedAssignee = workspaceMembers.find((m) => m.id === assigneeId);

    addTask({
      workspaceId: currentChannel?.workspaceId || 'demo-workspace',
      channelId: currentChannel?.id || 'demo-channel',
      title: title.trim(),
      note: note.trim() || null,
      priority,
      status: TaskItemStatus.Todo,
      dueDate: dueDate ? new Date(dueDate).toISOString() : null,
      createdById: currentUserId || 'user-me',
      assigneeId: assigneeId || null,
      sourceMessageId,
      assignee: selectedAssignee
        ? {
            id: selectedAssignee.id,
            displayName: selectedAssignee.displayName || selectedAssignee.username || 'Thành viên',
            username: selectedAssignee.username,
            avatarUrl: selectedAssignee.avatarUrl,
          }
        : assigneeId === 'user-me'
        ? { id: 'user-me', displayName: 'Tôi (Học viên)', username: 'ban' }
        : null,
      creator: {
        id: currentUserId || 'user-me',
        displayName: 'Tôi (Học viên)',
        username: 'ban',
      },
    });

    handleClose();
  };

  return (
    <Modal
      isOpen={isModalOpen}
      onClose={handleClose}
      title="Tạo công việc mới"
      subtitle={`Giao việc cho thành viên trong kênh #${currentChannel?.name || 'chung'}`}
      className="max-w-[500px]"
    >
      <form onSubmit={handleSubmit} className="p-6 space-y-4">
        {/* Source Message Preview (if created from chat) */}
        {sourceMessageId && (
          <div className="p-3 rounded-[4px] bg-[var(--accent-soft)] border border-[var(--accent-primary)]/20 flex items-start gap-2 text-xs">
            <Quotes size={18} weight="fill" className="text-[var(--accent-primary)] shrink-0 mt-0.5" />
            <div className="text-[11px] text-[var(--text-secondary)]">
              <span className="font-semibold text-[var(--accent-primary)]">Được tạo từ tin nhắn: </span>
              <span className="italic line-clamp-2">{title}</span>
            </div>
          </div>
        )}

        {/* Title */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-1.5">
            Tên công việc <span className="text-[var(--accent-primary)]">*</span>
          </label>
          <input
            type="text"
            required
            autoFocus
            placeholder="Ví dụ: Nộp bài tập tuần 4, chuẩn bị slide..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-3 py-2 text-xs rounded-[3px] border border-[var(--border-color)] bg-[var(--bg-surface)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-primary)] focus:ring-1 focus:ring-[var(--accent-primary)] transition-all font-sans"
          />
        </div>

        {/* Note / Description */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-1.5">
            Ghi chú thêm (không bắt buộc)
          </label>
          <textarea
            rows={2}
            placeholder="Yêu cầu cụ thể, tài liệu đính kèm hoặc tiêu chí hoàn thành..."
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="w-full px-3 py-2 text-xs rounded-[3px] border border-[var(--border-color)] bg-[var(--bg-surface)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-primary)] focus:ring-1 focus:ring-[var(--accent-primary)] transition-all resize-none font-sans"
          />
        </div>

        {/* Assignee & Due Date 2-col row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Assignee Dropdown */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-1.5">
              Người thực hiện
            </label>
            <div className="relative">
              <UserIcon
                size={14}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none"
              />
              <select
                value={assigneeId}
                onChange={(e) => setAssigneeId(e.target.value)}
                className="w-full pl-8 pr-3 py-2 bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-[3px] text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-primary)] focus:ring-1 focus:ring-[var(--accent-primary)] transition-all cursor-pointer"
              >
                <option value="user-me">Tôi (Học viên)</option>
                {workspaceMembers.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.displayName || member.username || 'Thành viên'}
                  </option>
                ))}
                <option value="">(Chưa giao cho ai)</option>
              </select>
            </div>
          </div>

          {/* Due Date */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-1.5">
              Hạn chót (Deadline)
            </label>
            <div className="relative">
              <CalendarBlank
                size={14}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none"
              />
              <input
                type="datetime-local"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full pl-8 pr-2 py-1.5 bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-[3px] text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-primary)] focus:ring-1 focus:ring-[var(--accent-primary)] transition-all"
              />
            </div>

            {/* Quick Date Picks */}
            <div className="flex items-center gap-1.5 mt-1.5 text-[10px]">
              <button
                type="button"
                onClick={() => handleQuickDue(0)}
                className="px-2 py-0.5 rounded-[3px] bg-[var(--bg-surface)] hover:bg-[var(--bg-surface-active)] text-[var(--text-secondary)] border border-[var(--border-color)] cursor-pointer transition-colors"
              >
                Hôm nay
              </button>
              <button
                type="button"
                onClick={() => handleQuickDue(1)}
                className="px-2 py-0.5 rounded-[3px] bg-[var(--bg-surface)] hover:bg-[var(--bg-surface-active)] text-[var(--text-secondary)] border border-[var(--border-color)] cursor-pointer transition-colors"
              >
                Ngày mai
              </button>
              <button
                type="button"
                onClick={() => handleQuickDue(3)}
                className="px-2 py-0.5 rounded-[3px] bg-[var(--bg-surface)] hover:bg-[var(--bg-surface-active)] text-[var(--text-secondary)] border border-[var(--border-color)] cursor-pointer transition-colors"
              >
                3 ngày nữa
              </button>
            </div>
          </div>
        </div>

        {/* Priority selector */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-1.5">
            Mức độ ưu tiên
          </label>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => setPriority(TaskPriority.Low)}
              className={`py-1.5 px-2 rounded-[3px] text-xs font-medium border flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                priority === TaskPriority.Low
                  ? 'bg-slate-500/20 text-slate-300 border-slate-500'
                  : 'bg-[var(--bg-surface)] text-[var(--text-secondary)] border-[var(--border-color)] hover:bg-[var(--bg-surface-active)]'
              }`}
            >
              <Flag size={13} />
              <span>Thấp</span>
            </button>

            <button
              type="button"
              onClick={() => setPriority(TaskPriority.Normal)}
              className={`py-1.5 px-2 rounded-[3px] text-xs font-medium border flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                priority === TaskPriority.Normal
                  ? 'bg-[var(--accent-soft)] text-[var(--accent-primary)] border-[var(--accent-primary)]'
                  : 'bg-[var(--bg-surface)] text-[var(--text-secondary)] border-[var(--border-color)] hover:bg-[var(--bg-surface-active)]'
              }`}
            >
              <Flag size={13} weight="fill" />
              <span>Bình thường</span>
            </button>

            <button
              type="button"
              onClick={() => setPriority(TaskPriority.High)}
              className={`py-1.5 px-2 rounded-[3px] text-xs font-medium border flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                priority === TaskPriority.High
                  ? 'bg-rose-500/20 text-rose-400 border-rose-500'
                  : 'bg-[var(--bg-surface)] text-[var(--text-secondary)] border-[var(--border-color)] hover:bg-[var(--bg-surface-active)]'
              }`}
            >
              <Flag size={13} weight="fill" />
              <span>Cao (Gấp)</span>
            </button>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[var(--border-color)]">
          <Button type="button" variant="ghost" size="sm" onClick={handleClose}>
            Hủy
          </Button>
          <Button
            type="submit"
            variant="primary"
            size="sm"
            disabled={!title.trim()}
            leftIcon={<CheckSquare size={15} weight="bold" />}
          >
            Giao việc
          </Button>
        </div>
      </form>
    </Modal>
  );
};
