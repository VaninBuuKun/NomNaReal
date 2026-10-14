import React, { useState } from 'react';
import { Warning } from '@phosphor-icons/react';
import { Button, Input } from '../../ui';
import { serverApi } from '../../../services/serverApi';
import type { Workspace } from '../../../types';

interface ServerDangerZoneTabProps {
  workspace: Workspace;
  onWorkspaceDeleted?: (id: string) => void;
  onClose: () => void;
}

export const ServerDangerZoneTab: React.FC<ServerDangerZoneTabProps> = ({
  workspace,
  onWorkspaceDeleted,
  onClose,
}) => {
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const handleDeleteServer = async () => {
    if (deleteConfirmText !== workspace.name) return;

    try {
      setIsDeleting(true);
      setDeleteError(null);
      await serverApi.deleteServer(workspace.id);
      onClose();
      onWorkspaceDeleted?.(workspace.id);
    } catch (err: unknown) {
      console.error('Failed to delete server:', err);
      const errorObj = err as { response?: { data?: { message?: string } } };
      setDeleteError(
        errorObj?.response?.data?.message || 'Không thể xóa máy chủ. Vui lòng kiểm tra quyền hạn!'
      );
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 max-w-lg space-y-4">
      <div className="p-4 bg-[var(--status-dnd)]/10 border border-[var(--status-dnd)]/30 rounded-[4px]">
        <h4 className="text-sm font-bold text-[var(--status-dnd)] mb-1">
          Xóa vĩnh viễn máy chủ
        </h4>
        <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
          Hành động này <strong className="text-[var(--status-dnd)]">không thể hoàn tác</strong>. Toàn bộ tin nhắn, kênh chat, vai trò và dữ liệu của máy chủ <strong>{workspace.name}</strong> sẽ bị xóa vĩnh viễn khỏi hệ thống.
        </p>
      </div>

      {deleteError && (
        <div className="p-3 bg-[var(--status-dnd)]/10 border border-[var(--status-dnd)]/30 rounded-[4px] text-xs text-[var(--status-dnd)] flex items-center gap-2">
          <Warning size={16} weight="bold" />
          <span>{deleteError}</span>
        </div>
      )}

      <div>
        <label className="block text-xs font-semibold text-[var(--text-primary)] mb-1.5">
          Nhập chính xác tên máy chủ <span className="font-bold text-[var(--status-dnd)]">"{workspace.name}"</span> để xác nhận:
        </label>
        <Input
          value={deleteConfirmText}
          onChange={(e) => setDeleteConfirmText(e.target.value)}
          placeholder={workspace.name}
        />
      </div>

      <Button
        variant="danger"
        size="sm"
        onClick={handleDeleteServer}
        disabled={isDeleting || deleteConfirmText !== workspace.name}
      >
        {isDeleting ? 'Đang xóa máy chủ...' : 'Tôi hiểu hậu quả, xóa máy chủ này'}
      </Button>
    </div>
  );
};
