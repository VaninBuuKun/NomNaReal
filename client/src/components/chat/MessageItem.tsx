import React, { memo, useState, useRef } from "react";
import {
  PushPin,
  ArrowUUpLeft,
  PencilSimple,
  Trash,
  FileText,
} from "@phosphor-icons/react";
import { ChannelType, type Channel, type Message, type User } from "../../types";
import { formatDateDivider, isDifferentDay, formatMessageTime } from "../../utils/formatDate";
import { MessageContent } from "./MessageContent";
import { ImageGalleryGrid } from "./ImageGalleryGrid";
import { MentionAutocompletePopover } from "./MentionAutocompletePopover";
import { getMediaUrl } from "../../utils/constants";
import type { DirectMessageUser } from "../dm";
import type { UserProfileData } from "../profile";

export interface MessageItemProps {
  msg: Message;
  prevMsg?: Message;
  currentUser: User | null;
  currentChannel: Channel | null;
  workspaceMembers?: DirectMessageUser[];
  isPinned: boolean;
  canManageMessages?: boolean;
  isAdmin?: boolean;
  onJumpToMessage: (messageId: string) => void;
  onOpenUserProfile?: (user: UserProfileData, anchorRect?: DOMRect) => void;
  onReplyMessage: (msg: Message) => void;
  onEditMessage?: (messageId: string, content: string) => Promise<void>;
  onDeleteMessage: (msg: Message) => void;
  onToggleReaction: (messageId: string, emoji: string) => void;
  onPinMessage?: (messageId: string) => void;
  onUnpinMessage?: (messageId: string) => void;
}

