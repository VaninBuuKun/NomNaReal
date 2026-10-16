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
  Plus,
  FileText,
  Play,
  DownloadSimple,
  Image as ImageIcon,
} from '@phosphor-icons/react';
import { Avatar } from '../ui';
import type { Channel, Message, User, MessageAttachment } from '../../types';
import { useVoiceStore } from '../../stores/useVoiceStore';
import { getMediaUrl } from '../../utils/constants';
import { MessageContent } from './MessageContent';
import { EmojiPickerPopover } from './EmojiPickerPopover';
import { GifPicker } from './GifPicker';
import { MentionAutocompletePopover, type MentionUser } from './MentionAutocompletePopover';
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
  workspaceMembers?: MentionUser[];
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
  workspaceMembers = [],
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
    toggleScreenSharing,
    toggleTextChat,
  } = useVoiceStore();

  const [inputMessage, setInputMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [pendingAttachments, setPendingAttachments] = useState<PendingAttachment[]>([]);
  const [isPlusMenuOpen, setIsPlusMenuOpen] = useState(false);
  const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false);
  const [isGifPickerOpen, setIsGifPickerOpen] = useState(false);
  const [reactingMessageId, setReactingMessageId] = useState<string | null>(null);

  // Mention autocomplete state in voice chat
  const [isMentionOpen, setIsMentionOpen] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');

  const chatScrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const plusMenuRef = useRef<HTMLDivElement>(null);

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

  // Close plus menu on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (plusMenuRef.current && !plusMenuRef.current.contains(e.target as Node)) {
        setIsPlusMenuOpen(false);
      }
    };
    if (isPlusMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isPlusMenuOpen]);

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
    setIsPlusMenuOpen(false);
  };

  const removeAttachment = (id: string) => {
    setPendingAttachments((prev) => {
      const target = prev.find((a) => a.id === id);
      if (target?.previewUrl) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((a) => a.id !== id);
    });
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setInputMessage(val);

    const cursorPos = e.target.selectionStart;
    const textBeforeCursor = val.slice(0, cursorPos);
    const lastAtMatch = textBeforeCursor.match(/@([a-zA-Z0-9_\.]*)$/);
    if (lastAtMatch) {
      setMentionQuery(lastAtMatch[1]);
      setIsMentionOpen(true);
    } else {
      setIsMentionOpen(false);
    }
  };

  const handleSelectMention = (username: string) => {
    if (!textareaRef.current) return;
    const textarea = textareaRef.current;
    const cursorPos = textarea.selectionStart;
    const textBeforeCursor = inputMessage.slice(0, cursorPos);
    const textAfterCursor = inputMessage.slice(cursorPos);

    const updatedBefore = textBeforeCursor.replace(/@([a-zA-Z0-9_\.]*)$/, `@${username} `);
    const newContent = updatedBefore + textAfterCursor;
    setInputMessage(newContent);
    setIsMentionOpen(false);

    setTimeout(() => {
      textarea.focus();
      const newCursor = updatedBefore.length;
      textarea.setSelectionRange(newCursor, newCursor);
    }, 10);
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
      setIsMentionOpen(false);
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
      {/* 1. Voice Channel Header (Compact 48px, exactly matching text channel header) */}
      <div className="h-12 px-4 border-b border-border flex items-center justify-between shrink-0 bg-chat">
        <div className="flex items-center gap-2 min-w-0">
          <SpeakerHigh size={18} weight="bold" className="text-text-muted shrink-0" />
          <h2 className="text-sm font-semibold text-text-primary truncate">
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
            className={`p-1.5 rounded-md text-xs font-semibold cursor-pointer transition-colors ${
              isScreenSharing
                ? 'bg-accent-soft text-accent-primary'
                : 'text-text-muted hover:text-text-primary hover:bg-surface-active'
            }`}
            title="Chia sẻ màn hình"
          >
            <Screencast size={16} weight={isScreenSharing ? 'fill' : 'bold'} />
          </button>

          <button
            type="button"
            onClick={toggleTextChat}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold cursor-pointer transition-colors ${
              isTextChatOpen
                ? 'bg-accent-soft text-accent-primary'
                : 'text-text-muted hover:text-text-primary hover:bg-surface-active'
            }`}
            title={isTextChatOpen ? 'Ẩn trò chuyện' : 'Mở trò chuyện trong phòng thoại'}
          >
            <ChatTeardropText size={16} weight={isTextChatOpen ? 'fill' : 'bold'} />
            <span className="hidden sm:inline">Trò chuyện</span>
          </button>
        </div>
      </div>

      {/* 2. Main Stage & In-Voice Chat Split View */}
      <div className="flex-1 flex min-h-0 overflow-hidden relative">
        {/* LEFT / CENTER: Authentic Discord-style Voice Room Stage */}
        <div className="flex-1 flex flex-col min-h-0 p-4 sm:p-6 relative justify-between overflow-y-auto no-scrollbar">
          {/* Participant Cards Grid */}
          <div className="max-w-4xl w-full mx-auto grid grid-cols-1 md:grid-cols-2 gap-4 flex-1 items-center justify-center my-auto">
            {participants.map((p) => {
              const isMe = p.userId === currentUser?.id;

              return (
                <div
                  key={p.userId}
                  className={`relative flex flex-col items-center justify-center p-6 rounded-xl bg-surface/90 border transition-all duration-150 min-h-[220px] shadow-raised overflow-hidden ${
                    p.isSpeaking
                      ? 'border-success/80 shadow-[0_0_20px_rgba(35,165,90,0.25)]'
                      : 'border-border/60 hover:border-border'
                  }`}
                >
                  {/* Avatar: Clean without thick awkward rings; pure green ring ONLY when speaking */}
                  <div className="relative mb-2">
                    <div
                      className={`rounded-full transition-all duration-150 ${
                        p.isSpeaking
                          ? 'ring-2 ring-success shadow-[0_0_12px_rgba(35,165,90,0.4)]'
                          : 'ring-0'
                      }`}
                    >
                      <Avatar
                        src={getMediaUrl(p.avatarUrl)}
                        fallback={p.displayName}
                        size="lg"
                      />
                    </div>
                  </div>

                  {/* Translucent bottom pill tag (Authentic Discord layout) */}
                  <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between px-3 py-1.5 rounded-lg bg-black/60 backdrop-blur-sm border border-white/5">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="text-xs font-semibold text-white truncate max-w-[150px]">
                        {p.displayName}
                      </span>
                      {isMe && (
                        <span className="text-[10px] text-accent-primary font-bold shrink-0">
                          (Bạn)
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {p.isMuted && (
                        <MicrophoneSlash size={14} weight="bold" className="text-danger" />
                      )}
                      {p.isSpeaking && (
                        <Waveform size={14} weight="bold" className="text-success animate-pulse" />
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Floating Dock: Discord Voice Stage Controls */}
          <div className="shrink-0 flex justify-center pt-3 pb-2">
            <div className="inline-flex items-center gap-1.5 p-1.5 rounded-full bg-sidebar/95 backdrop-blur-md border border-border shadow-floating">
              {/* Mic toggle */}
              <button
                type="button"
                onClick={toggleMute}
                className={`w-9 h-9 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                  isMuted
                    ? 'bg-danger text-white hover:bg-danger-hover shadow-xs'
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
                className={`w-9 h-9 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                  isDeafened
                    ? 'bg-danger text-white hover:bg-danger-hover shadow-xs'
                    : 'text-text-primary hover:bg-surface-active'
                }`}
                title={isDeafened ? 'Bật âm thanh' : 'Tắt toàn bộ âm thanh'}
              >
                <Headphones size={18} weight={isDeafened ? 'fill' : 'bold'} />
              </button>

              {/* Video Camera Toggle */}
              <button
                type="button"
                onClick={() => setIsCameraActive((prev) => !prev)}
                className={`w-9 h-9 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                  isCameraActive
                    ? 'bg-accent-primary text-white shadow-xs'
                    : 'text-text-primary hover:bg-surface-active'
                }`}
                title={isCameraActive ? 'Tắt Camera' : 'Bật Camera'}
              >
                {isCameraActive ? <VideoCamera size={18} weight="bold" /> : <VideoCameraSlash size={18} weight="bold" />}
              </button>

              {/* Screen Share */}
              <button
                type="button"
                onClick={toggleScreenSharing}
                className={`w-9 h-9 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                  isScreenSharing
                    ? 'bg-accent-primary text-white shadow-xs'
                    : 'text-text-primary hover:bg-surface-active'
                }`}
                title="Chia sẻ màn hình"
              >
                <Screencast size={18} weight="bold" />
              </button>

              {/* Text Chat toggle */}
              <button
                type="button"
                onClick={toggleTextChat}
                className={`w-9 h-9 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                  isTextChatOpen
                    ? 'bg-accent-soft text-accent-primary'
                    : 'text-text-primary hover:bg-surface-active'
                }`}
                title="Trò chuyện bằng văn bản"
              >
                <ChatTeardropText size={18} weight={isTextChatOpen ? 'fill' : 'bold'} />
              </button>

              {/* Divider */}
              <div className="w-px h-5 bg-border mx-1" />

              {/* Red Disconnect Button */}
              <button
                type="button"
                onClick={handleDisconnect}
                className="h-9 px-4 rounded-full bg-danger text-white hover:bg-danger-hover transition-all font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-sm hover:shadow active:scale-95"
                title="Ngắt kết nối phòng thoại"
              >
                <PhoneDisconnect size={16} weight="bold" />
                <span>Ngắt kết nối</span>
              </button>
            </div>
          </div>
        </div>

        {/* RIGHT: In-Voice Chat Panel (Discord-style with + Action Menu) */}
        {isTextChatOpen && (
          <div className="w-80 md:w-96 border-l border-border bg-sidebar/50 flex flex-col h-full shrink-0 animate-in slide-in-from-right-4 duration-150">
            {/* Header (compact 48px) */}
            <div className="h-12 px-3.5 border-b border-border flex items-center justify-between shrink-0 bg-sidebar/80">
              <div className="flex items-center gap-2">
                <ChatTeardropText size={17} weight="fill" className="text-accent-primary" />
                <h3 className="font-semibold text-xs text-text-primary">Chat trong phòng thoại</h3>
              </div>
              <button
                type="button"
                onClick={toggleTextChat}
                className="p-1 rounded-md text-text-muted hover:text-text-primary hover:bg-surface transition-colors cursor-pointer"
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
                  <div className="w-10 h-10 rounded-xl bg-surface flex items-center justify-center text-accent-primary shadow-xs">
                    <ChatTeardropText size={20} weight="fill" />
                  </div>
                  <p className="text-xs font-semibold text-text-primary">
                    Chưa có tin nhắn nào trong phòng
                  </p>
                  <p className="text-[11px] leading-relaxed max-w-[210px]">
                    Hãy gửi bình luận, reaction hoặc gửi tệp trong khi đàm thoại!
                  </p>
                </div>
              ) : (
                messages.map((msg) => (
                  <div
                    key={msg.id}
                    className="group relative flex items-start gap-2.5 text-xs p-1.5 rounded-lg hover:bg-surface/50 transition-colors"
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
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span
                          className="font-semibold text-text-primary truncate cursor-pointer hover:underline"
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

                      {/* Message Content with Markdown & Mentions */}
                      {msg.content && (
                        <div className="text-text-secondary leading-relaxed break-words">
                          <MessageContent
                            content={msg.content}
                            currentUsername={currentUser?.username}
                          />
                        </div>
                      )}

                      {/* Attachments */}
                      {msg.attachments && msg.attachments.length > 0 && (
                        <div className="mt-1.5 flex flex-col gap-1.5">
                          {msg.attachments.map((att, idx) => {
                            const fullUrl = getMediaUrl(att.url);
                            if (att.type === 'image') {
                              return (
                                <a
                                  key={idx}
                                  href={fullUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="block max-w-[220px] max-h-[160px] rounded-lg overflow-hidden border border-border hover:border-accent-primary transition-all"
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
                                  className="max-w-[220px] max-h-[160px] rounded-lg border border-border"
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
                                className="inline-flex items-center gap-2 p-1.5 rounded-lg bg-surface border border-border hover:bg-surface-active text-text-primary text-[11px] max-w-xs transition-colors"
                              >
                                <FileText size={16} className="text-accent-primary shrink-0" />
                                <span className="truncate flex-1 font-medium">
                                  {att.fileName}
                                  {att.fileSize ? ` (${formatFileSize(att.fileSize)})` : ''}
                                </span>
                                <DownloadSimple size={13} className="text-text-muted shrink-0" />
                              </a>
                            );
                          })}
                        </div>
                      )}

                      {/* Reactions badges strip */}
                      {msg.reactions && msg.reactions.length > 0 && (
                        <div className="flex flex-wrap items-center gap-1 mt-1">
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
                    className="relative group shrink-0 w-14 h-14 rounded-lg border border-border bg-chat overflow-hidden flex flex-col items-center justify-center"
                  >
                    {att.type === 'image' ? (
                      <img src={att.previewUrl} alt={att.name} className="w-full h-full object-cover" />
                    ) : att.type === 'video' ? (
                      <Play size={18} className="text-accent-primary" />
                    ) : (
                      <FileText size={18} className="text-accent-primary" />
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

            {/* In-Voice Chat Input Bar (Discord-style: [+] Action Button on Left) */}
            <form
              onSubmit={handleSendMessage}
              className="p-2.5 border-t border-border bg-sidebar/80 flex flex-col gap-1.5 shrink-0 relative"
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

              {/* Mention Autocomplete Popover for In-Voice Chat */}
              <MentionAutocompletePopover
                isOpen={isMentionOpen}
                query={mentionQuery}
                members={workspaceMembers}
                onSelect={handleSelectMention}
                onClose={() => setIsMentionOpen(false)}
              />

              <div className="flex items-center gap-1.5">
                {/* Discord-style [+] Actions Button */}
                <div className="relative" ref={plusMenuRef}>
                  <button
                    type="button"
                    onClick={() => setIsPlusMenuOpen((prev) => !prev)}
                    className="w-7 h-7 rounded-full bg-surface-active hover:bg-surface text-text-muted hover:text-text-primary flex items-center justify-center transition-all cursor-pointer shadow-2xs"
                    title="Mở menu tính năng"
                  >
                    <Plus size={15} weight="bold" />
                  </button>

                  {/* [+] Popover Menu */}
                  {isPlusMenuOpen && (
                    <div className="absolute bottom-full left-0 mb-2 w-48 rounded-xl bg-surface border border-border shadow-xl p-1.5 z-50 flex flex-col gap-0.5 animate-in fade-in slide-in-from-bottom-2 duration-100">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-text-primary hover:bg-surface-active transition-colors cursor-pointer text-left"
                      >
                        <ImageIcon size={16} weight="bold" className="text-accent-primary" />
                        <span>Tải tệp tin lên</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setIsPlusMenuOpen(false);
                          setIsGifPickerOpen(true);
                          setIsEmojiPickerOpen(false);
                        }}
                        className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-text-primary hover:bg-surface-active transition-colors cursor-pointer text-left"
                      >
                        <span className="font-bold text-[10px] border border-current px-1 rounded leading-tight text-accent-primary">
                          GIF
                        </span>
                        <span>Thư viện ảnh GIF</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setIsPlusMenuOpen(false);
                          setIsEmojiPickerOpen(true);
                          setIsGifPickerOpen(false);
                        }}
                        className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-text-primary hover:bg-surface-active transition-colors cursor-pointer text-left"
                      >
                        <Smiley size={16} weight="bold" className="text-accent-primary" />
                        <span>Biểu cảm Emoji</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* Textarea Input */}
                <div className="flex-1 relative flex items-center">
                  <textarea
                    ref={textareaRef}
                    rows={1}
                    value={inputMessage}
                    onChange={handleInputChange}
                    onKeyDown={(e) => {
                      if (isMentionOpen) {
                        if (e.key === 'Enter' || e.key === 'Tab' || e.key === 'ArrowUp' || e.key === 'ArrowDown' || e.key === 'Escape') {
                          return;
                        }
                      }
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                    placeholder={`Nhắn trong #${currentChannel.name}...`}
                    className="w-full min-h-[32px] max-h-20 py-1.5 pl-2.5 pr-14 rounded-lg bg-chat border border-border focus:border-accent-primary text-xs text-text-primary placeholder:text-text-muted focus:outline-hidden resize-none leading-normal"
                  />

                  {/* Right quick triggers: GIF & Emoji inside input */}
                  <div className="absolute right-1.5 flex items-center gap-0.5 text-text-muted">
                    <button
                      type="button"
                      onClick={() => {
                        setIsGifPickerOpen((prev) => !prev);
                        setIsEmojiPickerOpen(false);
                      }}
                      className="p-1 hover:text-text-primary transition-colors cursor-pointer text-[10px] font-bold"
                      title="GIF"
                    >
                      GIF
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsEmojiPickerOpen((prev) => !prev);
                        setIsGifPickerOpen(false);
                      }}
                      className="p-1 hover:text-text-primary transition-colors cursor-pointer"
                      title="Emoji"
                    >
                      <Smiley size={15} weight="bold" />
                    </button>
                  </div>
                </div>

                {/* Send Button */}
                <button
                  type="submit"
                  disabled={(!inputMessage.trim() && pendingAttachments.length === 0) || isSending}
                  className="w-7 h-7 rounded-lg bg-accent-primary text-white hover:bg-accent-hover disabled:opacity-40 transition-colors flex items-center justify-center shrink-0 cursor-pointer shadow-2xs"
                  title="Gửi tin nhắn"
                >
                  {isSending ? (
                    <CircleNotch size={13} className="animate-spin" />
                  ) : (
                    <PaperPlaneRight size={13} weight="bold" />
                  )}
                </button>
              </div>

              {/* Emoji Picker Popover */}
              <EmojiPickerPopover
                isOpen={isEmojiPickerOpen}
                onClose={() => setIsEmojiPickerOpen(false)}
                onSelectEmoji={(emoji) => {
                  setInputMessage((prev) => prev + emoji);
                  setIsEmojiPickerOpen(false);
                  textareaRef.current?.focus();
                }}
              />

              {/* GIF Picker Popover */}
              <GifPicker
                isOpen={isGifPickerOpen}
                onClose={() => setIsGifPickerOpen(false)}
                onSelectGif={async (gifUrl) => {
                  setIsGifPickerOpen(false);
                  await onSendMessage(gifUrl);
                }}
              />

              {/* Emoji Picker Popover for reactions */}
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
