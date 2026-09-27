import React, { useState } from 'react';
import { Hash, SpeakerHigh, Key } from '@phosphor-icons/react';
import { Modal, Button } from '../ui';
import { channelApi } from '../../services/channelApi';
import { ChannelType, type Channel } from '../../types';

interface CreateChannelModalProps {
  isOpen: boolean;
  onClose: () => void;
  workspaceId: string | null;
  channelType: ChannelType;
  onChannelCreated: (channel: Channel) => void;
}

export const CreateChannelModal: React.FC<CreateChannelModalProps> = ({
  isOpen,
  onClose,
  workspaceId,
  channelType = ChannelType.Text,
  onChannelCreated,
}) => {
  const [name, setName] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isVoice = channelType === ChannelType.Voice;

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Format channel name slug: lowercase, replace spaces with hyphen
    const formatted = e.target.value
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-_]/g, '');
    setName(formatted);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workspaceId) {
      setError('Không tìm thấy không gian làm việc hiện tại.');
      return;
    }

    const trimmedName = name.trim();
    if (!trimmedName) {
      setError('Vui lòng nhập tên kênh.');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      const newChannel = await channelApi.createChannel(workspaceId, {
        name: trimmedName,
        type: channelType,
        isPrivate,
      });

      onChannelCreated(newChannel);
      handleClose();
    } catch (err: unknown) {
      const errorObj = err as { response?: { data?: { message?: string } } };
      setError(errorObj?.response?.data?.message || 'Không thể tạo kênh. Vui lòng thử lại.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setName('');
    setIsPrivate(false);
    setError(null);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={isVoice ? 'Tạo Kênh Thoại Mới' : 'Tạo Kênh Thảo Luận Mới'}
      subtitle={
        isVoice
          ? 'Kênh thoại cho phép các thành viên trò chuyện bằng âm thanh và chia sẻ màn hình.'
          : 'Kênh văn bản là nơi nhóm trao đổi tin nhắn, tệp đính kèm và thảo luận.'
      }
      className="max-w-[480px]"
    >
      <form onSubmit={handleSubmit} className="p-6 space-y-5">
        {error && (
          <div className="p-3 text-xs rounded-[3px] bg-rose-500/10 border border-rose-500/20 text-rose-500 font-medium">
            {error}
          </div>
        )}

        {/* Channel Type Indicator Badge */}
        <div className="flex items-center gap-2 p-2.5 rounded-[4px] bg-[var(--bg-surface)] border border-[var(--border-color)]">
          <div className="w-8 h-8 rounded-[3px] bg-[var(--accent-soft)] flex items-center justify-center text-[var(--accent-primary)] shrink-0">
            {isVoice ? <SpeakerHigh size={18} weight="bold" /> : <Hash size={18} weight="bold" />}
          </div>
          <div>
            <div className="text-xs font-bold text-[var(--text-primary)]">
              {isVoice ? 'Kênh thoại (Voice Channel)' : 'Kênh thảo luận (Text Channel)'}
            </div>
            <div className="text-[11px] text-[var(--text-muted)]">
              {isVoice ? 'Âm thanh thời gian thực & kết nối trực tiếp' : 'Gửi tin nhắn, hình ảnh & tệp đính kèm'}
            </div>
          </div>
        </div>

        {/* Channel Name Input */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-1.5">
            Tên kênh <span className="text-[var(--accent-primary)]">*</span>
          </label>
          <div className="relative flex items-center">
            <span className="absolute left-3 text-[var(--text-muted)] font-bold text-sm pointer-events-none select-none">
              {isVoice ? '🔊' : '#'}
            </span>
            <input
              type="text"
              value={name}
              onChange={handleNameChange}
              placeholder={isVoice ? 'vd: phong-hop-tuan, gaming-lounge' : 'vd: ke-hoach-quy-4, general, dev-ops'}
              required
              autoFocus
              className="w-full pl-9 pr-3.5 py-2 text-sm rounded-[3px] border border-[var(--border-color)] bg-[var(--bg-surface)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-primary)] focus:ring-1 focus:ring-[var(--accent-primary)] transition-all font-mono"
            />
          </div>
          <p className="text-[11px] text-[var(--text-muted)] mt-1">
            Chỉ được chứa chữ thường không dấu, số và dấu gạch nối (-).
          </p>
        </div>

        {/* Private Channel Toggle */}
        <div className="p-3 rounded-[4px] border border-[var(--border-color)] bg-[var(--bg-surface)] flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-[3px] bg-[var(--bg-chat)] border border-[var(--border-color)] flex items-center justify-center text-[var(--accent-primary)] shrink-0">
              <Key size={18} weight="duotone" />
            </div>
            <div>
              <div className="text-xs font-bold text-[var(--text-primary)]">
                Kênh riêng tư
              </div>
              <div className="text-[11px] text-[var(--text-muted)] leading-tight">
                Chỉ những thành viên được mời mới có thể xem và tham gia.
              </div>
            </div>
          </div>

          <label className="relative inline-flex items-center cursor-pointer shrink-0">
            <input
              type="checkbox"
              checked={isPrivate}
              onChange={(e) => setIsPrivate(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-9 h-5 bg-neutral-300 peer-focus:outline-none rounded-full peer dark:bg-neutral-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[var(--accent-primary)]"></div>
          </label>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[var(--border-color)]">
          <Button type="button" variant="ghost" size="sm" onClick={handleClose} disabled={isSubmitting}>
            Hủy
          </Button>
          <Button
            type="submit"
            variant="primary"
            size="sm"
            isLoading={isSubmitting}
            disabled={!name.trim()}
          >
            Tạo kênh
          </Button>
        </div>
      </form>
    </Modal>
  );
};
