import React, { useState } from 'react';
import { Clock, WarningCircle } from '@phosphor-icons/react';
import { Modal, Button, UserAvatar } from '../ui';
import type { DirectMessageUser } from '../dm';

interface TimeoutMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  member: DirectMessageUser | null;
  serverName?: string;
  onConfirmTimeout: (member: DirectMessageUser, durationMinutes: number, reason?: string) => Promise<void>;
}

const TIMEOUT_OPTIONS = [
  { label: '60 giây', value: 1 },
  { label: '5 phút', value: 5 },
  { label: '10 phút', value: 10 },
  { label: '1 giờ', value: 60 },
  { label: '1 ngày', value: 1440 },
  { label: '7 ngày', value: 10080 },
  { label: 'Gỡ tạm khóa', value: 0 },
];

export const TimeoutMemberModal: React.FC<TimeoutMemberModalProps> = ({
  isOpen,
  onClose,
  member,
  serverName,
  onConfirmTimeout,
}) => {
  const [durationMinutes, setDurationMinutes] = useState(5);
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!member) return null;

  const handleSubmit = async () => {
    try {
      setIsSubmitting(true);
      setError(null);
      await onConfirmTimeout(member, durationMinutes, reason.trim() || undefined);
      onClose();
    } catch (err: unknown) {
      const errorObj = err as { response?: { data?: { message?: string } } };
      setError(errorObj?.response?.data?.message || 'Không thể đặt tạm khóa cho thành viên này.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Tạm khóa chat"
      subtitle={
        serverName
          ? `Thành viên sẽ không thể gửi tin nhắn hoặc phát biểu trong ${serverName}.`
          : "Thành viên sẽ không thể gửi tin nhắn hoặc phát biểu trong máy chủ."
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

        {/* Duration Combobox (clean, compact) */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
            Thời lượng tạm khóa
          </label>
          <select
            value={durationMinutes}
            onChange={(e) => setDurationMinutes(Number(e.target.value))}
            className="w-full px-3 py-2 bg-surface border border-border rounded-control text-xs text-text-primary focus:outline-hidden focus:border-accent-primary cursor-pointer"
          >
            {TIMEOUT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Reason field */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
            Lý do (Tùy chọn)
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Ví dụ: Cần hạ nhiệt, spam tin nhắn..."
            rows={2}
            maxLength={512}
            className="w-full px-3 py-2 bg-surface border border-border rounded-control text-xs text-text-primary placeholder:text-text-muted focus:outline-hidden focus:border-accent-primary resize-none"
          />
        </div>

        <div className="flex items-center gap-2 p-2.5 rounded-control bg-warning-soft border border-warning/20 text-warning text-xs">
          <WarningCircle size={16} className="shrink-0" />
          <span>
            {durationMinutes > 0
              ? 'Thành viên sẽ bị chặn gửi tin nhắn cho đến khi hết thời lượng.'
              : 'Gỡ bỏ trạng thái tạm khóa ngay lập tức.'}
          </span>
        </div>

        <div className="flex items-center justify-end gap-2.5 pt-2">
          <Button variant="ghost" size="sm" onClick={onClose} disabled={isSubmitting}>
            Hủy
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleSubmit}
            isLoading={isSubmitting}
            leftIcon={<Clock size={15} />}
          >
            {durationMinutes > 0 ? 'Xác nhận tạm khóa' : 'Gỡ tạm khóa'}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
