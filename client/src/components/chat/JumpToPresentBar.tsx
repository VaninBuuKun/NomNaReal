import React from "react";
import { ArrowDown, CircleNotch } from "@phosphor-icons/react";

interface JumpToPresentBarProps {
  hasNewerMessages: boolean;
  isLoadingNewer?: boolean;
  showScrollToBottom: boolean;
  unreadBelowCount?: number;
  onJumpToPresent: () => void;
  onScrollToBottom: () => void;
  isSidebar?: boolean;
}

export const JumpToPresentBar: React.FC<JumpToPresentBarProps> = ({
  hasNewerMessages,
  isLoadingNewer = false,
  showScrollToBottom,
  unreadBelowCount = 0,
  onJumpToPresent,
  onScrollToBottom,
  isSidebar = false,
}) => {
  // If user is viewing historical messages (has newer messages to load)
  if (hasNewerMessages) {
    return (
      <div
        className={`absolute ${
          isSidebar ? "bottom-16 left-3 right-3" : "bottom-20 left-6 right-6"
        } z-30 animate-in fade-in slide-in-from-bottom-2 duration-150`}
      >
        <div className="flex items-center justify-between px-3.5 py-2 rounded-control bg-surface border border-accent-primary/40 shadow-floating">
          <div className="flex items-center gap-2 text-xs text-text-secondary">
            {isLoadingNewer && (
              <CircleNotch size={14} className="animate-spin text-accent-primary" />
            )}
            <span>Bạn đang xem lịch sử tin nhắn</span>
          </div>
          <button
            type="button"
            onClick={onJumpToPresent}
            className="flex items-center gap-1.5 px-3 py-1 rounded-control bg-accent-primary hover:bg-accent-hover text-on-accent text-xs font-semibold shadow-raised transition-all cursor-pointer"
          >
            <span>Nhảy về hiện tại</span>
            <ArrowDown size={14} weight="bold" />
          </button>
        </div>
      </div>
    );
  }

  // If user is scrolled up in the current stream, show floating pill to jump down
  if (showScrollToBottom) {
    return (
      <div
        className={`absolute ${
          isSidebar ? "bottom-16 right-4" : "bottom-20 right-6"
        } z-30 animate-in fade-in slide-in-from-bottom-2 duration-150`}
      >
        <button
          type="button"
          onClick={onScrollToBottom}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface border border-border text-xs font-semibold text-text-secondary shadow-floating hover:text-accent-primary hover:border-accent-primary hover:bg-surface-active transition-all cursor-pointer select-none group"
          title="Cuộn xuống tin nhắn mới nhất"
        >
          <ArrowDown
            size={14}
            weight="bold"
            className="group-hover:translate-y-0.5 transition-transform"
          />
          <span>Tin nhắn mới nhất</span>
          {unreadBelowCount > 0 && (
            <span className="ml-0.5 px-1.5 py-0.2 rounded-full bg-accent-primary text-on-accent text-[10px] font-bold">
              {unreadBelowCount > 99 ? "99+" : unreadBelowCount}
            </span>
          )}
        </button>
      </div>
    );
  }

  return null;
};
