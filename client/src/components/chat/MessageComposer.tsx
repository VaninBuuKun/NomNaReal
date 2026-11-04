import React, {
  useState,
  useEffect,
  useRef,
  useMemo,
  forwardRef,
  useImperativeHandle,
} from "react";
import {
  Smiley,
  PaperPlaneRight,
  ArrowUUpLeft,
  CircleNotch,
  X,
  Plus,
  Play,
  FileText,
  Image as ImageIcon,
} from "@phosphor-icons/react";
import { ChannelType, type Message } from "../../types";
import { fileApi } from "../../services/fileApi";
import { EmojiPickerPopover } from "./EmojiPickerPopover";
import { GifPicker } from "./GifPicker";
import { MentionAutocompletePopover } from "./MentionAutocompletePopover";
import { InputLinkPreviewStrip } from "./InputLinkPreviewStrip";
import { useChatStore } from "../../stores";
import type { DirectMessageUser } from "../dm";

export interface PendingAttachment {
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

export interface MessageComposerProps {
  channelId?: string;
  channelName?: string | null;
  channelType?: ChannelType | number;
  isDm?: boolean;
  canSendMessages: boolean;
  canAttachFiles: boolean;
  replyingToMessage: Message | null;
  onCancelReply: () => void;
  onSendMessage: (
    content: string,
    attachments?: Array<{
      url: string;
      fileName: string;
      fileSize: number;
      contentType: string;
      type: "image" | "video" | "file";
    }>,
    replyToMessageId?: string
  ) => Promise<void>;
  onStartTyping: () => void;
  onStopTyping: () => void;
  workspaceMembers?: DirectMessageUser[];
  isSidebar?: boolean;
  onSendSuccess?: () => void;
}

export interface MessageComposerHandle {
  addFiles: (files: File[]) => void;
  focus: () => void;
}

export const MessageComposer = forwardRef<MessageComposerHandle, MessageComposerProps>(({
  channelId,
  channelName,
  isDm = false,
  canSendMessages,
  canAttachFiles,
  replyingToMessage,
  onCancelReply,
  onSendMessage,
  onStartTyping,
  onStopTyping,
  workspaceMembers = [],
  isSidebar = false,
  onSendSuccess,
}, ref) => {
  const drafts = useChatStore((state) => state.drafts);
  const setDraft = useChatStore((state) => state.setDraft);
  const clearDraft = useChatStore((state) => state.clearDraft);

  const [content, setContent] = useState("");
  const [sending, setSending] = useState(false);
  const [pendingAttachments, setPendingAttachments] = useState<PendingAttachment[]>([]);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showGifPicker, setShowGifPicker] = useState(false);
  const [isMentionOpen, setIsMentionOpen] = useState(false);
  const [mentionQuery, setMentionQuery] = useState("");
  const [isPlusMenuOpen, setIsPlusMenuOpen] = useState(false);
  const [dismissedInputUrl, setDismissedInputUrl] = useState<string | null>(null);

  const plusMenuRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const typingTimeoutRef = useRef<any>(null);

  // Sync draft when active channel changes
  useEffect(() => {
    if (channelId) {
      setContent(drafts[channelId] || "");
    } else {
      setContent("");
    }
    setPendingAttachments([]);
    setDismissedInputUrl(null);
  }, [channelId]);

  // Focus textarea when replyingToMessage changes
  useEffect(() => {
    if (replyingToMessage && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [replyingToMessage]);

  // Close plus menu on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (plusMenuRef.current && !plusMenuRef.current.contains(e.target as Node)) {
        setIsPlusMenuOpen(false);
      }
    };
    if (isPlusMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isPlusMenuOpen]);

