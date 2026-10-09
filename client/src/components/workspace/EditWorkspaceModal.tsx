import React, { useState, useEffect, useRef } from "react";
import { UploadCloud, Trash, Loader2 } from "lucide-react";
import { Modal, Button, Input } from "../ui";
import { getMediaUrl } from "../../utils/constants";
import { workspaceApi } from "../../services/workspaceApi";
import { fileApi } from "../../services/fileApi";
import type { Workspace } from "../../types";

interface EditWorkspaceModalProps {
  isOpen: boolean;
  onClose: () => void;
  workspace: Workspace | null;
  isOwner: boolean;
  onWorkspaceUpdated: (workspace: Workspace) => void;
  onWorkspaceDeleted: (workspaceId: string) => void;
}

export const EditWorkspaceModal: React.FC<EditWorkspaceModalProps> = ({
  isOpen,
  onClose,
  workspace,
  isOwner,
  onWorkspaceUpdated,
  onWorkspaceDeleted,
}) => {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [iconUrl, setIconUrl] = useState("/default-avatar.png");
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (workspace && isOpen) {
      setName(workspace.name || "");
      setDescription(workspace.description || "");
      setIconUrl(workspace.iconUrl || "/default-avatar.png");
      setError(null);
      setShowDeleteConfirm(false);
    }
  }, [workspace, isOpen]);

  const processImageFile = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      setError("Vui lòng chọn tệp hình ảnh hợp lệ (.png, .jpg, .webp, .svg).");
      return;
    }

    if (file.size > 20 * 1024 * 1024) {
      setError("Kích thước ảnh không được vượt quá 20MB.");
      return;
    }

    try {
      setIsUploading(true);
      setError(null);
      // Upload directly to S3 / Cloudflare R2 under "workspaces" folder
      const res = await fileApi.uploadFile(file, "workspaces");
      setIconUrl(res.url);
    } catch (err: unknown) {
      const errorObj = err as { response?: { data?: { message?: string } } };
      setError(errorObj?.response?.data?.message || "Không thể tải ảnh lên S3. Vui lòng thử lại.");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processImageFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processImageFile(file);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workspace || !name.trim()) return;

    try {
      setIsSubmitting(true);
      setError(null);
      const updated = await workspaceApi.updateWorkspace(workspace.id, {
        name: name.trim(),
        description: description.trim() || undefined,
        iconUrl: iconUrl.trim() || undefined,
      });
      onWorkspaceUpdated(updated);
      onClose();
    } catch (err: unknown) {
      const errorObj = err as { response?: { data?: { message?: string } } };
      setError(errorObj?.response?.data?.message || "Không thể cập nhật workspace.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!workspace) return;

    try {
      setIsDeleting(true);
      setError(null);
      await workspaceApi.deleteWorkspace(workspace.id);
      onWorkspaceDeleted(workspace.id);
      onClose();
    } catch (err: unknown) {
      const errorObj = err as { response?: { data?: { message?: string } } };
      setError(errorObj?.response?.data?.message || "Không thể xóa workspace.");
    } finally {
      setIsDeleting(false);
    }
  };

  if (!workspace) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Cài đặt Server"
      subtitle="Cập nhật thông tin, ảnh đại diện S3 và quản lý không gian làm việc."
      className="max-w-[480px]"
    >
      <form onSubmit={handleSave} className="p-6 space-y-5">
        {error && (
          <div className="p-3 text-xs rounded-[3px] bg-rose-500/10 border border-rose-500/20 text-rose-500 font-medium">
            {error}
          </div>
        )}

        {/* Workspace Avatar & S3 Upload */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-2">
            Ảnh đại diện Server <span className="text-[var(--accent-primary)]">*</span>
          </label>

          <div className="flex items-center gap-4">
            {/* Current Selected Avatar Preview with Drag-and-Drop */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              title="Nhấp hoặc kéo thả ảnh để tải lên S3"
              className={`relative group shrink-0 cursor-pointer transition-all ${
                isDragging ? "ring-2 ring-[var(--accent-primary)] scale-105" : ""
              }`}
            >
              <img
                src={getMediaUrl(iconUrl)}
                alt="Workspace Icon Preview"
                className="w-16 h-16 rounded-[4px] object-cover border-2 border-[var(--border-color)] group-hover:border-[var(--accent-primary)] transition-all shadow-sm"
                onError={(e) => {
                  e.currentTarget.src = "/default-avatar.png";
                }}
              />
              {isUploading ? (
                <div className="absolute inset-0 bg-black/60 rounded-[4px] flex items-center justify-center">
                  <Loader2 size={20} className="animate-spin text-white" />
                </div>
              ) : (
                <div className="absolute inset-0 bg-black/40 rounded-[4px] opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                  <UploadCloud size={16} className="text-white" />
                </div>
              )}
            </div>

            {/* S3 Upload Controls */}
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
                leftIcon={<UploadCloud size={14} />}
                className="w-full text-xs rounded-[3px]"
              >
                {isUploading ? "Đang tải lên S3..." : "Tải ảnh mới từ máy"}
              </Button>
              <p className="text-[11px] text-[var(--text-muted)]">
                Tỉ lệ 1:1, dung lượng tối đa 20MB (.png, .jpg, .webp).
              </p>
            </div>
          </div>

          </div>

        {/* Workspace Name */}
        <div>
          <Input
            label="Tên Server *"
            placeholder="Nhập tên workspace..."
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            maxLength={100}
          />
        </div>

        {/* Workspace Description */}
        <div className="flex flex-col gap-1.5">
          <label className="block text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">
            Mô tả (tùy chọn)
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Mô tả mục đích của workspace này..."
            rows={2}
            className="w-full bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-[3px] p-2.5 text-xs text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-primary)] transition-colors resize-none leading-relaxed"
            maxLength={500}
          />
        </div>

        {/* Modal Actions */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-[var(--border-color)]">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClose}
            disabled={isSubmitting || isDeleting}
          >
            Hủy
          </Button>
          <Button
            type="submit"
            variant="primary"
            size="sm"
            isLoading={isSubmitting}
            disabled={isSubmitting || !name.trim() || isUploading}
          >
            Lưu thay đổi
          </Button>
        </div>

        {/* Danger Zone for Workspace Owner */}
        {isOwner && (
          <div className="pt-4 border-t border-rose-500/20 space-y-2.5">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs font-bold uppercase tracking-wider text-rose-500">
                  Vùng nguy hiểm
                </div>
                <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
                  Xóa vĩnh viễn không gian làm việc này cùng toàn bộ kênh và tin nhắn.
                </p>
              </div>
              {!showDeleteConfirm && (
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => setShowDeleteConfirm(true)}
                  className="text-rose-500 hover:bg-rose-500/10 border-rose-500/30 text-xs shrink-0 rounded-[3px]"
                  leftIcon={<Trash size={14} />}
                >
                  Xóa Server
                </Button>
              )}
            </div>

            {showDeleteConfirm && (
              <div className="p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-[4px] space-y-3 animate-in fade-in duration-150">
                <p className="text-xs text-rose-400 font-medium leading-relaxed">
                  Hành động này <strong className="text-rose-300">không thể hoàn tác</strong>. Bạn có chắc chắn muốn xóa vĩnh viễn workspace này?
                </p>
                <div className="flex items-center justify-end gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => setShowDeleteConfirm(false)}
                    className="text-xs rounded-[3px]"
                  >
                    Hủy bỏ
                  </Button>
                  <Button
                    type="button"
                    variant="danger"
                    size="sm"
                    isLoading={isDeleting}
                    onClick={handleDelete}
                    className="text-xs rounded-[3px]"
                  >
                    Xác nhận xóa vĩnh viễn
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </form>
    </Modal>
  );
};
