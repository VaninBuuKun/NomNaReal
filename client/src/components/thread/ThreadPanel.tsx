import React, { useState, useRef, useEffect } from "react";
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
  Images,
  Plus,
  Play,
  FileText,
} from "@phosphor-icons/react";
import type { Message, MessageEdited, User, ReactionUpdate, DeletedMessage } from "../../types";
import { messageApi } from "../../services/messageApi";
import { fileApi } from "../../services/fileApi";
import { signalRService } from "../../services/signalr";
import { MessageContent } from "../chat/MessageContent";
import { DeleteMessageModal } from "../chat/DeleteMessageModal";
import { formatMessageTime } from "../../utils/formatDate";

interface PendingAttachment {
  id: string;
  file: File;
  previewUrl: string;
  type: "image" | "video" | "file";
  name: string;
  size: number;
  status: "uploading" | "ready" | "error";
  uploadedUrl?: string;
}

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
  const [pendingAttachments, setPendingAttachments] = useState<PendingAttachment[]>([]);

  // Inline edit state in thread
  const [editingReplyId, setEditingReplyId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");

  // Delete modal state
  const [deleteModalState, setDeleteModalState] = useState<{
    isOpen: boolean;
    messageId: string | null;
    preview: string;
  }>({
    isOpen: false,
    messageId: null,
    preview: "",
  });
  const [isDeletingReply, setIsDeletingReply] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handleRemoveAttachment = (id: string) => {
    setPendingAttachments((prev) => {
      const target = prev.find((a) => a.id === id);
      if (target?.previewUrl) {
        URL.revokeObjectURL(target.previewUrl);
      }
      return prev.filter((a) => a.id !== id);
    });
  };

  const handleSendReply = async () => {
    const text = replyText.trim();
    const hasAttachments = pendingAttachments.length > 0;
    if ((!text && !hasAttachments) || !parentMessage || sending) return;

    const stillUploading = pendingAttachments.some((a) => a.status === "uploading");
    if (stillUploading) {
      alert("Đang tải tệp đính kèm lên, vui lòng chờ trong giây lát...");
      return;
    }

    let payload = text;
    const readyAttachments = pendingAttachments.filter((a) => a.status === "ready" && a.uploadedUrl);

    for (const att of readyAttachments) {
      if (att.type === "image") {
        payload = `${payload ? payload + "\n" : ""}![${att.name}](${att.uploadedUrl})`;
      } else if (att.type === "video") {
        payload = `${payload ? payload + "\n" : ""}[video:${att.name}](${att.uploadedUrl})`;
      } else {
        payload = `${payload ? payload + "\n" : ""}[file:${att.name}](${att.uploadedUrl})`;
      }
    }

    if (!payload.trim()) return;

    setSending(true);

    try {
      const res = await signalRService.sendThreadReply(parentMessage.id, payload);
      if (!res) {
        const fallbackMsg = await messageApi.replyToThread(parentMessage.id, payload);
        setReplies((prev) =>
          prev.some((r) => r.id === fallbackMsg.id) ? prev : [...prev, fallbackMsg]
        );
      }
      setReplyText("");
      pendingAttachments.forEach((a) => {
        if (a.previewUrl) URL.revokeObjectURL(a.previewUrl);
      });
      setPendingAttachments([]);
      setShowEmojiBar(false);
    } catch {
      try {
        const fallbackMsg = await messageApi.replyToThread(parentMessage.id, payload);
        setReplies((prev) =>
          prev.some((r) => r.id === fallbackMsg.id) ? prev : [...prev, fallbackMsg]
        );
        setReplyText("");
        pendingAttachments.forEach((a) => {
          if (a.previewUrl) URL.revokeObjectURL(a.previewUrl);
        });
        setPendingAttachments([]);
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

  const handleDeleteClick = (reply: Message) => {
    const skip = localStorage.getItem("nomna_skip_delete_confirm") === "true";
    if (skip) {
      performDelete(reply.id);
    } else {
      setDeleteModalState({
        isOpen: true,
        messageId: reply.id,
        preview: reply.content,
      });
    }
  };

  const performDelete = async (replyId: string) => {
    try {
      setIsDeletingReply(true);
      if (onDeleteMessage) {
        await onDeleteMessage(replyId);
      } else {
        await messageApi.deleteMessage(replyId);
      }
    } catch {
      alert("Không thể xoá phản hồi.");
    } finally {
      setIsDeletingReply(false);
    }
  };

  const handleConfirmDelete = async (dontAskAgain: boolean) => {
    if (dontAskAgain) {
      localStorage.setItem("nomna_skip_delete_confirm", "true");
    }
    if (deleteModalState.messageId) {
      await performDelete(deleteModalState.messageId);
    }
    setDeleteModalState({ isOpen: false, messageId: null, preview: "" });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !parentMessage) return;

    const fileList = Array.from(files);
    const MAX_SIZE = 100 * 1024 * 1024; // 100MB limit

    const newAttachments: PendingAttachment[] = [];

    for (const file of fileList) {
      if (file.size > MAX_SIZE) {
        alert(`Tệp "${file.name}" vượt quá giới hạn 100MB.`);
        continue;
      }

      const type: "image" | "video" | "file" = file.type.startsWith("image/")
        ? "image"
        : file.type.startsWith("video/")
        ? "video"
        : "file";

      const previewUrl = type === "image" || type === "video" ? URL.createObjectURL(file) : "";
      const attId = `att-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

      newAttachments.push({
        id: attId,
        file,
        previewUrl,
        type,
        name: file.name,
        size: file.size,
        status: "uploading",
      });
    }

    if (newAttachments.length === 0) return;

    setPendingAttachments((prev) => [...prev, ...newAttachments]);

    newAttachments.forEach(async (att) => {
      try {
        const folder = att.type === "video" ? "videos" : att.type === "image" ? "uploads" : "attachments";
        const res = await fileApi.uploadFile(att.file, folder);
        setPendingAttachments((prev) =>
          prev.map((item) => (item.id === att.id ? { ...item, status: "ready", uploadedUrl: res.url } : item))
        );
      } catch (err) {
        console.error("Upload error for file:", att.name, err);
        setPendingAttachments((prev) =>
          prev.map((item) => (item.id === att.id ? { ...item, status: "error" } : item))
        );
      }
    });

    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Render message content with markdown, code blocks, and media preview
  const renderMessageContent = (text: string) => {
    return <MessageContent content={text} />;
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
        {/* Parent Root Message - Unboxed, clean message layout with larger typography */}
        {parentMessage ? (
          <div className="px-1 py-2 flex gap-3 select-text border-b border-[var(--border-color)]/60 pb-3">
            <img
              src={parentMessage.senderAvatarUrl || (import.meta.env.VITE_DEFAULT_AVATAR as string) || "/default-avatar.png"}
              alt={parentMessage.senderDisplayName}
              className="w-9 h-9 rounded-xl object-cover shrink-0 border border-[var(--border-color)] shadow-2xs"
              onError={(e) => {
                e.currentTarget.src = "/default-avatar.png";
              }}
            />
            <div className="flex-1 min-w-0 flex flex-col gap-1">
              <div className="flex items-baseline gap-2">
                <span className="text-[0.92rem] font-bold text-[var(--text-primary)]">
                  {parentMessage.senderDisplayName}
                </span>
                <span className="text-[0.72rem] text-[var(--text-muted)]">
                  {formatMessageTime(parentMessage.createdAt)}
                </span>
              </div>
              <div className="text-[0.95rem] font-medium text-[var(--text-primary)] leading-relaxed break-words whitespace-pre-wrap">
                {renderMessageContent(parentMessage.content)}
              </div>
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
          <div className="flex flex-col items-center justify-center py-8 text-center text-[var(--text-muted)]">
            <div className="mb-2 rounded-full bg-[var(--bg-muted)] p-3">
              <Images size={28} weight="regular" />
            </div>
            <p className="text-xs font-medium">Chưa có phản hồi nào trong thread này.</p>
            <p className="text-[0.72rem]">Hãy là người đầu tiên trả lời!</p>
          </div>
        )}

        {/* Replies Stream */}
        {replies.map((r) => {
          const isMe = currentUser && (r.senderId === currentUser.id || r.senderUsername === currentUser.username);
          const isEditingThis = editingReplyId === r.id;
          const timeStr = formatMessageTime(r.createdAt);
          const avatarSrc = r.senderAvatarUrl || (import.meta.env.VITE_DEFAULT_AVATAR as string) || "/default-avatar.png";

          return (
            <div
              key={r.id}
              className="group relative p-2.5 rounded-md hover:bg-[var(--bg-surface)] transition-all flex gap-3"
            >
              <img
                src={avatarSrc}
                alt={r.senderDisplayName}
                className="w-8 h-8 rounded-xl object-cover shrink-0 border border-[var(--border-color)]"
                onError={(e) => {
                  e.currentTarget.src = "/default-avatar.png";
                }}
              />
              <div className="flex-1 min-w-0 flex flex-col gap-0.5">
                <div className="flex items-baseline gap-2">
                  <span className="text-xs font-bold text-[var(--text-primary)]">
                    {r.senderDisplayName}
                  </span>
                  {isMe && (
                    <span className="bg-[var(--accent-soft)] text-[var(--accent-primary)] text-[0.62rem] px-1.5 py-0.2 rounded font-bold uppercase">
                      YOU
                    </span>
                  )}
                  <span className="text-[0.68rem] text-[var(--text-muted)]">{timeStr}</span>
                  {r.isEdited && (
                    <span className="text-[0.65rem] text-[var(--text-muted)] italic select-none">
                      (đã sửa)
                    </span>
                  )}
                </div>

                {isEditingThis ? (
                  <div className="mt-1 flex flex-col gap-1.5 p-2.5 rounded-md bg-[var(--bg-chat)] border border-[var(--accent-primary)] shadow-xs">
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
                        className={`text-[0.72rem] px-2 py-0.5 rounded-md flex items-center gap-1 transition-all cursor-pointer ${item.hasReacted
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
                    onClick={() => handleDeleteClick(r)}
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
        <div className="bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-md p-2.5 px-3 flex flex-col gap-2 transition-all duration-200 focus-within:border-[var(--accent-primary)] focus-within:bg-[var(--bg-chat)] focus-within:ring-1 focus-within:ring-[var(--accent-primary)] focus-within:shadow-[0_4px_16px_var(--accent-glow)]">
          {/* Pending Attachments Preview Tray */}
          {pendingAttachments.length > 0 && (
            <div className="flex items-center gap-2 overflow-x-auto py-1 border-b border-[var(--border-color)]/70 pb-2 mb-1 scrollbar-thin">
              {pendingAttachments.map((att) => (
                <div
                  key={att.id}
                  className="relative group shrink-0 flex items-center gap-1.5 p-1 rounded-md border border-[var(--border-color)] bg-[var(--bg-chat)] shadow-2xs"
                >
                  {att.type === 'image' ? (
                    <div className="relative w-12 h-12 rounded overflow-hidden bg-black/10">
                      <img
                        src={att.previewUrl}
                        alt={att.name}
                        className="w-full h-full object-cover"
                      />
                      {att.status === 'uploading' && (
                        <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                          <CircleNotch size={16} className="animate-spin text-white" />
                        </div>
                      )}
                    </div>
                  ) : att.type === 'video' ? (
                    <div className="relative w-12 h-12 rounded overflow-hidden bg-zinc-900 flex flex-col items-center justify-center text-white">
                      <Play size={16} weight="fill" className="text-[var(--accent-primary)]" />
                      {att.status === 'uploading' && (
                        <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                          <CircleNotch size={16} className="animate-spin text-white" />
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 px-1.5 py-0.5 max-w-[140px]">
                      <FileText size={18} className="text-[var(--accent-primary)] shrink-0" />
                      <span className="text-[11px] text-[var(--text-primary)] truncate font-medium">
                        {att.name}
                      </span>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => handleRemoveAttachment(att.id)}
                    className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-[var(--bg-chat)] border border-[var(--border-color)] text-[var(--text-secondary)] hover:text-white hover:bg-rose-500 hover:border-rose-500 flex items-center justify-center transition-all cursor-pointer shadow-xs"
                    title="Xóa tệp đính kèm"
                  >
                    <X size={10} weight="bold" />
                  </button>
                </div>
              ))}

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-12 h-12 rounded border-2 border-dashed border-[var(--border-color)] hover:border-[var(--accent-primary)] hover:bg-[var(--accent-soft)]/30 text-[var(--text-muted)] hover:text-[var(--accent-primary)] flex flex-col items-center justify-center transition-all shrink-0 cursor-pointer"
                title="Thêm tệp khác"
              >
                <Plus size={16} />
              </button>
            </div>
          )}

          {showEmojiBar && (
            <div className="flex items-center gap-2 p-1.5 mb-1 bg-[var(--bg-chat)] border border-[var(--border-color)] rounded-md shadow-md animate-in slide-in-from-bottom-2 duration-150">
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
                multiple
                accept="image/*,video/mp4,video/webm,video/quicktime,video/x-matroska,application/pdf"
                className="hidden"
                onChange={handleFileUpload}
              />
              <button
                type="button"
                className="p-1.5 rounded-md text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-active)] transition-colors cursor-pointer inline-flex items-center justify-center"
                title="Đính kèm tệp / video trong thread"
                onClick={() => fileInputRef.current?.click()}
              >
                <Paperclip size={15} />
              </button>
              <button
                type="button"
                className={`p-1.5 rounded-md transition-colors cursor-pointer inline-flex items-center justify-center ${showEmojiBar
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
                disabled={(!replyText.trim() && pendingAttachments.length === 0) || !parentMessage || sending || pendingAttachments.some((a) => a.status === 'uploading')}
              >
                {sending || pendingAttachments.some((a) => a.status === 'uploading') ? (
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

      {/* Delete Confirmation Modal for Thread */}
      <DeleteMessageModal
        isOpen={deleteModalState.isOpen}
        onClose={() => setDeleteModalState({ isOpen: false, messageId: null, preview: "" })}
        onConfirm={handleConfirmDelete}
        messagePreview={deleteModalState.preview}
        isDeleting={isDeletingReply}
      />
    </aside>
  );
};
