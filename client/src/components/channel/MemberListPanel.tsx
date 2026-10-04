import React, { useState, useMemo, useRef, useEffect } from "react";
import {
  X,
  MagnifyingGlass,
  ChatCenteredDots,
  Crown,
  ShieldCheck,
  Gear,
  UserMinus,
  Lock,
  UserPlus,
} from "@phosphor-icons/react";
import { Spinner } from "../ui";
import type { DirectMessageUser } from "../dm";
import type { User } from "../../types";
import type { UserProfileData } from "../profile";

interface MemberListPanelProps {
  isOpen: boolean;
  onClose: () => void;
  members: DirectMessageUser[];
  currentUser: User | null;
  currentUserRole?: string;
  width?: number;
  onOpenUserProfile?: (user: UserProfileData, anchorRect?: DOMRect) => void;
  onStartDmWithUser?: (user: {
    id: string;
    displayName: string;
    username: string;
    avatarUrl?: string;
  }) => void;
  onOpenSettings?: () => void;
  onRequestKickMember?: (member: DirectMessageUser) => void;
  onKickMember?: (member: DirectMessageUser) => Promise<void>;
  channelName?: string;
  isPrivateChannel?: boolean;
  isLoading?: boolean;
  onOpenAddMember?: () => void;
}

interface ActivePopoverUser {
  user: DirectMessageUser;
  top: number;
}

