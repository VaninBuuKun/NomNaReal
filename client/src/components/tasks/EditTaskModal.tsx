import React, { useState, useEffect } from 'react';
import {
  CalendarBlank,
  Flag,
  Trash,
  User as UserIcon,
  Link as LinkIcon,
  Lock,
  ChatText,
} from '@phosphor-icons/react';
import { Modal, Button } from '../ui';
import { useTaskStore } from '../../stores/useTaskStore';
import { TaskItemStatus, TaskPriority } from '../../types/task';

interface EditTaskModalProps {
  workspaceMembers?: { id: string; displayName?: string; username?: string; avatarUrl?: string }[];
  currentUserId?: string;
  isWorkspaceManager?: boolean;
}

export const EditTaskModal: React.FC<EditTaskModalProps> = ({
  workspaceMembers = [],
  currentUserId,
  isWorkspaceManager = false,
}) => {
  const { taskToEdit, closeEditModal, updateTask, deleteTask } = useTaskStore();

  const [title, setTitle] = useState('');
  const [note, setNote] = useState('');
  const [attachmentUrl, setAttachmentUrl] = useState('');
  const [completionNote, setCompletionNote] = useState('');
  const [status, setStatus] = useState<TaskItemStatus>(TaskItemStatus.Todo);
  const [priority, setPriority] = useState<TaskPriority>(TaskPriority.Normal);
  const [assigneeId, setAssigneeId] = useState<string>('');
  const [dueDate, setDueDate] = useState<string>('');

  useEffect(() => {
    if (taskToEdit) {
      setTitle(taskToEdit.title || '');
      setNote(taskToEdit.note || '');
      setAttachmentUrl(taskToEdit.attachmentUrl || '');
      setCompletionNote(taskToEdit.completionNote || '');
      setStatus(taskToEdit.status ?? TaskItemStatus.Todo);
      setPriority(taskToEdit.priority ?? TaskPriority.Normal);
      setAssigneeId(taskToEdit.assigneeId || '');
      setDueDate(taskToEdit.dueDate ? taskToEdit.dueDate.slice(0, 16) : '');
    }
  }, [taskToEdit]);

  if (!taskToEdit) return null;

  // Permissions calculation
  const isCreator = Boolean(
    currentUserId &&
      (taskToEdit.createdById === currentUserId || taskToEdit.createdById === 'user-me')
  );
  const isAssignee = Boolean(
    currentUserId &&
      (taskToEdit.assigneeId === currentUserId || taskToEdit.assigneeId === 'user-me')
  );
  // Creators, managers, or local demo creators have full edit rights
  const canEditAll =
    isCreator ||
    isWorkspaceManager ||
    !currentUserId ||
    taskToEdit.createdById === 'user-me';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const selectedAssignee = workspaceMembers.find((m) => m.id === assigneeId);

    updateTask(taskToEdit.id, {
      title: canEditAll ? title.trim() : taskToEdit.title,
      note: canEditAll ? (note.trim() || null) : taskToEdit.note,
      attachmentUrl: canEditAll ? (attachmentUrl.trim() || null) : taskToEdit.attachmentUrl,
      completionNote: completionNote.trim() || null,
      status,
      priority: canEditAll ? priority : taskToEdit.priority,
      assigneeId: canEditAll ? (assigneeId || null) : taskToEdit.assigneeId,
      dueDate: canEditAll ? (dueDate ? new Date(dueDate).toISOString() : null) : taskToEdit.dueDate,
      completedAt:
        status === TaskItemStatus.Done
          ? taskToEdit.completedAt || new Date().toISOString()
          : null,
      assignee: canEditAll
        ? selectedAssignee
          ? {
              id: selectedAssignee.id,
              displayName:
                selectedAssignee.displayName || selectedAssignee.username || 'Thành viên',
              username: selectedAssignee.username,
              avatarUrl: selectedAssignee.avatarUrl,
            }
          : assigneeId === 'user-me'
          ? { id: 'user-me', displayName: 'Tôi (Học viên)', username: 'ban' }
          : null
        : taskToEdit.assignee,
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
      subtitle={
        canEditAll
          ? 'Chỉnh sửa thông tin, người phụ trách và tiến độ thực hiện'
          : 'Xem thông tin công việc và cập nhật tiến độ / phản hồi kết quả'
      }
      className="max-w-[500px]"
    >
      <form onSubmit={handleSubmit} className="p-6 space-y-4">
        {/* Permission Info for Assignees */}
        {!canEditAll && isAssignee && (
          <div className="p-2.5 rounded-[4px] bg-[var(--accent-soft)]/60 border border-[var(--accent-primary)]/20 flex items-center gap-2 text-xs text-[var(--text-secondary)]">
            <Lock size={15} className="text-[var(--accent-primary)] shrink-0" />
            <span>
              Bạn là người được giao việc. Bạn có quyền cập nhật trạng thái và ghi chú/báo cáo kết quả hoàn thành.
            </span>
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
            disabled={!canEditAll}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className={`w-full px-3 py-2 text-xs rounded-[3px] border border-[var(--border-color)] bg-[var(--bg-surface)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-primary)] focus:ring-1 focus:ring-[var(--accent-primary)] transition-all font-sans ${
              !canEditAll ? 'opacity-70 cursor-not-allowed bg-[var(--bg-chat)]' : ''
            }`}
          />
        </div>

        {/* Note */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-1.5">
            Ghi chú yêu cầu
          </label>
          <textarea
            rows={2}
            disabled={!canEditAll}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className={`w-full px-3 py-2 text-xs rounded-[3px] border border-[var(--border-color)] bg-[var(--bg-surface)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-primary)] focus:ring-1 focus:ring-[var(--accent-primary)] transition-all resize-none font-sans ${
              !canEditAll ? 'opacity-70 cursor-not-allowed bg-[var(--bg-chat)]' : ''
            }`}
          />
        </div>

        {/* Attachment Link */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-1.5">
            Tài liệu / Liên kết đính kèm
          </label>
          <div className="relative">
            <LinkIcon
              size={14}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none"
            />
            <input
              type="url"
              disabled={!canEditAll}
              placeholder="https://docs.google.com/... hoặc link tài liệu"
              value={attachmentUrl}
              onChange={(e) => setAttachmentUrl(e.target.value)}
              className={`w-full pl-8 pr-3 py-2 text-xs rounded-[3px] border border-[var(--border-color)] bg-[var(--bg-surface)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-primary)] focus:ring-1 focus:ring-[var(--accent-primary)] transition-all font-sans ${
                !canEditAll ? 'opacity-70 cursor-not-allowed bg-[var(--bg-chat)]' : ''
              }`}
            />
          </div>
          {attachmentUrl && (
            <div className="mt-1">
              <a
                href={attachmentUrl}
                target="_blank"
                rel="noreferrer noopener"
                className="text-[11px] text-[var(--accent-primary)] hover:underline inline-flex items-center gap-1"
              >
                <span>Mở liên kết đính kèm</span>
                <span className="text-[10px]">↗</span>
              </a>
            </div>
          )}
        </div>

        {/* Status selector (Always editable by Assignee, Creator & Manager) */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-1.5">
            Trạng thái tiến độ
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

        {/* Completion Note / Feedback (Editable by both Assignee and Creator) */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] flex items-center gap-1.5">
              <ChatText size={14} className="text-[var(--accent-primary)]" />
              <span>Phản hồi / Báo cáo kết quả hoàn thành</span>
            </label>
            {status === TaskItemStatus.Done && (
              <span className="text-[10px] text-[var(--accent-primary)] font-medium">
                Khuyên dùng khi xong
              </span>
            )}
          </div>
          <textarea
            rows={2}
            placeholder="Ghi chú kết quả, link bàn giao sản phẩm, báo cáo hoàn thành..."
            value={completionNote}
            onChange={(e) => setCompletionNote(e.target.value)}
            className="w-full px-3 py-2 text-xs rounded-[3px] border border-[var(--border-color)] bg-[var(--bg-surface)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-primary)] focus:ring-1 focus:ring-[var(--accent-primary)] transition-all resize-none font-sans"
          />
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
                disabled={!canEditAll}
                value={assigneeId}
                onChange={(e) => setAssigneeId(e.target.value)}
                className={`w-full pl-8 pr-3 py-2 bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-[3px] text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-primary)] focus:ring-1 focus:ring-[var(--accent-primary)] transition-all ${
                  !canEditAll ? 'opacity-70 cursor-not-allowed bg-[var(--bg-chat)]' : 'cursor-pointer'
                }`}
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
                disabled={!canEditAll}
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className={`w-full pl-8 pr-2 py-1.5 bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-[3px] text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-primary)] focus:ring-1 focus:ring-[var(--accent-primary)] transition-all ${
                  !canEditAll ? 'opacity-70 cursor-not-allowed bg-[var(--bg-chat)]' : ''
                }`}
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
              disabled={!canEditAll}
              onClick={() => setPriority(TaskPriority.Low)}
              className={`py-1.5 px-2 rounded-[3px] text-xs font-medium border flex items-center justify-center gap-1.5 transition-colors ${
                priority === TaskPriority.Low
                  ? 'bg-slate-500/20 text-slate-300 border-slate-500'
                  : 'bg-[var(--bg-surface)] text-[var(--text-secondary)] border-[var(--border-color)] hover:bg-[var(--bg-surface-active)]'
              } ${!canEditAll ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer'}`}
            >
              <Flag size={13} />
              <span>Thấp</span>
            </button>
            <button
              type="button"
              disabled={!canEditAll}
              onClick={() => setPriority(TaskPriority.Normal)}
              className={`py-1.5 px-2 rounded-[3px] text-xs font-medium border flex items-center justify-center gap-1.5 transition-colors ${
                priority === TaskPriority.Normal
                  ? 'bg-[var(--accent-soft)] text-[var(--accent-primary)] border-[var(--accent-primary)]'
                  : 'bg-[var(--bg-surface)] text-[var(--text-secondary)] border-[var(--border-color)] hover:bg-[var(--bg-surface-active)]'
              } ${!canEditAll ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer'}`}
            >
              <Flag size={13} weight="fill" />
              <span>Bình thường</span>
            </button>
            <button
              type="button"
              disabled={!canEditAll}
              onClick={() => setPriority(TaskPriority.High)}
              className={`py-1.5 px-2 rounded-[3px] text-xs font-medium border flex items-center justify-center gap-1.5 transition-colors ${
                priority === TaskPriority.High
                  ? 'bg-rose-500/20 text-rose-400 border-rose-500'
                  : 'bg-[var(--bg-surface)] text-[var(--text-secondary)] border-[var(--border-color)] hover:bg-[var(--bg-surface-active)]'
              } ${!canEditAll ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer'}`}
            >
              <Flag size={13} weight="fill" />
              <span>Cao (Gấp)</span>
            </button>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-3 border-t border-[var(--border-color)]">
          {canEditAll ? (
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
          ) : (
            <div />
          )}

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
