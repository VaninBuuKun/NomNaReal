import React, { useState } from "react";
import { UserMinus, WarningCircle } from "@phosphor-icons/react";
import { Modal, Button, ImageWithSkeleton } from "../ui";
import type { DirectMessageUser } from "../dm";

interface KickMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  member: DirectMessageUser | null;
  workspaceName?: string;
  onConfirmKick: (member: DirectMessageUser) => Promise<void>;
}

export const KickMemberModal: React.FC<KickMemberModalProps> = ({
  isOpen,
  onClose,
  member,
  workspaceName,
  onConfirmKick,
}) => {
  const [isKicking, setIsKicking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!member) return null;

  const handleKick = async () => {
    try {
      setIsKicking(true);
      setError(null);
      await onConfirmKick(member);
      onClose();
    } catch (err: unknown) {
      const errorObj = err as { response?: { data?: { message?: string } } };
      setError(errorObj?.response?.data?.message || "Không thể đuổi thành viên này.");
    } finally {
      setIsKicking(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Đuổi thành viên"
      subtitle="Xác nhận thu hồi quyền truy cập không gian làm việc của thành viên."
      className="max-w-[440px]"
    >
      <div className="p-6 space-y-5">
        {error && (
          <div className="p-3 text-xs rounded-[3px] bg-rose-500/10 border border-rose-500/20 text-rose-500 font-medium">
            {error}
          </div>
        )}

        {/* Member Preview Card */}
        <div className="flex items-center gap-3.5 p-3 rounded-[4px] bg-[var(--bg-surface)] border border-[var(--border-color)]">
          <div className="relative w-11 h-11 shrink-0">
            <ImageWithSkeleton
              src={member.avatarUrl}
              alt={member.displayName}
              className="w-11 h-11 rounded-full object-cover border border-[var(--border-color)]"
            />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-bold text-[var(--text-primary)] truncate">
              {member.displayName}
            </div>
            <div className="text-xs text-[var(--text-muted)] truncate">
              @{member.username}
            </div>
          </div>
        </div>

        {/* Warning Banner */}
        <div className="flex gap-2.5 p-3.5 rounded-[4px] bg-amber-500/10 border border-amber-500/25 text-amber-500 text-xs">
          <WarningCircle size={18} weight="fill" className="shrink-0 mt-0.5" />
          <div className="leading-relaxed">
            Bạn có chắc chắn muốn đuổi <strong className="text-[var(--text-primary)] font-bold">@{member.username}</strong> khỏi <strong className="text-[var(--text-primary)] font-bold">{workspaceName || "không gian này"}</strong>? Họ sẽ mất toàn bộ quyền truy cập vào các kênh và tin nhắn.
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-[var(--border-color)]">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClose}
            disabled={isKicking}
          >
            Hủy bỏ
          </Button>
          <Button
            type="button"
            variant="danger"
            size="sm"
            isLoading={isKicking}
            onClick={handleKick}
            leftIcon={<UserMinus size={15} weight="bold" />}
          >
            Đuổi khỏi nhóm
          </Button>
        </div>
      </div>
    </Modal>
  );
};
