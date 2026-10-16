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
  Robot,
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
      {/* Caro (Grid) Background Pattern */}
      <div
        className="absolute inset-0 pointer-events-none opacity-20"
        style={{
          backgroundImage: `
            linear-gradient(to right, rgba(255, 255, 255, 0.08) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(255, 255, 255, 0.08) 1px, transparent 1px)
          `,
          backgroundSize: '28px 28px',
          maskImage: 'radial-gradient(ellipse at center, black 65%, transparent 100%)',
          WebkitMaskImage: 'radial-gradient(ellipse at center, black 65%, transparent 100%)',
        }}
      />

      {/* Dynamic Ambient Background Glows for Immersion */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-accent-primary/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-1/4 w-96 h-96 bg-success/8 rounded-full blur-3xl pointer-events-none" />

      {/* 1. Discord-style Compact Voice Room Header */}
      <div className="h-[54px] border-b border-border px-5 flex items-center justify-between bg-sidebar/90 backdrop-blur-md shrink-0 z-20">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 rounded-control bg-accent-soft flex items-center justify-center text-accent-primary shrink-0">
            <SpeakerHigh size={19} weight="bold" />
          </div>
          <div className="min-w-0">
            <h2 className="text-sm font-bold text-text-primary truncate">
              {currentChannel.name || 'Kênh thoại'}
            </h2>
            <div className="flex items-center gap-2 text-[11px] text-text-muted">
              <span>{participants.length} người đang tham gia</span>
            </div>
          </div>

          <div className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-success-soft text-success text-[11px] font-semibold border border-success/20 ml-2">
            <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
            <span className="font-mono">RTC Đã kết nối • 18ms</span>
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

      {/* 2. Main Stage Canvas (Centered Horizontally & Vertically, Zero Left-Bias) */}
      <div className="flex-1 flex flex-col min-h-0 p-4 sm:p-6 justify-between overflow-y-auto no-scrollbar relative z-10">
        {/* Participant Tiles: flex-wrap centered so cards are always in the middle */}
        <div className="max-w-4xl w-full mx-auto flex flex-wrap items-center justify-center gap-6 flex-1 my-auto">
          {participants.map((p) => {
            const isMe = p.userId === currentUser?.id;
            const isBot = p.userId === 'simulated-nomna-bot';
            const avatarSrc = getMediaUrl(p.avatarUrl) || DEFAULT_AVATAR;

            return (
              <div
                key={p.userId}
                className={`relative group flex flex-col items-center justify-center p-6 rounded-card backdrop-blur-xl border transition-all duration-300 min-h-[220px] shadow-raised overflow-hidden w-full sm:w-[280px] md:w-[300px] ${
                  isMe
                    ? p.isSpeaking
                      ? 'bg-emerald-950/40 border-emerald-400 ring-2 ring-emerald-500 shadow-[0_0_35px_rgba(16,185,129,0.5)]'
                      : 'bg-emerald-950/20 border-emerald-500/60 ring-1 ring-emerald-500/30 hover:border-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.2)]'
                    : p.isSpeaking
                    ? 'bg-surface/90 border-success/80 shadow-[0_0_30px_rgba(35,165,90,0.35)] ring-1 ring-success/50'
                    : 'bg-surface/90 border-border/70 hover:border-border hover:shadow-floating'
                }`}
              >
                {/* Active Speaking Ambient Radial Glow */}
                {p.isSpeaking && (
                  <div className="absolute inset-0 bg-radial from-success/20 via-transparent to-transparent pointer-events-none animate-pulse" />
                )}

                {/* Circular Avatar with Speaking Green Halo & Pulse Waves */}
                <div className="relative mb-3 flex items-center justify-center">
                  {p.isSpeaking && (
                    <span className="absolute -inset-2.5 rounded-full border-2 border-success/40 animate-ping pointer-events-none" />
                  )}
                  <div
                    className={`rounded-full transition-all duration-300 ${
                      p.isSpeaking
                        ? 'ring-4 ring-emerald-400 ring-offset-4 ring-offset-surface shadow-[0_0_24px_rgba(16,185,129,0.6)] scale-105'
                        : isMe
                        ? 'ring-3 ring-emerald-500 shadow-[0_0_14px_rgba(16,185,129,0.4)]'
                        : 'ring-2 ring-border/80'
                    }`}
                  >
                    <img
                      src={avatarSrc}
                      alt={p.displayName}
                      className="w-20 h-20 sm:w-24 sm:h-24 rounded-full object-cover shadow-lg"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = DEFAULT_AVATAR;
                      }}
                    />
                  </div>
                </div>

                {/* Status Badges in Tile Top-Right */}
                <div className="absolute top-3 right-3 flex items-center gap-1.5 z-10">
                  {p.isMuted && (
                    <span
                      className="p-1.5 rounded-full bg-danger text-white shadow-xs border border-danger/30"
                      title="Microphone đang tắt"
                    >
                      <MicrophoneSlash size={14} weight="bold" />
                    </span>
                  )}
                  {p.isDeafened && (
                    <span
                      className="relative p-1.5 rounded-full bg-danger text-white shadow-xs border border-danger/30 flex items-center justify-center"
                      title="Đã tắt toàn bộ âm thanh"
                    >
                      <Headphones size={14} weight="fill" />
                      <span
                        className="absolute w-[15px] h-[2px] bg-white rotate-45 rounded-full pointer-events-none"
                        aria-hidden="true"
                      />
                    </span>
                  )}
                  {p.isScreenSharing && (
                    <span
                      className="p-1.5 rounded-full bg-accent-primary text-white shadow-xs"
                      title="Đang chia sẻ màn hình"
                    >
                      <Screencast size={14} weight="bold" />
                    </span>
                  )}
                </div>

                {/* Translucent Bottom Tag */}
                <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between px-3 py-2 rounded-control bg-black/65 backdrop-blur-md border border-white/10 z-10">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="text-xs font-bold text-white truncate max-w-[130px]">
                      {p.displayName}
                    </span>
                    {isMe && (
                      <span className="text-[10px] text-emerald-300 font-bold px-1.5 py-0.2 rounded bg-emerald-500/25 shrink-0 border border-emerald-500/40">
                        BẠN
                      </span>
                    )}
                    {isBot && (
                      <span className="text-[10px] text-white font-bold px-1.5 py-0.2 rounded bg-indigo-600 shrink-0 flex items-center gap-0.5">
                        <Robot size={11} weight="fill" />
                        <span>BOT</span>
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {p.isSpeaking ? (
                      <div className="flex items-center gap-0.5">
                        <span className="w-1 h-3.5 rounded-full bg-success animate-pulse" />
                        <span className="w-1 h-2 rounded-full bg-success animate-pulse [animation-delay:150ms]" />
                        <span className="w-1 h-4 rounded-full bg-success animate-pulse [animation-delay:300ms]" />
                      </div>
                    ) : (
                      /* Audio ping quality bars */
                      <div className="flex items-end gap-0.5 opacity-60">
                        <span className="w-0.5 h-1.5 rounded-xs bg-success" />
                        <span className="w-0.5 h-2.5 rounded-xs bg-success" />
                        <span className="w-0.5 h-3.5 rounded-xs bg-success" />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* 3. Floating Bottom Dock (Aligned with app footer baseline, chat button removed) */}
        <div className="shrink-0 flex justify-center pb-2.5 pt-1.5 z-30">
          <div className="h-[52px] px-3.5 rounded-full bg-surface/95 backdrop-blur-2xl border border-border/80 shadow-floating inline-flex items-center gap-2">
            {/* Mic Toggle: RED with slash when muted */}
            <button
              type="button"
              onClick={toggleMute}
              className={`w-9 h-9 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                isMuted
                  ? 'bg-danger text-white hover:bg-danger-hover shadow-[0_0_14px_rgba(242,63,67,0.45)]'
                  : 'bg-surface hover:bg-surface-active text-text-primary'
              }`}
              title={isMuted ? 'Bật Mic' : 'Tắt Mic'}
            >
              {isMuted ? (
                <MicrophoneSlash size={18} weight="bold" />
              ) : (
                <Microphone size={18} weight="bold" />
              )}
            </button>

            {/* Deafen Toggle: RED with diagonal slash when deafened */}
            <button
              type="button"
              onClick={toggleDeafen}
              className={`relative w-9 h-9 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                isDeafened
                  ? 'bg-danger text-white hover:bg-danger-hover shadow-[0_0_14px_rgba(242,63,67,0.45)]'
                  : 'bg-surface hover:bg-surface-active text-text-primary'
              }`}
              title={isDeafened ? 'Bật âm thanh' : 'Tắt toàn bộ âm thanh'}
            >
              <Headphones size={18} weight={isDeafened ? 'fill' : 'bold'} />
              {isDeafened && (
                <span
                  className="absolute w-[18px] h-[2px] bg-white rotate-45 rounded-full pointer-events-none"
                  aria-hidden="true"
                />
              )}
            </button>

            {/* Video Camera Toggle */}
            <button
              type="button"
              onClick={() => setIsCameraActive((prev) => !prev)}
              className={`w-9 h-9 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                isCameraActive
                  ? 'bg-accent-primary text-white shadow-sm'
                  : 'bg-surface hover:bg-surface-active text-text-primary'
              }`}
              title={isCameraActive ? 'Tắt Camera' : 'Bật Camera'}
            >
              {isCameraActive ? (
                <VideoCamera size={18} weight="bold" />
              ) : (
                <VideoCameraSlash size={18} weight="bold" />
              )}
            </button>

            {/* Screen Share Toggle */}
            <button
              type="button"
              onClick={toggleScreenSharing}
              className={`w-9 h-9 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                isScreenSharing
                  ? 'bg-accent-primary text-white shadow-sm'
                  : 'bg-surface hover:bg-surface-active text-text-primary'
              }`}
              title="Chia sẻ màn hình"
            >
              <Screencast size={18} weight="bold" />
            </button>

            {/* Test Speaking Simulation Toggle (Quick mic test feedback) */}
            <button
              type="button"
              onClick={toggleSpeaking}
              className={`w-9 h-9 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                isSpeaking
                  ? 'bg-success text-white shadow-[0_0_14px_rgba(35,165,90,0.45)]'
                  : 'bg-surface hover:bg-surface-active text-text-primary'
              }`}
              title={isSpeaking ? 'Dừng kiểm tra giọng nói' : 'Nói thử (kiểm tra vòng xanh)'}
            >
              <Waveform size={18} weight="bold" />
            </button>

            {/* Divider */}
            <div className="w-px h-5 bg-border mx-0.5" />

            {/* RED Disconnect Button (Discord End Call Red) */}
            <button
              type="button"
              onClick={handleDisconnect}
              className="h-9 px-4 rounded-full bg-danger text-white hover:bg-danger-hover transition-all font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-md shadow-danger/25 active:scale-95"
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
