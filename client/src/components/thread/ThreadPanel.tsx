import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  X,
  PaperPlaneRight,
  Paperclip,
  Smiley,
  Code,
  ChatCenteredDots,
  PencilSimple,
  Trash,
  CircleNotch,
  FileText,
} from "@phosphor-icons/react";
import type { Message, MessageEdited, User, ReactionUpdate, DeletedMessage } from "../../types";
import { messageApi } from "../../services/messageApi";
import { fileApi } from "../../services/fileApi";
import { signalRService } from "../../services/signalr";

interface ThreadPanelProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User | null;
  parentMessage?: Message | null;
  width?: number;
  onExpandWidth?: () => void;
  onToggleReaction?: (messageId: string, emoji: string) => Promise<void>;
  onEditMessage?: (messageId: string, content: string) => Promise<void>;
  onDeleteMessage?: (messageId: string) => Promise<void>;
}

const QUICK_EMOJIS = ["❤️", "👍", "🔥", "🚀", "😂", "🎉"];

export const ThreadPanel: React.FC<ThreadPanelProps> = ({
  isOpen,
  onClose,
  currentUser,
  parentMessage,
  width = 480,
  onExpandWidth,
  onToggleReaction,
  onEditMessage,
  onDeleteMessage,
}) => {
  const [replyText, setReplyText] = useState("");
  const [showEmojiBar, setShowEmojiBar] = useState(false);
  const [replies, setReplies] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Inline edit state in thread
  const [editingReplyId, setEditingReplyId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Helper to extract code block from message content
  const parseMessageContent = useCallback((content: string) => {
    const codeMatch = content.match(/```(?:[a-zA-Z0-9_-]+)?\n?([\s\S]*?)```/);
    if (codeMatch) {
      const codeSnippet = codeMatch[1].trim();
      let text = content.replace(/```(?:[a-zA-Z0-9_-]+)?\n?([\s\S]*?)```/, "").trim();
      if (!text) text = "Đã chia sẻ đoạn mã nguồn:";
      return { text, codeSnippet };
    }
    return { text: content, codeSnippet: undefined };
  }, []);

  // Fetch thread replies & join SignalR thread room
  useEffect(() => {
    if (!isOpen || !parentMessage) {
      setReplies([]);
      return;
    }

    let isMounted = true;
    setLoading(true);

    // 1. Fetch from REST API
    messageApi
      .getThreadReplies(parentMessage.id)
      .then((res) => {
        if (!isMounted) return;
        setReplies(res.replies || []);
      })
      .catch((err) => {
        console.error("Failed to load thread replies:", err);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    // 2. Join SignalR thread group
    signalRService.joinThread(parentMessage.id);

    // 3. Listen for incoming realtime thread replies
    const handleRealtimeReply = (reply: Message) => {
      if (reply.threadId === parentMessage.id) {
        setReplies((prev) => {
          if (prev.some((item) => item.id === reply.id)) return prev;
          return [...prev, reply];
        });
      }
    };

    // 4. Listen for realtime edits in thread
    const handleMessageEdited = (edited: MessageEdited) => {
      setReplies((prev) =>
        prev.map((r) => (r.id === edited.id ? { ...r, ...edited } : r))
      );
    };

    // 5. Listen for realtime deletes in thread
    const handleMessageDeleted = (deleted: DeletedMessage) => {
      setReplies((prev) => prev.filter((r) => r.id !== deleted.messageId));
    };

    // 6. Listen for realtime reactions in thread
    const handleReactionUpdated = (update: ReactionUpdate) => {
      setReplies((prev) =>
        prev.map((r) =>
          r.id === update.messageId ? { ...r, reactions: update.reactions } : r
        )
      );
    };

    signalRService.onThreadReply(handleRealtimeReply);
    signalRService.onMessageEdited(handleMessageEdited);
    signalRService.onMessageDeleted(handleMessageDeleted);
    signalRService.onReactionUpdated(handleReactionUpdated);

    return () => {
      isMounted = false;
      signalRService.leaveThread(parentMessage.id);
      signalRService.offThreadReply(handleRealtimeReply);
      signalRService.offMessageEdited(handleMessageEdited);
      signalRService.offMessageDeleted(handleMessageDeleted);
      signalRService.offReactionUpdated(handleReactionUpdated);
    };
  }, [isOpen, parentMessage]);

  // Auto scroll to latest reply
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [replies.length, isOpen]);

  if (!isOpen) return null;

  const handleSendReply = async () => {
    if (!replyText.trim() || !parentMessage || sending) return;

    const content = replyText.trim();
    setSending(true);

    try {
      const res = await signalRService.sendThreadReply(parentMessage.id, content);
      if (!res) {
        const fallbackMsg = await messageApi.replyToThread(parentMessage.id, content);
        setReplies((prev) =>
          prev.some((r) => r.id === fallbackMsg.id) ? prev : [...prev, fallbackMsg]
        );
      }
      setReplyText("");
      setShowEmojiBar(false);
    } catch {
      try {
        const fallbackMsg = await messageApi.replyToThread(parentMessage.id, content);
        setReplies((prev) =>
          prev.some((r) => r.id === fallbackMsg.id) ? prev : [...prev, fallbackMsg]
        );
        setReplyText("");
        setShowEmojiBar(false);
      } catch {
        alert("Không thể gửi tin nhắn trong thread. Vui lòng thử lại.");
      }
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendReply();
    }
  };

  const toggleReaction = async (msgId: string, emoji: string) => {
    if (onToggleReaction) {
      await onToggleReaction(msgId, emoji);
    } else {
      await messageApi.toggleReaction(msgId, emoji);
    }
  };

  const handleEditReply = async (replyId: string) => {
    if (!editContent.trim()) return;
    try {
      if (onEditMessage) {
        await onEditMessage(replyId, editContent.trim());
      } else {
        await messageApi.editMessage(replyId, editContent.trim());
      }
      setEditingReplyId(null);
      setEditContent("");
    } catch {
      alert("Không thể chỉnh sửa phản hồi.");
    }
  };

  const handleDeleteReply = async (replyId: string) => {
    if (!window.confirm("Bạn có chắc chắn muốn xoá phản hồi này?")) return;
    try {
      if (onDeleteMessage) {
        await onDeleteMessage(replyId);
      } else {
        await messageApi.deleteMessage(replyId);
      }
    } catch {
      alert("Không thể xoá phản hồi.");
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !parentMessage) return;

    if (file.size > 100 * 1024 * 1024) {
      alert("Kích thước tệp vượt quá giới hạn 100MB.");
      return;
    }

    try {
      setUploading(true);
      const res = await fileApi.uploadFile(file, file.type.startsWith("video/") ? "videos" : "attachments");
      const isVideo = file.type.startsWith("video/") || /\.(mp4|webm|mov|mkv)$/i.test(res.fileName);
      const isImage = file.type.startsWith("image/") || /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(res.fileName);

      let payload = "";
      if (isImage) {
        payload = `![${res.fileName}](${res.url})`;
      } else if (isVideo) {
        payload = `[video:${res.fileName}](${res.url})`;
      } else {
        payload = `[file:${res.fileName}](${res.url})`;
      }

      await messageApi.replyToThread(parentMessage.id, payload);
    } catch (err: any) {
      alert(err.response?.data?.message || "Tải lên tệp thất bại.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // Render message content with video/image preview
  const renderMessageContent = (text: string) => {
    const videoMatch = text.match(/\[video:(.*?)\]\((.*?)\)/);
    if (videoMatch) {
      const fileName = videoMatch[1];
      const videoUrl = videoMatch[2];
      return (
        <div className="rounded-xl overflow-hidden border border-[var(--border-color)] bg-black/60 my-1">
          <video src={videoUrl} controls preload="metadata" className="w-full max-h-56 object-contain" />
          <div className="p-1.5 px-2 bg-[var(--bg-surface)] text-[11px] text-[var(--text-secondary)] truncate">
            {fileName}
          </div>
        </div>
      );
    }

    const imageMatch = text.match(/!\[(.*?)\]\((.*?)\)/);
    if (imageMatch) {
      const altText = imageMatch[1];
      const imageUrl = imageMatch[2];
      return (
        <div className="rounded-xl overflow-hidden border border-[var(--border-color)] my-1 max-w-xs">
          <img src={imageUrl} alt={altText} className="w-full max-h-52 object-cover cursor-pointer" onClick={() => window.open(imageUrl, "_blank")} />
        </div>
      );
    }

    const fileMatch = text.match(/\[file:(.*?)\]\((.*?)\)/);
    if (fileMatch) {
      const fileName = fileMatch[1];
      const fileUrl = fileMatch[2];
      return (
        <a href={fileUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 p-2 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-color)] text-xs text-[var(--accent-primary)] font-medium my-1">
          <FileText size={16} /> <span className="truncate">{fileName}</span>
        </a>
      );
    }

    const { text: cleanText, codeSnippet } = parseMessageContent(text);
    return (
      <>
        <div>{cleanText}</div>
        {codeSnippet && (
          <div className="bg-[var(--code-bg)] text-[var(--code-text)] text-[0.75rem] p-2.5 rounded-lg mt-2 font-mono overflow-x-auto leading-normal">
            {codeSnippet}
          </div>
        )}
      </>
    );
  };

  return (
    <aside
      id="threadSidebar"
      className="h-full min-h-0 shrink-0 bg-[var(--bg-sidebar)] border-l border-[var(--border-color)] flex flex-col overflow-hidden min-w-[360px] max-w-[720px]"
      style={{ width: `${width}px` }}
    >
      {/* 1. Thread Header */}
      <div className="h-[54px] border-b border-[var(--border-color)] px-4 flex items-center justify-between font-bold text-[0.92rem] shrink-0 bg-[var(--bg-sidebar)] select-none">
        <div className="flex items-center gap-2">
          <ChatCenteredDots size={17} weight="bold" className="text-[var(--accent-primary)]" />
          <span className="font-bold text-sm text-[var(--text-primary)]">Thread thảo luận</span>
          <span className="text-[0.68rem] font-semibold px-2 py-0.5 rounded-full bg-[var(--accent-soft)] text-[var(--accent-primary)]">
            {replies.length} phản hồi
          </span>
        </div>
        <button
          type="button"
          className="p-1.5 rounded-md text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-active)] transition-colors cursor-pointer inline-flex items-center justify-center"
          onClick={onClose}
          title="Đóng bảng thread (Esc)"
        >
          <X size={16} weight="bold" />
        </button>
      </div>

      {/* 2. Messages List */}
      <div className="flex-1 min-h-0 overflow-y-auto p-4 flex flex-col gap-3">
        {/* Parent Root Message Card */}
        {parentMessage ? (
          <div className="p-3.5 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-color)] flex flex-col gap-2 shadow-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <img
                  src={parentMessage.senderAvatarUrl || (import.meta.env.VITE_DEFAULT_AVATAR as string) || "/default-avatar.png"}
                  alt={parentMessage.senderDisplayName}
                  className="w-6 h-6 rounded-lg object-cover border border-[var(--border-color)]"
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                  }}
                />
                <span className="text-xs font-bold text-[var(--text-primary)]">
                  {parentMessage.senderDisplayName}
                </span>
                <span className="text-[0.62rem] font-bold uppercase px-1.5 py-0.2 rounded bg-[var(--accent-soft)] text-[var(--accent-primary)]">
                  ROOT
                </span>
              </div>
              <span className="text-[0.68rem] text-[var(--text-muted)]">
                {new Date(parentMessage.createdAt).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>
            <div className="text-xs text-[var(--text-primary)] leading-relaxed break-words whitespace-pre-wrap">
              {renderMessageContent(parentMessage.content)}
            </div>
          </div>
        ) : (
          <div className="p-4 text-center text-xs text-[var(--text-muted)] border border-dashed border-[var(--border-color)] rounded-xl">
            Chọn một tin nhắn trong kênh để mở thread thảo luận.
          </div>
        )}

        <div className="flex items-center gap-2 my-1">
          <div className="flex-1 h-px bg-[var(--border-color)]" />
          <span className="text-[0.68rem] font-bold uppercase tracking-wider text-[var(--text-muted)]">
            Các câu trả lời
          </span>
          <div className="flex-1 h-px bg-[var(--border-color)]" />
        </div>

        {/* Loading Spinner */}
        {loading && (
          <div className="flex items-center justify-center py-6 text-[var(--accent-primary)] gap-2">
            <CircleNotch size={20} className="animate-spin" />
            <span className="text-xs font-semibold">Đang tải phản hồi...</span>
          </div>
        )}

        {/* Empty replies state */}
        {!loading && replies.length === 0 && (
          <div className="py-8 text-center text-[var(--text-muted)]">
            <div className="text-2xl mb-1">💬</div>
            <p className="text-xs font-medium">Chưa có phản hồi nào trong thread này.</p>
            <p className="text-[0.72rem]">Hãy là người đầu tiên trả lời!</p>
          </div>
        )}

        {/* Replies Stream */}
        {replies.map((r) => {
          const isMe = currentUser && (r.senderId === currentUser.id || r.senderUsername === currentUser.username);
          const isEditingThis = editingReplyId === r.id;
          const timeStr = new Date(r.createdAt).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          });
          const avatarSrc = r.senderAvatarUrl || (import.meta.env.VITE_DEFAULT_AVATAR as string) || "/default-avatar.png";

          return (
            <div
              key={r.id}
              className="group relative p-2.5 rounded-xl hover:bg-[var(--bg-surface)] transition-all flex gap-3"
            >
              <img
                src={avatarSrc}
                alt={r.senderDisplayName}
                className="w-[30px] h-[30px] rounded-lg object-cover shrink-0 border border-[var(--border-color)]"
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                }}
              />
              <div className="flex-1 min-w-0 flex flex-col gap-0.5">
                <div className="flex items-baseline gap-2">
                  <span className="text-xs font-bold text-[var(--text-primary)]">
                    {r.senderDisplayName}
                  </span>
                  <span className="bg-[var(--accent-soft)] text-[var(--accent-primary)] text-[0.62rem] px-1.5 py-0.2 rounded font-bold uppercase">
                    {isMe ? "YOU" : "DEV"}
                  </span>
                  <span className="text-[0.68rem] text-[var(--text-muted)]">{timeStr}</span>
                  {r.isEdited && (
                    <span className="text-[0.65rem] text-[var(--text-muted)] italic select-none">
                      (đã sửa)
                    </span>
                  )}
                </div>

                {isEditingThis ? (
                  <div className="mt-1 flex flex-col gap-1.5 p-2 rounded-lg bg-[var(--bg-chat)] border border-[var(--accent-primary)]">
                    <textarea
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      rows={2}
                      className="bg-transparent border-none outline-none text-xs text-[var(--text-primary)] resize-none w-full"
                    />
                    <div className="flex items-center justify-end gap-1.5 pt-1">
                      <button
                        type="button"
                        onClick={() => setEditingReplyId(null)}
                        className="px-2 py-0.5 rounded text-[11px] text-[var(--text-secondary)] hover:bg-[var(--bg-surface)] cursor-pointer"
                      >
                        Huỷ
                      </button>
                      <button
                        type="button"
                        onClick={() => handleEditReply(r.id)}
                        className="px-2.5 py-0.5 rounded text-[11px] font-semibold bg-[var(--accent-primary)] text-white hover:bg-[var(--accent-hover)] cursor-pointer"
                      >
                        Lưu
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="text-xs text-[var(--text-primary)] mt-0.5 leading-relaxed break-words whitespace-pre-wrap">
                    {renderMessageContent(r.content)}
                  </div>
                )}

                {/* Realtime Reactions */}
                {r.reactions && r.reactions.length > 0 && (
                  <div className="flex gap-1.5 mt-2 flex-wrap">
                    {r.reactions.map((item) => (
                      <button
                        type="button"
                        key={item.emoji}
                        onClick={() => toggleReaction(r.id, item.emoji)}
                        className={`text-[0.72rem] px-2 py-0.5 rounded-md flex items-center gap-1 transition-all cursor-pointer ${
                          item.hasReacted
                            ? "bg-[var(--accent-soft)] border border-[var(--accent-primary)] text-[var(--accent-primary)] font-bold"
                            : "bg-[var(--bg-surface)] text-[var(--text-secondary)] border border-[var(--border-color)] hover:border-[var(--border-hover)]"
                        }`}
                      >
                        <span>{item.emoji}</span>
                        <span>{item.count}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Hover Floating Action Toolbar */}
              <div className="absolute -top-3 right-3 bg-[var(--bg-chat)] border border-[var(--border-color)] rounded-lg p-0.5 flex gap-0.5 opacity-0 group-hover:opacity-100 group-hover:translate-y-0 translate-y-1 transition-all duration-150 shadow-md z-10">
                {QUICK_EMOJIS.slice(0, 3).map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    className="p-1 px-1.5 text-xs hover:scale-125 transition-transform cursor-pointer rounded"
                    title={`Thả cảm xúc ${emoji}`}
                    onClick={() => toggleReaction(r.id, emoji)}
                  >
                    {emoji}
                  </button>
                ))}
                {isMe && (
                  <button
                    type="button"
                    className="p-1 px-1.5 text-[var(--text-secondary)] hover:bg-[var(--bg-surface)] hover:text-[var(--text-primary)] rounded text-xs transition-colors cursor-pointer"
                    title="Chỉnh sửa phản hồi"
                    onClick={() => {
                      setEditingReplyId(r.id);
                      setEditContent(r.content);
                    }}
                  >
                    <PencilSimple size={13} />
                  </button>
                )}
                {isMe && (
                  <button
                    type="button"
                    className="p-1 px-1.5 text-rose-500 hover:bg-rose-500/10 rounded text-xs transition-colors cursor-pointer"
                    title="Xoá phản hồi"
                    onClick={() => handleDeleteReply(r.id)}
                  >
                    <Trash size={13} />
                  </button>
                )}
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* 3. Rich Chat Input Area for Thread */}
      <div className="p-3 shrink-0">
        <div className="bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-xl p-2.5 px-3 flex flex-col gap-2 transition-all duration-200 focus-within:border-[var(--accent-primary)] focus-within:bg-[var(--bg-chat)] focus-within:ring-1 focus-within:ring-[var(--accent-primary)] focus-within:shadow-[0_4px_16px_var(--accent-glow)]">
          {showEmojiBar && (
            <div className="flex items-center gap-2 p-1.5 mb-1 bg-[var(--bg-chat)] border border-[var(--border-color)] rounded-xl shadow-md animate-in slide-in-from-bottom-2 duration-150">
              <span className="text-[0.72rem] font-bold text-[var(--text-muted)] px-1">Gợi ý:</span>
              {["👍", "❤️", "🔥", "🚀", "👀", "🎉", "💡", "😂"].map((emoji) => (
                <button
                  type="button"
                  key={emoji}
                  onClick={() => {
                    setReplyText((prev) => prev + emoji);
                    setShowEmojiBar(false);
                  }}
                  className="text-base p-1 hover:scale-125 transition-transform cursor-pointer"
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}

          <textarea
            className="bg-transparent border-none outline-none text-[var(--text-primary)] placeholder:text-[var(--text-muted)] text-[0.88rem] resize-none w-full leading-normal"
            rows={2}
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => {
              if (onExpandWidth) onExpandWidth();
            }}
            placeholder={
              parentMessage
                ? `Trả lời trong thread của @${parentMessage.senderDisplayName}... (Enter để gửi)`
                : "Chọn một tin nhắn để trả lời trong thread..."
            }
            disabled={!parentMessage}
          />

          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-1">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,video/mp4,video/webm,video/quicktime,video/x-matroska,application/pdf"
                className="hidden"
                onChange={handleFileUpload}
              />
              <button
                type="button"
                className="p-1.5 rounded-md text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-active)] transition-colors cursor-pointer inline-flex items-center justify-center"
                title="Đính kèm tệp / video trong thread"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
              >
                <Paperclip size={15} />
              </button>
              <button
                type="button"
                className={`p-1.5 rounded-md transition-colors cursor-pointer inline-flex items-center justify-center ${
                  showEmojiBar
                    ? "text-[var(--accent-primary)] bg-[var(--accent-soft)]"
                    : "text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-active)]"
                }`}
                title="Thêm Emoji"
                onClick={() => setShowEmojiBar(!showEmojiBar)}
              >
                <Smiley size={15} />
              </button>
              <button
                type="button"
                className="p-1.5 rounded-md text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-active)] transition-colors cursor-pointer inline-flex items-center justify-center"
                title="Chèn mã code"
                onClick={() => setReplyText((prev) => prev + "\n```csharp\n// Nhập code\n```\n")}
              >
                <Code size={15} />
              </button>
            </div>

            <div className="flex items-center">
              <button
                type="button"
                className="bg-[var(--accent-primary)] text-white border-none px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all duration-150 flex items-center gap-1.5 shadow-[0_2px_8px_var(--accent-glow)] hover:bg-[var(--accent-hover)] hover:shadow-[0_4px_14px_var(--accent-glow)] disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
                onClick={handleSendReply}
                disabled={!replyText.trim() || !parentMessage || sending || uploading}
              >
                {sending || uploading ? (
                  <CircleNotch size={13} className="animate-spin" />
                ) : (
                  <PaperPlaneRight size={13} weight="fill" />
                )}
                <span>Trả lời</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
};
