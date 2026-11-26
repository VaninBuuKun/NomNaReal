import React, { useState } from 'react';
import { Prohibit, WarningCircle } from '@phosphor-icons/react';
import { Modal, Button, UserAvatar } from '../ui';
import type { DirectMessageUser } from '../dm';

interface BanMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  member: DirectMessageUser | null;
  serverName?: string;
  onConfirmBan: (member: DirectMessageUser, reason?: string) => Promise<void>;
}

export const BanMemberModal: React.FC<BanMemberModalProps> = ({
  isOpen,
  onClose,
  member,
  serverName,
  onConfirmBan,
}) => {
  const [reason, setReason] = useState('');
  const [isBanning, setIsBanning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!member) return null;

  const handleBan = async () => {
    try {
      setIsBanning(true);
      setError(null);
      await onConfirmBan(member, reason.trim() || undefined);
      onClose();
    } catch (err: unknown) {
      const errorObj = err as { response?: { data?: { message?: string } } };
      setError(errorObj?.response?.data?.message || 'Không thể cấm thành viên này.');
    } finally {
      setIsBanning(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Cấm thành viên vĩnh viễn"
      subtitle={
        serverName
          ? `Thành viên sẽ bị trục xuất khỏi ${serverName} và không thể tham gia lại.`
          : "Thành viên sẽ bị trục xuất khỏi máy chủ và không thể tham gia lại bằng liên kết mời."
      }
      className="max-w-[420px]"
    >
      <div className="p-5 space-y-4">
        {error && (
          <div className="p-3 text-xs rounded-control bg-danger-soft border border-danger/20 text-danger font-medium">
            {error}
          </div>
        )}

        {/* Member preview card with unified UserAvatar */}
        <div className="flex items-center gap-3 p-3 rounded-control bg-surface border border-border">
          <UserAvatar
            name={member.displayName}
            avatarUrl={member.avatarUrl}
            size="md"
            status={member.status}
            className="w-10 h-10 shrink-0"
          />
          <div className="min-w-0 flex-1">
            <h4 className="text-sm font-semibold text-text-primary truncate">
              {member.displayName}
            </h4>
            <p className="text-xs text-text-muted truncate">@{member.username}</p>
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
            Lý do cấm (Tùy chọn)
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Ví dụ: Vi phạm quy định cộng đồng, phát ngôn xúc phạm, spam..."
            rows={3}
            maxLength={512}
            className="w-full px-3 py-2 bg-surface border border-border rounded-control text-xs text-text-primary placeholder:text-text-muted focus:outline-hidden focus:border-danger resize-none"
          />
          <div className="flex justify-between items-center text-[11px] text-text-muted">
            <span>{reason.length}/512 ký tự</span>
          </div>
        </div>

        <div className="flex items-center gap-2 p-3 rounded-control bg-danger-soft border border-danger/20 text-danger text-xs">
          <WarningCircle size={18} className="shrink-0" />
          <span>Hành động này sẽ tước quyền truy cập máy chủ của thành viên ngay lập tức.</span>
        </div>

        <div className="flex items-center justify-end gap-2.5 pt-2">
          <Button variant="ghost" size="sm" onClick={onClose} disabled={isBanning}>
            Hủy
          </Button>
          <Button
            variant="danger"
            size="sm"
            onClick={handleBan}
            isLoading={isBanning}
            leftIcon={<Prohibit size={16} />}
          >
            Xác nhận cấm vĩnh viễn
          </Button>
        </div>
      </div>
    </Modal>
  );
};
