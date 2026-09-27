import React, { useState, useEffect, useRef } from "react";
import {
  MagnifyingGlass,
  Users,
  PushPin,
  ChatCenteredDots,
  Paperclip,
  Smiley,
  Code,
  PaperPlaneRight,
  ChatTeardropDots,
  PencilSimple,
  Trash,
  FileText,
  CircleNotch,
  HandWaving,
} from "@phosphor-icons/react";
import { ChannelType, type Channel, type Message, type User } from "../../types";
import { messageApi } from "../../services/messageApi";
import { fileApi } from "../../services/fileApi";
import { formatDateDivider, isDifferentDay } from "../../utils/formatDate";

interface ChatAreaProps {
  currentChannel: Channel | null;
  messages: Message[];
  currentUser: User | null;
  onSendMessage: (content: string) => Promise<void>;
  onEditMessage?: (messageId: string, content: string) => Promise<void>;
  onDeleteMessage?: (messageId: string) => Promise<void>;
  onToggleReaction?: (messageId: string, emoji: string) => Promise<void>;
  onStartTyping: () => void;
  onStopTyping: () => void;
  typingUser: string | null;
  onToggleThread: () => void;
  onOpenThread?: (message: Message) => void;
  onStartDmWithUser?: (user: { id: string; displayName: string; username: string; avatarUrl?: string }) => void;
}

const QUICK_EMOJIS = ["❤️", "👍", "🔥", "🚀", "😂", "🎉"];

interface SelectedUserProfile {
  userId: string;
  displayName: string;
  username: string;
  avatarUrl?: string;
  targetRect: DOMRect;
}