const QUICK_EMOJIS = ["❤️", "👍", "🔥", "🚀", "😂", "🎉"];

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export const MessageItem: React.FC<MessageItemProps> = memo(({
  msg,
  prevMsg,
  currentUser,
  currentChannel,
  workspaceMembers = [],
  isPinned,
  canManageMessages = false,
  isAdmin = false,
  onJumpToMessage,
  onOpenUserProfile,
  onReplyMessage,
  onEditMessage,
  onDeleteMessage,
  onToggleReaction,
  onPinMessage,
  onUnpinMessage,
}) => {
  // Inline editing state
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState("");
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [isEditMentionOpen, setIsEditMentionOpen] = useState(false);
  const [editMentionQuery, setEditMentionQuery] = useState("");
  const editTextareaRef = useRef<HTMLTextAreaElement>(null);

  const showDateDivider = isDifferentDay(msg.createdAt, prevMsg?.createdAt);
  const isSameSender = prevMsg && prevMsg.senderId === msg.senderId;
  const timeDiffMin = prevMsg
    ? (new Date(msg.createdAt).getTime() - new Date(prevMsg.createdAt).getTime()) / 60000
    : 999;
  const isConsecutive = !showDateDivider && isSameSender && timeDiffMin <= 5 && !msg.replyTo;
  const isMe = Boolean(
    currentUser &&
      (msg.senderId === currentUser.id || msg.senderUsername === currentUser.username)
  );
  const timeStr = formatMessageTime(msg.createdAt);
  const avatarSrc = getMediaUrl(msg.senderAvatarUrl);

  const isMentioningMe = Boolean(
    currentUser &&
      (msg.content?.toLowerCase().includes(`@${currentUser.username?.toLowerCase()}`) ||
        (currentUser.displayName &&
          msg.content?.toLowerCase().includes(`@${currentUser.displayName.toLowerCase()}`)) ||
        msg.content?.toLowerCase().includes("@all") ||
        msg.content?.toLowerCase().includes("@everyone") ||
        msg.content?.toLowerCase().includes("@channel") ||
        msg.content?.toLowerCase().includes("@here"))
  );

  const startEdit = () => {
    setEditContent(msg.content);
    setIsEditing(true);
    setTimeout(() => {
      if (editTextareaRef.current) {
        editTextareaRef.current.focus();
        editTextareaRef.current.setSelectionRange(
          editTextareaRef.current.value.length,
          editTextareaRef.current.value.length
        );
      }
    }, 10);
  };

  const handleEditInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setEditContent(val);
    const cursorPos = e.target.selectionStart;
    const textBeforeCursor = val.slice(0, cursorPos);
    const textAfterCursor = val.slice(cursorPos);

    // Auto-space after typing broadcast mentions: @everyone, @all, @channel, @here
    const broadcastMatch = textBeforeCursor.match(/(?:^|\s)@(everyone|all|channel|here)$/i);
    if (broadcastMatch && !textAfterCursor.startsWith(" ")) {
      const newVal = textBeforeCursor + " " + textAfterCursor;
      setEditContent(newVal);
      setIsEditMentionOpen(false);
      setTimeout(() => {
        if (editTextareaRef.current) {
          editTextareaRef.current.setSelectionRange(cursorPos + 1, cursorPos + 1);
        }
      }, 0);
      return;
    }

    const lastAtMatch = textBeforeCursor.match(/@([a-zA-Z0-9_\.]*)$/);
    if (lastAtMatch) {
      setEditMentionQuery(lastAtMatch[1]);
      setIsEditMentionOpen(true);
    } else {
      setIsEditMentionOpen(false);
    }
  };

  const handleSelectEditMention = (username: string) => {
    if (!editTextareaRef.current) {
      setEditContent((prev) => prev.replace(/@([a-zA-Z0-9_\.]*)$/, `@${username} `));
      setIsEditMentionOpen(false);
      return;
    }
    const textarea = editTextareaRef.current;
    const cursorPos = textarea.selectionStart;
    const textBeforeCursor = editContent.slice(0, cursorPos);
    const textAfterCursor = editContent.slice(cursorPos);

    const updatedBefore = textBeforeCursor.replace(/@([a-zA-Z0-9_\.]*)$/, `@${username} `);
    const newContent = updatedBefore + textAfterCursor;
    setEditContent(newContent);
    setIsEditMentionOpen(false);

    setTimeout(() => {
      textarea.focus();
      const newCursor = updatedBefore.length;
      textarea.setSelectionRange(newCursor, newCursor);
    }, 10);
  };

  const saveEdit = async () => {
    if (!editContent.trim() || isSavingEdit) return;
    try {
      setIsSavingEdit(true);
      if (onEditMessage) {
        await onEditMessage(msg.id, editContent.trim());
      }
      setIsEditing(false);
    } catch (err) {
      console.error("Failed to edit message:", err);
      alert("Không thể cập nhật tin nhắn. Vui lòng thử lại.");
    } finally {
      setIsSavingEdit(false);
    }
  };

  return (
    <div className="flex flex-col w-full">
      {/* Date Divider */}
      {showDateDivider && (
        <div className="relative my-3 mx-4 flex items-center justify-center select-none">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-border" />
          </div>
          <span className="relative px-3 py-0.5 text-[0.72rem] font-semibold text-text-muted bg-chat border border-border rounded-full shadow-2xs">
            {formatDateDivider(msg.createdAt)}
          </span>
        </div>
      )}

      {/* Message Row */}
      <div
        id={`msg-${msg.id}`}
        className={`group relative flex flex-col w-full px-4 sm:px-5 rounded-none transition-colors duration-100 ${
          isMentioningMe
            ? "bg-accent-soft/20 border-l-2 border-accent-primary hover:bg-accent-soft/30"
            : "hover:bg-surface"
        } ${isConsecutive ? "py-0.5" : "py-1.5 mt-2"}`}
      >
        {/* In-line Quote Reply Preview */}
        {msg.replyTo && (
          <div
            onClick={() => onJumpToMessage(msg.replyTo!.id)}
            className="flex items-center gap-1.5 ml-8 pl-1 mb-1 text-[0.78rem] text-text-muted hover:text-text-primary cursor-pointer select-none group/reply truncate max-w-2xl"
            title="Chuyển đến tin nhắn gốc"
          >
            <div className="w-5 h-2.5 border-l-2 border-t-2 border-border group-hover/reply:border-accent-primary rounded-tl -mr-0.5 mt-1 shrink-0 transition-colors" />
            <img
              src={getMediaUrl(msg.replyTo.senderAvatarUrl) || "/default-avatar.png"}
              alt={msg.replyTo.senderDisplayName}
              className="w-4 h-4 rounded-full object-cover shrink-0"
              onError={(e) => {
                e.currentTarget.src = "/default-avatar.png";
              }}
            />
            <span className="font-semibold text-text-secondary group-hover/reply:text-accent-primary group-hover/reply:underline shrink-0">
              @{msg.replyTo.senderDisplayName}
            </span>
            <span className="truncate italic text-text-muted group-hover/reply:text-text-primary">
              {msg.replyTo.isDeleted
                ? "Tin nhắn đã bị xóa"
                : msg.replyTo.content || "Tệp đính kèm"}
            </span>
          </div>
        )}

        <div className="flex items-start gap-3 w-full">
          {/* Left Gutter: Avatar (if new block) OR hover timestamp (if consecutive, centered) */}
          {isConsecutive ? (
            <div className="w-10 shrink-0 flex items-center justify-center select-none pt-0.5">
              <span className="opacity-0 group-hover:opacity-100 text-[11px] text-text-muted font-mono tabular-nums text-center transition-opacity">
                {timeStr}
              </span>
            </div>
          ) : (
            <div
              onClick={(e) => {
                e.stopPropagation();
                const rect = e.currentTarget.getBoundingClientRect();
                const member = workspaceMembers?.find((m) => m.id === msg.senderId);
                onOpenUserProfile?.(
                  {
                    id: msg.senderId,
                    displayName: member?.displayName || msg.senderDisplayName,
                    username:
                      member?.username ||
                      msg.senderUsername ||
                      msg.senderDisplayName.toLowerCase().replace(/\s+/g, ""),
                    avatarUrl: member?.avatarUrl || msg.senderAvatarUrl || undefined,
                    email: member?.email,
                    role: member?.role,
                    status: member?.status,
                  },
                  rect
                );
              }}
              title="Xem thông tin thành viên"
              className="w-10 h-10 rounded-full shrink-0 overflow-hidden flex items-center justify-center font-bold text-[0.82rem] text-white shadow-xs border border-border cursor-pointer hover:opacity-95 hover:scale-105 active:scale-95 transition-all ring-1 ring-transparent hover:ring-accent-primary/40"
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
                <span
                  onClick={(e) => {
                    e.stopPropagation();
                    const rect = e.currentTarget.getBoundingClientRect();
                    const member = workspaceMembers?.find((m) => m.id === msg.senderId);
                    onOpenUserProfile?.(
                      {
                        id: msg.senderId,
                        displayName: member?.displayName || msg.senderDisplayName,
                        username:
                          member?.username ||
                          msg.senderUsername ||
                          msg.senderDisplayName.toLowerCase().replace(/\s+/g, ""),
                        avatarUrl: member?.avatarUrl || msg.senderAvatarUrl || undefined,
                        email: member?.email,
                        role: member?.role,
                        status: member?.status,
                      },
                      rect
                    );
                  }}
                  className="text-[0.9rem] font-semibold text-text-primary hover:underline cursor-pointer"
                >
                  {msg.senderDisplayName}
                </span>

                {/* Role badge */}
                {(() => {
                  const isDm =
                    currentChannel?.type === ChannelType.DirectMessage ||
                    currentChannel?.type === 2;
                  const memberRole = workspaceMembers?.find((m) => m.id === msg.senderId)?.role;

                  if (isDm) {
                    return isMe ? (
                      <span className="bg-accent-soft text-accent-primary text-[0.65rem] px-1.5 py-0.25 rounded font-bold uppercase">
                        YOU
                      </span>
                    ) : null;
                  }

                  if (isMe) {
                    return (
                      <span className="bg-accent-soft text-accent-primary text-[0.65rem] px-1.5 py-0.25 rounded font-bold uppercase">
                        YOU
                      </span>
                    );
                  }

                  if (memberRole === "Owner" || memberRole === "Admin") {
                    return (
                      <span className="bg-accent-soft text-accent-primary text-[0.65rem] px-1.5 py-0.25 rounded font-bold uppercase">
                        {memberRole.toUpperCase()}
                      </span>
                    );
                  }

                  return null;
                })()}

                <span className="text-[0.72rem] text-text-muted">{timeStr}</span>

                {msg.isEdited && (
                  <span className="text-[0.7rem] text-text-muted italic select-none">
                    (đã chỉnh sửa)
                  </span>
                )}

                {isPinned && (
                  <span
                    className="inline-flex items-center gap-0.5 text-[0.7rem] text-warning font-semibold px-1 rounded bg-warning-soft border border-warning/20"
                    title="Tin nhắn đã ghim"
                  >
                    <PushPin size={10} weight="fill" />
                    <span>Đã ghim</span>
                  </span>
                )}
              </div>
            )}

            {/* Message Content or Inline Edit Box */}
            {isEditing ? (
              <div className="mt-1 flex flex-col gap-2 p-2 rounded-control bg-chat border border-accent-primary shadow-sm relative">
                {/* Mention Autocomplete Popover for Edit Box */}
                <MentionAutocompletePopover
                  isOpen={isEditMentionOpen}
                  query={editMentionQuery}
                  members={workspaceMembers}
                  onSelect={handleSelectEditMention}
                  onClose={() => setIsEditMentionOpen(false)}
                />

                {/* Textarea for Editing Message */}
                <div className="relative w-full">
                  <textarea
                    ref={editTextareaRef}
                    value={editContent}
                    onChange={handleEditInputChange}
                    onKeyDown={(e) => {
                      if (e.defaultPrevented) return;
                      if (isEditMentionOpen) {
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
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        saveEdit();
                      } else if (e.key === "Escape") {
                        setIsEditing(false);
                        setIsEditMentionOpen(false);
                      }
                    }}
                    rows={2}
                    autoFocus
                    className="bg-transparent border-none outline-none text-[0.92rem] text-text-primary placeholder:text-text-muted resize-none w-full leading-normal"
                  />
                </div>

                <div className="flex items-center justify-between text-xs pt-1 border-t border-border">
                  <span className="text-[11px] text-text-muted">
                    Enter để lưu · Escape để huỷ
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        setIsEditing(false);
                        setIsEditMentionOpen(false);
                      }}
                      className="px-2.5 py-1 rounded text-xs text-text-secondary hover:bg-surface cursor-pointer"
                    >
                      Huỷ
                    </button>
                    <button
                      type="button"
                      onClick={saveEdit}
                      disabled={isSavingEdit || !editContent.trim()}
                      className="px-3 py-1 rounded text-xs font-semibold bg-accent-primary text-white hover:bg-accent-hover cursor-pointer disabled:opacity-50"
                    >
                      {isSavingEdit ? "Đang lưu..." : "Lưu thay đổi"}
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <>
                {msg.content ? (
                  <div className="text-[0.92rem] leading-relaxed text-text-primary break-words whitespace-pre-wrap">
                    <MessageContent
                      content={msg.content}
                      currentUsername={currentUser?.username}
                    />
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
                              className="flex items-center gap-2.5 p-2 rounded-control bg-chat border border-border hover:border-accent-primary max-w-sm transition-all group/file text-left"
                            >
                              <div className="w-8 h-8 rounded-control bg-surface border border-border flex items-center justify-center text-text-muted group-hover/file:text-accent-primary shrink-0">
                                <FileText size={18} />
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="text-xs font-medium text-text-primary truncate">
                                  {file.fileName}
                                </div>
                                <div className="text-[10px] text-text-muted">
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
                    onClick={() => onToggleReaction(msg.id, r.emoji)}
                    className={`border rounded-md px-2 py-0.5 text-[0.78rem] font-medium inline-flex items-center gap-1.5 cursor-pointer select-none transition-colors duration-100 active:scale-95 ${
                      r.hasReacted
                        ? "bg-accent-soft border-accent-primary text-accent-primary"
                        : "bg-surface border-border text-text-secondary hover:border-border-hover hover:bg-surface-active"
                    }`}
                  >
                    <span>{r.emoji}</span>
                    <span>{r.count}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Toolbar on Hover */}
        <div className="absolute -top-3.5 right-4 bg-chat border border-border rounded-control p-0.5 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 group-hover:translate-y-0 translate-y-1 transition-all duration-150 shadow-raised z-10">
          {/* Quick Emojis */}
          {QUICK_EMOJIS.slice(0, 3).map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={() => onToggleReaction(msg.id, emoji)}
              className="p-1 px-1.5 text-sm hover:scale-125 active:scale-95 transition-transform cursor-pointer rounded select-none"
              title={`Thả cảm xúc ${emoji}`}
            >
              {emoji}
            </button>
          ))}

          <div className="w-px h-4 bg-border mx-0.5" />

          {/* Quote Reply */}
          <button
            type="button"
            className="p-1.5 text-text-secondary hover:bg-surface hover:text-text-primary rounded-control text-xs transition-colors cursor-pointer"
            title="Trả lời"
            onClick={() => onReplyMessage(msg)}
          >
            <ArrowUUpLeft size={15} />
          </button>

          {/* Pin / Unpin Message */}
          <button
            type="button"
            className={`p-1.5 rounded-control text-xs transition-colors cursor-pointer ${
              isPinned
                ? "text-warning bg-warning-soft hover:bg-warning-soft/80"
                : "text-text-secondary hover:bg-surface hover:text-warning"
            }`}
            title={isPinned ? "Bỏ ghim tin nhắn" : "Ghim tin nhắn"}
            onClick={() =>
              isPinned ? onUnpinMessage?.(msg.id) : onPinMessage?.(msg.id)
            }
          >
            <PushPin size={15} weight={isPinned ? "fill" : "regular"} />
          </button>

          {/* Edit Message (Sender Only) */}
          {isMe && (
            <button
              type="button"
              className="p-1.5 text-text-secondary hover:bg-surface hover:text-text-primary rounded-control text-xs transition-colors cursor-pointer"
              title="Chỉnh sửa tin nhắn"
              onClick={startEdit}
            >
              <PencilSimple size={15} />
            </button>
          )}

          {/* Delete Message (Sender or Admin/Mod with ManageMessages) */}
          {(isMe || canManageMessages || isAdmin) && (
            <button
              type="button"
              className="p-1.5 text-danger hover:bg-danger-soft rounded-control text-xs transition-colors cursor-pointer"
              title={isMe ? "Xoá tin nhắn" : "Xoá tin nhắn (Quản trị viên)"}
              onClick={() => onDeleteMessage(msg)}
            >
              <Trash size={15} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
});

MessageItem.displayName = "MessageItem";