  // Detect Link preview
  const detectedInputUrl = useMemo(() => {
    const match = content.match(/https?:\/\/[^\s<)]+/);
    if (!match) return null;
    return match[0].replace(/[.,;:!?]+$/, "");
  }, [content]);

  const showLinkPreviewStrip = Boolean(
    detectedInputUrl && detectedInputUrl !== dismissedInputUrl
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setContent(val);

    // Auto-adjust height
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 180)}px`;
    }

    if (channelId) {
      if (val.trim()) {
        setDraft(channelId, val);
      } else {
        clearDraft(channelId);
      }
    }

    // Detect @mention trigger
    const cursorPos = e.target.selectionStart;
    const textBeforeCursor = val.slice(0, cursorPos);
    const lastAtMatch = textBeforeCursor.match(/@([a-zA-Z0-9_\.]*)$/);
    if (lastAtMatch) {
      setMentionQuery(lastAtMatch[1]);
      setIsMentionOpen(true);
    } else {
      setIsMentionOpen(false);
    }

    onStartTyping();
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    typingTimeoutRef.current = setTimeout(() => {
      onStopTyping();
    }, 2000);
  };

  const handleSelectMention = (username: string) => {
    if (!textareaRef.current) return;
    const textarea = textareaRef.current;
    const cursorPos = textarea.selectionStart;
    const textBeforeCursor = content.slice(0, cursorPos);
    const textAfterCursor = content.slice(cursorPos);

    const updatedBefore = textBeforeCursor.replace(/@([a-zA-Z0-9_\.]*)$/, `@${username} `);
    const newContent = updatedBefore + textAfterCursor;
    setContent(newContent);
    if (channelId) {
      setDraft(channelId, newContent);
    }
    setIsMentionOpen(false);

    setTimeout(() => {
      textarea.focus();
      const newCursor = updatedBefore.length;
      textarea.setSelectionRange(newCursor, newCursor);
    }, 10);
  };

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

  const handleSelectGif = (url: string, title: string) => {
    const gifMarkdown = `![GIF: ${title}](${url})`;
    onSendMessage(gifMarkdown);
    setShowGifPicker(false);
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

  const processFiles = (fileList: File[]) => {
    if (!canSendMessages || !canAttachFiles || fileList.length === 0) return;
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

    // Start background upload
    newAttachments.forEach(async (att) => {
      try {
        const folder =
          att.type === "video" ? "videos" : att.type === "image" ? "uploads" : "attachments";
        const res = await fileApi.uploadFile(att.file, folder);
        setPendingAttachments((prev) =>
          prev.map((item) =>
            item.id === att.id ? { ...item, status: "ready", uploadedUrl: res.url } : item
          )
        );
      } catch (err) {
        console.error("Upload error for file:", att.name, err);
        setPendingAttachments((prev) =>
          prev.map((item) => (item.id === att.id ? { ...item, status: "error" } : item))
        );
      }
    });

  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) processFiles(Array.from(files));
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  useImperativeHandle(ref, () => ({
    addFiles: processFiles,
    focus: () => textareaRef.current?.focus(),
  }));

  // Ctrl+V: paste screenshots / files straight from the clipboard
  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const files = Array.from(e.clipboardData?.files ?? []);
    if (files.length === 0) return;
    e.preventDefault();
    processFiles(
      files.map((f, i) =>
        f.name && f.name !== "image.png"
          ? f
          : new File([f], `pasted-${Date.now()}-${i}.${(f.type.split("/")[1] || "png")}`, {
              type: f.type,
            })
      )
    );
  };

  // Ctrl+B / Ctrl+I / Ctrl+K: wrap the selection with Markdown markers
  const applyMarkdownShortcut = (marker: string, linkMode = false) => {
    const ta = textareaRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const selected = content.slice(start, end);
    let next: string;
    let selStart: number;
    let selEnd: number;
    if (linkMode) {
      const label = selected || "văn bản";
      next = `${content.slice(0, start)}[${label}](https://)${content.slice(end)}`;
      selStart = start + label.length + 3;
      selEnd = selStart + 8;
    } else {
      next = `${content.slice(0, start)}${marker}${selected}${marker}${content.slice(end)}`;
      selStart = start + marker.length;
      selEnd = selStart + selected.length;
    }
    setContent(next);
    if (channelId) setDraft(channelId, next);
    requestAnimationFrame(() => {
      ta.focus();
      ta.setSelectionRange(selStart, selEnd);
    });
  };

  const handleSend = async () => {
    const text = content.trim();
    const hasAttachments = pendingAttachments.length > 0;
    if ((!text && !hasAttachments) || sending) return;

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
      await onSendMessage(text, readyAttachments, replyingToMessage?.id);
      setContent("");
      onCancelReply();
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
      }
      setDismissedInputUrl(null);
      if (channelId) {
        clearDraft(channelId);
      }
      pendingAttachments.forEach((a) => {
        if (a.previewUrl) URL.revokeObjectURL(a.previewUrl);
      });
      setPendingAttachments([]);
      onStopTyping();
      onSendSuccess?.();
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.defaultPrevented) return;

    if ((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey) {
      const k = e.key.toLowerCase();
      if (k === "b") {
        e.preventDefault();
        applyMarkdownShortcut("**");
        return;
      }
      if (k === "i") {
        e.preventDefault();
        applyMarkdownShortcut("*");
        return;
      }
      if (k === "k") {
        e.preventDefault();
        applyMarkdownShortcut("", true);
        return;
      }
    }

    if (isMentionOpen) {
      if (
        e.key === "Enter" ||
        e.key === "Tab" ||
        e.key === "ArrowUp" ||
        e.key === "ArrowDown" ||
        e.key === "Escape"
      ) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }
    }

    if (e.key === "Escape" && replyingToMessage) {
      e.preventDefault();
      onCancelReply();
      return;
    }

    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className={`${isSidebar ? "px-3" : "px-4"} pb-2.5 pt-1.5 shrink-0 relative`}>
      {/* Emoji Picker Popover */}
      <EmojiPickerPopover
        isOpen={showEmojiPicker}
        onClose={() => setShowEmojiPicker(false)}
        onSelectEmoji={handleInsertEmoji}
      />

      {/* GIF Picker Popover (Only for main chat) */}
      {!isSidebar && (
        <GifPicker
          isOpen={showGifPicker}
          onClose={() => setShowGifPicker(false)}
          onSelectGif={handleSelectGif}
        />
      )}

      {/* Mention Autocomplete Popover */}
      <MentionAutocompletePopover
        isOpen={isMentionOpen}
        query={mentionQuery}
        members={workspaceMembers}
        onSelect={handleSelectMention}
        onClose={() => setIsMentionOpen(false)}
      />

      <div className="bg-surface border border-border rounded-control py-1.5 px-3 flex flex-col gap-1.5 min-h-[52px] justify-center transition-all duration-200 focus-within:border-accent-primary focus-within:bg-chat focus-within:ring-1 focus-within:ring-accent-primary focus-within:shadow-[0_2px_12px_var(--accent-glow)]">
        {/* Quote Reply Banner */}
        {replyingToMessage && (
          <div className="flex items-center justify-between px-2.5 py-1.5 bg-chat border-b border-border -mx-3 -mt-1.5 mb-0.5 rounded-t-control text-xs text-text-secondary select-none animate-in fade-in slide-in-from-bottom-1 duration-100">
            <div className="flex items-center gap-2 min-w-0">
              <ArrowUUpLeft size={14} className="text-accent-primary shrink-0" />
              <span className="shrink-0 font-medium text-text-primary">
                Đang trả lời{" "}
                <span className="text-accent-primary font-semibold">
                  @{replyingToMessage.senderDisplayName}
                </span>
              </span>
              <span className="text-text-muted shrink-0">·</span>
              <span className="truncate italic text-text-muted max-w-xs sm:max-w-md">
                {replyingToMessage.content || "Tệp đính kèm"}
              </span>
            </div>
            <button
              type="button"
              onClick={onCancelReply}
              className="p-1 rounded-full text-text-muted hover:text-text-primary hover:bg-surface transition-colors cursor-pointer shrink-0 ml-2"
              title="Hủy trả lời (Escape)"
            >
              <X size={13} weight="bold" />
            </button>
          </div>
        )}

        {/* Pending Attachments Preview Tray */}
        {pendingAttachments.length > 0 && (
          <div className="flex items-center gap-2.5 overflow-x-auto py-1 px-0.5 border-b border-border/70 pb-2.5 mb-1 scrollbar-thin">
            {pendingAttachments.map((att) => (
              <div
                key={att.id}
                className="relative group shrink-0 flex items-center gap-2 p-1.5 rounded-control border border-border bg-chat shadow-2xs"
              >
                {att.type === "image" ? (
                  <div className="relative w-14 h-14 rounded-md overflow-hidden bg-black/10">
                    <img src={att.previewUrl} alt={att.name} className="w-full h-full object-cover" />
                    {att.status === "uploading" && (
                      <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                        <CircleNotch size={18} className="animate-spin text-white" />
                      </div>
                    )}
                    {att.status === "error" && (
                      <div className="absolute inset-0 bg-danger/80 flex items-center justify-center text-[10px] text-white font-bold">
                        Lỗi
                      </div>
                    )}
                  </div>
                ) : att.type === "video" ? (
                  <div className="relative w-14 h-14 rounded-md overflow-hidden bg-surface flex flex-col items-center justify-center text-white">
                    <Play size={20} weight="fill" className="text-accent-primary" />
                    <span className="text-[9px] truncate max-w-[50px] px-1 text-text-secondary">
                      {att.name}
                    </span>
                    {att.status === "uploading" && (
                      <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                        <CircleNotch size={18} className="animate-spin text-white" />
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center gap-2 px-2 py-1 max-w-[180px]">
                    <FileText size={22} className="text-accent-primary shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-text-primary truncate font-medium">{att.name}</p>
                      <p className="text-[10px] text-text-muted">{formatFileSize(att.size)}</p>
                    </div>
                    {att.status === "uploading" && (
                      <CircleNotch size={14} className="animate-spin text-accent-primary shrink-0" />
                    )}
                  </div>
                )}

                {/* Remove Attachment Button */}
                <button
                  type="button"
                  onClick={() => handleRemoveAttachment(att.id)}
                  className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-chat border border-border text-text-secondary hover:text-white hover:bg-danger hover:border-danger flex items-center justify-center transition-all cursor-pointer shadow-xs"
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
              className="w-14 h-14 rounded-md border-2 border-dashed border-border hover:border-accent-primary hover:bg-accent-soft/30 text-text-muted hover:text-accent-primary flex flex-col items-center justify-center transition-all shrink-0 cursor-pointer"
              title="Thêm tệp khác"
            >
              <Plus size={18} />
              <span className="text-[9px] font-bold">Thêm</span>
            </button>
          </div>
        )}

        {/* Rich Link Preview Strip */}
        {showLinkPreviewStrip && detectedInputUrl && (
          <InputLinkPreviewStrip
            url={detectedInputUrl}
            onDismiss={() => setDismissedInputUrl(detectedInputUrl)}
          />
        )}

        {/* Discord-style Unified Single Row Chat Input Bar */}
        <div className="flex items-center gap-3 w-full min-h-[40px]">
          {/* Hidden file picker */}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*,video/mp4,video/webm,video/quicktime,video/x-matroska,application/pdf,.doc,.docx,.zip"
            className="hidden"
            onChange={handleFileUpload}
          />

          {/* Left Circular [+] Button */}
          {!isSidebar && (
            <div className="relative shrink-0" ref={plusMenuRef}>
              <button
                type="button"
                onClick={() => setIsPlusMenuOpen((prev) => !prev)}
                className={`w-6 h-6 rounded-full flex items-center justify-center transition-colors cursor-pointer ${
                  isPlusMenuOpen
                    ? "bg-accent-primary text-white"
                    : "bg-text-muted/20 hover:bg-text-muted/35 text-text-muted hover:text-text-primary"
                }`}
                title="Đính kèm tệp tin hoặc ảnh"
                disabled={!canSendMessages}
              >
                <Plus size={15} weight="bold" />
              </button>

              {/* Plus Menu Popover */}
              {isPlusMenuOpen && (
                <div className="absolute bottom-full left-0 mb-2 w-48 rounded-card bg-surface border border-border shadow-floating p-1.5 z-50 flex flex-col gap-0.5 animate-in fade-in slide-in-from-bottom-2 duration-100">
                  <button
                    type="button"
                    onClick={() => {
                      setIsPlusMenuOpen(false);
                      fileInputRef.current?.click();
                    }}
                    disabled={!canAttachFiles}
                    className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-control text-xs font-semibold text-text-primary hover:bg-surface-active transition-colors cursor-pointer text-left disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <ImageIcon size={16} weight="bold" className="text-accent-primary" />
                    <span>Tải tệp tin lên</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsPlusMenuOpen(false);
                      setShowGifPicker(true);
                      setShowEmojiPicker(false);
                    }}
                    className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-control text-xs font-semibold text-text-primary hover:bg-surface-active transition-colors cursor-pointer text-left"
                  >
                    <span className="font-bold text-[10px] border border-current px-1 rounded leading-tight text-accent-primary">
                      GIF
                    </span>
                    <span>Thư viện ảnh GIF</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Direct Input Textarea */}
          <textarea
            ref={textareaRef}
            className={`flex-1 bg-transparent border-none outline-none caret-accent-primary placeholder:text-text-muted text-text-primary resize-none leading-relaxed disabled:opacity-50 py-1 max-h-36 no-scrollbar ${
              isSidebar ? "text-[0.88rem]" : "text-[0.93rem]"
            }`}
            rows={1}
            value={content}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            disabled={!channelId || !canSendMessages}
            placeholder={
              !channelId
                ? "Chọn một kênh để nhắn tin..."
                : !canSendMessages
                ? `Bạn không có quyền gửi tin nhắn trong kênh #${channelName || "này"}.`
                : isDm
                ? `Nhắn @${channelName || "người dùng"}`
                : `Nhắn #${channelName || "kênh"}`
            }
          />

          {/* Right Action Icons Row */}
          <div className="flex items-center gap-1.5 shrink-0 text-text-muted">
            {/* Main chat only: GIF Picker button */}
            {!isSidebar && (
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  setShowGifPicker((prev) => !prev);
                  setShowEmojiPicker(false);
                }}
                className={`hover:text-text-primary transition-colors cursor-pointer p-1 rounded-control hover:bg-surface-active flex items-center justify-center ${
                  showGifPicker ? "text-accent-primary" : ""
                }`}
                title="Mở thư viện ảnh GIF"
                disabled={!canSendMessages}
              >
                <span className="font-extrabold text-[10px] border border-current px-1 py-0.5 rounded-[4px] leading-none tracking-tight">
                  GIF
                </span>
              </button>
            )}

            {/* Emoji button */}
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                setShowEmojiPicker((prev) => !prev);
                if (!isSidebar) setShowGifPicker(false);
              }}
              className={`hover:text-text-primary transition-colors cursor-pointer p-1 rounded-control hover:bg-surface-active ${
                showEmojiPicker ? "text-accent-primary" : ""
              }`}
              title="Biểu cảm Emoji"
              disabled={!canSendMessages}
            >
              <Smiley size={20} weight="bold" />
            </button>

            {/* Send Button (Visible on both main chat and sidebar when text/attachment exists) */}
            {(content.trim() || pendingAttachments.length > 0) && (
              <button
                type="button"
                onClick={handleSend}
                disabled={
                  !canSendMessages ||
                  sending ||
                  pendingAttachments.some((a) => a.status === "uploading")
                }
                className="w-8 h-8 sm:w-7 sm:h-7 rounded-full bg-accent-primary text-white hover:bg-accent-hover transition-all flex items-center justify-center cursor-pointer shadow-xs disabled:opacity-50 shrink-0 ml-0.5"
                title="Gửi tin nhắn (Enter)"
              >
                {sending ? (
                  <CircleNotch size={14} className="animate-spin" />
                ) : (
                  <PaperPlaneRight size={14} weight="fill" />
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
});

MessageComposer.displayName = "MessageComposer";
