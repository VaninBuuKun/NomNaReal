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
} from "@phosphor-icons/react";
import type { Channel, Message, User } from "../../types";
import { messageApi } from "../../services/messageApi";
import { fileApi } from "../../services/fileApi";
import { EmptyChatState } from "./EmptyChatState";

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
}

const QUICK_EMOJIS = ["❤️", "👍", "🔥", "🚀", "😂", "🎉"];

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
}) => {
  const [content, setContent] = useState("");
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);

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
            {currentChannel ? `# ${currentChannel.name}` : "NomNa Workspace"}
          </h2>
          {currentChannel?.topic ? (
            <span className="text-[0.8rem] text-[var(--text-muted)] border-l border-[var(--border-color)] pl-2.5 whitespace-nowrap overflow-hidden text-ellipsis">
              {currentChannel.topic}
            </span>
          ) : !currentChannel ? (
            <span className="text-[0.8rem] text-[var(--text-muted)] border-l border-[var(--border-color)] pl-2.5 whitespace-nowrap overflow-hidden text-ellipsis">
              Không gian trao đổi và làm việc nhóm
            </span>
          ) : null}
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            className="p-1.5 rounded-md text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-active)] transition-colors cursor-pointer inline-flex items-center justify-center"
            title="Tìm kiếm trong kênh"
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
      <div className="flex-1 min-h-0 p-5 overflow-y-auto flex flex-col gap-3" id="messageStream">
        {messages.length === 0 ? (
          <EmptyChatState
            currentChannel={currentChannel}
            onSelectPrompt={(promptText) => {
              setContent(promptText);
              textareaRef.current?.focus();
            }}
          />
        ) : (
          <>
            <div className="mt-auto" />
            {messages.map((msg, index) => {
              const isMe = currentUser && (msg.senderId === currentUser.id || msg.senderUsername === currentUser.username);
              const isEditingThis = editingMessageId === msg.id;
              const timeStr = new Date(msg.createdAt).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              });
              const avatarSrc = msg.senderAvatarUrl || (import.meta.env.VITE_DEFAULT_AVATAR as string) || "/default-avatar.png";

              return (
                <div
                  key={msg.id}
                  className="group relative flex gap-3 px-3 py-2 rounded-xl transition-all duration-150 hover:bg-[var(--bg-surface)]"
                >
                  {/* Sender Avatar */}
                  <div className="w-9 h-9 rounded-xl shrink-0 overflow-hidden flex items-center justify-center font-bold text-[0.82rem] text-white shadow-sm border border-[var(--border-color)]">
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
              );
            })}
          </>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Typing indicator & Upload Progress */}
      <div className="px-5 text-xs text-[var(--text-muted)] flex items-center justify-between shrink-0 min-h-6">
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

      {/* Chat Input Box */}
      <div className="px-5 pb-3 shrink-0">
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
    </section>
  );
};
