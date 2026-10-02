import React, { useEffect } from 'react';
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
} from '@phosphor-icons/react';

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
  currentUserId?: string;
  onStartDm?: (user: UserProfileData) => void;
  onMentionUser?: (username: string) => void;
  onOpenSettings?: () => void;
  canKick?: boolean;
  onKickMember?: (user: UserProfileData) => void;
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({
  isOpen,
  onClose,
  user,
  currentUserId,
  onStartDm,
  onMentionUser,
  onOpenSettings,
  canKick,
  onKickMember,
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

  if (!isOpen || !user) return null;

  const isMe = currentUserId === user.id;

  const renderRoleBadge = () => {
    const r = (user.role || '').toLowerCase();
    if (r === 'owner') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/15 text-amber-500 border border-amber-500/30">
          <Crown size={12} weight="fill" />
          <span>Chủ sở hữu</span>
        </span>
      );
    }
    if (r === 'admin') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-indigo-500/15 text-indigo-400 border border-indigo-500/30">
          <ShieldCheck size={12} weight="fill" />
          <span>Quản trị viên</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-[var(--bg-surface-active)] text-[var(--text-muted)] border border-[var(--border-color)]">
        <User size={12} />
        <span>Thành viên</span>
      </span>
    );
  };

  const renderStatus = () => {
    const s = (user.status || 'offline').toLowerCase();
    switch (s) {
      case 'online':
        return (
          <span className="inline-flex items-center gap-1.5 text-xs text-emerald-500 font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
            <span>Đang trực tuyến</span>
          </span>
        );
      case 'away':
        return (
          <span className="inline-flex items-center gap-1.5 text-xs text-amber-500 font-medium">
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            <span>Vắng mặt</span>
          </span>
        );
      case 'dnd':
        return (
          <span className="inline-flex items-center gap-1.5 text-xs text-rose-500 font-medium">
            <span className="w-2 h-2 rounded-full bg-rose-500" />
            <span>Không làm phiền</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
            <Circle size={8} weight="fill" className="text-zinc-500" />
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
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs select-none animate-in fade-in duration-150"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-[340px] rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-color)] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150"
      >
        {/* Top Cover Banner */}
        <div className="h-20 bg-gradient-to-r from-[var(--accent-primary)]/30 via-[var(--accent-primary)]/15 to-[var(--bg-surface)] relative">
          <button
            type="button"
            onClick={onClose}
            title="Đóng (Escape)"
            className="absolute top-3 right-3 w-7 h-7 rounded-full bg-black/25 hover:bg-black/40 text-white/80 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X size={15} weight="bold" />
          </button>
        </div>

        {/* Profile Card Body */}
        <div className="px-5 pb-5 pt-0">
          {/* Avatar (overlapping the banner) */}
          <div className="relative -mt-10 mb-3 inline-block">
            <img
              src={user.avatarUrl || '/default-avatar.png'}
              alt={user.displayName}
              className="w-18 h-18 rounded-2xl object-cover border-3 border-[var(--bg-surface)] bg-[var(--bg-chat)] shadow-md"
              onError={(e) => {
                e.currentTarget.src = '/default-avatar.png';
              }}
            />
            {/* Status ring */}
            <span
              className={`absolute bottom-0 right-0 w-4 h-4 rounded-full border-2 border-[var(--bg-surface)] shadow-xs ${
                user.status === 'online'
                  ? 'bg-emerald-500'
                  : user.status === 'away'
                    ? 'bg-amber-500'
                    : user.status === 'dnd'
                      ? 'bg-rose-500'
                      : 'bg-zinc-500'
              }`}
            />
          </div>

          {/* Name & Handle */}
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <h3 className="font-bold text-base text-[var(--text-primary)] truncate leading-tight">
                {user.displayName}
              </h3>
              <p className="text-xs text-[var(--text-muted)] truncate mt-0.5 font-medium">
                @{user.username}
              </p>
            </div>
            <div>{renderRoleBadge()}</div>
          </div>

          {/* Status & Details */}
          <div className="mt-3.5 pt-3 border-t border-[var(--border-color)]/70 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-[var(--text-muted)]">Trạng thái</span>
              {renderStatus()}
            </div>

            {user.email && (
              <div className="flex items-center justify-between text-xs">
                <span className="text-[var(--text-muted)] flex items-center gap-1">
                  <EnvelopeSimple size={13} />
                  <span>Email</span>
                </span>
                <span className="text-[var(--text-secondary)] font-mono text-[11px] truncate max-w-[170px]">
                  {user.email}
                </span>
              </div>
            )}

            {user.bio && (
              <div className="pt-1 text-xs text-[var(--text-secondary)] leading-relaxed italic bg-[var(--bg-chat)]/60 p-2 rounded-lg border border-[var(--border-color)]/40">
                "{user.bio}"
              </div>
            )}
          </div>

          {/* Primary Actions */}
          <div className="mt-4 pt-3 border-t border-[var(--border-color)]/70 flex items-center gap-2">
            {isMe ? (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenSettings?.();
                }}
                className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-[var(--accent-soft)] hover:bg-[var(--accent-primary)] text-[var(--accent-primary)] hover:text-white text-xs font-bold transition-all cursor-pointer shadow-2xs"
              >
                <Gear size={15} weight="bold" />
                <span>Cài đặt tài khoản của bạn</span>
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onStartDm?.(user);
                  }}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-[var(--accent-primary)] hover:bg-[var(--accent-hover)] text-white text-xs font-bold transition-all shadow-xs cursor-pointer active:scale-98"
                >
                  <ChatCenteredDots size={15} weight="bold" />
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
                    className="p-2 rounded-xl bg-[var(--bg-chat)] hover:bg-[var(--bg-surface-active)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border-color)] transition-all cursor-pointer"
                  >
                    <At size={16} weight="bold" />
                  </button>
                )}
              </>
            )}
          </div>

          {!isMe && canKick && onKickMember && (
            <div className="mt-2 pt-2 border-t border-[var(--border-color)]/60">
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onKickMember(user);
                }}
                className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-500 text-xs font-semibold transition-all border border-red-500/25 cursor-pointer active:scale-98"
              >
                <UserMinus size={14} weight="bold" />
                <span>Đuổi khỏi nhóm (Kick)</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
