import React, { useState, useEffect } from "react";
import { Hash, SpeakerHigh } from "@phosphor-icons/react";
import { Trash } from "lucide-react";
import { Modal, Button, Input } from "../ui";
import { channelApi } from "../../services/channelApi";
import { ChannelType, type Channel } from "../../types";

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
  const isVoice = channel?.type === ChannelType.Voice;

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
      .replace(/[^a-z0-9-_]/g, "");

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
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Cài đặt Kênh"
      subtitle="Tùy chỉnh thông tin tên kênh hoặc cấu hình cài đặt nâng cao."
      className="max-w-[480px]"
    >
      <form onSubmit={handleSave} className="p-6 space-y-5">
        {error && (
          <div className="p-3 text-xs rounded-[3px] bg-rose-500/10 border border-rose-500/20 text-rose-500 font-medium">
            {error}
          </div>
        )}

        {/* Channel Indicator Badge */}
        <div className="flex items-center gap-2.5 p-2.5 rounded-[4px] bg-[var(--bg-surface)] border border-[var(--border-color)]">
          <div className="w-8 h-8 rounded-[3px] bg-[var(--accent-soft)] flex items-center justify-center text-[var(--accent-primary)] shrink-0">
            {isVoice ? <SpeakerHigh size={18} weight="bold" /> : <Hash size={18} weight="bold" />}
          </div>
          <div className="min-w-0">
            <div className="text-xs font-bold text-[var(--text-primary)] truncate">
              {isVoice ? channel.name : `#${channel.name}`}
            </div>
            <div className="text-[10px] text-[var(--text-muted)]">
              {isVoice ? "Kênh thoại âm thanh" : "Kênh văn bản thảo luận"}
            </div>
          </div>
        </div>

        {/* Input Name */}
        <div className="space-y-1.5">
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
          {isGeneralChannel ? (
            <p className="text-[11px] text-[var(--text-muted)]">
              Kênh mặc định #general không thể đổi tên hoặc xóa.
            </p>
          ) : (
            <p className="text-[11px] text-[var(--text-muted)]">
              Tên kênh chỉ được chứa chữ cái thường, số và dấu gạch nối.
            </p>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-[var(--border-color)]">
          <Button type="button" variant="ghost" size="sm" onClick={onClose}>
            Huỷ bỏ
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
          <div className="pt-4 border-t border-red-500/20 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-red-500">Vùng nguy hiểm</div>
                <div className="text-[11px] text-[var(--text-muted)]">
                  Xóa kênh này và toàn bộ lịch sử tin nhắn bên trong.
                </div>
              </div>
            </div>

            {!showDeleteConfirm ? (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setShowDeleteConfirm(true)}
                className="text-red-500 hover:bg-red-500/10 border-red-500/30 w-full justify-start"
                leftIcon={<Trash size={14} />}
              >
                Xóa kênh #{channel.name}
              </Button>
            ) : (
              <div className="p-3.5 bg-red-500/10 border border-red-500/25 rounded-[4px] space-y-3">
                <p className="text-xs text-red-400 font-medium leading-relaxed">
                  Hành động này sẽ xóa vĩnh viễn kênh #{channel.name} cùng toàn bộ tin nhắn. Bạn có chắc chắn muốn xóa?
                </p>
                <div className="flex items-center justify-end gap-2">
                  <Button
                    type="button"
                    variant="ghost"
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
