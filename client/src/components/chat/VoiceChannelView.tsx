import React, { useState, useRef, useEffect } from 'react';
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
  X,
  Waveform,
  PaperPlaneRight,
  Smiley,
  CircleNotch,
  Paperclip,
  FileText,
  Play,
  Plus,
  DownloadSimple,
} from '@phosphor-icons/react';
import { Avatar } from '../ui';
import type { Channel, Message, User, MessageAttachment } from '../../types';
import { useVoiceStore } from '../../stores/useVoiceStore';
import { getMediaUrl } from '../../utils/constants';
import { MessageContent } from './MessageContent';
import { EmojiPickerPopover } from './EmojiPickerPopover';
import { fileApi } from '../../services/fileApi';
import type { UserProfileData } from '../profile';

interface VoiceChannelViewProps {
  currentChannel: Channel;
  currentUser: User | null;
  messages: Message[];
  onSendMessage: (
    content: string,
    attachments?: Array<{
      url: string;
      fileName: string;
      fileSize: number;
      contentType: string;
      type: 'image' | 'video' | 'file';
    }>
  ) => Promise<void>;
  onToggleReaction?: (messageId: string, emoji: string) => void;
  onOpenUserProfile?: (user: UserProfileData) => void;
  workspaceName?: string;
  onLeaveVoice?: () => void;
}

interface PendingAttachment {
  id: string;
  file: File;
  previewUrl: string;
  type: 'image' | 'video' | 'file';
  name: string;
  size: number;
}

