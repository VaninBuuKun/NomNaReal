import React, { useState } from 'react';
import { SignOut, WarningCircle } from '@phosphor-icons/react';
import { Modal, Button } from '../ui';
import type { Workspace } from '../../types';

interface LeaveServerModalProps {
  isOpen: boolean;
  onClose: () => void;
  workspace: Workspace | null;
  onConfirmLeave: () => Promise<void>;
}

export const LeaveServerModal: React.FC<LeaveServerModalProps> = ({
  isOpen,
  onClose,
  workspace,
  onConfirmLeave,
}) => {
  const [isLeaving, setIsLeaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!workspace) return null;

  const handleLeave = async () => {
    try {
      setIsLeaving(true);
      setError(null);
      await onConfirmLeave();
      onClose();
    } catch (err: unknown) {
      const errorObj = err as { response?: { data?: { message?: string } } };
      setError(errorObj?.response?.data?.message || 'Không thể rời máy chủ. Vui lòng thử lại sau.');
    } finally {
      setIsLeaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Rời khỏi máy chủ"
      subtitle="Xác nhận việc rời khỏi máy chủ này."
      className="max-w-[440px]"
    >
      <div className="p-6 space-y-5">
        {error && (
          <div className="p-3 text-xs rounded-control bg-danger-soft border border-danger/20 text-danger font-medium">
            {error}
          </div>
        )}

        {/* Server Preview Card */}
        <div className="flex items-center gap-3.5 p-3 rounded-card bg-surface border border-border">
          <div className="w-11 h-11 rounded-control bg-accent-primary text-on-accent font-bold text-base flex items-center justify-center shrink-0">
            {workspace.iconUrl ? (
              <img
                src={workspace.iconUrl}
                alt={workspace.name}
                className="w-full h-full object-cover rounded-control"
              />
            ) : (
              workspace.name.substring(0, 2).toUpperCase()
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-bold text-text-primary truncate">
              {workspace.name}
            </div>
            <div className="text-xs text-text-muted truncate">
              {workspace.description || 'Máy chủ NomNa'}
            </div>
          </div>
        </div>

        {/* Warning Banner */}
        <div className="flex gap-2.5 p-3.5 rounded-control bg-warning-soft border border-warning/25 text-warning text-xs">
          <WarningCircle size={18} weight="fill" className="shrink-0 mt-0.5" />
          <div className="leading-relaxed">
            Bạn có chắc chắn muốn rời khỏi <strong className="text-text-primary font-bold">{workspace.name}</strong>? Bạn sẽ không thể tham gia lại trừ khi nhận được lời mời mới.
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClose}
            disabled={isLeaving}
          >
            Hủy bỏ
          </Button>
          <Button
            type="button"
            variant="danger"
            size="sm"
            isLoading={isLeaving}
            onClick={handleLeave}
            leftIcon={<SignOut size={15} weight="bold" />}
          >
            Rời máy chủ
          </Button>
        </div>
      </div>
    </Modal>
  );
};
