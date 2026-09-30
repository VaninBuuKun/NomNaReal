import React, { useState, useEffect, useRef } from "react";
import { UploadCloud, Trash, Loader2 } from "lucide-react";
import { Modal, Button, Input } from "../ui";
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

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (workspace) {
      setName(workspace.name || "");
      setDescription(workspace.description || "");
      setIconUrl(workspace.iconUrl || "/default-avatar.png");
      setError(null);
      setShowDeleteConfirm(false);
    }
  }, [workspace, isOpen]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Vui lòng chọn tệp hình ảnh hợp lệ (.png, .jpg, .webp).");
      return;
    }

    if (file.size > 20 * 1024 * 1024) {
      setError("Kích thước ảnh không được vượt quá 20MB.");
      return;
    }

    try {
      setIsUploading(true);
      setError(null);
      const res = await fileApi.uploadFile(file, "workspaces");
      setIconUrl(res.url);
    } catch {
      setError("Không thể tải ảnh lên. Vui lòng thử lại.");
    } finally {
      setIsUploading(false);
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
    <Modal isOpen={isOpen} onClose={onClose} title="Cài đặt Workspace" size="md">
      <form onSubmit={handleSave} className="flex flex-col gap-4">
        {error && (
          <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-xs text-red-400">
            {error}
          </div>
        )}

        {/* Icon Preview & Upload */}
        <div className="flex items-center gap-4">
          <div className="relative w-16 h-16 rounded-xl border border-[var(--border-color)] overflow-hidden shrink-0 bg-[var(--bg-surface)]">
            <img
              src={iconUrl || "/default-avatar.png"}
              alt="Workspace Icon"
              className="w-full h-full object-cover"
              onError={(e) => {
                e.currentTarget.src = "/default-avatar.png";
              }}
            />
            {isUploading && (
              <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                <Loader2 className="w-5 h-5 text-white animate-spin" />
              </div>
            )}
          </div>

          <div className="flex-1">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept="image/*"
              className="hidden"
            />
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              leftIcon={<UploadCloud size={14} />}
            >
              {isUploading ? "Đang tải ảnh lên..." : "Đổi biểu tượng"}
            </Button>
            <p className="text-[11px] text-[var(--text-muted)] mt-1">
              Ảnh vuông PNG, JPG, tối đa 20MB.
            </p>
          </div>
        </div>

        {/* Name */}
        <Input
          label="Tên Workspace"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nhập tên workspace..."
          required
          maxLength={100}
        />

        {/* Description */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-[var(--text-primary)]">
            Mô tả (tùy chọn)
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Mô tả mục đích của workspace này..."
            rows={2}
            className="w-full bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-lg p-2.5 text-xs text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-primary)] transition-colors resize-none"
            maxLength={500}
          />
        </div>

        {/* Save button */}
        <div className="flex justify-end gap-2 pt-2 border-t border-[var(--border-color)]">
          <Button type="button" variant="secondary" size="sm" onClick={onClose}>
            Huỷ
          </Button>
          <Button
            type="submit"
            variant="primary"
            size="sm"
            isLoading={isSubmitting}
            disabled={isSubmitting || !name.trim()}
          >
            Lưu thay đổi
          </Button>
        </div>

        {/* Danger Zone for Owner */}
        {isOwner && (
          <div className="mt-2 pt-4 border-t border-red-500/20 flex flex-col gap-2">
            <div className="text-xs font-bold text-red-500">Vùng nguy hiểm</div>
            {!showDeleteConfirm ? (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setShowDeleteConfirm(true)}
                className="text-red-500 hover:bg-red-500/10 border-red-500/30"
                leftIcon={<Trash size={14} />}
              >
                Xóa Workspace này
              </Button>
            ) : (
              <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg flex flex-col gap-2">
                <p className="text-xs text-red-400 font-medium">
                  Hành động này sẽ xóa vĩnh viễn workspace cùng toàn bộ kênh và tin nhắn. Không thể khôi phục!
                </p>
                <div className="flex gap-2 justify-end">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => setShowDeleteConfirm(false)}
                  >
                    Hủy bỏ
                  </Button>
                  <Button
                    type="button"
                    variant="danger"
                    size="sm"
                    isLoading={isDeleting}
                    onClick={handleDelete}
                  >
                    Xác nhận xóa
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
