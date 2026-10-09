import React, { useState } from "react";
import {
  MagnifyingGlass,
  X,
  Funnel,
  CalendarBlank,
  User as UserIcon,
  CircleNotch,
  ChatCircleText,
  ArrowsClockwise,
} from "@phosphor-icons/react";
import type { Channel, Message } from "../../types";
import { messageApi } from "../../services/messageApi";

interface SearchSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  width?: number;
  currentChannel: Channel | null;
  workspaceId: string | null;
  workspaceMembers?: { id: string; displayName?: string; username?: string; avatarUrl?: string }[];
  onJumpToMessage: (channelId: string, messageId: string) => void;
}

export const SearchSidebar: React.FC<SearchSidebarProps> = ({
  isOpen,
  onClose,
  width = 380,
  currentChannel,
  workspaceId,
  workspaceMembers = [],
  onJumpToMessage,
}) => {
  const [keyword, setKeyword] = useState("");
  const [isWorkspaceWide, setIsWorkspaceWide] = useState(false);
  const [senderId, setSenderId] = useState<string>("");
  const [fromDate, setFromDate] = useState<string>("");
  const [toDate, setToDate] = useState<string>("");

  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [results, setResults] = useState<Message[]>([]);
  const [showFilters, setShowFilters] = useState(true);

  if (!isOpen) return null;

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!workspaceId) return;

    const trimmed = keyword.trim();
    if (!trimmed && !senderId && !fromDate && !toDate) return;

    setIsSearching(true);
    setHasSearched(true);

    try {
      const msgs = await messageApi.searchMessages({
        workspaceId,
        keyword: trimmed || undefined,
        channelId: !isWorkspaceWide && currentChannel ? currentChannel.id : undefined,
        senderId: senderId || undefined,
        fromDate: fromDate ? new Date(fromDate).toISOString() : undefined,
        toDate: toDate ? new Date(toDate).toISOString() : undefined,
        limit: 50,
      });
      setResults(msgs || []);
    } catch (err) {
      console.error("Search failed:", err);
      alert("Không thể tìm kiếm tin nhắn. Vui lòng thử lại.");
    } finally {
      setIsSearching(false);
    }
  };

  const handleResetFilters = () => {
    setSenderId("");
    setFromDate("");
    setToDate("");
    setIsWorkspaceWide(false);
  };

  const hasActiveFilters = Boolean(senderId || fromDate || toDate || isWorkspaceWide);

  // Helper to highlight matching keyword in pure text snippet
  const renderHighlightedSnippet = (text: string, term: string) => {
    if (!term.trim()) return text;
    const parts = text.split(new RegExp(`(${term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi"));
    return parts.map((part, i) =>
      part.toLowerCase() === term.toLowerCase() ? (
        <mark
          key={i}
          className="bg-[var(--accent-soft)] text-[var(--accent-primary)] font-bold px-0.5 rounded"
        >
          {part}
        </mark>
      ) : (
        part
      )
    );
  };

  return (
    <aside
      style={{ width: `${width}px` }}
      className="h-full bg-[var(--bg-sidebar)] border-l border-[var(--border-color)] flex flex-col shrink-0 overflow-hidden select-none z-20 shadow-lg"
    >
      {/* 1. Header (Unified with MemberListPanel) */}
      <div className="h-[54px] border-b border-[var(--border-color)] px-3.5 flex items-center justify-between bg-[var(--bg-sidebar)] shrink-0">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <span className="font-bold text-sm text-[var(--text-primary)] truncate">
            Tìm kiếm
          </span>
          {hasSearched && (
            <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-[var(--accent-soft)] text-[var(--accent-primary)] shrink-0">
              {results.length} kết quả
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-1.5 rounded-md text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)] transition-colors cursor-pointer"
          title="Đóng tìm kiếm"
        >
          <X size={15} />
        </button>
      </div>

      {/* 2. Search Input & Scope Bar */}
      <div className="p-3 border-b border-[var(--border-color)] bg-[var(--bg-sidebar)] flex flex-col gap-2.5 shrink-0">
        <form onSubmit={handleSearch} className="relative flex items-center">
          <MagnifyingGlass
            size={15}
            weight="bold"
            className="absolute left-3 text-[var(--text-muted)] pointer-events-none"
          />
          <input
            type="text"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                handleSearch();
              }
            }}
            placeholder="Nội dung cần tìm... (Enter)"
            autoFocus
            className="w-full pl-9 pr-8 py-2 text-xs rounded-lg border border-[var(--border-color)] bg-[var(--bg-surface)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-primary)] focus:ring-1 focus:ring-[var(--accent-primary)] transition-all shadow-2xs"
          />
          {keyword && (
            <button
              type="button"
              onClick={() => setKeyword("")}
              className="absolute right-2.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
            >
              <X size={12} weight="bold" />
            </button>
          )}
        </form>

        {/* Scope Segment: Current Channel vs Entire Workspace */}
        <div className="flex items-center gap-1.5 p-1 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-color)]">
          <button
            type="button"
            onClick={() => setIsWorkspaceWide(false)}
            className={`flex-1 py-1 px-2 text-[11px] font-semibold rounded-md transition-all cursor-pointer truncate ${
              !isWorkspaceWide
                ? "bg-[var(--bg-chat)] text-[var(--accent-primary)] shadow-2xs"
                : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            }`}
          >
            #{currentChannel?.name || "Kênh hiện tại"}
          </button>
          <button
            type="button"
            onClick={() => setIsWorkspaceWide(true)}
            className={`flex-1 py-1 px-2 text-[11px] font-semibold rounded-md transition-all cursor-pointer ${
              isWorkspaceWide
                ? "bg-[var(--bg-chat)] text-[var(--accent-primary)] shadow-2xs"
                : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            }`}
          >
            Toàn bộ Server
          </button>
        </div>

        {/* Filter Toggle Header */}
        <div className="flex items-center justify-between pt-1">
          <button
            type="button"
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-1.5 text-[11px] font-medium text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
          >
            <Funnel size={13} weight={hasActiveFilters ? "fill" : "regular"} />
            <span>Bộ lọc nâng cao</span>
            {hasActiveFilters && (
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent-primary)]" />
            )}
          </button>

          {hasActiveFilters && (
            <button
              type="button"
              onClick={handleResetFilters}
              className="flex items-center gap-1 text-[10px] text-rose-500 hover:underline cursor-pointer"
            >
              <ArrowsClockwise size={11} />
              <span>Đặt lại</span>
            </button>
          )}
        </div>

        {/* Collapsible Filter Panel */}
        {showFilters && (
          <div className="p-2.5 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-color)] flex flex-col gap-2.5 text-xs animate-in fade-in duration-150">
            {/* Sender Filter */}
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold uppercase text-[var(--text-muted)] flex items-center gap-1">
                <UserIcon size={11} /> Người gửi
              </label>
              <select
                value={senderId}
                onChange={(e) => setSenderId(e.target.value)}
                className="w-full px-2 py-1.5 text-xs rounded-md border border-[var(--border-color)] bg-[var(--bg-chat)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-primary)] cursor-pointer"
              >
                <option value="">Tất cả người gửi</option>
                {workspaceMembers.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.displayName || m.username || "Thành viên"} (@{m.username || ""})
                  </option>
                ))}
              </select>
            </div>

            {/* Date Range: From - To */}
            <div className="grid grid-cols-2 gap-2">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold uppercase text-[var(--text-muted)] flex items-center gap-1">
                  <CalendarBlank size={11} /> Từ ngày
                </label>
                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="w-full px-2 py-1 text-xs rounded-md border border-[var(--border-color)] bg-[var(--bg-chat)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-primary)]"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold uppercase text-[var(--text-muted)] flex items-center gap-1">
                  <CalendarBlank size={11} /> Đến ngày
                </label>
                <input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="w-full px-2 py-1 text-xs rounded-md border border-[var(--border-color)] bg-[var(--bg-chat)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-primary)]"
                />
              </div>
            </div>

            {/* Execute Filter Button */}
            <button
              type="button"
              onClick={() => handleSearch()}
              disabled={isSearching}
              className="mt-0.5 py-1.5 px-3 rounded-md bg-[var(--accent-primary)] hover:bg-[var(--accent-hover)] text-white text-xs font-semibold cursor-pointer transition-all disabled:opacity-50 flex items-center justify-center gap-1.5 shadow-2xs"
            >
              {isSearching ? (
                <>
                  <CircleNotch size={14} className="animate-spin" />
                  <span>Đang tìm...</span>
                </>
              ) : (
                <>
                  <MagnifyingGlass size={13} weight="bold" />
                  <span>Áp dụng & Tìm kiếm</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* 3. Result List */}
      <div className="flex-1 min-h-0 overflow-y-auto p-3 flex flex-col gap-2">
        {isSearching ? (
          <div className="py-12 flex flex-col items-center justify-center gap-2.5 text-[var(--text-muted)]">
            <CircleNotch size={24} className="animate-spin text-[var(--accent-primary)]" />
            <span className="text-xs">Đang quét cơ sở dữ liệu tin nhắn...</span>
          </div>
        ) : hasSearched && results.length === 0 ? (
          <div className="py-12 flex flex-col items-center justify-center gap-2 text-center text-[var(--text-muted)] px-4">
            <div className="w-12 h-12 rounded-full bg-[var(--bg-surface)] border border-[var(--border-color)] flex items-center justify-center text-[var(--text-muted)]">
              <ChatCircleText size={22} className="opacity-50" />
            </div>
            <p className="text-xs font-semibold text-[var(--text-primary)]">
              Không tìm thấy tin nhắn nào
            </p>
            <p className="text-[11px] leading-relaxed">
              Thử tìm kiếm với từ khoá khác hoặc mở rộng bộ lọc thời gian / toàn bộ workspace.
            </p>
          </div>
        ) : results.length > 0 ? (
          <>
            <div className="px-1 pb-1 text-[11px] font-bold text-[var(--text-muted)] flex items-center justify-between select-none">
              <span>KẾT QUẢ TÌM THẤY</span>
              <span className="px-1.5 py-0.2 rounded-full bg-[var(--accent-soft)] text-[var(--accent-primary)] font-bold">
                {results.length}
              </span>
            </div>

            {results.map((msg) => {
              const avatarSrc = msg.senderAvatarUrl || "/default-avatar.png";
              const timeFormatted = new Date(msg.createdAt).toLocaleDateString([], {
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              });

              return (
                <div
                  key={msg.id}
                  onClick={() => onJumpToMessage(msg.channelId, msg.id)}
                  className="p-2.5 rounded-lg bg-[var(--bg-chat)] border border-[var(--border-color)] hover:border-[var(--accent-primary)] hover:bg-[var(--bg-surface)] transition-all cursor-pointer group flex flex-col gap-1.5 shadow-2xs"
                >
                  {/* Top: Avatar, Name, Time */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-6 h-6 rounded-md overflow-hidden bg-[var(--bg-surface)] border border-[var(--border-color)] shrink-0">
                        <img
                          src={avatarSrc}
                          alt={msg.senderDisplayName}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.currentTarget.src = "/default-avatar.png";
                          }}
                        />
                      </div>
                      <span className="text-xs font-bold text-[var(--text-primary)] truncate">
                        {msg.senderDisplayName}
                      </span>
                    </div>

                    <span className="text-[10px] text-[var(--text-muted)] shrink-0 font-mono">
                      {timeFormatted}
                    </span>
                  </div>

                  {/* Pure Text Snippet (No images as requested) */}
                  <p className="text-xs text-[var(--text-secondary)] leading-relaxed line-clamp-3 break-words">
                    {msg.content ? (
                      renderHighlightedSnippet(msg.content, keyword)
                    ) : msg.attachments && msg.attachments.length > 0 ? (
                      <span className="italic text-[var(--text-muted)]">[Hình ảnh / Tệp đính kèm]</span>
                    ) : (
                      <span className="italic text-[var(--text-muted)]">[Không có nội dung text]</span>
                    )}
                  </p>
                </div>
              );
            })}
          </>
        ) : (
          <div className="py-12 flex flex-col items-center justify-center gap-2 text-center text-[var(--text-muted)] px-4">
            <MagnifyingGlass size={28} className="opacity-40" />
            <p className="text-xs font-medium text-[var(--text-secondary)]">
              Nhập từ khóa và bấm Enter để tìm kiếm
            </p>
            <p className="text-[11px] leading-relaxed">
              Hỗ trợ lọc theo thành viên và mốc thời gian linh hoạt.
            </p>
          </div>
        )}
      </div>
    </aside>
  );
};
