import React from 'react';
import {
  Microphone,
  MicrophoneSlash,
  Headphones,
  Gear,
  CaretDown,
} from '@phosphor-icons/react';
import { Avatar } from '../ui';
import type { User } from '../../types';
import { useVoiceStore } from '../../stores/useVoiceStore';

interface UserFooterBarProps {
  currentUser: User | null;
  onOpenSettings: () => void;
}

export const UserFooterBar: React.FC<UserFooterBarProps> = ({
  currentUser,
  onOpenSettings,
}) => {
  const {
    isMuted,
    isDeafened,
    toggleMute,
    toggleDeafen,
  } = useVoiceStore();

  return (
    <div className="shrink-0 z-30 select-none pb-2.5 pt-1.5 px-3 border-t border-[var(--border-color)] bg-[var(--bg-sidebar)] flex items-center">
      {/* Floating User Profile Card - Height 52px, perfectly aligned with Chat Input Box */}
      <div className="h-[52px] w-full bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-lg px-2.5 flex items-center justify-between shadow-2xs hover:border-[var(--border-color)]/90 transition-all">
        {/* User profile button */}
        <button
          type="button"
          onClick={onOpenSettings}
          title="Mở cài đặt tài khoản"
          className="flex items-center gap-2.5 min-w-0 p-1 -ml-1 rounded-md hover:bg-[var(--bg-surface-active)] transition-colors cursor-pointer text-left group flex-1 mr-1"
        >
          <div className="relative shrink-0">
            <Avatar
              src={currentUser?.avatarUrl}
              fallback={currentUser?.displayName || 'User'}
              size="md"
              status="online"
            />
          </div>
          <div className="min-w-0 flex-1 leading-tight">
            <div className="text-[13px] font-bold text-[var(--text-primary)] truncate group-hover:text-[var(--accent-primary)] transition-colors">
              {currentUser?.displayName || 'Người dùng'}
            </div>
            <div className="text-[11px] text-[var(--text-muted)] truncate font-normal">
              Trực tuyến
            </div>
          </div>
        </button>

        {/* Media & Settings Controls */}
        <div className="flex items-center gap-1 shrink-0 text-[var(--text-muted)]">
          {/* Microphone Toggle - Discord-style pill with caret (Image 3) */}
          <button
            type="button"
            onClick={toggleMute}
            title={isMuted ? 'Bật Mic' : 'Tắt Mic'}
            className={`relative px-2 py-1.5 rounded-md transition-all cursor-pointer flex items-center gap-1 ${
              isMuted
                ? 'bg-danger/15 text-danger border border-danger/30 hover:bg-danger/25'
                : 'text-[var(--text-muted)] hover:bg-[var(--bg-surface-active)] hover:text-[var(--text-primary)]'
            }`}
          >
            {isMuted ? (
              <MicrophoneSlash size={17} weight="bold" />
            ) : (
              <Microphone size={17} weight="bold" />
            )}
            <CaretDown size={10} weight="bold" className={isMuted ? 'text-danger' : 'opacity-60'} />
          </button>

          {/* Headphones (Deafen) Toggle - Discord-style pill with caret (Image 3) */}
          <button
            type="button"
            onClick={toggleDeafen}
            title={isDeafened ? 'Bật Âm thanh' : 'Tắt Âm thanh'}
            className={`relative px-2 py-1.5 rounded-md transition-all cursor-pointer flex items-center gap-1 ${
              isDeafened
                ? 'bg-danger/15 text-danger border border-danger/30 hover:bg-danger/25'
                : 'text-[var(--text-muted)] hover:bg-[var(--bg-surface-active)] hover:text-[var(--text-primary)]'
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
            className="p-1.5 rounded-md hover:bg-[var(--bg-surface-active)] hover:text-[var(--text-primary)] transition-colors cursor-pointer text-[var(--text-muted)]"
          >
            <Gear size={17} weight="bold" />
          </button>
        </div>
      </div>
    </div>
  );
};