export const MemberListPanel: React.FC<MemberListPanelProps> = ({
  isOpen,
  onClose,
  members,
  currentUser,
  currentUserRole,
  width,
  channelName,
  isPrivateChannel,
  isLoading,
  onOpenAddMember,
  onOpenUserProfile,
  onStartDmWithUser,
  onOpenSettings,
  onRequestKickMember,
  onKickMember,
}) => {
  const [search, setSearch] = useState("");
  const [selectedUserPopover, setSelectedUserPopover] = useState<ActivePopoverUser | null>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // Close popover when clicking outside or pressing Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setSelectedUserPopover(null);
      }
    };

    const handleClickOutside = (e: MouseEvent) => {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(e.target as Node)
      ) {
        setSelectedUserPopover(null);
      }
    };

    if (selectedUserPopover) {
      document.addEventListener("keydown", handleKeyDown);
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [selectedUserPopover]);

  const filteredMembers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return members;
    return members.filter(
      (m) =>
        m.displayName.toLowerCase().includes(q) ||
        m.username.toLowerCase().includes(q)
    );
  }, [members, search]);

  // Sort helper: Owner (0) > Admin (1) > Member (2), then alphabetical
  const getRolePriority = (role?: string) => {
    const r = (role || "").toLowerCase();
    if (r === "owner") return 0;
    if (r === "admin") return 1;
    return 2;
  };

  const sortMembers = (list: DirectMessageUser[]) => {
    return [...list].sort((a, b) => {
      const pDiff = getRolePriority(a.role) - getRolePriority(b.role);
      if (pDiff !== 0) return pDiff;
      return a.displayName.localeCompare(b.displayName);
    });
  };

  const onlineMembers = useMemo(() => {
    return sortMembers(filteredMembers.filter((m) => m.status !== "offline"));
  }, [filteredMembers]);

  const offlineMembers = useMemo(() => {
    return sortMembers(filteredMembers.filter((m) => m.status === "offline"));
  }, [filteredMembers]);

  if (!isOpen) return null;

  const handleMemberClick = (m: DirectMessageUser, e: React.MouseEvent<HTMLLIElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    if (onOpenUserProfile) {
      onOpenUserProfile({
        id: m.id,
        displayName: m.displayName,
        username: m.username,
        avatarUrl: m.avatarUrl,
        email: m.email,
        role: m.role,
        status: m.status,
      }, rect);
      return;
    }

    const panelRect = panelRef.current?.getBoundingClientRect();
    const topOffset = panelRect ? Math.max(10, rect.top - panelRect.top - 20) : rect.top;

    setSelectedUserPopover({
      user: m,
      top: Math.min(topOffset, (panelRect?.height || 500) - 240),
    });
  };

  const renderStatusDot = (status: DirectMessageUser["status"]) => {
    switch (status) {
      case "online":
        return <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-[var(--bg-sidebar)]" />;
      case "away":
        return <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-amber-500 ring-2 ring-[var(--bg-sidebar)]" />;
      case "dnd":
        return <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-rose-500 ring-2 ring-[var(--bg-sidebar)]" />;
      default:
        return <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-zinc-500 ring-2 ring-[var(--bg-sidebar)]" />;
    }
  };

  const renderRoleBadge = (role?: string) => {
    const r = (role || "").toLowerCase();
    if (r === "owner") {
      return (
        <span className="inline-flex items-center gap-0.5 text-[9px] px-1.5 py-0.2 rounded font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">
          <Crown size={10} weight="fill" />
          <span>CHỦ</span>
        </span>
      );
    }
    if (r === "admin") {
      return (
        <span className="inline-flex items-center gap-0.5 text-[9px] px-1.5 py-0.2 rounded font-bold bg-indigo-500/15 text-indigo-400 border border-indigo-500/30">
          <ShieldCheck size={10} weight="bold" />
          <span>ADMIN</span>
        </span>
      );
    }
    return null;
  };

  return (
    <aside
      ref={panelRef}
      id="memberListPanel"
      style={width ? { width: `${width}px` } : undefined}
      className={`shrink-0 h-full min-h-0 bg-[var(--bg-sidebar)] border-l border-[var(--border-color)] flex flex-col select-none relative z-20 animate-in fade-in slide-in-from-right-2 duration-150 ${width ? '' : 'w-[270px]'
        }`}
    >
      {/* 1. Header */}
      <div className="h-[54px] border-b border-[var(--border-color)] px-3.5 flex items-center justify-between shrink-0 bg-[var(--bg-sidebar)]">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {isPrivateChannel && (
            <Lock size={15} weight="bold" className="text-amber-500 shrink-0" />
          )}
          <span className="font-bold text-sm text-[var(--text-primary)] truncate">
            {isPrivateChannel && channelName ? `#${channelName}` : 'Thành viên'}
          </span>
          <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-[var(--accent-soft)] text-[var(--accent-primary)] shrink-0">
            {members.length}
          </span>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {isPrivateChannel && onOpenAddMember && (
            <button
              type="button"
              onClick={onOpenAddMember}
              className="p-1.5 rounded-md text-[var(--text-muted)] hover:text-[var(--accent-primary)] hover:bg-[var(--bg-surface)] transition-colors cursor-pointer"
              title="Thêm thành viên vào kênh"
            >
              <UserPlus size={15} weight="bold" />
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-md text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)] transition-colors cursor-pointer"
            title="Đóng danh sách thành viên"
          >
            <X size={15} />
          </button>
        </div>
      </div>

      {/* 2. Search Box */}
      <div className="p-2.5 pb-1 border-b border-[var(--border-color)]/50 shrink-0">
        <div className="relative flex items-center">
          <MagnifyingGlass
            size={13}
            className="absolute left-2.5 text-[var(--text-muted)] pointer-events-none"
          />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Lọc thành viên..."
            className="w-full bg-[var(--bg-surface)] text-xs text-[var(--text-primary)] placeholder:text-[var(--text-muted)] pl-7 pr-2.5 py-1.5 rounded-md border border-[var(--border-color)] focus:outline-none focus:border-[var(--accent-primary)] transition-colors"
          />
        </div>
      </div>

      {/* 3. Members Scrollable List */}
      <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar p-2 flex flex-col gap-2">
        {/* Online Section */}
        {onlineMembers.length > 0 && (
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] px-2 py-1">
              Trực tuyến — {onlineMembers.length}
            </div>
            <ul className="list-none flex flex-col gap-0.5 m-0 p-0">
              {onlineMembers.map((m) => {
                const isCurrent = currentUser && (m.id === currentUser.id || m.username === currentUser.username);
                return (
                  <li
                    key={m.id}
                    onClick={(e) => handleMemberClick(m, e)}
                    className="flex items-center gap-2.5 px-2 py-1.5 rounded-md hover:bg-[var(--bg-surface)] cursor-pointer transition-colors group"
                  >
                    <div className="relative w-8 h-8 rounded-full shrink-0">
                      <img
                        src={m.avatarUrl || "/default-avatar.png"}
                        alt={m.displayName}
                        className="w-8 h-8 rounded-full object-cover border border-[var(--border-color)]"
                        onError={(e) => {
                          e.currentTarget.src = "/default-avatar.png";
                        }}
                      />
                      {renderStatusDot(m.status)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[0.84rem] font-semibold text-[var(--text-primary)] truncate group-hover:text-[var(--accent-primary)] transition-colors">
                          {m.displayName}
                        </span>
                        {isCurrent && (
                          <span className="text-[10px] text-[var(--text-muted)] shrink-0 font-normal">
                            (bạn)
                          </span>
                        )}
                        {renderRoleBadge(m.role)}
                      </div>
                      <div className="text-[0.7rem] text-[var(--text-muted)] truncate">
                        @{m.username}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {/* Offline Section */}
        {offlineMembers.length > 0 && (
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] px-2 py-1 mt-1">
              Ngoại tuyến — {offlineMembers.length}
            </div>
            <ul className="list-none flex flex-col gap-0.5 m-0 p-0">
              {offlineMembers.map((m) => {
                const isCurrent = currentUser && (m.id === currentUser.id || m.username === currentUser.username);
                return (
                  <li
                    key={m.id}
                    onClick={(e) => handleMemberClick(m, e)}
                    className="flex items-center gap-2.5 px-2 py-1.5 rounded-md hover:bg-[var(--bg-surface)] cursor-pointer transition-colors opacity-75 hover:opacity-100 group"
                  >
                    <div className="relative w-8 h-8 rounded-full shrink-0">
                      <img
                        src={m.avatarUrl || "/default-avatar.png"}
                        alt={m.displayName}
                        className="w-8 h-8 rounded-full object-cover border border-[var(--border-color)] grayscale-[30%]"
                        onError={(e) => {
                          e.currentTarget.src = "/default-avatar.png";
                        }}
                      />
                      {renderStatusDot(m.status)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[0.84rem] font-medium text-[var(--text-secondary)] truncate group-hover:text-[var(--text-primary)] transition-colors">
                          {m.displayName}
                        </span>
                        {isCurrent && (
                          <span className="text-[10px] text-[var(--text-muted)] shrink-0 font-normal">
                            (bạn)
                          </span>
                        )}
                        {renderRoleBadge(m.role)}
                      </div>
                      <div className="text-[0.7rem] text-[var(--text-muted)] truncate">
                        @{m.username}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {isLoading ? (
          <div className="py-12 flex flex-col items-center justify-center gap-2.5 text-xs text-[var(--text-muted)] animate-pulse">
            <Spinner size="sm" />
            <span>Đang tải thành viên...</span>
          </div>
        ) : onlineMembers.length === 0 && offlineMembers.length === 0 ? (
          <div className="py-12 px-4 text-center text-xs text-[var(--text-muted)] flex flex-col items-center gap-2">
            <span>Không tìm thấy thành viên nào.</span>
            {isPrivateChannel && onOpenAddMember && (
              <button
                type="button"
                onClick={onOpenAddMember}
                className="mt-1 inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--accent-primary)] hover:underline cursor-pointer"
              >
                <UserPlus size={14} weight="bold" />
                <span>Thêm thành viên vào kênh</span>
              </button>
            )}
          </div>
        ) : null}
      </div>

      {/* 4. Sleek Profile Popover Card */}
      {selectedUserPopover && (
        <div
          ref={popoverRef}
          style={{ top: `${selectedUserPopover.top}px` }}
          className="absolute right-[calc(100%+8px)] w-64 bg-[var(--bg-chat)] border border-[var(--border-color)] rounded-xl shadow-2xl p-3.5 z-50 animate-in fade-in zoom-in-95 duration-150 backdrop-blur-md flex flex-col gap-3"
        >
          {/* Card Header & Avatar */}
          <div className="flex items-center gap-3">
            <div className="relative w-12 h-12 rounded-full shrink-0">
              <img
                src={selectedUserPopover.user.avatarUrl || "/default-avatar.png"}
                alt={selectedUserPopover.user.displayName}
                className="w-12 h-12 rounded-full object-cover border-2 border-[var(--accent-primary)] shadow-sm"
                onError={(e) => {
                  e.currentTarget.src = "/default-avatar.png";
                }}
              />
              {renderStatusDot(selectedUserPopover.user.status)}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <h4 className="font-bold text-sm text-[var(--text-primary)] truncate">
                  {selectedUserPopover.user.displayName}
                </h4>
              </div>
              <p className="text-xs text-[var(--text-muted)] truncate">
                @{selectedUserPopover.user.username}
              </p>
              <div className="mt-1">
                {renderRoleBadge(selectedUserPopover.user.role)}
              </div>
            </div>
          </div>

          {/* Details */}
          {selectedUserPopover.user.email && (
            <div className="p-2 rounded-lg bg-[var(--bg-surface)] text-[11px] text-[var(--text-secondary)] truncate border border-[var(--border-color)]/60">
              <span className="text-[var(--text-muted)] block text-[10px]">Email:</span>
              <span className="font-medium text-[var(--text-primary)]">{selectedUserPopover.user.email}</span>
            </div>
          )}

          {/* Action Button */}
          <div className="pt-1 border-t border-[var(--border-color)] flex flex-col gap-1.5">
            {currentUser && (selectedUserPopover.user.id === currentUser.id || selectedUserPopover.user.username === currentUser.username) ? (
              <button
                type="button"
                onClick={() => {
                  setSelectedUserPopover(null);
                  if (onOpenSettings) onOpenSettings();
                }}
                className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-[var(--bg-surface)] hover:bg-[var(--bg-surface-active)] text-[var(--text-primary)] text-xs font-semibold transition-all border border-[var(--border-color)] cursor-pointer"
              >
                <Gear size={15} />
                <span>Cài đặt tài khoản của bạn</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  const target = selectedUserPopover.user;
                  setSelectedUserPopover(null);
                  if (onStartDmWithUser) {
                    onStartDmWithUser({
                      id: target.id,
                      displayName: target.displayName,
                      username: target.username,
                      avatarUrl: target.avatarUrl,
                    });
                  }
                }}
                className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-[var(--accent-primary)] hover:bg-[var(--accent-hover)] text-white text-xs font-bold transition-all shadow-md shadow-[var(--accent-glow)] cursor-pointer active:scale-98"
              >
                <ChatCenteredDots size={16} weight="bold" />
                <span>Nhắn tin riêng</span>
              </button>
            )}

            {/* Kick Member button for Owner / Admin */}
            {(() => {
              const target = selectedUserPopover.user;
              const isSelf = currentUser && (target.id === currentUser.id || target.username === currentUser.username);
              const callerRole = (currentUserRole || "").toLowerCase();
              const targetRole = (target.role || "").toLowerCase();
              const canKick = !isSelf && (onRequestKickMember || onKickMember) && (
                callerRole === "owner" || (callerRole === "admin" && targetRole !== "owner" && targetRole !== "admin")
              );

              if (!canKick) return null;

              return (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedUserPopover(null);
                    if (onRequestKickMember) {
                      onRequestKickMember(target);
                    } else if (onKickMember) {
                      onKickMember(target);
                    }
                  }}
                  className="w-full flex items-center justify-center gap-2 py-1.75 px-3 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-500 text-xs font-semibold transition-all border border-red-500/25 cursor-pointer active:scale-98"
                >
                  <UserMinus size={15} weight="bold" />
                  <span>Đuổi khỏi nhóm (Kick)</span>
                </button>
              );
            })()}
          </div>
        </div>
      )}
    </aside>
  );
};
