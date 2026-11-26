import React, { useEffect, useMemo } from 'react';
import {
  X,
  ChatCenteredDots,
  At,
  Gear,
  Crown,
  ShieldCheck,
  User,
  EnvelopeSimple,
  Circle,
  UserMinus,
  Clock,
  Prohibit,
} from '@phosphor-icons/react';
import { UserAvatar } from '../ui/UserAvatar';

export interface UserProfileData {
  id: string;
  displayName: string;
  username: string;
  avatarUrl?: string | null;
  email?: string;
  role?: string;
  status?: string;
  bio?: string;
}

export interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserProfileData | null;
  anchorRect?: { top: number; left: number; right: number; bottom: number } | null;
  currentUserId?: string;
  onStartDm?: (user: UserProfileData) => void;
  onMentionUser?: (username: string) => void;
  onOpenSettings?: () => void;
  canKick?: boolean;
  onKickMember?: (user: UserProfileData) => void;
  onTimeoutMember?: (user: UserProfileData) => void;
  onBanMember?: (user: UserProfileData) => void;
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({
  isOpen,
  onClose,
  user,
  anchorRect,
  currentUserId,
  onStartDm,
  onMentionUser,
  onOpenSettings,
  canKick,
  onKickMember,
  onTimeoutMember,
  onBanMember,
}) => {
  // ESC key handler
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Compute position near anchorRect with robust viewport collision clamping
  const popoverStyle = useMemo<React.CSSProperties>(() => {
    if (!anchorRect) {
      return {
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
      };
    }

    const cardWidth = 310;
    const estimatedHeight = canKick ? 340 : 260;
    const pad = 12;
    const vw = typeof window !== 'undefined' ? window.innerWidth : 1200;
    const vh = typeof window !== 'undefined' ? window.innerHeight : 800;

    // Horizontal: default to right of anchor; flip to left if overflowing
    let left = anchorRect.right + 8;
    if (left + cardWidth > vw - pad) {
      left = Math.max(pad, anchorRect.left - cardWidth - 8);
    }

    // Vertical: clamp inside screen so it never overflows bottom taskbar
    let top = anchorRect.top - 8;
    if (top + estimatedHeight > vh - pad) {
      top = Math.max(pad, vh - estimatedHeight - pad);
    }
    if (top < pad) {
      top = pad;
    }

    return {
      top: `${top}px`,
      left: `${left}px`,
      maxHeight: `calc(100vh - ${pad * 2}px)`,
    };
  }, [anchorRect, canKick]);

  if (!isOpen || !user) return null;

  const isMe = currentUserId === user.id;

  const renderRoleBadge = () => {
    const r = (user.role || '').toLowerCase();
    if (r === 'owner') {
      return (
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-warning-soft text-warning border border-warning/30">
          <Crown size={11} weight="fill" />
          <span>Chủ sở hữu</span>
        </span>
      );
    }
    if (r === 'admin') {
      return (
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-accent-soft text-accent border border-accent/30">
          <ShieldCheck size={11} weight="fill" />
          <span>Quản trị viên</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-surface-active text-text-muted border border-border">
        <User size={11} />
        <span>Thành viên</span>
      </span>
    );
  };

  const renderStatus = () => {
    const s = (user.status || 'offline').toLowerCase();
    switch (s) {
      case 'online':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] text-status-online font-medium">
            <span className="w-2 h-2 rounded-full bg-status-online shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
            <span>Trực tuyến</span>
          </span>
        );
      case 'away':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] text-status-idle font-medium">
            <span className="w-2 h-2 rounded-full bg-status-idle" />
            <span>Vắng mặt</span>
          </span>
        );
      case 'dnd':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] text-status-dnd font-medium">
            <span className="w-2 h-2 rounded-full bg-status-dnd" />
            <span>Bận</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 text-[11px] text-text-muted">
            <Circle size={7} weight="fill" className="text-status-offline" />
            <span>Ngoại tuyến</span>
          </span>
        );
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={onClose}
      className="fixed inset-0 z-50 select-none bg-transparent"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={popoverStyle}
        className="fixed z-50 w-[310px] rounded-2xl bg-surface border border-border shadow-2xl overflow-y-auto custom-scrollbar animate-in fade-in zoom-in-95 duration-150"
      >
        {/* Compact Banner */}
        <div className="h-16 bg-gradient-to-r from-accent-primary/35 via-accent-primary/20 to-surface relative shrink-0">
          <button
            type="button"
            onClick={onClose}
            title="Đóng (Escape)"
            className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/30 hover:bg-black/50 text-white/80 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X size={13} weight="bold" />
          </button>
        </div>

        {/* Profile Card Body */}
        <div className="px-3.5 pb-3.5 pt-0">
          {/* Avatar (overlapping banner) */}
          <div className="relative -mt-7 mb-2 inline-block">
            <UserAvatar
              size="lg"
              name={user.displayName || user.username}
              avatarUrl={user.avatarUrl}
              roundedClassName="rounded-full"
              status={user.status}
              className="w-14 h-14 border-3 border-surface shadow-md"
            />
          </div>

          {/* Name & Role Header */}
          <div className="flex items-start justify-between gap-1.5">
            <div className="min-w-0 flex-1">
              <h3 className="font-bold text-sm text-text-primary truncate leading-tight">
                {user.displayName}
              </h3>
              <p className="text-[11px] text-text-muted truncate mt-0.5 font-medium">
                @{user.username}
              </p>
            </div>
            <div className="shrink-0">{renderRoleBadge()}</div>
          </div>

          {/* Details (compact card) */}
          <div className="mt-2.5 p-2.5 rounded-control bg-chat/60 border border-border/50 space-y-1.5 text-xs">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-text-muted">Trạng thái</span>
              {renderStatus()}
            </div>

            {user.email && (
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-text-muted flex items-center gap-1">
                  <EnvelopeSimple size={12} />
                  <span>Email</span>
                </span>
                <span className="text-text-secondary font-mono text-[10px] truncate max-w-[155px]">
                  {user.email}
                </span>
              </div>
            )}

            {user.bio && (
              <div className="pt-1.5 mt-1 border-t border-border/40 text-[11px] text-text-secondary leading-snug italic">
                "{user.bio}"
              </div>
            )}
          </div>

          {/* Primary Action Button */}
          <div className="mt-3 pt-2.5 border-t border-border/60 flex items-center gap-1.5">
            {isMe ? (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenSettings?.();
                }}
                className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-control bg-accent-soft hover:bg-accent-primary text-accent-primary hover:text-white text-xs font-semibold transition-all cursor-pointer shadow-2xs"
              >
                <Gear size={14} weight="bold" />
                <span>Cài đặt tài khoản</span>
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onStartDm?.(user);
                  }}
                  className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-control bg-accent-primary hover:bg-accent-hover text-white text-xs font-semibold transition-all shadow-xs cursor-pointer active:scale-98"
                >
                  <ChatCenteredDots size={14} weight="bold" />
                  <span>Nhắn tin</span>
                </button>

                {onMentionUser && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onMentionUser(user.username);
                    }}
                    title={`Nhắc tên @${user.username} trong chat`}
                    className="p-1.5 rounded-control bg-chat hover:bg-surface-active text-text-secondary hover:text-text-primary border border-border transition-all cursor-pointer"
                  >
                    <At size={14} weight="bold" />
                  </button>
                )}
              </>
            )}
          </div>

          {/* Moderation Actions (Compact 3-column Grid, No English) */}
          {!isMe && canKick && (
            <div className="mt-2.5 pt-2 border-t border-border/60">
              <div className="grid grid-cols-3 gap-1.5">
                {onTimeoutMember && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onTimeoutMember(user);
                    }}
                    className="flex items-center justify-center gap-1 py-1.5 px-2 rounded-control bg-warning-soft hover:bg-warning/20 text-warning text-[11px] font-semibold whitespace-nowrap transition-all border border-warning/30 cursor-pointer active:scale-98"
                    title="Tạm khóa chat"
                  >
                    <Clock size={13} weight="bold" className="shrink-0" />
                    <span>Tạm khóa</span>
                  </button>
                )}
                {onKickMember && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onKickMember(user);
                    }}
                    className="flex items-center justify-center gap-1 py-1.5 px-2 rounded-control bg-danger-soft/80 hover:bg-danger-soft text-danger text-[11px] font-semibold whitespace-nowrap transition-all border border-danger/25 cursor-pointer active:scale-98"
                    title="Đuổi khỏi máy chủ"
                  >
                    <UserMinus size={13} weight="bold" className="shrink-0" />
                    <span>Đuổi</span>
                  </button>
                )}
                {onBanMember && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onBanMember(user);
                    }}
                    className="flex items-center justify-center gap-1 py-1.5 px-2 rounded-control bg-danger-soft hover:bg-danger text-danger hover:text-white text-[11px] font-semibold whitespace-nowrap transition-all border border-danger/30 cursor-pointer active:scale-98"
                    title="Cấm vĩnh viễn"
                  >
                    <Prohibit size={13} weight="bold" className="shrink-0" />
                    <span>Cấm</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
