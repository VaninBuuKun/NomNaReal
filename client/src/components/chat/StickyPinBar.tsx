import React, { useState, useRef, useEffect } from "react";
import { PushPin, CaretDown, ArrowRight } from "@phosphor-icons/react";
import type { PinnedMessage } from "../../types";
import { formatMessageTime } from "../../utils/formatDate";
import { UserAvatar } from "../ui/UserAvatar";

interface StickyPinBarProps {
  pinnedMessages: PinnedMessage[];
  onJumpToMessage: (messageId: string) => void;
  onOpenSidebar: () => void;
  onDismiss?: () => void;
}

export const StickyPinBar: React.FC<StickyPinBarProps> = ({
  pinnedMessages,
  onJumpToMessage,
  onOpenSidebar,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside or Escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false);
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  if (!pinnedMessages || pinnedMessages.length === 0) return null;

  const latestPin = pinnedMessages[0];
  const dropdownPins = pinnedMessages.slice(0, 4);
  const totalCount = pinnedMessages.length;

  const getSnippet = (pin: PinnedMessage) => {
    const text = pin.message.content?.trim();
    if (text) return text;
    if (pin.message.attachments?.length) {
      return `[${pin.message.attachments.length} tệp đính kèm]`;
    }
    return "Tin nhắn đã ghim";
  };

  const getTime = (dateStr: string) => {
    return formatMessageTime(dateStr);
  };

  return (
    <div ref={containerRef} className="relative w-full z-30 select-none">
      {/* 1. Main Sticky Bar (Clean Discord/Zalo style, unified item presentation) */}
      <div className="h-9 px-3.5 bg-[var(--bg-surface)]/95 backdrop-blur-sm border-b border-[var(--border-color)] flex items-center justify-between gap-2 text-xs shadow-xs">
        {isOpen ? (
          /* Header when expanded: clean title, avoiding duplicate of first item */
          <div className="flex items-center gap-2 text-xs font-semibold text-[var(--text-primary)]">
            <PushPin size={13} weight="fill" className="text-amber-500 flex-shrink-0" />
            <span>Tin nhắn đã ghim ({totalCount})</span>
          </div>
        ) : (
          /* When collapsed: shows latest pin with unified avatar + name + snippet format */
          <button
            type="button"
            onClick={() => onJumpToMessage(latestPin.messageId)}
            className="flex-1 min-w-0 flex items-center gap-2 text-left cursor-pointer group py-1 rounded hover:bg-[var(--bg-surface-active)] transition-colors -ml-1 pl-1"
            title="Bấm để cuộn tới tin nhắn này"
          >
            <PushPin size={13} weight="fill" className="text-amber-500 flex-shrink-0" />
            <UserAvatar
              size="xs"
              name={latestPin.message.senderDisplayName || latestPin.message.senderUsername}
              avatarUrl={latestPin.message.senderAvatarUrl}
              className="w-4.5 h-4.5 flex-shrink-0"
            />
            <span className="font-semibold text-[var(--text-primary)] flex-shrink-0 group-hover:text-[var(--accent-primary)] transition-colors">
              {latestPin.message.senderDisplayName || latestPin.message.senderUsername}:
            </span>
            <span className="truncate text-[var(--text-muted)] group-hover:text-[var(--text-primary)]">
              {getSnippet(latestPin)}
            </span>
          </button>
        )}

        {/* Right: Dropdown toggle or details button - 'X' button removed per request */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {totalCount > 1 ? (
            <button
              type="button"
              onClick={() => setIsOpen((prev) => !prev)}
              className={`flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                isOpen
                  ? "bg-[var(--accent-soft)] text-[var(--accent-primary)]"
                  : "text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-active)]"
              }`}
              title={isOpen ? "Thu gọn danh sách ghim" : "Mở danh sách ghim"}
            >
              <span>{isOpen ? "Thu gọn" : `${totalCount} tin ghim`}</span>
              <CaretDown
                size={11}
                weight="bold"
                className={`transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
              />
            </button>
          ) : (
            <button
              type="button"
              onClick={onOpenSidebar}
              className="text-[11px] text-[var(--text-muted)] hover:text-[var(--text-primary)] px-2 py-0.5 rounded hover:bg-[var(--bg-surface-active)] transition-colors cursor-pointer flex items-center gap-1 font-medium"
              title="Xem chi tiết tin ghim trong sidebar"
            >
              <span>Chi tiết</span>
              <ArrowRight size={11} weight="bold" />
            </button>
          )}
        </div>
      </div>

      {/* 2. Sleek Dropdown (Unified design with avatar + name + snippet + time) */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 bg-[var(--bg-surface)] border-b border-x border-[var(--border-color)] shadow-lg rounded-b-lg overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150 z-40">
          {/* List of pinned items */}
          <div className="divide-y divide-[var(--border-color)]/60">
            {dropdownPins.map((pin) => (
              <div
                key={pin.id}
                onClick={() => {
                  onJumpToMessage(pin.messageId);
                  setIsOpen(false);
                }}
                className="px-3.5 py-2 flex items-center justify-between gap-3 hover:bg-[var(--bg-surface-active)] cursor-pointer transition-colors group text-xs"
              >
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <UserAvatar
                    size="xs"
                    name={pin.message.senderDisplayName || pin.message.senderUsername}
                    avatarUrl={pin.message.senderAvatarUrl}
                    className="w-5 h-5 flex-shrink-0"
                  />
                  <div className="min-w-0 flex-1 flex items-baseline gap-1.5">
                    <span className="font-semibold text-[var(--text-primary)] flex-shrink-0 group-hover:text-[var(--accent-primary)] transition-colors">
                      {pin.message.senderDisplayName || pin.message.senderUsername}:
                    </span>
                    <span className="truncate text-[var(--text-muted)] group-hover:text-[var(--text-primary)]">
                      {getSnippet(pin)}
                    </span>
                  </div>
                </div>

                <span className="text-[10px] text-[var(--text-muted)] flex-shrink-0">
                  {getTime(pin.pinnedAt)}
                </span>
              </div>
            ))}
          </div>

          {/* Footer: Action to see all in Sidebar */}
          <button
            type="button"
            onClick={() => {
              setIsOpen(false);
              onOpenSidebar();
            }}
            className="w-full px-3.5 py-2 bg-[var(--bg-chat)]/70 hover:bg-[var(--bg-surface-active)] border-t border-[var(--border-color)] flex items-center justify-between text-xs text-[var(--accent-primary)] font-medium transition-colors cursor-pointer"
          >
            <span>Xem tất cả {totalCount} tin nhắn đã ghim</span>
            <ArrowRight size={13} weight="bold" />
          </button>
        </div>
      )}
    </div>
  );
};

