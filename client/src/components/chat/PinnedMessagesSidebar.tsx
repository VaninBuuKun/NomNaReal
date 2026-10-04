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

  const formatMessageTime = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("vi-VN", {
        day: "2-digit",
        month: "2-digit",
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
      className="flex-shrink-0 border-l border-[var(--border-color)] bg-[var(--bg-sidebar)] flex flex-col h-full z-20 select-none transition-all duration-150 animate-in slide-in-from-right-4"
    >
      {/* 1. Header (Unified with MemberListPanel & ChannelTasksSidebar) */}
      <div className="h-[54px] border-b border-[var(--border-color)] px-3.5 flex items-center justify-between shrink-0 bg-[var(--bg-sidebar)]">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <span className="font-bold text-sm text-[var(--text-primary)] truncate">
            Tin nhắn đã ghim
          </span>
          <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-[var(--accent-soft)] text-[var(--accent-primary)] shrink-0">
            {pinnedMessages.length}
          </span>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="p-1.5 rounded-md text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)] transition-colors cursor-pointer"
          title="Đóng danh sách ghim"
        >
          <X size={15} />
        </button>
      </div>

      {/* Content List */}
      <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2.5 min-h-0">
        {pinnedMessages.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-[var(--text-muted)]">
            <div className="w-12 h-12 rounded-full bg-[var(--bg-surface)] border border-[var(--border-color)] flex items-center justify-center mb-3 text-[var(--text-muted)]">
              <PushPin size={22} weight="duotone" />
            </div>
            <p className="font-medium text-sm text-[var(--text-primary)] mb-1">
              Chưa có tin nhắn nào được ghim
            </p>
            <p className="text-xs text-[var(--text-muted)] max-w-[220px]">
              Rê chuột vào tin nhắn trong kênh và bấm biểu tượng ghim để giữ lại ở đây.
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
                className="group relative bg-[var(--bg-surface)] border border-[var(--border-color)] hover:border-[var(--accent-primary)]/40 hover:bg-[var(--bg-surface-active)]/30 rounded-[4px] p-2.5 transition-all duration-150 cursor-pointer shadow-2xs"
              >
                {/* Header: Author info, time & hover quick actions */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <img
                      src={pin.message.senderAvatarUrl || "/default-avatar.png"}
                      alt={pin.message.senderDisplayName}
                      className="w-7 h-7 rounded-full object-cover shrink-0 border border-[var(--border-color)] shadow-xs"
                      onError={(e) => {
                        e.currentTarget.src = "/default-avatar.png";
                      }}
                    />
                    <div className="min-w-0 flex items-center gap-1.5">
                      <span className="font-semibold text-xs text-[var(--text-primary)] truncate">
                        {pin.message.senderDisplayName || pin.message.senderUsername}
                      </span>
                      <span className="text-[10px] text-[var(--text-muted)] shrink-0 font-mono">
                        {formatMessageTime(pin.message.createdAt)}
                      </span>
                    </div>
                  </div>

                  {/* Actions on hover */}
                  <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onJumpToMessage(pin.messageId);
                      }}
                      className="p-1 rounded text-[var(--text-muted)] hover:text-[var(--accent-primary)] hover:bg-[var(--bg-surface)] transition-colors cursor-pointer"
                      title="Đi tới tin nhắn"
                    >
                      <ArrowUpRight size={13} weight="bold" />
                    </button>
                    <button
                      type="button"
                      disabled={isUnpinning}
                      onClick={(e) => handleUnpin(pin.messageId, e)}
                      className="p-1 rounded text-[var(--text-muted)] hover:text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer disabled:opacity-50"
                      title="Bỏ ghim tin nhắn"
                    >
                      {isUnpinning ? (
                        <CircleNotch size={13} className="animate-spin" />
                      ) : (
                        <Trash size={13} />
                      )}
                    </button>
                  </div>
                </div>

                {/* Message Body Content */}
                {pin.message.content && (
                  <p className="text-xs text-[var(--text-secondary)] line-clamp-3 leading-relaxed mt-1.5 pl-9 whitespace-pre-wrap break-words">
                    {pin.message.content}
                  </p>
                )}

                {/* Attachment indicators */}
                {attachments.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1.5 pl-9">
                    {attachments.map((att, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-[3px] bg-[var(--bg-chat)] border border-[var(--border-color)] text-[10px] text-[var(--text-muted)]"
                      >
                        {att.type === "image" ? (
                          <ImageIcon size={11} className="text-[var(--accent-primary)]" />
                        ) : (
                          <FileText size={11} className="text-emerald-500" />
                        )}
                        <span className="truncate max-w-[120px]">{att.fileName}</span>
                      </span>
                    ))}
                  </div>
                )}

                {/* Subtle Card Footer: Pinned by & Jump link */}
                <div className="flex items-center justify-between text-[10px] text-[var(--text-muted)] mt-2 pt-1.5 border-t border-[var(--border-color)]/40 pl-9">
                  <span className="truncate">
                    📌 Ghim bởi <strong className="font-medium text-[var(--text-secondary)]">{pin.pinnedByName}</strong>
                  </span>
                  <span className="text-[var(--accent-primary)] font-medium group-hover:underline flex items-center gap-0.5 shrink-0">
                    Đi tới <ArrowUpRight size={10} weight="bold" />
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </aside>
  );
};
