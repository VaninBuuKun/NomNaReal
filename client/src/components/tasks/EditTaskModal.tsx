import React, { useState, useEffect } from 'react';
import {
  CalendarBlank,
  Flag,
  Trash,
  User as UserIcon,
} from '@phosphor-icons/react';
import { Modal, Button } from '../ui';
import { useTaskStore } from '../../stores/useTaskStore';
import { TaskItemStatus, TaskPriority } from '../../types/task';

interface EditTaskModalProps {
  workspaceMembers?: { id: string; displayName?: string; username?: string; avatarUrl?: string }[];
}

export const EditTaskModal: React.FC<EditTaskModalProps> = ({ workspaceMembers = [] }) => {
  const { taskToEdit, closeEditModal, updateTask, deleteTask } = useTaskStore();

  const [title, setTitle] = useState('');
  const [note, setNote] = useState('');
  const [status, setStatus] = useState<TaskItemStatus>(TaskItemStatus.Todo);
  const [priority, setPriority] = useState<TaskPriority>(TaskPriority.Normal);
  const [assigneeId, setAssigneeId] = useState<string>('');
  const [dueDate, setDueDate] = useState<string>('');

  useEffect(() => {
    if (taskToEdit) {
      setTitle(taskToEdit.title || '');
      setNote(taskToEdit.note || '');
      setStatus(taskToEdit.status ?? TaskItemStatus.Todo);
      setPriority(taskToEdit.priority ?? TaskPriority.Normal);
      setAssigneeId(taskToEdit.assigneeId || '');
      setDueDate(taskToEdit.dueDate ? taskToEdit.dueDate.slice(0, 16) : '');
    }
  }, [taskToEdit]);

  if (!taskToEdit) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const selectedAssignee = workspaceMembers.find((m) => m.id === assigneeId);

    updateTask(taskToEdit.id, {
      title: title.trim(),
      note: note.trim() || null,
      status,
      priority,
      assigneeId: assigneeId || null,
      dueDate: dueDate ? new Date(dueDate).toISOString() : null,
      completedAt: status === TaskItemStatus.Done ? new Date().toISOString() : null,
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
    });
  };

  const handleDelete = () => {
    if (window.confirm('Bạn có chắc chắn muốn xóa công việc này không?')) {
      deleteTask(taskToEdit.id);
    }
  };

  return (
    <Modal
      isOpen={Boolean(taskToEdit)}
      onClose={closeEditModal}
      title="Chi tiết công việc"
      subtitle="Chỉnh sửa thông tin, người phụ trách và tiến độ thực hiện"
      className="max-w-[500px]"
    >
      <form onSubmit={handleSubmit} className="p-6 space-y-4">
        {/* Title */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-1.5">
            Tên công việc <span className="text-[var(--accent-primary)]">*</span>
          </label>
          <input
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-3 py-2 text-xs rounded-[3px] border border-[var(--border-color)] bg-[var(--bg-surface)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-primary)] focus:ring-1 focus:ring-[var(--accent-primary)] transition-all font-sans"
          />
        </div>

        {/* Note */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-1.5">
            Ghi chú
          </label>
          <textarea
            rows={3}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="w-full px-3 py-2 text-xs rounded-[3px] border border-[var(--border-color)] bg-[var(--bg-surface)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-primary)] focus:ring-1 focus:ring-[var(--accent-primary)] transition-all resize-none font-sans"
          />
        </div>

        {/* Status selector */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-1.5">
            Trạng thái
          </label>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => setStatus(TaskItemStatus.Todo)}
              className={`py-1.5 px-2 rounded-[3px] text-xs font-medium border transition-colors cursor-pointer ${
                status === TaskItemStatus.Todo
                  ? 'bg-amber-500/20 text-amber-500 border-amber-500'
                  : 'bg-[var(--bg-surface)] text-[var(--text-secondary)] border-[var(--border-color)] hover:bg-[var(--bg-surface-active)]'
              }`}
            >
              Cần làm
            </button>
            <button
              type="button"
              onClick={() => setStatus(TaskItemStatus.InProgress)}
              className={`py-1.5 px-2 rounded-[3px] text-xs font-medium border transition-colors cursor-pointer ${
                status === TaskItemStatus.InProgress
                  ? 'bg-sky-500/20 text-sky-400 border-sky-500'
                  : 'bg-[var(--bg-surface)] text-[var(--text-secondary)] border-[var(--border-color)] hover:bg-[var(--bg-surface-active)]'
              }`}
            >
              Đang làm
            </button>
            <button
              type="button"
              onClick={() => setStatus(TaskItemStatus.Done)}
              className={`py-1.5 px-2 rounded-[3px] text-xs font-medium border transition-colors cursor-pointer ${
                status === TaskItemStatus.Done
                  ? 'bg-[var(--accent-soft)] text-[var(--accent-primary)] border-[var(--accent-primary)]'
                  : 'bg-[var(--bg-surface)] text-[var(--text-secondary)] border-[var(--border-color)] hover:bg-[var(--bg-surface-active)]'
              }`}
            >
              Đã xong
            </button>
          </div>
        </div>

        {/* Assignee & Due Date */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-1.5">
              Hạn chót
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
          </div>
        </div>

        {/* Priority */}
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
        <div className="flex items-center justify-between pt-3 border-t border-[var(--border-color)]">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleDelete}
            leftIcon={<Trash size={14} />}
            className="text-rose-500 hover:text-rose-600 hover:bg-rose-500/10"
          >
            Xóa việc
          </Button>

          <div className="flex items-center gap-2.5">
            <Button type="button" variant="ghost" size="sm" onClick={closeEditModal}>
              Đóng
            </Button>
            <Button type="submit" variant="primary" size="sm">
              Lưu thay đổi
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  );
};
