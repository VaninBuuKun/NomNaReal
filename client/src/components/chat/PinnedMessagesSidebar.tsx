import React, { useState } from "react";
import {
  PushPin,
  X,
  ArrowUpRight,
  Trash,
  CircleNotch,
  Image as ImageIcon,
  FileText,
} from "@phosphor-icons/react";
import type { PinnedMessage } from "../../types";

interface PinnedMessagesSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  pinnedMessages: PinnedMessage[];
  onJumpToMessage: (messageId: string) => void;
  onUnpinMessage: (messageId: string) => Promise<void>;
  width?: number;
}

export const PinnedMessagesSidebar: React.FC<PinnedMessagesSidebarProps> = ({
  isOpen,
  onClose,
  pinnedMessages,
  onJumpToMessage,
  onUnpinMessage,
  width = 360,
}) => {
  const [unpinningId, setUnpinningId] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleUnpin = async (messageId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      setUnpinningId(messageId);
      await onUnpinMessage(messageId);
    } catch (err) {
      console.error("Failed to unpin message:", err);
    } finally {
      setUnpinningId(null);
    }
  };

  const formatPinDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return dateString;
    }
  };

  return (
    <aside
      style={{ width }}
      className="flex-shrink-0 border-l border-[var(--border-color)] bg-[var(--bg-chat)] flex flex-col h-full z-20 select-none transition-all duration-150 animate-in slide-in-from-right-4"
    >
      {/* Header */}
      <div className="h-14 px-4 border-b border-[var(--border-color)] flex items-center justify-between bg-[var(--bg-surface)] flex-shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-7 h-7 rounded-md bg-amber-500/15 text-amber-500 flex items-center justify-center flex-shrink-0">
            <PushPin size={16} weight="fill" />
          </div>
          <div className="flex items-center gap-2 min-w-0">
            <h3 className="font-semibold text-sm text-[var(--text-primary)] truncate">
              Tin nhắn đã ghim
            </h3>
            <span className="px-1.5 py-0.5 rounded-full text-[11px] font-bold bg-[var(--bg-surface-active)] text-[var(--text-secondary)] border border-[var(--border-color)]">
              {pinnedMessages.length}
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="p-1.5 rounded-md text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-active)] transition-colors cursor-pointer"
          title="Đóng"
        >
          <X size={17} />
        </button>
      </div>

      {/* Content List */}
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3 min-h-0">
        {pinnedMessages.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-[var(--text-muted)]">
            <div className="w-12 h-12 rounded-full bg-[var(--bg-surface)] border border-[var(--border-color)] flex items-center justify-center mb-3 text-[var(--text-muted)]">
              <PushPin size={24} />
            </div>
            <p className="font-medium text-sm text-[var(--text-primary)] mb-1">
              Chưa có tin nhắn nào được ghim
            </p>
            <p className="text-xs text-[var(--text-muted)] max-w-[220px]">
              Rê chuột vào tin nhắn quan trọng trong kênh và bấm biểu tượng ghim để giữ lại ở đây.
            </p>
          </div>
        ) : (
          pinnedMessages.map((pin) => {
            const isUnpinning = unpinningId === pin.messageId;
            const attachments = pin.message.attachments || [];

            return (
              <div
                key={pin.id}
                onClick={() => onJumpToMessage(pin.messageId)}
                className="group relative bg-[var(--bg-surface)] border border-[var(--border-color)] hover:border-[var(--accent-primary)]/40 rounded-lg p-3 transition-all duration-150 cursor-pointer shadow-sm hover:shadow"
              >
                {/* Top: Pinner info & Date */}
                <div className="flex items-center justify-between gap-2 mb-2 pb-2 border-b border-[var(--border-color)]/60 text-[11px] text-[var(--text-muted)]">
                  <span className="truncate flex items-center gap-1">
                    <PushPin size={11} className="text-amber-500 flex-shrink-0" weight="fill" />
                    <span>Ghim bởi:</span>
                    <strong className="text-[var(--text-secondary)] font-medium">
                      {pin.pinnedByName}
                    </strong>
                  </span>
                  <span className="flex-shrink-0 text-[10px]">
                    {formatPinDate(pin.pinnedAt)}
                  </span>
                </div>

                {/* Message Author info */}
                <div className="flex items-center gap-2 mb-2">
                  <img
                    src={pin.message.senderAvatarUrl || "/default-avatar.png"}
                    alt={pin.message.senderDisplayName}
                    className="w-6 h-6 rounded-full object-cover flex-shrink-0 border border-[var(--border-color)]"
                    onError={(e) => {
                      e.currentTarget.src = "/default-avatar.png";
                    }}
                  />
                  <div className="min-w-0 flex items-center gap-1.5">
                    <span className="font-semibold text-xs text-[var(--text-primary)] truncate">
                      {pin.message.senderDisplayName || pin.message.senderUsername}
                    </span>
                    <span className="text-[10px] text-[var(--text-muted)]">
                      {formatPinDate(pin.message.createdAt)}
                    </span>
                  </div>
                </div>

                {/* Message Body Content */}
                {pin.message.content && (
                  <p className="text-xs text-[var(--text-secondary)] line-clamp-3 leading-relaxed mb-2 whitespace-pre-wrap break-words">
                    {pin.message.content}
                  </p>
                )}

                {/* Attachment indicators */}
                {attachments.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-2.5">
                    {attachments.map((att, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[var(--bg-chat)] border border-[var(--border-color)] text-[11px] text-[var(--text-muted)]"
                      >
                        {att.type === "image" ? (
                          <ImageIcon size={12} className="text-[var(--accent-primary)]" />
                        ) : (
                          <FileText size={12} className="text-emerald-500" />
                        )}
                        <span className="truncate max-w-[130px]">{att.fileName}</span>
                      </span>
                    ))}
                  </div>
                )}

                {/* Card Actions Footer */}
                <div className="flex items-center justify-between pt-1 text-[11px]">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onJumpToMessage(pin.messageId);
                    }}
                    className="inline-flex items-center gap-1 text-[var(--accent-primary)] hover:underline font-medium cursor-pointer"
                  >
                    <span>Đi đến tin nhắn</span>
                    <ArrowUpRight size={12} weight="bold" />
                  </button>

                  <button
                    type="button"
                    disabled={isUnpinning}
                    onClick={(e) => handleUnpin(pin.messageId, e)}
                    className="inline-flex items-center gap-1 text-rose-500 hover:text-rose-600 hover:bg-rose-500/10 px-2 py-1 rounded transition-colors cursor-pointer disabled:opacity-50"
                    title="Bỏ ghim tin nhắn này"
                  >
                    {isUnpinning ? (
                      <CircleNotch size={12} className="animate-spin" />
                    ) : (
                      <Trash size={12} />
                    )}
                    <span>Bỏ ghim</span>
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </aside>
  );
};
