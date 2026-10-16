import React, { useState, useEffect } from 'react';
import { Hash, SpeakerHigh, Lock } from '@phosphor-icons/react';
import { Modal, Button, Input } from '../ui';
import { channelApi } from '../../services/channelApi';
import { ChannelType, type Channel } from '../../types';

interface CreateChannelModalProps {
  isOpen: boolean;
  onClose: () => void;
  workspaceId: string | null;
  channelType?: ChannelType;
  initialCategoryId?: string | null;
  categories?: Channel[];
  onChannelCreated: (channel: Channel) => void;
}

export const CreateChannelModal: React.FC<CreateChannelModalProps> = ({
  isOpen,
  onClose,
  workspaceId,
  channelType = ChannelType.Text,
  initialCategoryId = null,
  categories = [],
  onChannelCreated,
}) => {
  const [type, setType] = useState<ChannelType>(channelType);
  const [name, setName] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>(initialCategoryId || '');
  const [isPrivate, setIsPrivate] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setType(channelType);
      setSelectedCategoryId(initialCategoryId || '');
      setName('');
      setIsPrivate(false);
      setError(null);
    }
  }, [isOpen, channelType, initialCategoryId]);

  const isCategory = type === ChannelType.Category;
  const isVoice = type === ChannelType.Voice;

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (isCategory) {
      setName(val);
    } else if (isVoice) {
      setName(val);
    } else {
      setName(val.toLowerCase().replace(/\s+/g, '-'));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workspaceId) {
      setError('Không tìm thấy máy chủ hiện tại.');
      return;
    }

    const trimmedName = name.trim();
    if (!trimmedName) {
      setError('Vui lòng nhập tên.');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      const newChannel = await channelApi.createChannel(workspaceId, {
        name: isCategory ? trimmedName.toUpperCase() : trimmedName,
        type,
        isPrivate: isCategory ? false : isPrivate,
        categoryId: isCategory || !selectedCategoryId ? null : selectedCategoryId,
      });

      onChannelCreated(newChannel);
      handleClose();
    } catch (err: unknown) {
      console.error('Failed to create channel/category:', err);
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

  const getModalTitle = () => {
    if (isCategory) return 'Tạo danh mục mới';
    if (isVoice) return 'Tạo kênh thoại mới';
    return 'Tạo kênh chat mới';
  };

  const getModalSubtitle = () => {
    if (isCategory) return 'Danh mục dùng để gom nhóm các kênh văn bản và âm thanh lại với nhau.';
    if (isVoice) return 'Kênh thoại cho phép các thành viên trò chuyện bằng âm thanh và chia sẻ màn hình.';
    return 'Kênh văn bản là nơi mọi người gửi tin nhắn, ảnh, tệp đính kèm và thảo luận.';
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={getModalTitle()}
      subtitle={getModalSubtitle()}
      className="max-w-[480px]"
    >
      <form onSubmit={handleSubmit} className="p-6 space-y-4">
        {error && (
          <div className="p-3 text-xs rounded-[3px] bg-[var(--status-dnd)]/10 border border-[var(--status-dnd)]/20 text-[var(--status-dnd)] font-medium">
            {error}
          </div>
        )}

        {/* Type Selector Tabs (Only shown when creating a channel, hidden when creating a category) */}
        {!isCategory && (
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-text-muted mb-2">
              Loại kênh
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setType(ChannelType.Text)}
                className={`p-3 rounded-control border flex flex-col items-center gap-1.5 transition-colors cursor-pointer text-center ${
                  type === ChannelType.Text
                    ? 'bg-surface-active border-accent-primary text-text-primary font-semibold'
                    : 'bg-surface border-border text-text-muted hover:text-text-primary hover:border-border-hover'
                }`}
              >
                <Hash size={20} weight="bold" className="text-accent-primary" />
                <span className="text-xs font-medium">Kênh chat</span>
              </button>

              <button
                type="button"
                onClick={() => setType(ChannelType.Voice)}
                className={`p-3 rounded-control border flex flex-col items-center gap-1.5 transition-colors cursor-pointer text-center ${
                  type === ChannelType.Voice
                    ? 'bg-surface-active border-accent-primary text-text-primary font-semibold'
                    : 'bg-surface border-border text-text-muted hover:text-text-primary hover:border-border-hover'
                }`}
              >
                <SpeakerHigh size={20} weight="bold" className="text-accent-primary" />
                <span className="text-xs font-medium">Kênh thoại</span>
              </button>
            </div>
          </div>
        )}

        {/* Channel Name Input */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] mb-1.5">
            {isCategory ? 'Tên danh mục' : 'Tên kênh'}{' '}
            <span className="text-[var(--status-dnd)]">*</span>
          </label>
          <Input
            value={name}
            onChange={handleNameChange}
            placeholder={
              isCategory
                ? 'vd: DỰ ÁN MỚI, TRÒ CHUYỆN'
                : isVoice
                ? 'vd: Phòng họp tuần, Phòng chơi game'
                : 'vd: ke-hoach-quy-4, general, dev-ops'
            }
            required
            autoFocus
          />
        </div>

        {/* Category Placement (Only for non-categories and when categories exist) */}
        {!isCategory && categories.length > 0 && (
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-text-muted mb-1.5">
              Thuộc danh mục
            </label>
            <select
              value={selectedCategoryId}
              onChange={(e) => setSelectedCategoryId(e.target.value)}
              className="w-full px-3 py-2 bg-sidebar border border-border rounded-control text-xs text-text-primary focus:outline-hidden focus:border-accent-primary cursor-pointer"
            >
              <option value="">(Không thuộc danh mục nào)</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  📁 {cat.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Private Channel Toggle (Non-categories only) */}
        {!isCategory && (
          <div className="pt-2 border-t border-border">
            <label className="flex items-start gap-3 cursor-pointer group">
              <input
                type="checkbox"
                checked={isPrivate}
                onChange={(e) => setIsPrivate(e.target.checked)}
                className="w-4 h-4 rounded-control accent-accent-primary cursor-pointer mt-0.5"
              />
              <div>
                <div className="text-xs font-bold text-text-primary flex items-center gap-1.5 group-hover:text-accent-primary transition-colors">
                  <Lock size={13} weight="bold" />
                  <span>Kênh riêng tư</span>
                </div>
                <div className="text-[11px] text-text-muted leading-relaxed">
                  Chỉ những thành viên hoặc vai trò được cấp quyền mới có thể xem và tham gia.
                </div>
              </div>
            </label>
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-border">
          <Button type="button" variant="ghost" size="sm" onClick={handleClose} disabled={isSubmitting}>
            Hủy
          </Button>
          <Button
            type="submit"
            variant="primary"
            size="sm"
            disabled={isSubmitting || !name.trim()}
          >
            {isSubmitting ? 'Đang tạo...' : isCategory ? 'Tạo danh mục' : 'Tạo kênh'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
