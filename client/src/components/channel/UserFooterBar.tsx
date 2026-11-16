import React, { useState, useRef, useEffect } from 'react';
import {
  Microphone,
  MicrophoneSlash,
  Headphones,
  Gear,
  CaretDown,
  Check,
} from '@phosphor-icons/react';
import { Avatar } from '../ui';
import type { User, UserStatus } from '../../types';
import { useVoiceStore } from '../../stores/useVoiceStore';
import { signalRService } from '../../services/signalr';
import { authApi } from '../../services/authApi';

interface UserFooterBarProps {
  currentUser: User | null;
  onOpenSettings: () => void;
  onUpdateStatus?: (status: UserStatus) => void;
}

interface StatusOption {
  value: UserStatus;
  label: string;
  desc: string;
  dotColor: string;
  avatarStatus: 'online' | 'away' | 'dnd' | 'offline';
}

const STATUS_OPTIONS: StatusOption[] = [
  {
    value: 0,
    label: 'Trực tuyến',
    desc: 'Sẵn sàng trò chuyện',
    dotColor: 'bg-[var(--status-online)]',
    avatarStatus: 'online',
  },
  {
    value: 1,
    label: 'Chờ',
    desc: 'Tạm vắng mặt',
    dotColor: 'bg-[var(--status-away)]',
    avatarStatus: 'away',
  },
  {
    value: 2,
    label: 'Không làm phiền',
    desc: 'Tắt âm thông báo',
    dotColor: 'bg-[var(--status-dnd)]',
    avatarStatus: 'dnd',
  },
  {
    value: 3,
    label: 'Tàng hình',
    desc: 'Không hiển thị trực tuyến',
    dotColor: 'bg-[var(--text-muted)]',
    avatarStatus: 'offline',
  },
];

