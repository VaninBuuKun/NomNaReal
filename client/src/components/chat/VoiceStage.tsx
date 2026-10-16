import React, { useState, useEffect } from 'react';
import {
  SpeakerHigh,
  Microphone,
  MicrophoneSlash,
  Headphones,
  PhoneDisconnect,
  Screencast,
  VideoCamera,
  VideoCameraSlash,
  ChatTeardropText,
  Waveform,
} from '@phosphor-icons/react';
import type { Channel, User } from '../../types';
import { useVoiceStore } from '../../stores/useVoiceStore';
import { DEFAULT_AVATAR, getMediaUrl } from '../../utils/constants';

interface VoiceStageProps {
  currentChannel: Channel;
  currentUser: User | null;
  isChatOpen: boolean;
  onToggleChat: () => void;
  onLeaveVoice?: () => void;
}

export const VoiceStage: React.FC<VoiceStageProps> = ({
  currentChannel,
  currentUser,
  isChatOpen,
  onToggleChat,
  onLeaveVoice,
}) => {
  const {
    connectedChannelId,
    isMuted,
    isDeafened,
    isSpeaking,
    isScreenSharing,
    participants,
    joinVoice,
    leaveVoice,
    toggleMute,
    toggleDeafen,
    toggleSpeaking,
    toggleScreenSharing,
  } = useVoiceStore();

  const [isCameraActive, setIsCameraActive] = useState(false);

  // Auto-connect to voice channel when entering view if not connected yet
  useEffect(() => {
    if (connectedChannelId !== currentChannel.id && currentUser) {
      joinVoice(
        currentChannel.id,
        currentChannel.name || 'Kênh thoại',
        currentChannel.serverId || currentChannel.workspaceId || '',
        {
          id: currentUser.id,
          displayName: currentUser.displayName,
          avatarUrl: currentUser.avatarUrl,
        }
      );
    }
  }, [currentChannel.id, connectedChannelId, currentUser, joinVoice]);

  const handleDisconnect = () => {
    leaveVoice();
    onLeaveVoice?.();
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-chat overflow-hidden select-none relative">
      {/* 1. Discord-style Compact Voice Room Header */}
      <div className="h-[54px] border-b border-border px-5 flex items-center justify-between bg-sidebar/80 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <SpeakerHigh size={20} weight="bold" className="text-text-muted shrink-0" />
          <h2 className="text-sm font-bold text-text-primary truncate">
            {currentChannel.name || 'Kênh thoại'}
          </h2>
          <div className="hidden sm:inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-success-soft text-success text-[11px] font-semibold border border-success/20">
            <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
            <span>RTC Đã kết nối • 18ms</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Toggle In-Voice Text Chat Button */}
          <button
            type="button"
            onClick={onToggleChat}
            className={`px-3 py-1.5 rounded-control transition-all cursor-pointer flex items-center gap-1.5 text-xs font-semibold ${
              isChatOpen
                ? 'bg-accent-soft text-accent-primary border border-accent-primary/30 shadow-xs'
                : 'text-text-muted hover:text-text-primary hover:bg-surface-active'
            }`}
            title={isChatOpen ? 'Đóng trò chuyện văn bản' : 'Mở trò chuyện văn bản'}
          >
            <ChatTeardropText size={17} weight={isChatOpen ? 'fill' : 'bold'} />
            <span className="hidden sm:inline">
              {isChatOpen ? 'Đang mở chat' : 'Trò chuyện'}
            </span>
          </button>
        </div>
      </div>

      {/* 2. Main Stage Canvas */}
      <div className="flex-1 flex flex-col min-h-0 p-4 sm:p-6 justify-between overflow-y-auto no-scrollbar relative">
        {/* Participant Tiles Grid */}
        <div className="max-w-4xl w-full mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 flex-1 items-center justify-center my-auto">
          {participants.map((p) => {
            const isMe = p.userId === currentUser?.id;
            const avatarSrc = getMediaUrl(p.avatarUrl) || DEFAULT_AVATAR;

            return (
              <div
                key={p.userId}
                className={`relative flex flex-col items-center justify-center p-6 rounded-card bg-surface/90 border transition-all duration-200 min-h-[200px] shadow-raised overflow-hidden ${
                  p.isSpeaking
                    ? 'border-success/80 shadow-[0_0_24px_rgba(34,197,94,0.3)]'
                    : 'border-border/60 hover:border-border'
                }`}
              >
                {/* Circular Avatar with Speaking Green Halo */}
                <div className="relative mb-3 flex items-center justify-center">
                  <div
                    className={`rounded-full transition-all duration-200 ${
                      p.isSpeaking
                        ? 'ring-4 ring-success ring-offset-4 ring-offset-surface shadow-[0_0_20px_rgba(34,197,94,0.45)]'
                        : 'ring-1 ring-border/60'
                    }`}
                  >
                    <img
                      src={avatarSrc}
                      alt={p.displayName}
                      className="w-20 h-20 sm:w-24 sm:h-24 rounded-full object-cover shadow-md"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = DEFAULT_AVATAR;
                      }}
                    />
                  </div>
                </div>

                {/* Status Badges in Tile Top-Right */}
                <div className="absolute top-3 right-3 flex items-center gap-1">
                  {p.isMuted && (
                    <span
                      className="p-1 rounded-full bg-danger/15 text-danger border border-danger/20"
                      title="Microphone đang tắt"
                    >
                      <MicrophoneSlash size={13} weight="bold" />
                    </span>
                  )}
                  {p.isDeafened && (
                    <span
                      className="p-1 rounded-full bg-danger/15 text-danger border border-danger/20"
                      title="Đã tắt toàn bộ âm thanh"
                    >
                      <Headphones size={13} weight="fill" />
                    </span>
                  )}
                </div>

                {/* Translucent Bottom Tag (Discord-style) */}
                <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between px-3 py-1.5 rounded-control bg-black/60 backdrop-blur-md border border-white/10">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="text-xs font-semibold text-white truncate max-w-[120px]">
                      {p.displayName}
                    </span>
                    {isMe && (
                      <span className="text-[10px] text-accent-primary font-bold px-1 rounded bg-accent-soft shrink-0">
                        BẠN
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    {p.isSpeaking && (
                      <Waveform size={14} weight="bold" className="text-success animate-pulse" />
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* 3. Floating Bottom Dock (Modern Discord Voice Controls) */}
        <div className="shrink-0 flex justify-center pt-2 pb-1 z-30">
          <div className="inline-flex items-center gap-2 p-1.5 rounded-full bg-surface/95 backdrop-blur-xl border border-border/80 shadow-floating">
            {/* Mic Toggle: RED when muted */}
            <button
              type="button"
              onClick={toggleMute}
              className={`w-10 h-10 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                isMuted
                  ? 'bg-danger text-white hover:bg-danger-hover shadow-sm'
                  : 'bg-surface hover:bg-surface-active text-text-primary'
              }`}
              title={isMuted ? 'Bật Mic' : 'Tắt Mic'}
            >
              {isMuted ? (
                <MicrophoneSlash size={19} weight="bold" />
              ) : (
                <Microphone size={19} weight="bold" />
              )}
            </button>

            {/* Deafen Toggle: RED when deafened */}
            <button
              type="button"
              onClick={toggleDeafen}
              className={`w-10 h-10 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                isDeafened
                  ? 'bg-danger text-white hover:bg-danger-hover shadow-sm'
                  : 'bg-surface hover:bg-surface-active text-text-primary'
              }`}
              title={isDeafened ? 'Bật âm thanh' : 'Tắt toàn bộ âm thanh'}
            >
              <Headphones size={19} weight={isDeafened ? 'fill' : 'bold'} />
            </button>

            {/* Video Camera Toggle */}
            <button
              type="button"
              onClick={() => setIsCameraActive((prev) => !prev)}
              className={`w-10 h-10 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                isCameraActive
                  ? 'bg-accent-primary text-white shadow-sm'
                  : 'bg-surface hover:bg-surface-active text-text-primary'
              }`}
              title={isCameraActive ? 'Tắt Camera' : 'Bật Camera'}
            >
              {isCameraActive ? (
                <VideoCamera size={19} weight="bold" />
              ) : (
                <VideoCameraSlash size={19} weight="bold" />
              )}
            </button>

            {/* Screen Share Toggle */}
            <button
              type="button"
              onClick={toggleScreenSharing}
              className={`w-10 h-10 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                isScreenSharing
                  ? 'bg-accent-primary text-white shadow-sm'
                  : 'bg-surface hover:bg-surface-active text-text-primary'
              }`}
              title="Chia sẻ màn hình"
            >
              <Screencast size={19} weight="bold" />
            </button>

            {/* Test Speaking Simulation Toggle (For quick mic testing feedback) */}
            <button
              type="button"
              onClick={toggleSpeaking}
              className={`w-10 h-10 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                isSpeaking
                  ? 'bg-success text-white shadow-sm'
                  : 'bg-surface hover:bg-surface-active text-text-primary'
              }`}
              title={isSpeaking ? 'Dừng kiểm tra giọng nói' : 'Nói thử (kiểm tra vòng xanh)'}
            >
              <Waveform size={19} weight="bold" />
            </button>

            {/* Chat Toggle Button */}
            <button
              type="button"
              onClick={onToggleChat}
              className={`w-10 h-10 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                isChatOpen
                  ? 'bg-accent-soft text-accent-primary'
                  : 'bg-surface hover:bg-surface-active text-text-primary'
              }`}
              title="Trò chuyện bằng văn bản"
            >
              <ChatTeardropText size={19} weight={isChatOpen ? 'fill' : 'bold'} />
            </button>

            {/* Divider */}
            <div className="w-px h-6 bg-border mx-1" />

            {/* RED Disconnect Button */}
            <button
              type="button"
              onClick={handleDisconnect}
              className="h-10 px-4 rounded-full bg-danger text-white hover:bg-danger-hover transition-all font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-sm hover:shadow active:scale-95"
              title="Ngắt kết nối phòng thoại"
            >
              <PhoneDisconnect size={18} weight="bold" />
              <span>Ngắt kết nối</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
