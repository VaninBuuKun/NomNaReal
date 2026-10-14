import React, { useState } from 'react';
import { Trash, Warning } from '@phosphor-icons/react';
import { Button } from '../../ui';
import { channelApi } from '../../../services/channelApi';
import { ChannelType, type Channel } from '../../../types';

interface ChannelDangerZoneTabProps {
  channel: Channel;
  onChannelDeleted: (channelId: string) => void;
  onClose: () => void;
}

export const ChannelDangerZoneTab: React.FC<ChannelDangerZoneTabProps> = ({
  channel,
  onChannelDeleted,
  onClose,
}) => {
  const isGeneral = channel.name?.toLowerCase() === 'general';
  const isCategory = channel.type === ChannelType.Category;

  const [isDeleting, setIsDeleting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    if (isGeneral) return;

    try {
      setIsDeleting(true);
      setError(null);
      await channelApi.deleteChannel(channel.id);
      onChannelDeleted(channel.id);
      onClose();
    } catch (err: unknown) {
      console.error('Failed to delete channel:', err);
      const errorObj = err as { response?: { data?: { message?: string } } };
      setError(
        errorObj?.response?.data?.message || 'Không thể xóa kênh này. Vui lòng thử lại!'
      );
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 max-w-xl">
      <h3 className="text-base font-bold text-rose-500 mb-1 flex items-center gap-2">
        <Warning size={20} weight="bold" />
        <span>Vùng nguy hiểm</span>
      </h3>
      <p className="text-xs text-[var(--text-muted)] mb-5">
        Các hành động nhạy cảm có thể ảnh hưởng vĩnh viễn tới dữ liệu kênh
      </p>

      {error && (
        <div className="mb-4 p-3 bg-[var(--status-dnd)]/10 border border-[var(--status-dnd)]/30 rounded-[4px] text-xs text-[var(--status-dnd)] flex items-center gap-2">
          <Warning size={16} weight="bold" />
          <span>{error}</span>
        </div>
      )}

      {isGeneral ? (
        <div className="p-4 bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-[4px] text-xs text-[var(--text-muted)]">
          <p className="font-semibold text-[var(--text-primary)] mb-1">
            Kênh hệ thống mặc định
          </p>
          <p>
            Kênh <span className="font-bold text-[var(--text-primary)]">#general</span> là kênh chat chính của máy chủ và không thể bị xóa.
          </p>
        </div>
      ) : (
        <div className="p-4 bg-rose-500/5 border border-rose-500/20 rounded-[4px] space-y-4">
          <div>
            <h4 className="text-xs font-bold text-rose-500">
              {isCategory ? 'Xóa danh mục' : 'Xóa kênh'}
            </h4>
            <p className="text-[11px] text-[var(--text-muted)] mt-1 leading-relaxed">
              {isCategory
                ? `Hành động này sẽ xóa danh mục "${channel.name}". Các kênh bên trong sẽ được chuyển ra ngoài danh mục.`
                : `Hành động này sẽ xóa vĩnh viễn kênh "${channel.name}" cùng với toàn bộ lịch sử tin nhắn bên trong. Không thể khôi phục sau khi xóa.`}
            </p>
          </div>

          {!showConfirm ? (
            <Button
              type="button"
              variant="danger"
              size="sm"
              onClick={() => setShowConfirm(true)}
              className="flex items-center gap-2"
            >
              <Trash size={14} weight="bold" />
              <span>{isCategory ? 'Xóa danh mục này' : 'Xóa kênh này'}</span>
            </Button>
          ) : (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-[4px] space-y-3">
              <p className="text-xs font-semibold text-rose-400">
                Bạn có chắc chắn muốn xóa {isCategory ? 'danh mục' : 'kênh'}{' '}
                <span className="font-bold text-white">"{channel.name}"</span>?
              </p>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowConfirm(false)}
                  disabled={isDeleting}
                >
                  Hủy bỏ
                </Button>
                <Button
                  type="button"
                  variant="danger"
                  size="sm"
                  onClick={handleDelete}
                  disabled={isDeleting}
                >
                  {isDeleting ? 'Đang xóa...' : 'Xác nhận xóa vĩnh viễn'}
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
