import React, { useState, useRef, useEffect, useMemo } from 'react';
import { UploadSimple, Warning } from '@phosphor-icons/react';
import { Input, UnsavedChangesBar } from '../../ui';
import { serverApi } from '../../../services/serverApi';
import { fileApi } from '../../../services/fileApi';
import type { Workspace } from '../../../types';

interface ServerOverviewTabProps {
  workspace: Workspace;
  onWorkspaceUpdated?: (ws: Workspace) => void;
}

export const ServerOverviewTab: React.FC<ServerOverviewTabProps> = ({
  workspace,
  onWorkspaceUpdated,
}) => {
  const [name, setName] = useState(workspace.name || '');
  const [description, setDescription] = useState(workspace.description || '');
  const [iconUrl, setIconUrl] = useState(workspace.iconUrl || '/default-avatar.png');
  const [isUploading, setIsUploading] = useState(false);
  const [isSavingOverview, setIsSavingOverview] = useState(false);
  const [overviewError, setOverviewError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setName(workspace.name || '');
    setDescription(workspace.description || '');
    setIconUrl(workspace.iconUrl || '/default-avatar.png');
    setOverviewError(null);
  }, [workspace]);

  const isDirty = useMemo(() => {
    const origName = workspace.name || '';
    const origDesc = workspace.description || '';
    const origIcon = workspace.iconUrl || '/default-avatar.png';
    return name !== origName || description !== origDesc || iconUrl !== origIcon;
  }, [name, description, iconUrl, workspace]);

  const handleReset = () => {
    setName(workspace.name || '');
    setDescription(workspace.description || '');
    setIconUrl(workspace.iconUrl || '/default-avatar.png');
    setOverviewError(null);
  };

  const handleUploadIcon = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(true);
      setOverviewError(null);
      const res = await fileApi.uploadFile(file);
      setIconUrl(res.url);
    } catch (err) {
      console.error('Failed to upload server icon:', err);
      setOverviewError('Không thể tải ảnh lên. Vui lòng thử lại!');
    } finally {
      setIsUploading(false);
    }
  };

  const handleSaveOverview = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!name.trim()) {
      setOverviewError('Tên máy chủ không được để trống.');
      return;
    }

    try {
      setIsSavingOverview(true);
      setOverviewError(null);
      const updated = await serverApi.updateServer(workspace.id, {
        name: name.trim(),
        description: description.trim() || undefined,
        iconUrl,
      });

      onWorkspaceUpdated?.(updated);
    } catch (err: unknown) {
      console.error('Failed to update server overview:', err);
      const errorObj = err as { response?: { data?: { message?: string } } };
      setOverviewError(
        errorObj?.response?.data?.message || 'Lỗi khi cập nhật máy chủ. Vui lòng thử lại!'
      );
    } finally {
      setIsSavingOverview(false);
    }
  };

  return (
    <div className="relative flex-1 flex flex-col min-h-0 h-full overflow-hidden">
      <div className="flex-1 overflow-y-auto p-6 pb-24 max-w-xl">
        <h3 className="text-base font-bold text-[var(--text-primary)] mb-1">
          Tổng quan máy chủ
        </h3>
        <p className="text-xs text-[var(--text-muted)] mb-5">
          Cập nhật thông tin nhận diện cơ bản cho máy chủ của bạn
        </p>

        {overviewError && (
          <div className="mb-4 p-3 bg-[var(--status-dnd)]/10 border border-[var(--status-dnd)]/30 rounded-[4px] text-xs text-[var(--status-dnd)] flex items-center gap-2">
            <Warning size={16} weight="bold" />
            <span>{overviewError}</span>
          </div>
        )}

        <form onSubmit={handleSaveOverview} className="space-y-4">
          {/* Icon Upload */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] mb-2">
              Biểu tượng máy chủ
            </label>
            <div className="flex items-center gap-4">
              <div className="relative group w-20 h-20 rounded-full overflow-hidden border-2 border-[var(--border-color)] bg-[var(--bg-sidebar)] shrink-0">
                <img
                  src={iconUrl}
                  alt="Server icon"
                  className="w-full h-full object-cover"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-white text-[10px] font-bold transition-opacity cursor-pointer"
                >
                  <UploadSimple size={20} />
                  <span>Thay đổi</span>
                </button>
              </div>

              <div className="text-xs space-y-1">
                <p className="font-semibold text-[var(--text-primary)]">
                  Kích thước khuyên dùng: 512x512px
                </p>
                <p className="text-[var(--text-muted)]">
                  Hỗ trợ ảnh PNG, JPG hoặc WEBP dung lượng dưới 20MB.
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleUploadIcon}
                />
              </div>
            </div>
          </div>

          {/* Server Name */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] mb-1.5">
              Tên máy chủ <span className="text-[var(--status-dnd)]">*</span>
            </label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nhập tên máy chủ..."
              required
            />
          </div>

          {/* Server Description */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] mb-1.5">
              Mô tả máy chủ
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Giới thiệu đôi nét về cộng đồng hoặc dự án của bạn..."
              rows={3}
              className="w-full px-3 py-2 bg-[var(--bg-sidebar)] border border-[var(--border-color)] rounded-[4px] text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-hidden focus:border-[var(--accent-primary)] resize-none"
            />
          </div>
        </form>
      </div>

      <UnsavedChangesBar
        show={isDirty}
        isSaving={isSavingOverview}
        onReset={handleReset}
        onSave={() => handleSaveOverview()}
      />
    </div>
  );
};

