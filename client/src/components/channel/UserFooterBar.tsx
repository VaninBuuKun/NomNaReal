import React, { useState } from 'react';
import { Microphone, MicrophoneSlash, Headphones, Gear } from '@phosphor-icons/react';
import { Avatar } from '../ui';
import type { User } from '../../types';

interface UserFooterBarProps {
  currentUser: User | null;
  onOpenSettings: () => void;
}

export const UserFooterBar: React.FC<UserFooterBarProps> = ({
  currentUser,
  onOpenSettings,
}) => {
  const [isMuted, setIsMuted] = useState(false);
  const [isDeafened, setIsDeafened] = useState(false);

  return (
    <div
      className="h-[52px] bg-[var(--bg-surface-active)]/95 border-t border-[var(--border-color)] px-2 flex items-center justify-between shrink-0 select-none z-30"
    >
      {/* User profile button */}
      <button
        type="button"
        onClick={onOpenSettings}
        title="Mở cài đặt tài khoản"
        className="flex items-center gap-2 min-w-0 p-1 -ml-1 rounded-[4px] hover:bg-[var(--bg-surface)] transition-colors cursor-pointer text-left group max-w-[130px]"
      >
        <div className="relative shrink-0">
          <Avatar
            src={currentUser?.avatarUrl}
            fallback={currentUser?.displayName || 'User'}
            size="sm"
            status="online"
          />
        </div>
        <div className="min-w-0 flex-1 leading-tight">
          <div className="text-[13px] font-bold text-[var(--text-primary)] truncate group-hover:text-[var(--accent-primary)] transition-colors">
            {currentUser?.displayName || 'Người dùng'}
          </div>
          <div className="text-[11px] text-[var(--text-muted)] truncate font-mono">
            @{currentUser?.username || 'user'}
          </div>
        </div>
      </button>

      {/* Media & Settings Controls */}
      <div className="flex items-center gap-0.5 shrink-0 text-[var(--text-muted)]">
        <button
          type="button"
          onClick={() => setIsMuted((prev) => !prev)}
          title={isMuted ? 'Bật Mic' : 'Tắt Mic'}
          className={`p-1.5 rounded-[4px] hover:bg-[var(--bg-surface)] hover:text-[var(--text-primary)] transition-colors cursor-pointer ${
            isMuted ? 'text-rose-500 hover:text-rose-400' : ''
          }`}
        >
          {isMuted ? (
            <MicrophoneSlash size={18} weight="bold" />
          ) : (
            <Microphone size={18} weight="bold" />
          )}
        </button>

        <button
          type="button"
          onClick={() => setIsDeafened((prev) => !prev)}
          title={isDeafened ? 'Bật Âm thanh' : 'Tắt Âm thanh'}
          className={`p-1.5 rounded-[4px] hover:bg-[var(--bg-surface)] hover:text-[var(--text-primary)] transition-colors cursor-pointer ${
            isDeafened ? 'text-rose-500 hover:text-rose-400' : ''
          }`}
        >
          <Headphones size={18} weight={isDeafened ? 'fill' : 'bold'} className={isDeafened ? 'text-rose-500' : ''} />
        </button>

        <button
          type="button"
          onClick={onOpenSettings}
          title="Cài đặt người dùng"
          className="p-1.5 rounded-[4px] hover:bg-[var(--bg-surface)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
        >
          <Gear size={18} weight="bold" />
        </button>
      </div>
    </div>
  );
};
