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
  CircleNotch,
  HandWaving,
  X,
  Plus,
  Play,
  FileText,
} from "@phosphor-icons/react";
import { ChannelType, type Channel, type Message, type User } from "../../types";
import { messageApi } from "../../services/messageApi";
import { fileApi } from "../../services/fileApi";
import { formatDateDivider, isDifferentDay } from "../../utils/formatDate";
import { ChatAreaSkeleton } from "./ChatAreaSkeleton";
import { MessageContent } from "./MessageContent";
import { EmojiPickerPopover } from "./EmojiPickerPopover";
import { GifPicker } from "./GifPicker";
import { DeleteMessageModal } from "./DeleteMessageModal";
import { ImageGalleryGrid } from "./ImageGalleryGrid";
import { useChatStore, useUiStore } from "../../stores";

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

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface ChatAreaProps {
  currentChannel: Channel | null;
  messages: Message[];
  currentUser: User | null;
  onSendMessage: (
    content: string,
    attachments?: Array<{ url: string; fileName: string; fileSize: number; contentType: string; type: "image" | "video" | "file" }>
  ) => Promise<void>;
  onEditMessage?: (messageId: string, content: string) => Promise<void>;
  onDeleteMessage?: (messageId: string) => Promise<void>;
  onToggleReaction?: (messageId: string, emoji: string) => Promise<void>;
  onStartTyping: () => void;
  onStopTyping: () => void;
  typingUser: string | null;
  onToggleThread: () => void;
  onOpenThread?: (message: Message) => void;
  onStartDmWithUser?: (user: { id: string; displayName: string; username: string; avatarUrl?: string }) => void;
  hasMoreMessages?: boolean;
  isLoadingMore?: boolean;
  isLoadingMessages?: boolean;
  onLoadMoreMessages?: () => Promise<void>;
  workspaceMembers?: { id: string; displayName?: string; username?: string; role?: string }[];
  isMemberListOpen?: boolean;
  onToggleMemberList?: () => void;
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
  hasMoreMessages = false,
  isLoadingMore = false,
  isLoadingMessages = false,
  onLoadMoreMessages,
  workspaceMembers = [],
  isMemberListOpen = false,
  onToggleMemberList,
}) => {
  const drafts = useChatStore((state) => state.drafts);
  const setDraft = useChatStore((state) => state.setDraft);
  const clearDraft = useChatStore((state) => state.clearDraft);

  const isSearchOpen = useUiStore((state) => state.isSearchOpen);
  const toggleSearch = useUiStore((state) => state.toggleSearch);

  const [content, setContent] = useState("");
  const [sending, setSending] = useState(false);
  const [pendingAttachments, setPendingAttachments] = useState<PendingAttachment[]>([]);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showGifPicker, setShowGifPicker] = useState(false);

  // Sync draft when active channel changes
  useEffect(() => {
    if (currentChannel?.id) {
      setContent(drafts[currentChannel.id] || "");
    } else {
      setContent("");
    }
    setPendingAttachments([]);
  }, [currentChannel?.id]);

  // Delete message modal state
  const [deleteModalState, setDeleteModalState] = useState<{
    isOpen: boolean;
    messageId: string | null;
    preview: string;
  }>({
    isOpen: false,
    messageId: null,
    preview: "",
  });
  const [isDeletingMessage, setIsDeletingMessage] = useState(false);

  // Skeleton threshold delay (150ms) to prevent UI flicker on fast responses
  const [showSkeleton, setShowSkeleton] = useState(false);

  useEffect(() => {
    let timer: any;
    if (isLoadingMessages) {
      timer = setTimeout(() => {
        setShowSkeleton(true);
      }, 150);
    } else {
      setShowSkeleton(false);
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [isLoadingMessages]);

  // Smart user profile dropdown state
  const [selectedProfile, setSelectedProfile] = useState<SelectedUserProfile | null>(null);
  const profileCardRef = useRef<HTMLDivElement>(null);

  // Inline editing state
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messageStreamRef = useRef<HTMLDivElement>(null);
  const previousScrollHeightRef = useRef<number>(0);
  const isPrependingRef = useRef<boolean>(false);
  const lastChannelIdRef = useRef<string | null>(null);
  const isSwitchingChannelRef = useRef<boolean>(false);
  const prevMessagesLengthRef = useRef<number>(0);

  const typingTimeoutRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Detect channel change and trigger instant positioning
  useEffect(() => {
    if (lastChannelIdRef.current !== currentChannel?.id) {
      lastChannelIdRef.current = currentChannel?.id || null;
      isSwitchingChannelRef.current = true;
      if (messageStreamRef.current) {
        messageStreamRef.current.scrollTop = messageStreamRef.current.scrollHeight;
      }
    }
  }, [currentChannel?.id]);

  // Auto scroll: Instant on channel change, smooth on new incoming message, maintain on prepending
  useEffect(() => {
    if (isPrependingRef.current && messageStreamRef.current) {
      const newScrollHeight = messageStreamRef.current.scrollHeight;
      messageStreamRef.current.scrollTop = newScrollHeight - previousScrollHeightRef.current;
      isPrependingRef.current = false;
      prevMessagesLengthRef.current = messages.length;
      return;
    }

    if (!messageStreamRef.current) return;

    if (isSwitchingChannelRef.current) {
      // Switched channels: INSTANT jump to bottom (no smooth animation from top to bottom)
      messageStreamRef.current.scrollTop = messageStreamRef.current.scrollHeight;
      isSwitchingChannelRef.current = false;
    } else if (messages.length > prevMessagesLengthRef.current) {
      // New message arrived/sent: smooth scroll down
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }

    prevMessagesLengthRef.current = messages.length;
  }, [messages]);

  const handleStreamScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const container = e.currentTarget;
    if (container.scrollTop < 50 && hasMoreMessages && !isLoadingMore && onLoadMoreMessages) {
      previousScrollHeightRef.current = container.scrollHeight;
      isPrependingRef.current = true;
      onLoadMoreMessages();
    }
  };

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
    const val = e.target.value;
    setContent(val);
    if (currentChannel?.id) {
      if (val.trim()) {
        setDraft(currentChannel.id, val);
      } else {
        clearDraft(currentChannel.id);
      }
    }
    onStartTyping();

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    typingTimeoutRef.current = setTimeout(() => {
      onStopTyping();
    }, 2000);
  };

  const handleRemoveAttachment = (id: string) => {
    setPendingAttachments((prev) => {
      const target = prev.find((a) => a.id === id);
      if (target?.previewUrl) {
        URL.revokeObjectURL(target.previewUrl);
      }
      return prev.filter((a) => a.id !== id);
    });
  };

  const handleSend = async () => {
    const text = content.trim();
    const hasAttachments = pendingAttachments.length > 0;
    if ((!text && !hasAttachments) || sending) return;

    // Check if any attachment is still uploading
    const stillUploading = pendingAttachments.some((a) => a.status === "uploading");
    if (stillUploading) {
      alert("Đang tải tệp đính kèm lên, vui lòng chờ trong giây lát...");
      return;
    }

    const readyAttachments = pendingAttachments
      .filter((a) => a.status === "ready" && a.uploadedUrl)
      .map((a) => ({
        url: a.uploadedUrl!,
        fileName: a.name,
        fileSize: a.size,
        contentType: a.file.type || "application/octet-stream",
        type: a.type as "image" | "video" | "file",
      }));

    if (!text && readyAttachments.length === 0) return;

    setSending(true);
    try {
      await onSendMessage(text, readyAttachments);
      setContent("");
      if (currentChannel?.id) {
        clearDraft(currentChannel.id);
      }
      pendingAttachments.forEach((a) => {
        if (a.previewUrl) URL.revokeObjectURL(a.previewUrl);
      });
      setPendingAttachments([]);
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

  // Staged File & Multiple Media Upload Handler (Does NOT auto-send)
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

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

    // Start background upload for each attachment
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

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
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

  // Delete message triggering
  const handleDeleteClick = (msg: Message) => {
    const skip = localStorage.getItem("nomna_skip_delete_confirm") === "true";
    if (skip) {
      performDelete(msg.id);
    } else {
      setDeleteModalState({
        isOpen: true,
        messageId: msg.id,
        preview: msg.content,
      });
    }
  };

  const performDelete = async (msgId: string) => {
    try {
      setIsDeletingMessage(true);
      if (onDeleteMessage) {
        await onDeleteMessage(msgId);
      } else {
        await messageApi.deleteMessage(msgId);
      }
    } catch (err) {
      console.error("Failed to delete message:", err);
      alert("Không thể xoá tin nhắn. Vui lòng thử lại.");
    } finally {
      setIsDeletingMessage(false);
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

  // Toggle reaction
  const handleReactionClick = (msgId: string, emoji: string) => {
    if (onToggleReaction) {
      onToggleReaction(msgId, emoji);
    } else {
      messageApi.toggleReaction(msgId, emoji);
    }
  };

  // Insert emoji at cursor without unwanted spaces
  const handleInsertEmoji = (emoji: string) => {
    if (textareaRef.current) {
      const start = textareaRef.current.selectionStart || 0;
      const end = textareaRef.current.selectionEnd || 0;
      const next = content.substring(0, start) + emoji + content.substring(end);
      setContent(next);
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.focus();
          textareaRef.current.selectionStart = textareaRef.current.selectionEnd = start + emoji.length;
        }
      }, 0);
    } else {
      setContent((prev) => prev + emoji);
    }
  };

  // Send selected GIF
  const handleSelectGif = (url: string, title: string) => {
    const gifMarkdown = `![GIF: ${title}](${url})`;
    onSendMessage(gifMarkdown);
  };

  // Render message content with markdown, code blocks, GIF/images, and video player
  const renderMessageBody = (text: string) => {
    return <MessageContent content={text} />;
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
            onClick={toggleSearch}
            className={`p-1.5 rounded-md transition-colors cursor-pointer inline-flex items-center justify-center ${
              isSearchOpen
                ? "text-[var(--accent-primary)] bg-[var(--accent-soft)]"
                : "text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-active)]"
            }`}
            title={isSearchOpen ? "Đóng tìm kiếm" : "Tìm kiếm tin nhắn"}
          >
            <MagnifyingGlass size={17} weight={isSearchOpen ? "bold" : "regular"} />
          </button>
          <button
            type="button"
            onClick={onToggleMemberList}
            className={`p-1.5 rounded-md transition-colors cursor-pointer inline-flex items-center justify-center ${
              isMemberListOpen
                ? "text-[var(--accent-primary)] bg-[var(--accent-soft)]"
                : "text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-active)]"
            }`}
            title={isMemberListOpen ? "Ẩn danh sách thành viên" : "Hiển thị danh sách thành viên"}
          >
            <Users size={17} weight={isMemberListOpen ? "bold" : "regular"} />
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

      {/* Message Stream Area or Skeleton */}
      {showSkeleton ? (
        <ChatAreaSkeleton />
      ) : (
        <div
          ref={messageStreamRef}
          onScroll={handleStreamScroll}
          className="flex-1 min-h-0 px-5 pt-4 pb-1 overflow-y-auto flex flex-col gap-2.5"
          id="messageStream"
        >
        <div className="mt-auto" />

        {/* Loading more spinner or load more trigger */}
        {isLoadingMore && (
          <div className="py-2.5 flex items-center justify-center gap-2 text-xs text-[var(--text-muted)] select-none">
            <CircleNotch size={16} className="animate-spin text-[var(--accent-primary)]" />
            <span>Đang tải tin nhắn cũ hơn...</span>
          </div>
        )}

        {!isLoadingMore && hasMoreMessages && (
          <div className="py-2 text-center select-none">
            <button
              type="button"
              onClick={() => {
                if (messageStreamRef.current && onLoadMoreMessages) {
                  previousScrollHeightRef.current = messageStreamRef.current.scrollHeight;
                  isPrependingRef.current = true;
                  onLoadMoreMessages();
                }
              }}
              className="text-xs text-[var(--accent-primary)] hover:underline font-medium cursor-pointer px-3 py-1 rounded-md hover:bg-[var(--accent-soft)] transition-colors"
            >
              ↑ Tải thêm tin nhắn cũ
            </button>
          </div>
        )}

        {/* Channel Welcome Header (only shown when user reaches the beginning of chat history) */}
        {!hasMoreMessages && currentChannel ? (
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
        ) : !hasMoreMessages && !currentChannel ? (
          <div className="p-8 text-center text-xs text-[var(--text-muted)]">
            Chọn một kênh để bắt đầu trò chuyện.
          </div>
        ) : null}

        {messages.map((msg, index) => {
          const prevMsg = index > 0 ? messages[index - 1] : undefined;
          const showDateDivider = isDifferentDay(msg.createdAt, prevMsg?.createdAt);
          const isSameSender = prevMsg && prevMsg.senderId === msg.senderId;
          const timeDiffMin = prevMsg
            ? (new Date(msg.createdAt).getTime() - new Date(prevMsg.createdAt).getTime()) / 60000
            : 999;
          const isConsecutive = !showDateDivider && isSameSender && timeDiffMin <= 5;
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
                id={`msg-${msg.id}`}
                className={`group relative flex gap-3 px-3 rounded-md transition-all duration-150 hover:bg-[var(--bg-surface)] ${
                  isConsecutive ? "py-0.5" : "py-1.5 mt-1"
                }`}
              >
                {/* Left Gutter: Avatar (if new block) OR hover timestamp (if consecutive) */}
                {isConsecutive ? (
                  <div className="w-9 shrink-0 flex items-center justify-end select-none">
                    <span className="opacity-0 group-hover:opacity-100 text-[10px] text-[var(--text-muted)] font-mono pr-1.5 transition-opacity">
                      {timeStr}
                    </span>
                  </div>
                ) : (
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
                        e.currentTarget.src = "/default-avatar.png";
                      }}
                    />
                  </div>
                )}

                <div className="flex-1 min-w-0 flex flex-col gap-0.75">
                  {/* Header: Name, Badge, Time, Edited Tag (ONLY if !isConsecutive) */}
                  {!isConsecutive && (
                    <div className="flex items-baseline gap-2">
                      <span className="text-[0.9rem] font-semibold text-[var(--text-primary)]">
                        {msg.senderDisplayName}
                      </span>
                      {/* Role badge: NEVER show Lead vs Member in DMs! In channels, show real role or YOU */}
                      {(() => {
                        const isDm = currentChannel?.type === ChannelType.DirectMessage || currentChannel?.type === 2;
                        const memberRole = workspaceMembers?.find((m) => m.id === msg.senderId)?.role;

                        if (isDm) {
                          return isMe ? (
                            <span className="bg-[var(--accent-soft)] text-[var(--accent-primary)] text-[0.65rem] px-1.5 py-0.25 rounded font-bold uppercase">
                              YOU
                            </span>
                          ) : null;
                        }

                        if (isMe) {
                          return (
                            <span className="bg-[var(--accent-soft)] text-[var(--accent-primary)] text-[0.65rem] px-1.5 py-0.25 rounded font-bold uppercase">
                              YOU
                            </span>
                          );
                        }

                        if (memberRole === "Owner" || memberRole === "Admin") {
                          return (
                            <span className="bg-[var(--accent-soft)] text-[var(--accent-primary)] text-[0.65rem] px-1.5 py-0.25 rounded font-bold uppercase">
                              {memberRole.toUpperCase()}
                            </span>
                          );
                        }

                        return null;
                      })()}
                      <span className="text-[0.72rem] text-[var(--text-muted)]">{timeStr}</span>
                      {msg.isEdited && (
                        <span className="text-[0.7rem] text-[var(--text-muted)] italic select-none">
                          (đã chỉnh sửa)
                        </span>
                      )}
                    </div>
                  )}

                  {/* Message Content or Inline Edit Box */}
                  {isEditingThis ? (
                    <div className="mt-1 flex flex-col gap-2 p-2 rounded-md bg-[var(--bg-chat)] border border-[var(--accent-primary)] shadow-sm">
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
                    <>
                      {msg.content ? (
                        <div className="text-[0.92rem] leading-relaxed text-[var(--text-primary)] break-words whitespace-pre-wrap">
                          {renderMessageBody(msg.content)}
                        </div>
                      ) : null}

                      {/* Structured Attachments (JSONB) */}
                      {msg.attachments && msg.attachments.length > 0 && (() => {
                        const imageAttachments = msg.attachments.filter(
                          (a) => a.type === "image" || a.contentType?.startsWith("image/")
                        );
                        const fileAttachments = msg.attachments.filter(
                          (a) => a.type !== "image" && !a.contentType?.startsWith("image/")
                        );

                        return (
                          <div className="flex flex-col gap-2 mt-1">
                            {imageAttachments.length > 0 && (
                              <ImageGalleryGrid
                                images={imageAttachments.map((img) => ({
                                  url: img.url,
                                  alt: img.fileName,
                                }))}
                              />
                            )}

                            {fileAttachments.length > 0 && (
                              <div className="flex flex-col gap-1.5">
                                {fileAttachments.map((file, fIdx) => (
                                  <a
                                    key={fIdx}
                                    href={file.url}
                                    target="_blank"
                                    rel="noreferrer"
                                    download={file.fileName}
                                    className="flex items-center gap-2.5 p-2 rounded-lg bg-[var(--bg-chat)] border border-[var(--border-color)] hover:border-[var(--accent-primary)] max-w-sm transition-all group/file text-left"
                                  >
                                    <div className="w-8 h-8 rounded-md bg-[var(--bg-surface)] border border-[var(--border-color)] flex items-center justify-center text-[var(--text-muted)] group-hover/file:text-[var(--accent-primary)] shrink-0">
                                      <FileText size={18} />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                      <div className="text-xs font-medium text-[var(--text-primary)] truncate">
                                        {file.fileName}
                                      </div>
                                      <div className="text-[10px] text-[var(--text-muted)]">
                                        {formatFileSize(file.fileSize)}
                                      </div>
                                    </div>
                                  </a>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })()}
                    </>
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
                  <div className="absolute -top-3.5 right-3.5 bg-[var(--bg-chat)] border border-[var(--border-color)] rounded-md p-0.5 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 group-hover:translate-y-0 translate-y-1 transition-all duration-150 shadow-md z-10">
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
                        onClick={() => handleDeleteClick(msg)}
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
      )}

      {/* Typing indicator */}
      {Boolean(typingUser) && (
        <div className="px-5 py-1 text-xs text-[var(--text-muted)] flex items-center justify-between shrink-0 animate-in fade-in duration-150">
          <div className="flex items-center gap-2">
            <div className="typing-wave">
              <span />
              <span />
              <span />
            </div>
            <span>
              <strong>{typingUser}</strong> đang soạn tin nhắn...
            </span>
          </div>
        </div>
      )}

      {/* Chat Input Box */}
      <div className="px-5 pb-2.5 pt-0.5 shrink-0 relative">
        {/* Emoji Picker Popover */}
        <EmojiPickerPopover
          isOpen={showEmojiPicker}
          onClose={() => setShowEmojiPicker(false)}
          onSelectEmoji={handleInsertEmoji}
        />

        {/* GIF Picker Popover */}
        <GifPicker
          isOpen={showGifPicker}
          onClose={() => setShowGifPicker(false)}
          onSelectGif={handleSelectGif}
        />

        <div className="bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-md p-2.5 px-3.5 flex flex-col gap-2 transition-all duration-200 focus-within:border-[var(--accent-primary)] focus-within:bg-[var(--bg-chat)] focus-within:ring-1 focus-within:ring-[var(--accent-primary)] focus-within:shadow-[0_2px_12px_var(--accent-glow)]">
          {/* Pending Attachments Preview Tray */}
          {pendingAttachments.length > 0 && (
            <div className="flex items-center gap-2.5 overflow-x-auto py-1 px-0.5 border-b border-[var(--border-color)]/70 pb-2.5 mb-1 scrollbar-thin">
              {pendingAttachments.map((att) => (
                <div
                  key={att.id}
                  className="relative group shrink-0 flex items-center gap-2 p-1.5 rounded-lg border border-[var(--border-color)] bg-[var(--bg-chat)] shadow-2xs"
                >
                  {att.type === 'image' ? (
                    <div className="relative w-14 h-14 rounded-md overflow-hidden bg-black/10">
                      <img
                        src={att.previewUrl}
                        alt={att.name}
                        className="w-full h-full object-cover"
                      />
                      {att.status === 'uploading' && (
                        <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                          <CircleNotch size={18} className="animate-spin text-white" />
                        </div>
                      )}
                      {att.status === 'error' && (
                        <div className="absolute inset-0 bg-rose-600/80 flex items-center justify-center text-[10px] text-white font-bold">
                          Lỗi
                        </div>
                      )}
                    </div>
                  ) : att.type === 'video' ? (
                    <div className="relative w-14 h-14 rounded-md overflow-hidden bg-zinc-900 flex flex-col items-center justify-center text-white">
                      <Play size={20} weight="fill" className="text-[var(--accent-primary)]" />
                      <span className="text-[9px] truncate max-w-[50px] px-1 text-zinc-300">
                        {att.name}
                      </span>
                      {att.status === 'uploading' && (
                        <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                          <CircleNotch size={18} className="animate-spin text-white" />
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 px-2 py-1 max-w-[180px]">
                      <FileText size={22} className="text-[var(--accent-primary)] shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs text-[var(--text-primary)] truncate font-medium">
                          {att.name}
                        </p>
                        <p className="text-[10px] text-[var(--text-muted)]">
                          {formatFileSize(att.size)}
                        </p>
                      </div>
                      {att.status === 'uploading' && (
                        <CircleNotch size={14} className="animate-spin text-[var(--accent-primary)] shrink-0" />
                      )}
                    </div>
                  )}

                  {/* Remove Attachment Button */}
                  <button
                    type="button"
                    onClick={() => handleRemoveAttachment(att.id)}
                    className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-[var(--bg-chat)] border border-[var(--border-color)] text-[var(--text-secondary)] hover:text-white hover:bg-rose-500 hover:border-rose-500 flex items-center justify-center transition-all cursor-pointer shadow-xs"
                    title="Xóa tệp đính kèm"
                  >
                    <X size={12} weight="bold" />
                  </button>
                </div>
              ))}

              {/* Add more button */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-14 h-14 rounded-md border-2 border-dashed border-[var(--border-color)] hover:border-[var(--accent-primary)] hover:bg-[var(--accent-soft)]/30 text-[var(--text-muted)] hover:text-[var(--accent-primary)] flex flex-col items-center justify-center transition-all shrink-0 cursor-pointer"
                title="Thêm tệp khác"
              >
                <Plus size={18} />
                <span className="text-[9px] font-bold">Thêm</span>
              </button>
            </div>
          )}

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
                ? `Nhắn tin tới #${currentChannel.name}... (Enter để gửi, hỗ trợ nhiều ảnh & file 100MB)`
                : "Vui lòng chọn một kênh ở danh sách bên trái để nhắn tin..."
            }
          />

          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-1">
              {/* Hidden file picker supporting multiple images, videos up to 100MB, and docs */}
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*,video/mp4,video/webm,video/quicktime,video/x-matroska,application/pdf,.doc,.docx,.zip"
                className="hidden"
                onChange={handleFileUpload}
              />

              <button
                type="button"
                className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-active)] transition-colors cursor-pointer inline-flex items-center justify-center"
                title="Đính kèm tệp tin / Video (Tối đa 100MB)"
                onClick={() => fileInputRef.current?.click()}
              >
                <Paperclip size={17} />
              </button>

              <button
                type="button"
                className={`p-1.5 rounded-lg transition-colors cursor-pointer inline-flex items-center justify-center ${
                  showGifPicker
                    ? "bg-[var(--accent-soft)] text-[var(--accent-primary)]"
                    : "text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-active)]"
                }`}
                title="Thư viện ảnh GIF"
                onClick={() => {
                  setShowGifPicker((prev) => !prev);
                  setShowEmojiPicker(false);
                }}
              >
                <span className="font-bold text-[10px] border border-current px-1 py-0.2 rounded leading-tight tracking-wider">
                  GIF
                </span>
              </button>

              <button
                type="button"
                className={`p-1.5 rounded-lg transition-colors cursor-pointer inline-flex items-center justify-center ${
                  showEmojiPicker
                    ? "bg-[var(--accent-soft)] text-[var(--accent-primary)]"
                    : "text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-active)]"
                }`}
                title="Thêm biểu cảm Emoji"
                onClick={() => {
                  setShowEmojiPicker((prev) => !prev);
                  setShowGifPicker(false);
                }}
              >
                <Smiley size={17} />
              </button>

              <button
                type="button"
                className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-active)] transition-colors cursor-pointer inline-flex items-center justify-center"
                title="Chèn khối mã code"
                onClick={() => setContent((prev) => prev ? `${prev}\n\`\`\`csharp\n// Nhập mã code tại đây\n\`\`\`\n` : `\`\`\`csharp\n// Nhập mã code tại đây\n\`\`\`\n`)}
              >
                <Code size={17} />
              </button>
            </div>

            <div className="flex items-center">
              <button
                type="button"
                className="bg-[var(--accent-primary)] text-white border-none px-3.5 py-1.5 rounded-lg text-[0.82rem] font-semibold cursor-pointer transition-all duration-150 flex items-center gap-1.5 shadow-[0_2px_8px_var(--accent-glow)] hover:bg-[var(--accent-hover)] hover:shadow-[0_4px_14px_var(--accent-glow)] disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
                onClick={handleSend}
                disabled={(!content.trim() && pendingAttachments.length === 0) || sending || pendingAttachments.some((a) => a.status === 'uploading')}
              >
                <span>{sending ? "Đang gửi..." : pendingAttachments.some((a) => a.status === 'uploading') ? "Đang tải ảnh..." : "Gửi tin"}</span>
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
          className="fixed z-50 w-[270px] bg-[var(--bg-chat)] border border-[var(--border-color)] rounded-[4px] shadow-2xl p-4 flex flex-col gap-3.5 animate-in fade-in zoom-in-95 duration-150 backdrop-blur-md"
        >
          {/* Ambient Header Bar */}
          <div className="h-10 -mx-4 -mt-4 rounded-t-[4px] bg-gradient-to-r from-[var(--accent-primary)]/20 via-[var(--accent-primary)]/10 to-transparent p-2.5 flex items-center">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--accent-primary)]">
              Thông tin thành viên
            </span>
          </div>

          {/* Avatar & Online status */}
          <div className="flex items-center gap-3 -mt-4">
            <div className="relative">
              <div className="w-13 h-13 rounded-[4px] bg-[var(--bg-surface)] border-2 border-[var(--bg-chat)] overflow-hidden shadow-md flex items-center justify-center font-bold text-base text-white">
                <img
                  src={selectedProfile.avatarUrl || (import.meta.env.VITE_DEFAULT_AVATAR as string) || "/default-avatar.png"}
                  alt={selectedProfile.displayName}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.currentTarget.src = "/default-avatar.png";
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
              <div className="text-center py-1.5 text-xs text-[var(--text-muted)] font-medium bg-[var(--bg-surface)] rounded-md">
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
                className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-[var(--accent-primary)] hover:bg-[var(--accent-hover)] text-white text-xs font-bold transition-all shadow-md shadow-[var(--accent-glow)] cursor-pointer active:scale-98"
              >
                <ChatCenteredDots size={16} weight="bold" />
                <span>Gửi tin nhắn</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <DeleteMessageModal
        isOpen={deleteModalState.isOpen}
        onClose={() => setDeleteModalState({ isOpen: false, messageId: null, preview: "" })}
        onConfirm={handleConfirmDelete}
        messagePreview={deleteModalState.preview}
        isDeleting={isDeletingMessage}
      />
    </section>
  );
};
