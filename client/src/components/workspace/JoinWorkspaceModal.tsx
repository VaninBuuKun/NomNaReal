import React, { useState } from 'react';
import { SignIn, Link as LinkIcon, Info } from '@phosphor-icons/react';
import { Modal, Button } from '../ui';
import { workspaceApi } from '../../services';
import type { Workspace } from '../../types';

interface JoinWorkspaceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onWorkspaceJoined: (workspace: Workspace) => void;
}

export const JoinWorkspaceModal: React.FC<JoinWorkspaceModalProps> = ({
  isOpen,
  onClose,
  onWorkspaceJoined,
}) => {
  const [inviteInput, setInviteInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = inviteInput.trim();
    if (!trimmed) {
      setError('Vui lòng nhập mã mời hoặc đường dẫn tham gia.');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      // Clean code if full URL was pasted
      let cleanCode = trimmed;
      if (cleanCode.includes('/')) {
        const segments = cleanCode.split('/').filter(Boolean);
        cleanCode = segments[segments.length - 1];
      }

      const joinedWorkspace = await workspaceApi.joinWorkspace(cleanCode);
      onWorkspaceJoined(joinedWorkspace);
      handleClose();
    } catch (err: unknown) {
      const errorObj = err as { response?: { data?: { message?: string } } };
      setError(
        errorObj?.response?.data?.message ||
          'Không thể tham gia Workspace. Mã mời không đúng hoặc đã hết hạn.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setInviteInput('');
    setError(null);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Tham gia Workspace"
      subtitle="Nhập mã mời hoặc liên kết bạn nhận được từ đồng nghiệp để gia nhập Workspace."
      className="max-w-[460px]"
    >
      <form onSubmit={handleSubmit} className="p-6 space-y-4">
        {error && (
          <div className="p-3 text-xs rounded-[3px] bg-rose-500/10 border border-rose-500/20 text-rose-500 font-medium animate-in fade-in">
            {error}
          </div>
        )}

        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-1.5">
            Mã mời hoặc Đường dẫn <span className="text-[var(--accent-primary)]">*</span>
          </label>
          <div className="relative flex items-center">
            <span className="absolute left-3 text-[var(--text-muted)] pointer-events-none">
              <LinkIcon size={16} weight="bold" />
            </span>
            <input
              type="text"
              value={inviteInput}
              onChange={(e) => {
                setInviteInput(e.target.value);
                if (error) setError(null);
              }}
              placeholder="vd: NEXUS123 hoặc https://nomna.app/join/NEXUS123"
              autoFocus
              className="w-full pl-9 pr-3.5 py-2.5 text-xs rounded-[3px] border border-[var(--border-color)] bg-[var(--bg-surface)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-primary)] focus:ring-1 focus:ring-[var(--accent-primary)] transition-all font-mono"
            />
          </div>
          <p className="text-[11px] text-[var(--text-muted)] mt-1.5 leading-relaxed">
            💡 Bạn có thể dán toàn bộ đường link hoặc chỉ cần nhập mã mời 8 ký tự.
          </p>
        </div>

        <div className="p-3 rounded-[4px] bg-[var(--accent-soft)] border border-[var(--accent-primary)]/20 text-[11px] text-[var(--text-secondary)] flex items-start gap-2">
          <Info size={16} weight="bold" className="text-[var(--accent-primary)] shrink-0 mt-0.5" />
          <span>
            Sau khi tham gia, bạn sẽ có quyền truy cập vào tất cả các kênh thảo luận công cộng và bắt đầu làm việc ngay lập tức.
          </span>
        </div>

        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[var(--border-color)]">
          <Button type="button" variant="ghost" size="sm" onClick={handleClose} disabled={isSubmitting}>
            Hủy
          </Button>
          <Button
            type="submit"
            variant="primary"
            size="sm"
            isLoading={isSubmitting}
            disabled={!inviteInput.trim() || isSubmitting}
            leftIcon={<SignIn size={14} weight="bold" />}
            className="text-xs py-2 px-4 rounded-[3px]"
          >
            Tham gia Workspace
          </Button>
        </div>
      </form>
    </Modal>
  );
};
