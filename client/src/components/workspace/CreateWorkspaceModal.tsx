import React, { useState, useRef } from 'react';
import { UploadCloud, Sparkles, Check, Loader2 } from 'lucide-react';
import { Modal, Button, Input } from '../ui';
import { workspaceApi } from '../../services/workspaceApi';
import { fileApi } from '../../services/fileApi';
import type { Workspace } from '../../types';

interface CreateWorkspaceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onWorkspaceCreated: (workspace: Workspace) => void;
}

const PRESET_AVATARS = [
  { id: 'cyan', label: 'Mascot Cyan', url: '/default-avatar.png' },
  { id: 'orange', label: 'Mascot Cam', url: '/avatars/avatar-orange.jpg' },
  { id: 'purple', label: 'Mascot Tím', url: '/avatars/avatar-purple.jpg' },
];

export const CreateWorkspaceModal: React.FC<CreateWorkspaceModalProps> = ({
  isOpen,
  onClose,
  onWorkspaceCreated,
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [iconUrl, setIconUrl] = useState('/default-avatar.png');
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Vui lòng chọn tệp hình ảnh hợp lệ (.png, .jpg, .webp).');
      return;
    }

    if (file.size > 20 * 1024 * 1024) {
      setError('Kích thước ảnh không được vượt quá 20MB.');
      return;
    }

    try {
      setIsUploading(true);
      setError(null);
      const res = await fileApi.uploadFile(file, 'workspaces');
      setIconUrl(res.url);
    } catch (err: unknown) {
      const errorObj = err as { response?: { data?: { message?: string } } };
      setError(errorObj?.response?.data?.message || 'Không thể tải ảnh lên. Vui lòng thử lại.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Vui lòng nhập tên Không gian làm việc.');
      return;
    }
    if (!iconUrl.trim()) {
      setError('Vui lòng chọn hoặc tải lên ảnh đại diện không gian làm việc.');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      const newWs = await workspaceApi.createWorkspace(name.trim(), iconUrl.trim(), description.trim() || undefined);
      onWorkspaceCreated(newWs);
      handleClose();
    } catch (err: unknown) {
      const errorObj = err as { response?: { data?: { message?: string } } };
      setError(errorObj?.response?.data?.message || 'Tạo máy chủ thất bại.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setName('');
    setDescription('');
    setIconUrl('/default-avatar.png');
    setError(null);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Tạo Không gian làm việc"
      subtitle="Không gian là nơi nhóm của bạn trò chuyện, gọi điện và chia sẻ tài liệu."
      className="max-w-[540px]"
    >
      <form onSubmit={handleSubmit} className="p-6 space-y-5">
        {error && (
          <div className="p-3 text-xs rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 font-medium">
            {error}
          </div>
        )}

        {/* Avatar Selection (Mandatory) */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-2">
            Ảnh đại diện Không gian <span className="text-[var(--accent-primary)]">*</span>
          </label>

          <div className="flex items-center gap-4">
            {/* Current Selected Avatar Preview */}
            <div className="relative group shrink-0">
              <img
                src={iconUrl}
                alt="Workspace Icon Preview"
                className="w-16 h-16 rounded-2xl object-cover border-2 border-[var(--border-color)] group-hover:border-[var(--accent-primary)] transition-all shadow-sm"
              />
              {isUploading && (
                <div className="absolute inset-0 bg-black/50 rounded-2xl flex items-center justify-center">
                  <Loader2 size={20} className="animate-spin text-white" />
                </div>
              )}
            </div>

            {/* Upload Custom Image Button */}
            <div className="flex-1 space-y-1.5">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                leftIcon={<UploadCloud size={15} />}
                className="w-full text-xs"
              >
                {isUploading ? 'Đang tải lên...' : 'Tải ảnh máy tính lên'}
              </Button>
              <p className="text-[11px] text-[var(--text-muted)]">
                Khuyến nghị tỉ lệ 1:1 vuông, dung lượng tối đa 20MB.
              </p>
            </div>
          </div>

          {/* Quick Mascot Presets */}
          <div className="mt-3.5">
            <div className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)] mb-2">
              <Sparkles size={13} className="text-[var(--accent-primary)]" />
              <span>Hoặc chọn biểu tượng Mascot NomNa:</span>
            </div>
            <div className="grid grid-cols-3 gap-2.5">
              {PRESET_AVATARS.map((preset) => {
                const isSelected = iconUrl === preset.url;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => setIconUrl(preset.url)}
                    className={`flex items-center gap-2 px-2.5 py-2 rounded-xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'border-[var(--accent-primary)] bg-[var(--accent-light)] shadow-xs'
                        : 'border-[var(--border-color)] hover:border-[var(--text-muted)] bg-[var(--bg-surface)]'
                    }`}
                  >
                    <img
                      src={preset.url}
                      alt={preset.label}
                      className="w-7 h-7 rounded-lg object-cover shrink-0"
                    />
                    <span className="text-xs font-semibold truncate text-[var(--text-primary)]">
                      {preset.label.replace('Mascot ', '')}
                    </span>
                    {isSelected && (
                      <Check size={13} className="ml-auto text-[var(--accent-primary)] shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Workspace Name (Mandatory) */}
        <div>
          <Input
            label="Tên không gian làm việc *"
            placeholder="VD: NomNa Devs, Anime Lounge..."
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            autoFocus
          />
        </div>

        {/* Description (Optional) */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">
              Mô tả không gian (Không bắt buộc)
            </label>
            <span className="text-[11px] text-[var(--text-muted)]">
              {description.length}/300 ký tự
            </span>
          </div>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value.slice(0, 300))}
            placeholder="VD: Không gian trao đổi kỹ thuật, cập nhật kiến trúc hệ thống và thảo luận công nghệ của team..."
            rows={4}
            className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-[var(--border-color)] bg-[var(--bg-input)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-primary)] focus:ring-1 focus:ring-[var(--accent-primary)] transition-all resize-none leading-relaxed"
          />
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-[var(--border-color)]">
          <Button type="button" variant="ghost" onClick={handleClose} disabled={isSubmitting}>
            Hủy
          </Button>
          <Button
            type="submit"
            variant="primary"
            isLoading={isSubmitting}
            disabled={!name.trim() || !iconUrl.trim() || isUploading}
          >
            Tạo không gian
          </Button>
        </div>
      </form>
    </Modal>
  );
};
