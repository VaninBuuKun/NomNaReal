import React, { useState, useEffect, useMemo } from 'react';
import { Warning } from '@phosphor-icons/react';
import { Input, UnsavedChangesBar } from '../../ui';
import { channelApi } from '../../../services/channelApi';
import { ChannelType, type Channel } from '../../../types';

interface ChannelOverviewTabProps {
  channel: Channel;
  categories?: Channel[];
  onChannelUpdated: (channel: Channel) => void;
}

export const ChannelOverviewTab: React.FC<ChannelOverviewTabProps> = ({
  channel,
  categories = [],
  onChannelUpdated,
}) => {
  const isCategory = channel.type === ChannelType.Category;
  const isGeneral = channel.name?.toLowerCase() === 'general';

  const [name, setName] = useState(channel.name || '');
  const [topic, setTopic] = useState(channel.topic || '');
  const [categoryId, setCategoryId] = useState<string>(channel.categoryId || '');
  const [isPrivate, setIsPrivate] = useState<boolean>(channel.isPrivate || false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setName(channel.name || '');
    setTopic(channel.topic || '');
    setCategoryId(channel.categoryId || '');
    setIsPrivate(channel.isPrivate || false);
    setError(null);
  }, [channel]);

  const isDirty = useMemo(() => {
    const origName = channel.name || '';
    const origTopic = channel.topic || '';
    const origCategory = channel.categoryId || '';
    const origPrivate = channel.isPrivate || false;

    return (
      name !== origName ||
      topic !== origTopic ||
      categoryId !== origCategory ||
      isPrivate !== origPrivate
    );
  }, [name, topic, categoryId, isPrivate, channel]);

  const handleReset = () => {
    setName(channel.name || '');
    setTopic(channel.topic || '');
    setCategoryId(channel.categoryId || '');
    setIsPrivate(channel.isPrivate || false);
    setError(null);
  };

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!name.trim()) {
      setError('Tên kênh không được để trống.');
      return;
    }

    try {
      setIsSaving(true);
      setError(null);

      const updated = await channelApi.updateChannel(channel.id, {
        name: name.trim(),
        topic: topic.trim() || null,
        categoryId: categoryId ? categoryId : '00000000-0000-0000-0000-000000000000', // Empty GUID unsets category
        isPrivate,
      });

      onChannelUpdated(updated);
    } catch (err: unknown) {
      console.error('Failed to update channel overview:', err);
      const errorObj = err as { response?: { data?: { message?: string } } };
      setError(
        errorObj?.response?.data?.message || 'Lỗi khi cập nhật kênh. Vui lòng thử lại!'
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="relative flex-1 flex flex-col min-h-0 h-full overflow-hidden">
      <div className="flex-1 overflow-y-auto p-6 pb-24 max-w-xl">
        <h3 className="text-base font-bold text-[var(--text-primary)] mb-1">
          {isCategory ? 'Tổng quan danh mục' : 'Tổng quan kênh'}
        </h3>
        <p className="text-xs text-[var(--text-muted)] mb-5">
          {isCategory
            ? 'Tùy chỉnh thông tin tên hiển thị cho danh mục này'
            : 'Tùy chỉnh tên, chủ đề và phân loại danh mục cho kênh'}
        </p>

        {error && (
          <div className="mb-4 p-3 bg-[var(--status-dnd)]/10 border border-[var(--status-dnd)]/30 rounded-[4px] text-xs text-[var(--status-dnd)] flex items-center gap-2">
            <Warning size={16} weight="bold" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-4">
          {/* Channel Name */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] mb-1.5">
              {isCategory ? 'Tên danh mục' : 'Tên kênh'}{' '}
              <span className="text-[var(--status-dnd)]">*</span>
            </label>
            <Input
              value={name}
              onChange={(e) => {
                const val = e.target.value;
                setName(val);
              }}
              placeholder={isCategory ? 'vd: KÊNH THẢO LUẬN' : 'vd: tin-tuc-moi'}
              disabled={isGeneral}
              required
            />
            {isGeneral && (
              <p className="text-[11px] text-[var(--text-muted)] mt-1">
                Kênh mặc định #general không thể đổi tên.
              </p>
            )}
          </div>

          {/* Channel Topic (Non-category channels) */}
          {!isCategory && (
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] mb-1.5">
                Chủ đề kênh
              </label>
              <textarea
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="Mô tả mục đích của kênh này cho các thành viên..."
                rows={3}
                maxLength={1024}
                className="w-full px-3 py-2 bg-[var(--bg-sidebar)] border border-[var(--border-color)] rounded-[4px] text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-hidden focus:border-[var(--accent-primary)] resize-none"
              />
              <div className="flex justify-end mt-1">
                <span className="text-[10px] text-[var(--text-muted)]">
                  {topic.length}/1024
                </span>
              </div>
            </div>
          )}

          {/* Category Selector (Non-category channels) */}
          {!isCategory && categories.length > 0 && (
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] mb-1.5">
                Thuộc danh mục
              </label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full px-3 py-2 bg-[var(--bg-sidebar)] border border-[var(--border-color)] rounded-[4px] text-xs text-[var(--text-primary)] focus:outline-hidden focus:border-[var(--accent-primary)] cursor-pointer"
              >
                <option value="">(Không có danh mục)</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    📁 {cat.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Private Channel Toggle */}
          {!isGeneral && (
            <div className="pt-2 border-t border-[var(--border-color)]">
              <label className="flex items-start gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={isPrivate}
                  onChange={(e) => setIsPrivate(e.target.checked)}
                  className="w-4 h-4 rounded-[3px] accent-[var(--accent-primary)] cursor-pointer mt-0.5"
                />
                <div>
                  <div className="text-xs font-bold text-[var(--text-primary)] group-hover:text-[var(--accent-primary)] transition-colors">
                    Kênh riêng tư
                  </div>
                  <div className="text-[11px] text-[var(--text-muted)] leading-relaxed">
                    Chỉ những thành viên hoặc vai trò được cấp quyền mới có thể xem và truy cập kênh này.
                  </div>
                </div>
              </label>
            </div>
          )}
        </form>
      </div>

      <UnsavedChangesBar
        show={isDirty}
        isSaving={isSaving}
        onReset={handleReset}
        onSave={() => handleSave()}
      />
    </div>
  );
};
