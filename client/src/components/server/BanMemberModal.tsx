import React, { useState } from 'react';
import { Prohibit, WarningCircle } from '@phosphor-icons/react';
import { Modal, Button, ImageWithSkeleton } from '../ui';
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
      subtitle="Thành viên sẽ bị trục xuất khỏi máy chủ và không thể tham gia lại bằng liên kết mời."
      className="max-w-[440px]"
    >
      <div className="p-6 space-y-5">
        {error && (
          <div className="p-3 text-xs rounded-control bg-danger-soft border border-danger/20 text-danger font-medium">
            {error}
          </div>
        )}

        <div className="flex items-center gap-3 p-3 rounded-control bg-surface border border-border">
          <div className="w-10 h-10 rounded-full overflow-hidden bg-chat shrink-0 border border-border">
            <ImageWithSkeleton
              src={member.avatarUrl}
              alt={member.displayName}
              className="w-full h-full object-cover"
            />
          </div>
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
            className="w-full p-2.5 text-xs bg-chat border border-border rounded-control text-text-primary placeholder:text-text-muted outline-none focus:border-accent-primary transition-colors resize-none"
          />
        </div>

        <div className="flex items-start gap-2.5 p-3 rounded-control bg-danger-soft text-danger text-xs font-medium border border-danger/20">
          <WarningCircle size={16} className="shrink-0 mt-0.5" />
          <span>
            Hành động này sẽ xóa thành viên khỏi <b>{serverName || 'máy chủ'}</b> và đưa vào danh sách đen (Blacklist).
          </span>
        </div>

        <div className="flex items-center justify-end gap-3 pt-2">
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
            Cấm vĩnh viễn
          </Button>
        </div>
      </div>
    </Modal>
  );
};