export const ChatArea: React.FC<ChatAreaProps> = ({
  currentChannel,
  messages,
  currentUser,
  onSendMessage,
  onEditMessage,
  onDeleteMessage,
  onToggleReaction,
  onStartTyping,
  onStopTyping,
  typingUser,
  onToggleThread,
  onOpenThread,
  onStartDmWithUser,
}) => {
  const [content, setContent] = useState("");
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);

  // Smart user profile dropdown state
  const [selectedProfile, setSelectedProfile] = useState<SelectedUserProfile | null>(null);
  const profileCardRef = useRef<HTMLDivElement>(null);

  // Inline editing state
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Handle clicking outside or pressing Escape to close profile dropdown
  useEffect(() => {
    if (!selectedProfile) return;
    const handleDown = (e: MouseEvent) => {
      if (profileCardRef.current && !profileCardRef.current.contains(e.target as Node)) {
        setSelectedProfile(null);
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSelectedProfile(null);
    };
    document.addEventListener("mousedown", handleDown);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleDown);
      document.removeEventListener("keydown", handleKey);
    };
  }, [selectedProfile]);

  const getProfilePositionStyle = (): React.CSSProperties => {
    if (!selectedProfile) return {};
    const { targetRect } = selectedProfile;
    const popoverWidth = 270;
    const popoverHeight = 240;
    const margin = 12;

    // Prefer right side of avatar
    let left = targetRect.right + margin;
    if (left + popoverWidth > window.innerWidth - margin) {
      // Flip to left side of avatar
      left = targetRect.left - popoverWidth - margin;
    }
    // Clamp horizontally
    left = Math.max(margin, Math.min(left, window.innerWidth - popoverWidth - margin));

    // Align with top of avatar, clamp vertically
    let top = targetRect.top - 8;
    if (top + popoverHeight > window.innerHeight - margin) {
      top = window.innerHeight - popoverHeight - margin;
    }
    top = Math.max(margin, top);

    return { top: `${top}px`, left: `${left}px` };
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value);
    onStartTyping();

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    typingTimeoutRef.current = setTimeout(() => {
      onStopTyping();
    }, 2000);
  };

  const handleSend = async () => {
    const text = content.trim();
    if (!text || sending) return;

    setSending(true);
    try {
      await onSendMessage(text);
      setContent("");
      onStopTyping();
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // File & Video Upload Handler (Supports up to 100MB AWS S3 storage)
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const MAX_SIZE = 100 * 1024 * 1024; // 100MB limit
    if (file.size > MAX_SIZE) {
      alert("Kích thước tệp vượt quá giới hạn 100MB. Vui lòng chọn tệp nhỏ hơn.");
      return;
    }

    try {
      setUploading(true);
      setUploadProgress(`Đang tải lên ${file.name}...`);
      const folder = file.type.startsWith("video/")
        ? "videos"
        : file.type.startsWith("image/")
        ? "uploads"
        : "attachments";

      const res = await fileApi.uploadFile(file, folder);

      // Append file URL or send message directly
      const fileUrl = res.url;
      const isVideo = file.type.startsWith("video/") || /\.(mp4|webm|mov|mkv)$/i.test(res.fileName);
      const isImage = file.type.startsWith("image/") || /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(res.fileName);

      let messagePayload = "";
      if (isImage) {
        messagePayload = `${content ? content + "\n" : ""}![${res.fileName}](${fileUrl})`;
      } else if (isVideo) {
        messagePayload = `${content ? content + "\n" : ""}[video:${res.fileName}](${fileUrl})`;
      } else {
        messagePayload = `${content ? content + "\n" : ""}[file:${res.fileName}](${fileUrl})`;
      }

      await onSendMessage(messagePayload);
      setContent("");
    } catch (err: any) {
      console.error("File upload error:", err);
      alert(err.response?.data?.message || "Tải lên tệp tin thất bại. Vui lòng thử lại.");
    } finally {
      setUploading(false);
      setUploadProgress(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  // Start editing a message
  const startEdit = (msg: Message) => {
    setEditingMessageId(msg.id);
    setEditContent(msg.content);
  };

  // Save edited message
  const saveEdit = async () => {
    if (!editingMessageId || !editContent.trim() || isSavingEdit) return;
    try {
      setIsSavingEdit(true);
      if (onEditMessage) {
        await onEditMessage(editingMessageId, editContent.trim());
      } else {
        await messageApi.editMessage(editingMessageId, editContent.trim());
      }
      setEditingMessageId(null);
      setEditContent("");
    } catch (err) {
      console.error("Failed to edit message:", err);
      alert("Không thể cập nhật tin nhắn. Vui lòng thử lại.");
    } finally {
      setIsSavingEdit(false);
    }
  };

  // Delete message
  const handleDelete = async (msgId: string) => {
    if (!window.confirm("Bạn có chắc chắn muốn xoá tin nhắn này?")) return;
    try {
      if (onDeleteMessage) {
        await onDeleteMessage(msgId);
      } else {
        await messageApi.deleteMessage(msgId);
      }
    } catch (err) {
      console.error("Failed to delete message:", err);
      alert("Không thể xoá tin nhắn. Vui lòng thử lại.");
    }
  };

  // Toggle reaction
  const handleReactionClick = (msgId: string, emoji: string) => {
    if (onToggleReaction) {
      onToggleReaction(msgId, emoji);
    } else {
      messageApi.toggleReaction(msgId, emoji);
    }
  };

  // Render message content with markdown, video player, and images
  const renderMessageBody = (text: string) => {
    // Check for video attachment pattern: [video:fileName](url)
    const videoMatch = text.match(/\[video:(.*?)\]\((.*?)\)/);
    if (videoMatch) {
      const fileName = videoMatch[1];
      const videoUrl = videoMatch[2];
      const restText = text.replace(/\[video:.*?\]\(.*?\)/, "").trim();

      return (
        <div className="flex flex-col gap-2">
          {restText && <div>{restText}</div>}
          <div className="rounded-xl overflow-hidden border border-[var(--border-color)] bg-black/60 max-w-lg shadow-md my-1">
            <video
              src={videoUrl}
              controls
              preload="metadata"
              className="w-full max-h-[340px] rounded-lg object-contain"
            />
            <div className="p-2 px-3 bg-[var(--bg-surface)] text-xs text-[var(--text-secondary)] flex items-center justify-between">
              <span className="truncate">{fileName}</span>
              <span className="text-[10px] uppercase font-bold text-[var(--accent-primary)]">Video</span>
            </div>
          </div>
        </div>
      );
    }

    // Check for image attachment pattern: ![fileName](url)
    const imageMatch = text.match(/!\[(.*?)\]\((.*?)\)/);
    if (imageMatch) {
      const altText = imageMatch[1];
      const imageUrl = imageMatch[2];
      const restText = text.replace(/!\[.*?\]\(.*?\)/, "").trim();

      return (
        <div className="flex flex-col gap-2">
          {restText && <div>{restText}</div>}
          <div className="max-w-md rounded-xl overflow-hidden border border-[var(--border-color)] shadow-sm my-1">
            <img
              src={imageUrl}
              alt={altText}
              className="w-full max-h-[320px] object-cover cursor-pointer hover:opacity-95 transition-opacity"
              onClick={() => window.open(imageUrl, "_blank")}
            />
          </div>
        </div>
      );
    }

    // Check for generic file attachment pattern: [file:fileName](url)
    const fileMatch = text.match(/\[file:(.*?)\]\((.*?)\)/);
    if (fileMatch) {
      const fileName = fileMatch[1];
      const fileUrl = fileMatch[2];
      const restText = text.replace(/\[file:.*?\]\(.*?\)/, "").trim();

      return (
        <div className="flex flex-col gap-2">
          {restText && <div>{restText}</div>}
          <a
            href={fileUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2.5 p-2.5 px-3.5 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-color)] hover:border-[var(--accent-primary)] text-xs text-[var(--accent-primary)] font-medium transition-all group my-1 max-w-sm"
          >
            <FileText size={18} className="shrink-0 text-[var(--accent-primary)]" />
            <span className="truncate group-hover:underline text-[var(--text-primary)]">{fileName}</span>
          </a>
        </div>
      );
    }

    return <div>{text}</div>;
  };

  return (
    <section className="flex-1 h-full min-h-0 bg-[var(--bg-chat)] flex flex-col overflow-hidden relative">
      {/* Header Chat */}
      <div className="h-[54px] border-b border-[var(--border-color)] px-5 flex items-center justify-between bg-[var(--bg-chat)] shrink-0 select-none">
        <div className="flex items-center gap-2.5 overflow-hidden">
          <h2 className="text-[1rem] font-bold text-[var(--text-primary)] whitespace-nowrap">
            {currentChannel
              ? currentChannel.type === 2 || currentChannel.type === ChannelType.DirectMessage
                ? `@ ${currentChannel.name}`
                : `# ${currentChannel.name}`
              : "NomNa Workspace"}
          </h2>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            className="p-1.5 rounded-md text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-active)] transition-colors cursor-pointer inline-flex items-center justify-center"
            title="Tìm kiếm"
          >
            <MagnifyingGlass size={17} />
          </button>
          <button
            type="button"
            className="p-1.5 rounded-md text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-active)] transition-colors cursor-pointer inline-flex items-center justify-center"
            title="Thành viên"
          >
            <Users size={17} />
          </button>
          <button
            type="button"
            className="p-1.5 rounded-md text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-active)] transition-colors cursor-pointer inline-flex items-center justify-center"
            title="Ghim"
          >
            <PushPin size={17} />
          </button>
        </div>
      </div>

      {/* Message Stream Area */}
      <div className="flex-1 min-h-0 px-5 pt-4 pb-1 overflow-y-auto flex flex-col gap-2.5" id="messageStream">
        <div className="mt-auto" />

        {/* Channel Welcome Header (Discord / Slack style) */}
        {currentChannel ? (
          <div className="pt-6 pb-4 px-2 select-none flex flex-col gap-2 border-b border-[var(--border-color)]/50 mb-1">
            <div className="w-12 h-12 rounded-2xl bg-[var(--accent-primary)] flex items-center justify-center text-white shadow-md shadow-[var(--accent-glow)]">
              <HandWaving size={26} weight="fill" className="text-white" />
            </div>
            <h3 className="text-xl font-black text-[var(--text-primary)] tracking-tight">
              {currentChannel.type === 2 || currentChannel.type === ChannelType.DirectMessage
                ? `Đoạn chat riêng với ${currentChannel.name}`
                : `Chào mừng bạn đến với kênh #${currentChannel.name}!`}
            </h3>
            <p className="text-xs text-[var(--text-muted)] leading-relaxed">
              {currentChannel.type === 2 || currentChannel.type === ChannelType.DirectMessage
                ? `Đây là sự bắt đầu của lịch sử trò chuyện trực tiếp giữa bạn và ${currentChannel.name}. Tin nhắn được bảo mật riêng tư.`
                : `Điểm bắt đầu cho cuộc trò chuyện. Nơi mọi người làm việc với nhau.`}
            </p>
          </div>
        ) : (
          <div className="p-8 text-center text-xs text-[var(--text-muted)]">
            Chọn một kênh để bắt đầu trò chuyện.
          </div>
        )}

        {messages.map((msg, index) => {
          const prevMsg = index > 0 ? messages[index - 1] : undefined;
          const showDateDivider = isDifferentDay(msg.createdAt, prevMsg?.createdAt);
          const isMe = currentUser && (msg.senderId === currentUser.id || msg.senderUsername === currentUser.username);
          const isEditingThis = editingMessageId === msg.id;
          const timeStr = new Date(msg.createdAt).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          });
          const avatarSrc = msg.senderAvatarUrl || (import.meta.env.VITE_DEFAULT_AVATAR as string) || "/default-avatar.png";

          return (
            <React.Fragment key={msg.id}>
              {showDateDivider && (
                <div className="relative my-3 flex items-center justify-center select-none">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-[var(--border-color)]" />
                  </div>
                  <span className="relative px-3 py-0.5 text-[0.72rem] font-semibold text-[var(--text-muted)] bg-[var(--bg-chat)] border border-[var(--border-color)] rounded-full shadow-2xs">
                    {formatDateDivider(msg.createdAt)}
                  </span>
                </div>
              )}

              <div
                className="group relative flex gap-3 px-3 py-2 rounded-xl transition-all duration-150 hover:bg-[var(--bg-surface)]"
              >
                  {/* Sender Avatar */}
                  <div
                    onClick={(e) => {
                      if (currentChannel?.type === ChannelType.DirectMessage) return;
                      e.stopPropagation();
                      const rect = e.currentTarget.getBoundingClientRect();
                      setSelectedProfile({
                        userId: msg.senderId,
                        displayName: msg.senderDisplayName,
                        username: msg.senderUsername || msg.senderDisplayName.toLowerCase().replace(/\s+/g, ""),
                        avatarUrl: msg.senderAvatarUrl || undefined,
                        targetRect: rect,
                      });
                    }}
                    title={currentChannel?.type !== ChannelType.DirectMessage ? "Xem thông tin thành viên" : undefined}
                    className={`w-9 h-9 rounded-xl shrink-0 overflow-hidden flex items-center justify-center font-bold text-[0.82rem] text-white shadow-sm border border-[var(--border-color)] ${
                      currentChannel?.type !== ChannelType.DirectMessage
                        ? "cursor-pointer hover:opacity-90 hover:scale-105 active:scale-95 transition-all ring-1 ring-transparent hover:ring-[var(--accent-primary)]/40"
                        : ""
                    }`}
                  >
                    <img
                      src={avatarSrc}
                      alt={msg.senderDisplayName}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        // Fallback initials if image fails
                        e.currentTarget.style.display = "none";
                      }}
                    />
                  </div>

                  <div className="flex-1 min-w-0 flex flex-col gap-0.75">
                    {/* Header: Name, Badge, Time, Edited Tag */}
                    <div className="flex items-baseline gap-2">
                      <span className="text-[0.9rem] font-semibold text-[var(--text-primary)]">
                        {msg.senderDisplayName}
                      </span>
                      <span className="bg-[var(--accent-soft)] text-[var(--accent-primary)] text-[0.65rem] px-1.5 py-0.25 rounded font-bold uppercase">
                        {isMe ? "YOU" : index === 0 ? "LEAD" : "MEMBER"}
                      </span>
                      <span className="text-[0.72rem] text-[var(--text-muted)]">{timeStr}</span>
                      {msg.isEdited && (
                        <span className="text-[0.7rem] text-[var(--text-muted)] italic select-none">
                          (đã chỉnh sửa)
                        </span>
                      )}
                    </div>

                    {/* Message Content or Inline Edit Box */}
                    {isEditingThis ? (
                      <div className="mt-1 flex flex-col gap-2 p-2 rounded-xl bg-[var(--bg-chat)] border border-[var(--accent-primary)] shadow-sm">
                        <textarea
                          value={editContent}
                          onChange={(e) => setEditContent(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && !e.shiftKey) {
                              e.preventDefault();
                              saveEdit();
                            } else if (e.key === "Escape") {
                              setEditingMessageId(null);
                            }
                          }}
                          rows={2}
                          autoFocus
                          className="bg-transparent border-none outline-none text-[0.92rem] text-[var(--text-primary)] resize-none w-full"
                        />
                        <div className="flex items-center justify-between text-xs pt-1 border-t border-[var(--border-color)]">
                          <span className="text-[11px] text-[var(--text-muted)]">
                            Enter để lưu · Escape để huỷ
                          </span>
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => setEditingMessageId(null)}
                              className="px-2.5 py-1 rounded text-xs text-[var(--text-secondary)] hover:bg-[var(--bg-surface)] cursor-pointer"
                            >
                              Huỷ
                            </button>
                            <button
                              type="button"
                              onClick={saveEdit}
                              disabled={isSavingEdit || !editContent.trim()}
                              className="px-3 py-1 rounded text-xs font-semibold bg-[var(--accent-primary)] text-white hover:bg-[var(--accent-hover)] cursor-pointer disabled:opacity-50"
                            >
                              {isSavingEdit ? "Đang lưu..." : "Lưu thay đổi"}
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-[0.92rem] leading-relaxed text-[var(--text-primary)] break-words whitespace-pre-wrap">
                        {renderMessageBody(msg.content)}
                      </div>
                    )}

                    {/* Reactions Row */}
                    {msg.reactions && msg.reactions.length > 0 && (
                      <div className="flex gap-1.5 mt-1.5 flex-wrap">
                        {msg.reactions.map((r) => (
                          <button
                            type="button"
                            key={r.emoji}
                            onClick={() => handleReactionClick(msg.id, r.emoji)}
                            className={`border rounded-md px-2 py-0.75 text-[0.78rem] inline-flex items-center gap-1.25 cursor-pointer transition-all duration-150 ${
                              r.hasReacted
                                ? "bg-[var(--accent-soft)] border-[var(--accent-primary)] text-[var(--accent-primary)] font-semibold"
                                : "bg-[var(--bg-surface)] border-[var(--border-color)] text-[var(--text-secondary)] hover:border-[var(--border-hover)] hover:bg-[var(--bg-surface-active)]"
                            }`}
                          >
                            <span>{r.emoji}</span>
                            <span>{r.count}</span>
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Thread Replies Button */}
                    {msg.replyCount && msg.replyCount > 0 ? (
                      <div
                        className="inline-flex items-center gap-1.5 mt-1.5 text-[0.8rem] text-[var(--accent-primary)] font-semibold cursor-pointer hover:underline"
                        onClick={() => (onOpenThread ? onOpenThread(msg) : onToggleThread())}
                      >
                        <ChatTeardropDots size={14} weight="fill" />
                        <span>{msg.replyCount} câu trả lời</span>
                      </div>
                    ) : null}
                  </div>

                  {/* Toolbar on Hover */}
                  <div className="absolute -top-3.5 right-3.5 bg-[var(--bg-chat)] border border-[var(--border-color)] rounded-xl p-0.5 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 group-hover:translate-y-0 translate-y-1 transition-all duration-150 shadow-md z-10">
                    {/* Quick Emojis */}
                    {QUICK_EMOJIS.slice(0, 3).map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => handleReactionClick(msg.id, emoji)}
                        className="p-1 px-1.5 text-sm hover:scale-125 transition-transform cursor-pointer rounded"
                        title={`Thả cảm xúc ${emoji}`}
                      >
                        {emoji}
                      </button>
                    ))}

                    <div className="w-px h-4 bg-[var(--border-color)] mx-0.5" />

                    {/* Reply to Thread */}
                    <button
                      type="button"
                      className="p-1.5 text-[var(--text-secondary)] hover:bg-[var(--bg-surface)] hover:text-[var(--text-primary)] rounded-lg text-xs transition-colors cursor-pointer"
                      title="Mở Thread trả lời"
                      onClick={() => (onOpenThread ? onOpenThread(msg) : onToggleThread())}
                    >
                      <ChatCenteredDots size={15} />
                    </button>

                    {/* Edit Message (Sender Only) */}
                    {isMe && (
                      <button
                        type="button"
                        className="p-1.5 text-[var(--text-secondary)] hover:bg-[var(--bg-surface)] hover:text-[var(--text-primary)] rounded-lg text-xs transition-colors cursor-pointer"
                        title="Chỉnh sửa tin nhắn"
                        onClick={() => startEdit(msg)}
                      >
                        <PencilSimple size={15} />
                      </button>
                    )}

                    {/* Delete Message (Sender Only) */}
                    {isMe && (
                      <button
                        type="button"
                        className="p-1.5 text-rose-500 hover:bg-rose-500/10 rounded-lg text-xs transition-colors cursor-pointer"
                        title="Xoá tin nhắn"
                        onClick={() => handleDelete(msg.id)}
                      >
                        <Trash size={15} />
                      </button>
                    )}
                  </div>
                </div>
              </React.Fragment>
            );
          })}
        <div ref={messagesEndRef} />
      </div>

      {/* Typing indicator & Upload Progress */}
      {(Boolean(typingUser) || uploading) && (
        <div className="px-5 py-1 text-xs text-[var(--text-muted)] flex items-center justify-between shrink-0 animate-in fade-in duration-150">
          <div className="flex items-center gap-2">
            {typingUser && (
              <>
                <div className="typing-wave">
                  <span />
                  <span />
                  <span />
                </div>
                <span>
                  <strong>{typingUser}</strong> đang soạn tin nhắn...
                </span>
              </>
            )}
          </div>

          {uploading && (
            <div className="flex items-center gap-1.5 text-[var(--accent-primary)] font-medium">
              <CircleNotch size={14} className="animate-spin" />
              <span>{uploadProgress || "Đang tải lên media S3 (tối đa 100MB)..."}</span>
            </div>
          )}
        </div>
      )}

      {/* Chat Input Box */}
      <div className="px-5 pb-2.5 pt-0.5 shrink-0">
        <div className="bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-md p-2.5 px-3.5 flex flex-col gap-2 transition-all duration-200 focus-within:border-[var(--accent-primary)] focus-within:bg-[var(--bg-chat)] focus-within:ring-1 focus-within:ring-[var(--accent-primary)] focus-within:shadow-[0_2px_12px_var(--accent-glow)]">
          <textarea
            ref={textareaRef}
            className="bg-transparent border-none outline-none text-[var(--text-primary)] placeholder:text-[var(--text-muted)] text-[0.92rem] resize-none w-full leading-normal disabled:opacity-50"
            rows={2}
            value={content}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            disabled={!currentChannel}
            placeholder={
              currentChannel
                ? `Nhắn tin tới #${currentChannel.name}... (Enter để gửi, hỗ trợ video & file 100MB)`
                : "Vui lòng chọn một kênh ở danh sách bên trái để nhắn tin..."
            }
          />

          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-1">
              {/* Hidden file picker supporting images, videos up to 100MB, and docs */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,video/mp4,video/webm,video/quicktime,video/x-matroska,application/pdf,.doc,.docx,.zip"
                className="hidden"
                onChange={handleFileUpload}
              />

              <button
                type="button"
                className="p-1.5 rounded-md text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-active)] transition-colors cursor-pointer inline-flex items-center justify-center"
                title="Đính kèm tệp tin / Video (Tối đa 100MB)"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
              >
                <Paperclip size={16} />
              </button>

              <button
                type="button"
                className="p-1.5 rounded-md text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-active)] transition-colors cursor-pointer inline-flex items-center justify-center"
                title="Thêm Emoji"
                onClick={() => setContent((prev) => prev + " 🔥 ")}
              >
                <Smiley size={16} />
              </button>

              <button
                type="button"
                className="p-1.5 rounded-md text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-active)] transition-colors cursor-pointer inline-flex items-center justify-center"
                title="Chèn mã code"
                onClick={() => setContent((prev) => prev + "\n```csharp\n// Nhập code\n```\n")}
              >
                <Code size={16} />
              </button>
            </div>

            <div className="flex items-center">
              <button
                type="button"
                className="bg-[var(--accent-primary)] text-white border-none px-3.5 py-1.5 rounded-lg text-[0.82rem] font-semibold cursor-pointer transition-all duration-150 flex items-center gap-1.5 shadow-[0_2px_8px_var(--accent-glow)] hover:bg-[var(--accent-hover)] hover:shadow-[0_4px_14px_var(--accent-glow)] disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
                onClick={handleSend}
                disabled={!content.trim() || sending || uploading}
              >
                <span>{sending ? "Đang gửi..." : "Gửi tin"}</span>
                <PaperPlaneRight size={14} weight="fill" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Smart User Profile Dropdown Popover */}
      {selectedProfile && (
        <div
          ref={profileCardRef}
          style={getProfilePositionStyle()}
          className="fixed z-50 w-[270px] bg-[var(--bg-chat)] border border-[var(--border-color)] rounded-2xl shadow-2xl p-4 flex flex-col gap-3.5 animate-in fade-in zoom-in-95 duration-150 backdrop-blur-md"
        >
          {/* Ambient Header Bar */}
          <div className="h-10 -mx-4 -mt-4 rounded-t-2xl bg-gradient-to-r from-[var(--accent-primary)]/20 via-[var(--accent-primary)]/10 to-transparent p-2.5 flex items-center">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--accent-primary)]">
              Thông tin thành viên
            </span>
          </div>

          {/* Avatar & Online status */}
          <div className="flex items-center gap-3 -mt-4">
            <div className="relative">
              <div className="w-13 h-13 rounded-2xl bg-[var(--bg-surface)] border-2 border-[var(--bg-chat)] overflow-hidden shadow-md flex items-center justify-center font-bold text-base text-white">
                <img
                  src={selectedProfile.avatarUrl || (import.meta.env.VITE_DEFAULT_AVATAR as string) || "/default-avatar.png"}
                  alt={selectedProfile.displayName}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                  }}
                />
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-[var(--bg-chat)] bg-emerald-500 shadow-xs" />
            </div>

            <div className="min-w-0 flex-1 pt-2">
              <h4 className="font-bold text-sm text-[var(--text-primary)] truncate">
                {selectedProfile.displayName}
              </h4>
              <p className="text-xs text-[var(--text-muted)] truncate">
                @{selectedProfile.username}
              </p>
            </div>
          </div>

          {/* Action / Identity Details */}
          <div className="pt-2 border-t border-[var(--border-color)]">
            {currentUser && (selectedProfile.userId === currentUser.id || selectedProfile.username === currentUser.username) ? (
              <div className="text-center py-1.5 text-xs text-[var(--text-muted)] font-medium bg-[var(--bg-surface)] rounded-xl">
                ✨ Đây là tài khoản của bạn
              </div>
            ) : (
              <button
                type="button"
                onClick={() => {
                  const target = { ...selectedProfile };
                  setSelectedProfile(null);
                  if (onStartDmWithUser) {
                    onStartDmWithUser({
                      id: target.userId,
                      displayName: target.displayName,
                      username: target.username,
                      avatarUrl: target.avatarUrl,
                    });
                  }
                }}
                className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-[var(--accent-primary)] hover:bg-[var(--accent-hover)] text-white text-xs font-bold transition-all shadow-md shadow-[var(--accent-glow)] cursor-pointer active:scale-98"
              >
                <ChatCenteredDots size={16} weight="bold" />
                <span>Gửi tin nhắn</span>
              </button>
            )}
          </div>
        </div>
      )}
    </section>
  );
};
