import React from 'react';
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
  currentServerName?: string;
  currentWorkspaceName?: string;
  onNavigateToVoiceChannel?: (channelId: string, serverId?: string | null) => void;
}

export const VoiceConnectionBar: React.FC<VoiceConnectionBarProps> = ({
  currentServerName,
  currentWorkspaceName,
  onNavigateToVoiceChannel,
}) => {
  const {
    connectedChannelId,
    connectedChannelName,
    connectedServerId,
    isSpeaking,
    isScreenSharing,
    isCameraActive,
    leaveVoice,
    toggleSpeaking,
    toggleScreenSharing,
    toggleCamera,
    toggleTextChat,
    setTextChatOpen,
  } = useVoiceStore();

  if (!connectedChannelId) return null;

  const handleOpenVoiceChat = () => {
    if (onNavigateToVoiceChannel && connectedChannelId) {
      onNavigateToVoiceChannel(connectedChannelId, connectedServerId);
      setTextChatOpen(true);
    } else {
      toggleTextChat();
    }
  };

  return (
    <div className="shrink-0 z-30 select-none px-3 pt-2 pb-1 border-t border-border bg-sidebar">
      <div className="w-full rounded-card bg-surface border border-border p-2.5 flex flex-col gap-2 shadow-raised animate-in fade-in slide-in-from-bottom-2 duration-150">
        {/* Top Row: Signal Icon + Title/Server + Disconnect Button */}
        <div className="flex items-center justify-between gap-2 min-w-0">
          <button
            type="button"
            onClick={() =>
              connectedChannelId &&
              onNavigateToVoiceChannel?.(connectedChannelId, connectedServerId)
            }
            title="Nhấn để quay lại kênh thoại"
            className="flex items-center gap-2 min-w-0 flex-1 text-left cursor-pointer group"
          >
            <div className="w-7 h-7 rounded-control bg-surface-active flex items-center justify-center text-text-primary shrink-0 border border-border">
              <Broadcast size={16} weight="bold" />
            </div>
            <div className="min-w-0 flex-1 leading-none">
              <div className="text-xs font-bold text-text-primary truncate tracking-tight">
                Đã Kết Nối Giọng Nói
              </div>
              <div className="text-[11px] text-text-muted group-hover:text-text-primary transition-colors truncate mt-0.5 font-medium">
                {connectedChannelName || 'Kênh thoại'} /{' '}
                {currentServerName || currentWorkspaceName || 'NomNa'}
              </div>
            </div>
          </button>

          {/* Right side: Disconnect button */}
          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={leaveVoice}
              title="Ngắt kết nối kênh thoại"
              className="p-1.5 rounded-control text-text-muted hover:text-danger hover:bg-danger-soft transition-colors cursor-pointer flex items-center justify-center"
            >
              <PhoneDisconnect size={15} weight="fill" />
            </button>
          </div>
        </div>

        {/* Bottom Row: 4 Quick Action Buttons */}
        <div className="flex items-center gap-1 pt-0.5">
          {/* Camera Toggle */}
          <button
            type="button"
            onClick={toggleCamera}
            title={isCameraActive ? 'Tắt Camera' : 'Bật Camera'}
            className={`flex-1 h-8 rounded-control flex items-center justify-center transition-colors cursor-pointer ${
              isCameraActive
                ? 'bg-surface-active text-text-primary border border-border-hover'
                : 'bg-surface-active/60 hover:bg-surface-active text-text-muted hover:text-text-primary'
            }`}
          >
            {isCameraActive ? (
              <VideoCamera size={15} weight="bold" />
            ) : (
              <VideoCameraSlash size={15} weight="bold" />
            )}
          </button>

          {/* Screen Share Toggle */}
          <button
            type="button"
            onClick={toggleScreenSharing}
            title={isScreenSharing ? 'Dừng chia sẻ' : 'Chia sẻ màn hình'}
            className={`flex-1 h-8 rounded-control flex items-center justify-center transition-colors cursor-pointer ${
              isScreenSharing
                ? 'bg-surface-active text-text-primary border border-border-hover'
                : 'bg-surface-active/60 hover:bg-surface-active text-text-muted hover:text-text-primary'
            }`}
          >
            <Screencast size={15} weight="bold" />
          </button>

          {/* Speaking Voice Test Toggle */}
          <button
            type="button"
            onClick={toggleSpeaking}
            title={isSpeaking ? 'Dừng thử giọng' : 'Thử giọng'}
            className={`flex-1 h-8 rounded-control flex items-center justify-center transition-colors cursor-pointer ${
              isSpeaking
                ? 'bg-surface-active text-text-primary border border-border-hover'
                : 'bg-surface-active/60 hover:bg-surface-active text-text-muted hover:text-text-primary'
            }`}
          >
            <Waveform size={15} weight="bold" />
          </button>

          {/* Text Chat Toggle */}
          <button
            type="button"
            onClick={handleOpenVoiceChat}
            title="Mở trò chuyện kênh thoại"
            className="flex-1 h-8 rounded-control bg-surface-active/60 hover:bg-surface-active text-text-muted hover:text-text-primary flex items-center justify-center transition-colors cursor-pointer"
          >
            <ChatTeardropText size={15} weight="bold" />
          </button>
        </div>
      </div>
    </div>
  );
};
