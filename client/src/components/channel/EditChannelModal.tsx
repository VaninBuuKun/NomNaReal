import React, { useState, useEffect } from "react";
import { Trash } from "lucide-react";
import { Modal, Button, Input } from "../ui";
import { channelApi } from "../../services/channelApi";
import type { Channel } from "../../types";

interface EditChannelModalProps {
  isOpen: boolean;
  onClose: () => void;
  channel: Channel | null;
  onChannelUpdated: (channel: Channel) => void;
  onChannelDeleted: (channelId: string) => void;
}

export const EditChannelModal: React.FC<EditChannelModalProps> = ({
  isOpen,
  onClose,
  channel,
  onChannelUpdated,
  onChannelDeleted,
}) => {
  const [name, setName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isGeneralChannel = channel?.name?.toLowerCase() === "general";

  useEffect(() => {
    if (channel) {
      setName(channel.name || "");
      setError(null);
      setShowDeleteConfirm(false);
    }
  }, [channel, isOpen]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!channel || !name.trim()) return;

    const formattedName = name
      .toLowerCase()
      .trim()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "");

    if (!formattedName) {
      setError("Tên kênh chỉ được chứa chữ cái thường, số và dấu gạch nối.");
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      const updated = await channelApi.updateChannel(channel.id, formattedName);
      onChannelUpdated(updated);
      onClose();
    } catch (err: unknown) {
      const errorObj = err as { response?: { data?: { message?: string } } };
      setError(errorObj?.response?.data?.message || "Không thể cập nhật tên kênh.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!channel || isGeneralChannel) return;

    try {
      setIsDeleting(true);
      setError(null);
      await channelApi.deleteChannel(channel.id);
      onChannelDeleted(channel.id);
      onClose();
    } catch (err: unknown) {
      const errorObj = err as { response?: { data?: { message?: string } } };
      setError(errorObj?.response?.data?.message || "Không thể xóa kênh này.");
    } finally {
      setIsDeleting(false);
    }
  };

  if (!channel) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Cài đặt Kênh" size="md">
      <form onSubmit={handleSave} className="flex flex-col gap-4">
        {error && (
          <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-xs text-red-400">
            {error}
          </div>
        )}

        <Input
          label="Tên kênh"
          value={name}
          onChange={(e) => {
            const val = e.target.value.toLowerCase().replace(/\s+/g, "-");
            setName(val);
          }}
          placeholder="vd: du-an-moi"
          required
          maxLength={50}
          disabled={isGeneralChannel}
        />
        {isGeneralChannel && (
          <p className="text-[11px] text-[var(--text-muted)] -mt-2">
            Kênh mặc định #general không thể đổi tên hoặc xóa.
          </p>
        )}

        <div className="flex justify-end gap-2 pt-2 border-t border-[var(--border-color)]">
          <Button type="button" variant="secondary" size="sm" onClick={onClose}>
            Huỷ
          </Button>
          <Button
            type="submit"
            variant="primary"
            size="sm"
            isLoading={isSubmitting}
            disabled={isSubmitting || !name.trim() || isGeneralChannel}
          >
            Lưu thay đổi
          </Button>
        </div>

        {/* Delete Channel Option */}
        {!isGeneralChannel && (
          <div className="mt-2 pt-4 border-t border-red-500/20 flex flex-col gap-2">
            <div className="text-xs font-bold text-red-500">Xóa kênh</div>
            {!showDeleteConfirm ? (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setShowDeleteConfirm(true)}
                className="text-red-500 hover:bg-red-500/10 border-red-500/30"
                leftIcon={<Trash size={14} />}
              >
                Xóa kênh #{channel.name}
              </Button>
            ) : (
              <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg flex flex-col gap-2">
                <p className="text-xs text-red-400 font-medium">
                  Hành động này sẽ xóa vĩnh viễn kênh #{channel.name} và toàn bộ tin nhắn bên trong.
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
