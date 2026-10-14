import React, { useState, useRef, useEffect } from 'react';
import {
  SpeakerHigh,
  Microphone,
  MicrophoneSlash,
  Headphones,
  PhoneDisconnect,
  Screencast,
  ChatTeardropText,
  X,
  Waveform,
  PaperPlaneRight,
  Smiley,
  CircleNotch,
} from '@phosphor-icons/react';
import { Avatar } from '../ui';
import type { Channel, Message, User } from '../../types';
import { useVoiceStore } from '../../stores/useVoiceStore';
import { getMediaUrl } from '../../utils/constants';

interface VoiceChannelViewProps {
  currentChannel: Channel;
  currentUser: User | null;
  messages: Message[];
  onSendMessage: (content: string) => Promise<void>;
  onToggleReaction?: (messageId: string, emoji: string) => void;
  workspaceName?: string;
  onLeaveVoice?: () => void;
}

export const VoiceChannelView: React.FC<VoiceChannelViewProps> = ({
  currentChannel,
  currentUser,
  messages,
  onSendMessage,
  workspaceName,
  onLeaveVoice,
}) => {
  const {
    connectedChannelId,
    isMuted,
    isDeafened,
    isScreenSharing,
    isTextChatOpen,
    pingMs,
    participants,
    joinVoice,
    leaveVoice,
    toggleMute,
    toggleDeafen,
    toggleSpeaking,
    toggleScreenSharing,
    toggleTextChat,
  } = useVoiceStore();

  const [inputMessage, setInputMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const chatScrollRef = useRef<HTMLDivElement>(null);

  // Auto-connect to voice channel when viewing this channel if not connected yet
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

  // Scroll to bottom when new in-voice chat messages arrive
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [messages.length, isTextChatOpen]);

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const text = inputMessage.trim();
    if (!text || isSending) return;

    try {
      setIsSending(true);
      await onSendMessage(text);
      setInputMessage('');
    } finally {
      setIsSending(false);
    }
  };

  const handleDisconnect = () => {
    leaveVoice();
    onLeaveVoice?.();
  };

  return (
    <div className="flex-1 flex flex-col h-full min-h-0 bg-chat overflow-hidden select-none">
      {/* 1. Voice Channel Header */}
      <div className="h-[54px] px-4 border-b border-border flex items-center justify-between shrink-0 bg-chat">
        <div className="flex items-center gap-2.5 min-w-0">
          <SpeakerHigh size={20} weight="bold" className="text-text-muted shrink-0" />
          <h2 className="text-sm font-bold text-text-primary truncate">
            {currentChannel.name}
          </h2>
          <span className="hidden sm:inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-success-soft text-success border border-success/20">
            <span className="w-1.5 h-1.5 rounded-full bg-success animate-ping" />
            Đã kết nối thoại (RTC {pingMs}ms)
          </span>
        </div>

        {/* Right Tools: Toggle Text Chat Button */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={toggleTextChat}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-control text-xs font-semibold cursor-pointer transition-colors ${
              isTextChatOpen
                ? 'bg-accent-soft text-accent-primary'
                : 'text-text-muted hover:text-text-primary hover:bg-surface-active'
            }`}
            title={isTextChatOpen ? 'Ẩn trò chuyện' : 'Mở trò chuyện trong phòng thoại'}
          >
            <ChatTeardropText size={16} weight={isTextChatOpen ? 'fill' : 'bold'} />
            <span className="hidden md:inline">Trò chuyện</span>
          </button>
        </div>
      </div>

      {/* 2. Main Stage & Side Chat Split View */}
      <div className="flex-1 flex min-h-0 overflow-hidden relative">
        {/* LEFT / CENTER: Voice Stage */}
        <div className="flex-1 flex flex-col min-h-0 p-4 relative justify-between overflow-y-auto no-scrollbar">
          {/* Top connection notice */}
          <div className="flex items-center justify-between text-xs text-text-muted max-w-4xl w-full mx-auto mb-4 px-2">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-success" />
              Mã hóa âm thanh đầu cuối (End-to-End Encrypted)
            </span>
            <span>{workspaceName || 'NomNa Workspace'}</span>
          </div>

          {/* Participant Cards Grid */}
          <div className="max-w-4xl w-full mx-auto grid grid-cols-1 md:grid-cols-2 gap-4 flex-1 items-center justify-center my-auto">
            {participants.map((p) => {
              const isMe = p.userId === currentUser?.id;
              const isCompanion = p.userId === 'simulated-nomna-bot';

              return (
                <div
                  key={p.userId}
                  className={`relative flex flex-col items-center justify-center p-6 rounded-card bg-surface border transition-all duration-200 min-h-[220px] shadow-raised ${
                    p.isSpeaking
                      ? 'border-success shadow-[0_0_20px_rgba(35,165,90,0.25)]'
                      : 'border-border hover:border-border-hover'
                  }`}
                >
                  {/* Speaking indicator waves */}
                  {p.isSpeaking && (
                    <div className="absolute top-3 right-3 flex items-center gap-0.5 text-success">
                      <span className="w-1 h-3 bg-success rounded-full animate-bounce [animation-delay:0ms]" />
                      <span className="w-1 h-5 bg-success rounded-full animate-bounce [animation-delay:150ms]" />
                      <span className="w-1 h-2 bg-success rounded-full animate-bounce [animation-delay:300ms]" />
                    </div>
                  )}

                  {/* Avatar with speaking ring */}
                  <div className="relative mb-3">
                    <div
                      className={`rounded-full transition-all duration-200 p-1 ${
                        p.isSpeaking
                          ? 'ring-4 ring-success ring-offset-2 ring-offset-surface'
                          : 'ring-2 ring-transparent'
                      }`}
                    >
                      <Avatar
                        src={getMediaUrl(p.avatarUrl)}
                        fallback={p.displayName}
                        size="lg"
                      />
                    </div>

                    {/* Mute/Deafen indicator badge on avatar */}
                    {p.isMuted && (
                      <span className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-danger text-on-accent flex items-center justify-center border-2 border-surface">
                        <MicrophoneSlash size={12} weight="bold" />
                      </span>
                    )}
                  </div>

                  {/* Name Tag */}
                  <div className="flex items-center gap-1.5 text-sm font-bold text-text-primary">
                    <span className="truncate max-w-[160px]">{p.displayName}</span>
                    {isCompanion && (
                      <span className="px-1.5 py-0.5 rounded-control text-[10px] font-bold bg-accent-soft text-accent-primary">
                        BOT
                      </span>
                    )}
                    {isMe && (
                      <span className="text-[11px] font-normal text-text-muted">(Bạn)</span>
                    )}
                  </div>

                  {/* Speaking status label or interactive test button */}
                  {isMe ? (
                    <button
                      type="button"
                      onClick={toggleSpeaking}
                      disabled={isMuted}
                      className={`mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-control text-xs font-semibold transition-all cursor-pointer ${
                        isMuted
                          ? 'opacity-40 cursor-not-allowed bg-surface-active text-text-muted'
                          : p.isSpeaking
                          ? 'bg-success text-on-accent'
                          : 'bg-surface-active hover:bg-surface text-text-secondary hover:text-text-primary'
                      }`}
                    >
                      <Waveform size={14} weight="bold" />
                      <span>{p.isSpeaking ? 'Đang nói...' : 'Bấm để thử nói (Mic Test)'}</span>
                    </button>
                  ) : (
                    <span className="mt-2 text-xs text-text-muted">
                      {p.isSpeaking ? 'Đang phát âm thanh...' : 'Đang lắng nghe'}
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          {/* Floating Dock: Discord-style Voice Stage Controls */}
          <div className="shrink-0 flex justify-center pt-4 pb-2">
            <div className="inline-flex items-center gap-2 p-1.5 rounded-full bg-sidebar/95 backdrop-blur-md border border-border shadow-floating">
              {/* Mic toggle */}
              <button
                type="button"
                onClick={toggleMute}
                className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors cursor-pointer ${
                  isMuted
                    ? 'bg-danger text-on-accent hover:bg-danger-hover'
                    : 'text-text-primary hover:bg-surface-active'
                }`}
                title={isMuted ? 'Bật Mic' : 'Tắt Mic'}
              >
                {isMuted ? <MicrophoneSlash size={18} weight="bold" /> : <Microphone size={18} weight="bold" />}
              </button>

              {/* Deafen toggle */}
              <button
                type="button"
                onClick={toggleDeafen}
                className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors cursor-pointer ${
                  isDeafened
                    ? 'bg-danger text-on-accent hover:bg-danger-hover'
                    : 'text-text-primary hover:bg-surface-active'
                }`}
                title={isDeafened ? 'Bật âm thanh' : 'Tắt toàn bộ âm thanh'}
              >
                <Headphones size={18} weight={isDeafened ? 'fill' : 'bold'} />
              </button>

              {/* Screen Share simulation */}
              <button
                type="button"
                onClick={toggleScreenSharing}
                className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors cursor-pointer ${
                  isScreenSharing
                    ? 'bg-accent-primary text-on-accent'
                    : 'text-text-primary hover:bg-surface-active'
                }`}
                title="Chia sẻ màn hình (Giả lập)"
              >
                <Screencast size={18} weight="bold" />
              </button>

              {/* Text Chat toggle */}
              <button
                type="button"
                onClick={toggleTextChat}
                className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors cursor-pointer ${
                  isTextChatOpen
                    ? 'bg-surface-active text-accent-primary'
                    : 'text-text-primary hover:bg-surface-active'
                }`}
                title="Trò chuyện bằng văn bản trong phòng"
              >
                <ChatTeardropText size={18} weight={isTextChatOpen ? 'fill' : 'bold'} />
              </button>

              {/* Divider */}
              <div className="w-px h-6 bg-border mx-1" />

              {/* Disconnect button */}
              <button
                type="button"
                onClick={handleDisconnect}
                className="h-10 px-4 rounded-full bg-danger text-on-accent hover:bg-danger-hover transition-colors font-bold text-xs flex items-center gap-1.5 cursor-pointer"
                title="Rời phòng thoại"
              >
                <PhoneDisconnect size={16} weight="bold" />
                <span>Ngắt kết nối</span>
              </button>
            </div>
          </div>
        </div>

        {/* RIGHT: In-Voice Text Chat Panel */}
        {isTextChatOpen && (
          <div className="w-80 md:w-96 border-l border-border bg-sidebar/50 flex flex-col h-full shrink-0 animate-in slide-in-from-right-4 duration-150">
            {/* Header */}
            <div className="h-[54px] px-3.5 border-b border-border flex items-center justify-between shrink-0 bg-sidebar/80">
              <div className="flex items-center gap-2">
                <ChatTeardropText size={18} weight="fill" className="text-accent-primary" />
                <h3 className="font-bold text-xs text-text-primary">Chat trong phòng thoại</h3>
              </div>
              <button
                type="button"
                onClick={toggleTextChat}
                className="p-1 rounded-control text-text-muted hover:text-text-primary hover:bg-surface transition-colors cursor-pointer"
                title="Đóng khung chat"
              >
                <X size={15} weight="bold" />
              </button>
            </div>

            {/* Messages Feed */}
            <div
              ref={chatScrollRef}
              className="flex-1 min-h-0 overflow-y-auto p-3 space-y-3 no-scrollbar"
            >
              {messages.length === 0 ? (
                <div className="py-10 text-center flex flex-col items-center gap-2 text-text-muted">
                  <div className="w-10 h-10 rounded-control bg-surface flex items-center justify-center text-accent-primary">
                    <ChatTeardropText size={20} weight="fill" />
                  </div>
                  <p className="text-xs font-semibold text-text-primary">
                    Chưa có tin nhắn nào trong phòng
                  </p>
                  <p className="text-[11px] leading-relaxed max-w-[200px]">
                    Hãy gửi bình luận hoặc chia sẻ liên kết đầu tiên trong khi đàm thoại!
                  </p>
                </div>
              ) : (
                messages.map((msg) => (
                  <div key={msg.id} className="flex items-start gap-2.5 text-xs group">
                    <Avatar
                      src={getMediaUrl(msg.senderAvatarUrl)}
                      fallback={msg.senderDisplayName}
                      size="sm"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className="font-semibold text-text-primary truncate">
                          {msg.senderDisplayName}
                        </span>
                        <span className="text-[10px] text-text-muted">
                          {new Date(msg.createdAt).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                      <p className="text-text-secondary leading-relaxed break-words">
                        {msg.content}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Input Bar */}
            <form
              onSubmit={handleSendMessage}
              className="p-2.5 border-t border-border bg-sidebar/80 flex items-center gap-2 shrink-0"
            >
              <div className="flex-1 relative flex items-center">
                <input
                  type="text"
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  placeholder={`Nhắn trong #${currentChannel.name}...`}
                  className="w-full h-8 pl-3 pr-8 rounded-control bg-chat border border-border focus:border-accent-primary text-xs text-text-primary placeholder:text-text-muted focus:outline-hidden"
                />
                <button
                  type="button"
                  onClick={() => setInputMessage((prev) => prev + ' 👋')}
                  className="absolute right-2 text-text-muted hover:text-text-primary cursor-pointer p-0.5"
                  title="Thêm emoji"
                >
                  <Smiley size={14} weight="bold" />
                </button>
              </div>

              <button
                type="submit"
                disabled={!inputMessage.trim() || isSending}
                className="w-8 h-8 rounded-control bg-accent-primary text-on-accent hover:bg-accent-hover disabled:opacity-40 transition-colors flex items-center justify-center shrink-0 cursor-pointer"
                title="Gửi tin nhắn"
              >
                {isSending ? (
                  <CircleNotch size={14} className="animate-spin" />
                ) : (
                  <PaperPlaneRight size={14} weight="bold" />
                )}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};
