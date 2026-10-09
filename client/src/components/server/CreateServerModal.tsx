import React, { useState, useRef } from 'react';
import { UploadCloud, Loader2 } from 'lucide-react';
import { getMediaUrl } from '../../utils/constants';
import { Modal, Button, Input } from '../ui';
import { workspaceApi } from '../../services/serverApi';
import { fileApi } from '../../services/fileApi';
import type { Workspace } from '../../types';

interface CreateWorkspaceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onWorkspaceCreated: (workspace: Workspace) => void;
}

export const CreateWorkspaceModal: React.FC<CreateWorkspaceModalProps> = ({
  isOpen,
  onClose,
  onWorkspaceCreated,
}) => {
  const [name, setName] = useState('');
  const [iconUrl, setIconUrl] = useState('');
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
      setError('Vui lòng nhập tên Server.');
      return;
    }
    if (!iconUrl.trim()) {
      setError('Vui lòng tải lên ảnh đại diện cho Server.');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      const newWs = await workspaceApi.createWorkspace(name.trim(), iconUrl.trim());
      onWorkspaceCreated(newWs);
      handleClose();
    } catch (err: unknown) {
      const errorObj = err as { response?: { data?: { message?: string } } };
      setError(errorObj?.response?.data?.message || 'Tạo Server thất bại.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setName('');
    setIconUrl('/default-avatar.png');
    setError(null);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Tạo Server mới"
      subtitle="Server là nơi bạn và cộng đồng cùng trò chuyện, kết nối và giao lưu."
      className="max-w-[480px]"
    >
      <form onSubmit={handleSubmit} className="p-6 space-y-5">
        {error && (
          <div className="p-3 text-xs rounded-[3px] bg-rose-500/10 border border-rose-500/20 text-rose-500 font-medium">
            {error}
          </div>
        )}

        {/* Avatar Selection (Mandatory) */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-2">
            Ảnh đại diện Server <span className="text-[var(--accent-primary)]">*</span>
          </label>

          <div className="flex items-center gap-4">
            {/* Current Selected Avatar Preview */}
            <div className="relative group shrink-0">
              <img
                src={getMediaUrl(iconUrl)}
                alt="Workspace Icon Preview"
                className="w-16 h-16 rounded-[4px] object-cover border-2 border-[var(--border-color)] group-hover:border-[var(--accent-primary)] transition-all shadow-sm"
                onError={(e) => {
                  e.currentTarget.src = '/default-avatar.png';
                }}
              />
              {isUploading && (
                <div className="absolute inset-0 bg-black/50 rounded-[4px] flex items-center justify-center">
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
                className="w-full text-xs rounded-[3px]"
              >
                {isUploading ? 'Đang tải lên...' : 'Tải ảnh máy tính lên'}
              </Button>
              <p className="text-[11px] text-[var(--text-muted)]">
                Khuyến nghị tỉ lệ 1:1 vuông, dung lượng tối đa 20MB.
              </p>
            </div>
          </div>

          </div>

        {/* Workspace Name (Mandatory) */}
        <div>
          <Input
            label="Tên Server *"
            placeholder="VD: NomNa Gaming, Câu Lạc Bộ Lập Trình..."
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            autoFocus
          />
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-[var(--border-color)]">
          <Button type="button" variant="ghost" size="sm" onClick={handleClose} disabled={isSubmitting}>
            Hủy
          </Button>
          <Button
            type="submit"
            variant="primary"
            size="sm"
            isLoading={isSubmitting}
            disabled={!name.trim() || !iconUrl.trim() || isUploading}
          >
            Tạo Server
          </Button>
        </div>
      </form>
    </Modal>
  );
};
export const CreateServerModal = CreateWorkspaceModal;
