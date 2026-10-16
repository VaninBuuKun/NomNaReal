import React, { useState } from 'react';
import {
  Broadcast,
  PhoneDisconnect,
  VideoCamera,
  VideoCameraSlash,
  Screencast,
  Waveform,
  ChatTeardropText,
} from '@phosphor-icons/react';
import { useVoiceStore } from '../../stores/useVoiceStore';

interface VoiceConnectionBarProps {
  currentWorkspaceName?: string;
}

export const VoiceConnectionBar: React.FC<VoiceConnectionBarProps> = ({
  currentWorkspaceName,
}) => {
  const {
    connectedChannelId,
    connectedChannelName,
    isSpeaking,
    isScreenSharing,
    leaveVoice,
    toggleSpeaking,
    toggleScreenSharing,
    toggleTextChat,
  } = useVoiceStore();

  const [isCameraActive, setIsCameraActive] = useState(false);

  if (!connectedChannelId) return null;

  return (
    <div className="shrink-0 p-2 pb-1 bg-[var(--bg-sidebar)] select-none">
      <div className="rounded-lg bg-[var(--bg-surface)] border border-[var(--border-color)] p-2.5 flex flex-col gap-2 shadow-xs animate-in fade-in slide-in-from-bottom-2 duration-150">
        {/* Top Row: Signal Icon + Title/Server + Ping/Waveform + Disconnect Button */}
        <div className="flex items-center justify-between gap-2 min-w-0">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <div className="w-7 h-7 rounded-md bg-emerald-500/15 flex items-center justify-center text-emerald-400 shrink-0">
              <Broadcast size={17} weight="bold" />
            </div>
            <div className="min-w-0 flex-1 leading-none">
              <div className="text-xs font-bold text-emerald-400 truncate tracking-tight">
                Đã Kết Nối Giọng Nói
              </div>
              <div className="text-[11px] text-[var(--text-muted)] truncate mt-0.5 font-medium">
                {connectedChannelName || 'Kênh thoại'} / {currentWorkspaceName || 'NomNa'}
              </div>
            </div>
          </div>

          {/* Right side: Waveform indicator & Disconnect button */}
          <div className="flex items-center gap-1 shrink-0">
            <Waveform size={16} weight="bold" className="text-emerald-400 animate-pulse" />
            <button
              type="button"
              onClick={leaveVoice}
              title="Ngắt kết nối kênh thoại"
              className="p-1.5 rounded-md text-[var(--text-muted)] hover:text-danger hover:bg-danger/15 transition-colors cursor-pointer flex items-center justify-center"
            >
              <PhoneDisconnect size={16} weight="fill" />
            </button>
          </div>
        </div>

        {/* Bottom Row: 4 Quick Action Buttons */}
        <div className="flex items-center gap-1 pt-0.5">
          {/* Camera Toggle */}
          <button
            type="button"
            onClick={() => setIsCameraActive((prev) => !prev)}
            title={isCameraActive ? 'Tắt Camera' : 'Bật Camera'}
            className={`flex-1 h-8 rounded-md flex items-center justify-center transition-colors cursor-pointer ${
              isCameraActive
                ? 'bg-accent-primary text-white shadow-2xs'
                : 'bg-[var(--bg-surface-active)] hover:bg-[var(--bg-surface-active)]/80 text-[var(--text-muted)] hover:text-[var(--text-primary)]'
            }`}
          >
            {isCameraActive ? (
              <VideoCamera size={16} weight="bold" />
            ) : (
              <VideoCameraSlash size={16} weight="bold" />
            )}
          </button>

          {/* Screen Share Toggle */}
          <button
            type="button"
            onClick={toggleScreenSharing}
            title="Chia sẻ màn hình"
            className={`flex-1 h-8 rounded-md flex items-center justify-center transition-colors cursor-pointer ${
              isScreenSharing
                ? 'bg-accent-primary text-white shadow-2xs'
                : 'bg-[var(--bg-surface-active)] hover:bg-[var(--bg-surface-active)]/80 text-[var(--text-muted)] hover:text-[var(--text-primary)]'
            }`}
          >
            <Screencast size={16} weight="bold" />
          </button>

          {/* Speaking Voice Test Toggle */}
          <button
            type="button"
            onClick={toggleSpeaking}
            title={isSpeaking ? 'Dừng thử giọng' : 'Thử giọng'}
            className={`flex-1 h-8 rounded-md flex items-center justify-center transition-colors cursor-pointer ${
              isSpeaking
                ? 'bg-emerald-500 text-white shadow-2xs'
                : 'bg-[var(--bg-surface-active)] hover:bg-[var(--bg-surface-active)]/80 text-[var(--text-muted)] hover:text-[var(--text-primary)]'
            }`}
          >
            <Waveform size={16} weight="bold" />
          </button>

          {/* Text Chat Toggle */}
          <button
            type="button"
            onClick={toggleTextChat}
            title="Mở trò chuyện kênh thoại"
            className="flex-1 h-8 rounded-md bg-[var(--bg-surface-active)] hover:bg-[var(--bg-surface-active)]/80 text-[var(--text-muted)] hover:text-[var(--text-primary)] flex items-center justify-center transition-colors cursor-pointer"
          >
            <ChatTeardropText size={16} weight="bold" />
          </button>
        </div>
      </div>
    </div>
  );
};
