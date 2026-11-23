import React, { useState } from 'react';
import { Clock, WarningCircle } from '@phosphor-icons/react';
import { Modal, Button, ImageWithSkeleton } from '../ui';
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
  { label: 'Gỡ timeout', value: 0 },
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
      setError(errorObj?.response?.data?.message || 'Không thể đặt timeout cho thành viên này.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Tạm thời cấm chat (Timeout)"
      subtitle="Thành viên sẽ không thể gửi tin nhắn, thả cảm xúc hoặc nói trong kênh thoại."
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

        <div className="space-y-2">
          <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
            Thời lượng cấm chat
          </label>
          <div className="grid grid-cols-2 gap-2">
            {TIMEOUT_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setDurationMinutes(opt.value)}
                className={`p-2.5 rounded-control text-xs font-medium border text-left transition-colors cursor-pointer ${
                  durationMinutes === opt.value
                    ? 'bg-accent-soft border-accent-primary text-accent-primary shadow-xs'
                    : 'bg-surface border-border text-text-secondary hover:bg-surface-active'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
            Lý do (Tùy chọn)
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Ví dụ: Spam tin nhắn, vi phạm nội quy..."
            rows={2}
            className="w-full p-2.5 text-xs bg-chat border border-border rounded-control text-text-primary placeholder:text-text-muted outline-none focus:border-accent-primary transition-colors resize-none"
          />
        </div>

        <div className="flex items-start gap-2.5 p-3 rounded-control bg-warning-soft text-warning text-xs font-medium border border-warning/20">
          <WarningCircle size={16} className="shrink-0 mt-0.5" />
          <span>
            {durationMinutes === 0
              ? `Gỡ bỏ trạng thái timeout cho ${member.displayName}.`
              : `Thành viên sẽ bị cấm phát ngôn trong ${TIMEOUT_OPTIONS.find((o) => o.value === durationMinutes)?.label} trên ${serverName || 'máy chủ'}.`}
          </span>
        </div>

        <div className="flex items-center justify-end gap-3 pt-2">
          <Button variant="ghost" size="sm" onClick={onClose} disabled={isSubmitting}>
            Hủy
          </Button>
          <Button
            variant={durationMinutes === 0 ? 'secondary' : 'primary'}
            size="sm"
            onClick={handleSubmit}
            isLoading={isSubmitting}
            leftIcon={<Clock size={16} />}
          >
            {durationMinutes === 0 ? 'Gỡ timeout' : 'Xác nhận timeout'}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