export const UserFooterBar: React.FC<UserFooterBarProps> = ({
  currentUser,
  onOpenSettings,
  onUpdateStatus,
}) => {
  const {
    isMuted,
    isDeafened,
    toggleMute,
    toggleDeafen,
  } = useVoiceStore();

  const [isStatusMenuOpen, setIsStatusMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const currentPreference = (currentUser?.statusPreference ?? currentUser?.status ?? 0) as UserStatus;
  const currentStatusConfig = STATUS_OPTIONS.find((s) => s.value === currentPreference) || STATUS_OPTIONS[0];

  useEffect(() => {
    if (!isStatusMenuOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        menuRef.current &&
        !menuRef.current.contains(target) &&
        buttonRef.current &&
        !buttonRef.current.contains(target)
      ) {
        setIsStatusMenuOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsStatusMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isStatusMenuOpen]);

  const handleSelectStatus = async (pref: UserStatus) => {
    setIsStatusMenuOpen(false);

    // 1. Optimistic update
    onUpdateStatus?.(pref);

    // 2. Dispatch via SignalR
    await signalRService.setStatusPreference(pref);

    // 3. Sync via HTTP endpoint
    authApi.updateStatusPreference(pref).catch((err) => {
      console.warn('Failed to sync status preference via HTTP:', err);
    });
  };

  return (
    <div className="relative shrink-0 z-30 select-none pb-2.5 pt-1.5 px-3 border-t border-[var(--border-color)] bg-[var(--bg-sidebar)] flex items-center">
      {/* Status Selector Popover */}
      {isStatusMenuOpen && (
        <div
          ref={menuRef}
          className="absolute bottom-[calc(100%+8px)] left-3 w-[260px] max-w-[calc(100vw-24px)] bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-card shadow-floating p-2 z-50 animate-in fade-in zoom-in-95 duration-150"
        >
          {/* User mini preview header */}
          <div className="flex items-center gap-2.5 p-2 rounded-control bg-[var(--bg-sidebar)]/50 border border-[var(--border-color)]/60 mb-2">
            <Avatar
              src={currentUser?.avatarUrl}
              fallback={currentUser?.displayName || 'User'}
              size="sm"
              status={currentStatusConfig.avatarStatus}
            />
            <div className="min-w-0 flex-1">
              <div className="text-xs font-bold text-[var(--text-primary)] truncate">
                {currentUser?.displayName || 'Người dùng'}
              </div>
              <div className="text-[11px] text-[var(--text-muted)] truncate">
                @{currentUser?.username || 'user'}
              </div>
            </div>
          </div>

          <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
            Trạng thái hoạt động
          </div>

          <div className="flex flex-col gap-0.5">
            {STATUS_OPTIONS.map((opt) => {
              const isSelected = opt.value === currentPreference;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => handleSelectStatus(opt.value)}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-control transition-colors cursor-pointer text-left ${
                    isSelected
                      ? 'bg-[var(--bg-surface-active)] text-[var(--text-primary)] font-medium'
                      : 'text-[var(--text-secondary)] hover:bg-[var(--bg-surface-active)]/70 hover:text-[var(--text-primary)]'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${opt.dotColor}`} />
                    <div className="min-w-0">
                      <div className="text-xs leading-tight">{opt.label}</div>
                      <div className="text-[10px] text-[var(--text-muted)] leading-tight mt-0.5 truncate">
                        {opt.desc}
                      </div>
                    </div>
                  </div>
                  {isSelected && (
                    <Check size={14} weight="bold" className="text-[var(--accent-primary)] shrink-0 ml-2" />
                  )}
                </button>
              );
            })}
          </div>

          <div className="h-px bg-[var(--border-color)] my-1.5" />

          <button
            type="button"
            onClick={() => {
              setIsStatusMenuOpen(false);
              onOpenSettings();
            }}
            className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-control text-xs text-[var(--text-secondary)] hover:bg-[var(--bg-surface-active)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
          >
            <Gear size={14} weight="bold" className="text-[var(--text-muted)]" />
            <span>Cài đặt tài khoản</span>
          </button>
        </div>
      )}

      {/* Floating User Profile Card - Height 52px, perfectly aligned with Chat Input Box */}
      <div className="h-[52px] w-full bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-control px-2.5 flex items-center justify-between shadow-2xs hover:border-[var(--border-color)]/90 transition-colors">
        {/* User profile button - toggles status menu */}
        <button
          ref={buttonRef}
          type="button"
          onClick={() => setIsStatusMenuOpen((prev) => !prev)}
          title="Chọn trạng thái hoạt động"
          aria-expanded={isStatusMenuOpen}
          className={`flex items-center gap-2.5 min-w-0 p-1 -ml-1 rounded-control border border-transparent transition-colors cursor-pointer text-left group flex-1 mr-1 ${
            isStatusMenuOpen ? 'bg-[var(--bg-surface-active)]' : 'hover:bg-[var(--bg-surface-active)]'
          }`}
        >
          <div className="relative shrink-0">
            <Avatar
              src={currentUser?.avatarUrl}
              fallback={currentUser?.displayName || 'User'}
              size="md"
              status={currentStatusConfig.avatarStatus}
            />
          </div>
          <div className="min-w-0 flex-1 leading-tight">
            <div className="text-[13px] font-bold text-[var(--text-primary)] truncate group-hover:text-[var(--accent-primary)] transition-colors">
              {currentUser?.displayName || 'Người dùng'}
            </div>
            <div className="text-[11px] text-[var(--text-muted)] truncate font-normal">
              {currentStatusConfig.label}
            </div>
          </div>
        </button>

        {/* Media & Settings Controls */}
        <div className="flex items-center gap-1 shrink-0 text-[var(--text-muted)]">
          {/* Microphone Toggle */}
          <button
            type="button"
            onClick={toggleMute}
            title={isMuted ? 'Bật Mic' : 'Tắt Mic'}
            className={`relative h-8 px-2 rounded-control transition-colors cursor-pointer flex items-center justify-center gap-1 border box-border ${
              isMuted
                ? 'bg-danger/15 text-danger border-danger/30 hover:bg-danger/25'
                : 'border-transparent text-[var(--text-muted)] hover:bg-[var(--bg-surface-active)] hover:text-[var(--text-primary)]'
            }`}
          >
            {isMuted ? (
              <MicrophoneSlash size={17} weight="bold" />
            ) : (
              <Microphone size={17} weight="bold" />
            )}
            <CaretDown size={10} weight="bold" className={isMuted ? 'text-danger' : 'opacity-60'} />
          </button>

          {/* Headphones (Deafen) Toggle */}
          <button
            type="button"
            onClick={toggleDeafen}
            title={isDeafened ? 'Bật Âm thanh' : 'Tắt Âm thanh'}
            className={`relative h-8 px-2 rounded-control transition-colors cursor-pointer flex items-center justify-center gap-1 border box-border ${
              isDeafened
                ? 'bg-danger/15 text-danger border-danger/30 hover:bg-danger/25'
                : 'border-transparent text-[var(--text-muted)] hover:bg-[var(--bg-surface-active)] hover:text-[var(--text-primary)]'
            }`}
          >
            <Headphones size={17} weight={isDeafened ? 'fill' : 'bold'} />
            {isDeafened && (
              <span
                className="absolute left-2.5 w-[18px] h-[2px] bg-danger rotate-45 rounded-full pointer-events-none"
                aria-hidden="true"
              />
            )}
            <CaretDown size={10} weight="bold" className={isDeafened ? 'text-danger' : 'opacity-60'} />
          </button>

          {/* Settings Button */}
          <button
            type="button"
            onClick={onOpenSettings}
            title="Cài đặt người dùng"
            className="h-8 w-8 rounded-control border border-transparent hover:bg-[var(--bg-surface-active)] hover:text-[var(--text-primary)] transition-colors cursor-pointer text-[var(--text-muted)] flex items-center justify-center box-border"
          >
            <Gear size={17} weight="bold" />
          </button>
        </div>
      </div>
    </div>
  );
};