const QUICK_EMOJIS = ['❤️', '👍', '🔥', '🚀', '😂', '🎉'];

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export const VoiceChannelView: React.FC<VoiceChannelViewProps> = ({
  currentChannel,
  currentUser,
  messages,
  onSendMessage,
  onToggleReaction,
  onOpenUserProfile,
  onLeaveVoice,
}) => {
  const {
    connectedChannelId,
    isMuted,
    isDeafened,
    isScreenSharing,
    isTextChatOpen,
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
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [pendingAttachments, setPendingAttachments] = useState<PendingAttachment[]>([]);
  const [isInputEmojiOpen, setIsInputEmojiOpen] = useState(false);
  const [reactingMessageId, setReactingMessageId] = useState<string | null>(null);

  const chatScrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newAttachments: PendingAttachment[] = Array.from(files).map((file) => {
      let type: 'image' | 'video' | 'file' = 'file';
      if (file.type.startsWith('image/')) type = 'image';
      else if (file.type.startsWith('video/')) type = 'video';

      return {
        id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        file,
        previewUrl: URL.createObjectURL(file),
        type,
        name: file.name,
        size: file.size,
      };
    });

    setPendingAttachments((prev) => [...prev, ...newAttachments]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeAttachment = (id: string) => {
    setPendingAttachments((prev) => {
      const target = prev.find((a) => a.id === id);
      if (target?.previewUrl) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((a) => a.id !== id);
    });
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const text = inputMessage.trim();
    if ((!text && pendingAttachments.length === 0) || isSending) return;

    try {
      setIsSending(true);

      const finalAttachments: MessageAttachment[] = [];
      for (const att of pendingAttachments) {
        try {
          const res = await fileApi.uploadFile(att.file);
          finalAttachments.push({
            url: res.url,
            fileName: res.fileName || att.name,
            fileSize: res.fileSize || att.size,
            contentType: res.contentType || att.file.type,
            type: att.type,
          });
        } catch (uploadErr) {
          console.error('Failed to upload file:', att.name, uploadErr);
        }
      }

      await onSendMessage(text, finalAttachments.length > 0 ? finalAttachments : undefined);
      setInputMessage('');
      setPendingAttachments([]);
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
      {/* 1. Voice Channel Header (Clean Discord style: No "Đã kết nối" text, No "Rời phòng" text button) */}
      <div className="h-[54px] px-5 border-b border-border flex items-center justify-between shrink-0 bg-chat">
        <div className="flex items-center gap-2.5 min-w-0">
          <SpeakerHigh size={22} weight="bold" className="text-text-muted shrink-0" />
          <h2 className="text-base font-bold text-text-primary truncate">
            {currentChannel.name}
          </h2>
          {currentChannel.topic && (
            <span className="hidden md:inline text-xs text-text-muted truncate max-w-sm border-l border-border pl-2.5 ml-1">
              {currentChannel.topic}
            </span>
          )}
        </div>

        {/* Right Header Actions */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={toggleScreenSharing}
            className={`p-2 rounded-control text-sm font-semibold cursor-pointer transition-colors ${
              isScreenSharing
                ? 'bg-accent-soft text-accent-primary'
                : 'text-text-muted hover:text-text-primary hover:bg-surface-active'
            }`}
            title="Chia sẻ màn hình"
          >
            <Screencast size={18} weight={isScreenSharing ? 'fill' : 'bold'} />
          </button>

          <button
            type="button"
            onClick={toggleTextChat}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-control text-xs font-semibold cursor-pointer transition-colors ${
              isTextChatOpen
                ? 'bg-accent-soft text-accent-primary'
                : 'text-text-muted hover:text-text-primary hover:bg-surface-active'
            }`}
            title={isTextChatOpen ? 'Ẩn trò chuyện' : 'Mở trò chuyện trong phòng thoại'}
          >
            <ChatTeardropText size={17} weight={isTextChatOpen ? 'fill' : 'bold'} />
            <span className="hidden sm:inline">Trò chuyện</span>
          </button>
        </div>
      </div>

      {/* 2. Main Stage & In-Voice Chat Split View */}
      <div className="flex-1 flex min-h-0 overflow-hidden relative">
        {/* LEFT / CENTER: Voice Stage Room */}
        <div className="flex-1 flex flex-col min-h-0 p-4 sm:p-6 relative justify-between overflow-y-auto no-scrollbar">
          {/* Participant Cards Grid */}
          <div className="max-w-4xl w-full mx-auto grid grid-cols-1 md:grid-cols-2 gap-5 flex-1 items-center justify-center my-auto">
            {participants.map((p) => {
              const isMe = p.userId === currentUser?.id;
              const isCompanion = p.userId === 'simulated-nomna-bot';

              return (
                <div
                  key={p.userId}
                  className={`relative flex flex-col items-center justify-center p-6 rounded-2xl transition-all duration-200 min-h-[230px] ${
                    isMe
                      ? p.isSpeaking
                        ? 'bg-linear-to-b from-accent-primary/[0.12] via-surface to-surface border-2 border-success shadow-[0_0_30px_rgba(35,165,90,0.3)]'
                        : 'bg-linear-to-b from-accent-primary/[0.08] via-surface to-surface border-2 border-accent-primary/60 shadow-[0_0_24px_rgba(99,102,241,0.14)]'
                      : p.isSpeaking
                      ? 'bg-surface border-2 border-success shadow-[0_0_24px_rgba(35,165,90,0.25)]'
                      : 'bg-surface/90 border border-border/70 hover:border-border shadow-raised'
                  }`}
                >
                  {/* Top Right: Speaking equalizer waves */}
                  {p.isSpeaking && (
                    <div className="absolute top-3.5 right-3.5 flex items-center gap-0.5 text-success">
                      <span className="w-1 h-3.5 bg-success rounded-full animate-bounce [animation-delay:0ms]" />
                      <span className="w-1 h-5 bg-success rounded-full animate-bounce [animation-delay:150ms]" />
                      <span className="w-1 h-2.5 bg-success rounded-full animate-bounce [animation-delay:300ms]" />
                    </div>
                  )}

                  {/* Top Left: Distinguished "BẠN" tag for current user */}
                  {isMe && (
                    <div className="absolute top-3.5 left-3.5">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-accent-primary text-white tracking-wider shadow-xs">
                        BẠN
                      </span>
                    </div>
                  )}

                  {/* Avatar with dynamic speaking ring */}
                  <div className="relative mb-3.5">
                    <div
                      className={`rounded-full transition-all duration-200 p-1 ${
                        p.isSpeaking
                          ? 'ring-4 ring-success ring-offset-4 ring-offset-surface animate-pulse'
                          : isMe
                          ? 'ring-2 ring-accent-primary/50'
                          : 'ring-2 ring-transparent'
                      }`}
                    >
                      <Avatar
                        src={getMediaUrl(p.avatarUrl)}
                        fallback={p.displayName}
                        size="lg"
                      />
                    </div>

                    {/* Mute badge overlay */}
                    {p.isMuted && (
                      <span className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-danger text-white flex items-center justify-center border-2 border-surface shadow-xs">
                        <MicrophoneSlash size={12} weight="bold" />
                      </span>
                    )}
                  </div>

                  {/* Name Tag */}
                  <div className="flex items-center gap-2 text-sm font-bold text-text-primary">
                    <span className="truncate max-w-[170px]">{p.displayName}</span>
                    {isCompanion && (
                      <span className="px-1.5 py-0.5 rounded-control text-[10px] font-bold bg-accent-soft text-accent-primary">
                        BOT
                      </span>
                    )}
                  </div>

                  {/* Refined Speaking Status / Mic Test Button */}
                  {isMe ? (
                    <button
                      type="button"
                      onClick={toggleSpeaking}
                      disabled={isMuted}
                      className={`mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer shadow-xs active:scale-95 ${
                        isMuted
                          ? 'opacity-40 cursor-not-allowed bg-surface-active text-text-muted border border-border/40'
                          : p.isSpeaking
                          ? 'bg-success text-white shadow-md'
                          : 'bg-surface-active hover:bg-accent-soft hover:text-accent-primary text-text-secondary border border-border/60'
                      }`}
                    >
                      <Waveform size={14} weight="bold" className={p.isSpeaking ? 'animate-pulse' : ''} />
                      <span>{p.isSpeaking ? 'Đang nói (Click để dừng)' : 'Thử micro'}</span>
                    </button>
                  ) : (
                    <div className="mt-3 flex items-center gap-1.5 text-xs text-text-muted">
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          p.isSpeaking ? 'bg-success animate-ping' : 'bg-text-muted/40'
                        }`}
                      />
                      <span>{p.isSpeaking ? 'Đang nói' : 'Đang lắng nghe'}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Floating Dock: Discord-style Voice Controls */}
          <div className="shrink-0 flex justify-center pt-4 pb-2">
            <div className="inline-flex items-center gap-2 p-2 rounded-full bg-sidebar/95 backdrop-blur-md border border-border shadow-floating">
              {/* Mic toggle */}
              <button
                type="button"
                onClick={toggleMute}
                className={`w-10 h-10 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                  isMuted
                    ? 'bg-danger text-white hover:bg-danger-hover shadow-xs'
                    : 'text-text-primary hover:bg-surface-active'
                }`}
                title={isMuted ? 'Bật Mic' : 'Tắt Mic'}
              >
                {isMuted ? <MicrophoneSlash size={19} weight="bold" /> : <Microphone size={19} weight="bold" />}
              </button>

              {/* Deafen toggle */}
              <button
                type="button"
                onClick={toggleDeafen}
                className={`w-10 h-10 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                  isDeafened
                    ? 'bg-danger text-white hover:bg-danger-hover shadow-xs'
                    : 'text-text-primary hover:bg-surface-active'
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
                    ? 'bg-accent-primary text-white shadow-xs'
                    : 'text-text-primary hover:bg-surface-active'
                }`}
                title={isCameraActive ? 'Tắt Camera' : 'Bật Camera'}
              >
                {isCameraActive ? <VideoCamera size={19} weight="bold" /> : <VideoCameraSlash size={19} weight="bold" />}
              </button>

              {/* Screen Share simulation */}
              <button
                type="button"
                onClick={toggleScreenSharing}
                className={`w-10 h-10 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                  isScreenSharing
                    ? 'bg-accent-primary text-white shadow-xs'
                    : 'text-text-primary hover:bg-surface-active'
                }`}
                title="Chia sẻ màn hình"
              >
                <Screencast size={19} weight="bold" />
              </button>

              {/* Text Chat toggle */}
              <button
                type="button"
                onClick={toggleTextChat}
                className={`w-10 h-10 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                  isTextChatOpen
                    ? 'bg-accent-soft text-accent-primary'
                    : 'text-text-primary hover:bg-surface-active'
                }`}
                title="Trò chuyện bằng văn bản"
              >
                <ChatTeardropText size={19} weight={isTextChatOpen ? 'fill' : 'bold'} />
              </button>

              {/* Divider */}
              <div className="w-px h-6 bg-border mx-1" />

              {/* Disconnect Button (User requirement: Prominently RED) */}
              <button
                type="button"
                onClick={handleDisconnect}
                className="h-10 px-5 rounded-full bg-danger text-white hover:bg-danger-hover transition-all font-bold text-xs flex items-center gap-2 cursor-pointer shadow-md hover:shadow-lg hover:scale-105 active:scale-95"
                title="Ngắt kết nối phòng thoại"
              >
                <PhoneDisconnect size={18} weight="bold" />
                <span>Ngắt kết nối</span>
              </button>
            </div>
          </div>
        </div>

        {/* RIGHT: Full-Featured In-Voice Text Chat Panel */}
        {isTextChatOpen && (
          <div className="w-80 md:w-96 border-l border-border bg-sidebar/50 flex flex-col h-full shrink-0 animate-in slide-in-from-right-4 duration-150">
            {/* Header */}
            <div className="h-[54px] px-4 border-b border-border flex items-center justify-between shrink-0 bg-sidebar/80">
              <div className="flex items-center gap-2">
                <ChatTeardropText size={18} weight="fill" className="text-accent-primary" />
                <h3 className="font-bold text-xs text-text-primary">Chat trong phòng thoại</h3>
              </div>
              <button
                type="button"
                onClick={toggleTextChat}
                className="p-1.5 rounded-control text-text-muted hover:text-text-primary hover:bg-surface transition-colors cursor-pointer"
                title="Đóng khung chat"
              >
                <X size={15} weight="bold" />
              </button>
            </div>

            {/* Messages Feed with Full Features: Reactions, Attachments, Markdown */}
            <div
              ref={chatScrollRef}
              className="flex-1 min-h-0 overflow-y-auto p-3.5 space-y-3.5 no-scrollbar"
            >
              {messages.length === 0 ? (
                <div className="py-12 text-center flex flex-col items-center gap-2.5 text-text-muted">
                  <div className="w-11 h-11 rounded-xl bg-surface flex items-center justify-center text-accent-primary shadow-xs">
                    <ChatTeardropText size={22} weight="fill" />
                  </div>
                  <p className="text-xs font-bold text-text-primary">
                    Chưa có tin nhắn nào trong phòng
                  </p>
                  <p className="text-[11px] leading-relaxed max-w-[210px]">
                    Hãy gửi bình luận, reaction hoặc gửi tệp đầu tiên trong khi đàm thoại!
                  </p>
                </div>
              ) : (
                messages.map((msg) => (
                  <div
                    key={msg.id}
                    className="group relative flex items-start gap-2.5 text-xs p-1.5 rounded-lg hover:bg-surface/60 transition-colors"
                  >
                    <div
                      className="cursor-pointer shrink-0"
                      onClick={() =>
                        onOpenUserProfile?.({
                          id: msg.senderId,
                          displayName: msg.senderDisplayName,
                          username: msg.senderUsername || '',
                          avatarUrl: msg.senderAvatarUrl,
                        })
                      }
                    >
                      <Avatar
                        src={getMediaUrl(msg.senderAvatarUrl)}
                        fallback={msg.senderDisplayName}
                        size="sm"
                      />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-1">
                        <span
                          className="font-bold text-text-primary truncate cursor-pointer hover:underline"
                          onClick={() =>
                            onOpenUserProfile?.({
                              id: msg.senderId,
                              displayName: msg.senderDisplayName,
                              username: msg.senderUsername || '',
                              avatarUrl: msg.senderAvatarUrl,
                            })
                          }
                        >
                          {msg.senderDisplayName}
                        </span>
                        <span className="text-[10px] text-text-muted">
                          {new Date(msg.createdAt).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>

                      {/* Rich Content rendering via MessageContent */}
                      {msg.content && (
                        <div className="text-text-secondary leading-relaxed break-words">
                          <MessageContent
                            content={msg.content}
                            currentUsername={currentUser?.username}
                          />
                        </div>
                      )}

                      {/* Attachments rendering */}
                      {msg.attachments && msg.attachments.length > 0 && (
                        <div className="mt-2 flex flex-col gap-1.5">
                          {msg.attachments.map((att, idx) => {
                            const fullUrl = getMediaUrl(att.url);
                            if (att.type === 'image') {
                              return (
                                <a
                                  key={idx}
                                  href={fullUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="block max-w-[240px] max-h-[180px] rounded-lg overflow-hidden border border-border hover:border-accent-primary transition-all"
                                >
                                  <img
                                    src={fullUrl}
                                    alt={att.fileName || 'Attachment'}
                                    className="w-full h-full object-cover"
                                  />
                                </a>
                              );
                            }
                            if (att.type === 'video') {
                              return (
                                <video
                                  key={idx}
                                  src={fullUrl}
                                  controls
                                  className="max-w-[240px] max-h-[180px] rounded-lg border border-border"
                                />
                              );
                            }
                            return (
                              <a
                                key={idx}
                                href={fullUrl}
                                target="_blank"
                                rel="noreferrer"
                                download={att.fileName}
                                className="inline-flex items-center gap-2 p-2 rounded-lg bg-surface border border-border hover:bg-surface-active text-text-primary text-[11px] max-w-xs transition-colors"
                              >
                                <FileText size={18} className="text-accent-primary shrink-0" />
                                <span className="truncate flex-1 font-medium">
                                  {att.fileName}
                                  {att.fileSize ? ` (${formatFileSize(att.fileSize)})` : ''}
                                </span>
                                <DownloadSimple size={14} className="text-text-muted shrink-0" />
                              </a>
                            );
                          })}
                        </div>
                      )}

                      {/* Reactions badges strip */}
                      {msg.reactions && msg.reactions.length > 0 && (
                        <div className="flex flex-wrap items-center gap-1 mt-1.5">
                          {msg.reactions.map((r, rIdx) => (
                            <button
                              key={rIdx}
                              type="button"
                              onClick={() => onToggleReaction?.(msg.id, r.emoji)}
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border transition-all cursor-pointer ${
                                r.hasReacted
                                  ? 'bg-accent-soft border-accent-primary text-accent-primary'
                                  : 'bg-surface border-border text-text-secondary hover:bg-surface-active'
                              }`}
                            >
                              <span>{r.emoji}</span>
                              <span className="text-[10px]">{r.count}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Quick Reactions Bar on Message Hover */}
                    <div className="absolute right-2 -top-2 hidden group-hover:flex items-center gap-0.5 bg-surface border border-border shadow-raised rounded-full p-0.5 z-10 animate-in fade-in duration-100">
                      {QUICK_EMOJIS.slice(0, 3).map((emoji) => (
                        <button
                          key={emoji}
                          type="button"
                          onClick={() => onToggleReaction?.(msg.id, emoji)}
                          className="w-6 h-6 flex items-center justify-center hover:scale-125 transition-transform text-xs cursor-pointer"
                        >
                          {emoji}
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={() => setReactingMessageId(msg.id)}
                        className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-surface-active text-text-muted hover:text-text-primary cursor-pointer"
                        title="Thêm biểu cảm khác"
                      >
                        <Plus size={12} weight="bold" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Pending Attachments Preview Strip */}
            {pendingAttachments.length > 0 && (
              <div className="p-2 border-t border-border bg-surface/70 flex items-center gap-2 overflow-x-auto no-scrollbar">
                {pendingAttachments.map((att) => (
                  <div
                    key={att.id}
                    className="relative group shrink-0 w-16 h-16 rounded-lg border border-border bg-chat overflow-hidden flex flex-col items-center justify-center"
                  >
                    {att.type === 'image' ? (
                      <img src={att.previewUrl} alt={att.name} className="w-full h-full object-cover" />
                    ) : att.type === 'video' ? (
                      <Play size={20} className="text-accent-primary" />
                    ) : (
                      <FileText size={20} className="text-accent-primary" />
                    )}
                    <button
                      type="button"
                      onClick={() => removeAttachment(att.id)}
                      className="absolute top-1 right-1 w-4 h-4 rounded-full bg-danger text-white flex items-center justify-center cursor-pointer shadow-xs"
                      title="Xóa tệp"
                    >
                      <X size={10} weight="bold" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Full-Featured In-Voice Input Bar */}
            <form
              onSubmit={handleSendMessage}
              className="p-3 border-t border-border bg-sidebar/80 flex flex-col gap-2 shrink-0 relative"
            >
              {/* Hidden file input */}
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*,video/*,application/pdf,.doc,.docx,.zip"
                className="hidden"
                onChange={handleFileUpload}
              />

              <div className="flex items-center gap-2">
                {/* Paperclip file attach button */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface transition-colors cursor-pointer"
                  title="Đính kèm ảnh / video / tệp"
                >
                  <Paperclip size={17} weight="bold" />
                </button>

                {/* Input text / textarea */}
                <div className="flex-1 relative flex items-center">
                  <textarea
                    ref={textareaRef}
                    rows={1}
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                    placeholder={`Nhắn trong #${currentChannel.name}...`}
                    className="w-full min-h-[34px] max-h-24 py-1.5 pl-3 pr-8 rounded-lg bg-chat border border-border focus:border-accent-primary text-xs text-text-primary placeholder:text-text-muted focus:outline-hidden resize-none leading-normal"
                  />
                  {/* Smiley emoji trigger */}
                  <button
                    type="button"
                    onClick={() => setIsInputEmojiOpen((prev) => !prev)}
                    className="absolute right-2 text-text-muted hover:text-text-primary cursor-pointer p-0.5"
                    title="Thêm biểu cảm"
                  >
                    <Smiley size={16} weight="bold" />
                  </button>
                </div>

                {/* Send Button */}
                <button
                  type="submit"
                  disabled={(!inputMessage.trim() && pendingAttachments.length === 0) || isSending}
                  className="w-8 h-8 rounded-lg bg-accent-primary text-white hover:bg-accent-hover disabled:opacity-40 transition-colors flex items-center justify-center shrink-0 cursor-pointer shadow-xs"
                  title="Gửi tin nhắn"
                >
                  {isSending ? (
                    <CircleNotch size={14} className="animate-spin" />
                  ) : (
                    <PaperPlaneRight size={14} weight="bold" />
                  )}
                </button>
              </div>

              {/* Emoji Picker Popover for main voice chat input */}
              <EmojiPickerPopover
                isOpen={isInputEmojiOpen}
                onClose={() => setIsInputEmojiOpen(false)}
                onSelectEmoji={(emoji) => {
                  setInputMessage((prev) => prev + emoji);
                  setIsInputEmojiOpen(false);
                  textareaRef.current?.focus();
                }}
              />

              {/* Emoji Picker Popover for reacting to a message */}
              {reactingMessageId && (
                <EmojiPickerPopover
                  isOpen={Boolean(reactingMessageId)}
                  onClose={() => setReactingMessageId(null)}
                  onSelectEmoji={(emoji) => {
                    if (reactingMessageId) {
                      onToggleReaction?.(reactingMessageId, emoji);
                      setReactingMessageId(null);
                    }
                  }}
                />
              )}
            </form>
          </div>
        )}
      </div>
    </div>
  );
};
