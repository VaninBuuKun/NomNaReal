import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  User as UserIcon,
  CaretRight,
  SpeakerHigh,
  Microphone,
  MicrophoneSlash,
  Headphones,
  Sliders,
  PhoneDisconnect,
  Copy,
  Check,
} from '@phosphor-icons/react';
import type { Channel, VoiceParticipant } from '../../types';
import { UserAvatar } from '../ui/UserAvatar';

export interface VoiceMemberContextMenuProps {
  position: { x: number; y: number };
  participant: VoiceParticipant;
  currentChannel?: Channel;
  otherVoiceChannels: Channel[];
  isCurrentUser: boolean;
  onClose: () => void;
  onOpenProfile: (participant: VoiceParticipant, anchorRect?: DOMRect) => void;
  onSwitchChannel: (channelId: string) => void;
  onToggleMute: () => void;
  onToggleDeafen: () => void;
  volume: number;
  onVolumeChange: (vol: number) => void;
  onDisconnect?: () => void;
}

export const VoiceMemberContextMenu: React.FC<VoiceMemberContextMenuProps> = ({
  position,
  participant,
  otherVoiceChannels,
  isCurrentUser,
  onClose,
  onOpenProfile,
  onSwitchChannel,
  onToggleMute,
  onToggleDeafen,
  volume,
  onVolumeChange,
  onDisconnect,
}) => {
  const menuRef = useRef<HTMLDivElement>(null);
  const [isSubmenuOpen, setIsSubmenuOpen] = useState(false);
  const [copiedId, setCopiedId] = useState(false);

  // Close on outside click or escape
  useEffect(() => {
    const handleMouseDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    const handleScroll = () => {
      onClose();
    };

    document.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('keydown', handleKeyDown);
    window.addEventListener('scroll', handleScroll, true);
    window.addEventListener('resize', handleScroll);

    return () => {
      document.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('scroll', handleScroll, true);
      window.removeEventListener('resize', handleScroll);
    };
  }, [onClose]);

  // Handle smart screen edge clamping
  const menuWidth = 224;
  const menuHeight = 310;
  const clampedX = Math.max(8, Math.min(position.x, window.innerWidth - menuWidth - 8));
  const clampedY = Math.max(8, Math.min(position.y, window.innerHeight - menuHeight - 8));

  // Determine submenu direction (open left if not enough space on right)
  const openSubmenuLeft = clampedX + menuWidth + 200 > window.innerWidth;

  const handleCopyUserId = async () => {
    try {
      await navigator.clipboard.writeText(participant.userId);
      setCopiedId(true);
      setTimeout(() => {
        setCopiedId(false);
        onClose();
      }, 800);
    } catch (err) {
      console.warn('Failed to copy ID:', err);
    }
  };

  return createPortal(
    <div
      ref={menuRef}
      style={{ left: `${clampedX}px`, top: `${clampedY}px` }}
      className="fixed z-50 w-56 bg-surface/95 backdrop-blur-md border border-border rounded-card shadow-floating p-1.5 flex flex-col gap-0.5 text-xs select-none animate-in fade-in zoom-in-95 duration-100"
      onClick={(e) => e.stopPropagation()}
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* Header with participant identity */}
      <div className="flex items-center gap-2.5 px-2.5 py-2 rounded-control bg-sidebar/50 mb-1 border-b border-border/50">
        <div className="relative shrink-0">
          <UserAvatar
            name={participant.displayName}
            avatarUrl={participant.avatarUrl}
            size="sm"
            roundedClassName="rounded-full"
            className={participant.isSpeaking ? 'ring-2 ring-success ring-offset-1 ring-offset-surface' : ''}
          />
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-bold text-text-primary truncate">
            {participant.displayName}
          </div>
          <div className="text-[10px] text-text-muted truncate">
            {participant.isSpeaking
              ? 'Đang nói...'
              : participant.isMuted
              ? 'Đã tắt micro'
              : 'Đang kết nối'}
          </div>
        </div>
      </div>

      {/* 1. Profile Action */}
      <button
        type="button"
        onClick={() => {
          const rect = menuRef.current?.getBoundingClientRect();
          onOpenProfile(participant, rect);
          onClose();
        }}
        className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-control font-medium text-text-secondary hover:text-text-primary hover:bg-surface-active transition-colors cursor-pointer text-left"
      >
        <UserIcon size={15} weight="bold" className="shrink-0 text-text-muted" />
        <span>Hồ sơ</span>
      </button>

      {/* 2. Switch Channel / Chuyển tới with Submenu */}
      <div
        className="relative"
        onMouseEnter={() => setIsSubmenuOpen(true)}
        onMouseLeave={() => setIsSubmenuOpen(false)}
      >
        <button
          type="button"
          onClick={() => setIsSubmenuOpen((prev) => !prev)}
          className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-control font-medium transition-colors cursor-pointer text-left ${
            isSubmenuOpen
              ? 'bg-surface-active text-text-primary'
              : 'text-text-secondary hover:text-text-primary hover:bg-surface-active'
          }`}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <SpeakerHigh size={15} weight="bold" className="shrink-0 text-text-muted" />
            <span className="truncate">Chuyển tới</span>
          </div>
          <CaretRight size={13} weight="bold" className="text-text-muted shrink-0" />
        </button>

        {/* Flyout Submenu showing other voice channels */}
        {isSubmenuOpen && (
          <div
            className={`absolute top-0 w-48 bg-surface/98 backdrop-blur-md border border-border rounded-card shadow-floating p-1.5 flex flex-col gap-0.5 z-60 animate-in fade-in duration-100 ${
              openSubmenuLeft ? 'right-full mr-1' : 'left-full ml-1'
            }`}
          >
            <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-text-muted">
              Kênh thoại khả dụng
            </div>
            {otherVoiceChannels.length === 0 ? (
              <div className="px-2 py-2 text-text-muted italic text-[11px] text-center">
                Không có kênh khác
              </div>
            ) : (
              otherVoiceChannels.map((vc) => (
                <button
                  key={vc.id}
                  type="button"
                  onClick={() => {
                    onSwitchChannel(vc.id);
                    onClose();
                  }}
                  className="w-full flex items-center gap-2 px-2 py-1.5 rounded-control text-text-secondary hover:text-text-primary hover:bg-surface-active transition-colors cursor-pointer text-left truncate"
                  title={`Chuyển sang ${vc.name}`}
                >
                  <SpeakerHigh size={14} weight="bold" className="shrink-0 text-text-muted" />
                  <span className="truncate">{vc.name}</span>
                </button>
              ))
            )}
          </div>
        )}
      </div>

      <div className="h-px bg-border/60 my-1" />

      {/* 3. Mute / Unmute */}
      <button
        type="button"
        onClick={() => {
          onToggleMute();
          if (isCurrentUser) onClose();
        }}
        className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-control font-medium text-text-secondary hover:text-text-primary hover:bg-surface-active transition-colors cursor-pointer text-left"
      >
        {participant.isMuted || (isCurrentUser && participant.isMuted) || (!isCurrentUser && volume === 0) ? (
          <>
            <Microphone size={15} weight="bold" className="shrink-0 text-success" />
            <span>{isCurrentUser ? 'Bật micro' : 'Bật tiếng người này'}</span>
          </>
        ) : (
          <>
            <MicrophoneSlash size={15} weight="bold" className="shrink-0 text-danger" />
            <span>{isCurrentUser ? 'Tắt micro' : 'Tắt tiếng người này'}</span>
          </>
        )}
      </button>

      {/* 4. Deafen / Undeafen (Only relevant for current user or full muting) */}
      {isCurrentUser && (
        <button
          type="button"
          onClick={() => {
            onToggleDeafen();
            onClose();
          }}
          className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-control font-medium text-text-secondary hover:text-text-primary hover:bg-surface-active transition-colors cursor-pointer text-left"
        >
          <Headphones size={15} weight="bold" className="shrink-0 text-text-muted" />
          <span>{participant.isDeafened ? 'Bật âm thanh' : 'Tắt toàn bộ âm thanh'}</span>
        </button>
      )}

      {/* 5. Volume Slider for other users */}
      {!isCurrentUser && (
        <div className="px-2.5 py-2 rounded-control bg-sidebar/30 mt-0.5 flex flex-col gap-1.5">
          <div className="flex items-center justify-between text-[11px]">
            <span className="font-semibold text-text-secondary flex items-center gap-1.5">
              <Sliders size={13} weight="bold" className="text-text-muted" />
              Âm lượng
            </span>
            <span className="font-mono text-text-primary font-bold">{volume}%</span>
          </div>
          <input
            type="range"
            min={0}
            max={200}
            value={volume}
            onChange={(e) => onVolumeChange(Number(e.target.value))}
            className="w-full accent-accent-primary cursor-pointer h-1.5 bg-surface-active rounded-control"
          />
        </div>
      )}

      <div className="h-px bg-border/60 my-1" />

      {/* 6. Copy ID */}
      <button
        type="button"
        onClick={handleCopyUserId}
        className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-control font-medium text-text-secondary hover:text-text-primary hover:bg-surface-active transition-colors cursor-pointer text-left"
      >
        <div className="flex items-center gap-2.5">
          <Copy size={15} weight="bold" className="shrink-0 text-text-muted" />
          <span>Sao chép ID</span>
        </div>
        {copiedId && <Check size={14} weight="bold" className="text-success" />}
      </button>

      {/* 7. Disconnect Button (if current user or onDisconnect provided) */}
      {isCurrentUser && onDisconnect && (
        <button
          type="button"
          onClick={() => {
            onDisconnect();
            onClose();
          }}
          className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-control font-medium text-danger hover:bg-danger-soft transition-colors cursor-pointer text-left mt-0.5"
        >
          <PhoneDisconnect size={15} weight="bold" className="shrink-0" />
          <span>Ngắt kết nối</span>
        </button>
      )}
    </div>,
    document.body
  );
};
