import React, { useState, useEffect, useRef } from "react";
import {
  MagnifyingGlass,
  Users,
  At,
  Hash,
  PushPin,
  Phone,
  VideoCamera,
  ChatTeardropText,
  X,
  CircleNotch,
} from "@phosphor-icons/react";
import { Avatar } from "../ui";
import { ChannelType, type Channel, type Message, type User, type PinnedMessage } from "../../types";
import { messageApi, webrtcService } from "../../services";
import { StickyPinBar } from "./StickyPinBar";
import { DeleteMessageModal } from "./DeleteMessageModal";
import { MessageList, type MessageListHandle } from "./MessageList";
import { MessageComposer, type MessageComposerHandle } from "./MessageComposer";
import { JumpToPresentBar } from "./JumpToPresentBar";
import { useChatStore, useUiStore } from "../../stores";
import { useVoiceStore } from "../../stores/useVoiceStore";
import { usePermissions } from "../../hooks/usePermissions";
import { useConnectionStatus } from "../../hooks/useConnectionStatus";
import { VoiceStage } from "./VoiceStage";
import type { DirectMessageItem, DirectMessageUser } from "../dm";
import type { UserProfileData } from "../profile";

interface ChatAreaProps {
  currentChannel: Channel | null;
  activeDm?: DirectMessageItem | null;
  messages: Message[];
  currentUser: User | null;
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
  onEditMessage?: (messageId: string, content: string) => Promise<void>;
  onDeleteMessage?: (messageId: string) => Promise<void>;
  onToggleReaction?: (messageId: string, emoji: string) => Promise<void>;
  onStartTyping: () => void;
  onStopTyping: () => void;
  typingUser: string | null;
  onStartDmWithUser?: (user: {
    id: string;
    displayName: string;
    username: string;
    avatarUrl?: string;
  }) => void;
  onOpenUserProfile?: (user: UserProfileData, anchorRect?: DOMRect) => void;
  hasMoreMessages?: boolean;
  isLoadingMore?: boolean;
  hasNewerMessages?: boolean;
  isLoadingNewer?: boolean;
  isLoadingMessages?: boolean;
  onLoadMoreMessages?: () => Promise<void>;
  onLoadNewerMessages?: () => Promise<void>;
  onJumpToPresent?: () => Promise<void>;
  workspaceMembers?: DirectMessageUser[];
  isMemberListOpen?: boolean;
  onToggleMemberList?: () => void;
  pinnedMessages?: PinnedMessage[];
  onPinMessage?: (messageId: string) => Promise<void>;
  onUnpinMessage?: (messageId: string) => Promise<void>;
  isPinnedSidebarOpen?: boolean;
  onTogglePinnedSidebar?: () => void;
  onJumpToMessage?: (messageId: string) => Promise<void> | void;
}

export const ChatArea: React.FC<ChatAreaProps> = ({
  currentChannel,
  activeDm,
  messages,
  currentUser,
  onSendMessage,
  onEditMessage,
  onDeleteMessage,
  onToggleReaction,
  onStartTyping,
  onStopTyping,
  typingUser,
  onOpenUserProfile,
  hasMoreMessages = false,
  isLoadingMore = false,
  hasNewerMessages = false,
  isLoadingNewer = false,
  isLoadingMessages = false,
  onLoadMoreMessages,
  onLoadNewerMessages,
  onJumpToPresent,
  workspaceMembers = [],
  isMemberListOpen = false,
  onToggleMemberList,
  pinnedMessages = [],
  onPinMessage,
  onUnpinMessage,
  isPinnedSidebarOpen = false,
  onTogglePinnedSidebar,
  onJumpToMessage,
}) => {
  const isSearchOpen = useUiStore((state) => state.isSearchOpen);
  const toggleSearch = useUiStore((state) => state.toggleSearch);

  const { canSendMessages, canAttachFiles, canManageMessages, isAdmin } = usePermissions(
    currentChannel?.permissions
  );
  const connectionStatus = useConnectionStatus();

  const [isStickyDismissed, setIsStickyDismissed] = useState(false);
  const [replyingToMessage, setReplyingToMessage] = useState<Message | null>(null);
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  const [unreadBelowCount, setUnreadBelowCount] = useState(0);

  const messageListRef = useRef<MessageListHandle>(null);
  const sidebarMessageListRef = useRef<MessageListHandle>(null);
  const composerRef = useRef<MessageComposerHandle>(null);
  const sidebarComposerRef = useRef<MessageComposerHandle>(null);

  // Drag & drop files onto the chat area
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const dragDepthRef = useRef(0);
  const hasFiles = (e: React.DragEvent) => Array.from(e.dataTransfer?.types ?? []).includes("Files");
  const buildDragProps = (target: React.RefObject<MessageComposerHandle | null>) => ({
    onDragEnter: (e: React.DragEvent) => {
      if (!hasFiles(e)) return;
      e.preventDefault();
      dragDepthRef.current += 1;
      setIsDraggingFile(true);
    },
    onDragOver: (e: React.DragEvent) => {
      if (!hasFiles(e)) return;
      e.preventDefault();
    },
    onDragLeave: (e: React.DragEvent) => {
      if (!hasFiles(e)) return;
      dragDepthRef.current = Math.max(0, dragDepthRef.current - 1);
      if (dragDepthRef.current === 0) setIsDraggingFile(false);
    },
    onDrop: (e: React.DragEvent) => {
      if (!hasFiles(e)) return;
      e.preventDefault();
      dragDepthRef.current = 0;
      setIsDraggingFile(false);
      target.current?.addFiles(Array.from(e.dataTransfer.files));
    },
  });
  const dropOverlay = isDraggingFile ? (
    <div className="absolute inset-0 z-40 flex items-center justify-center bg-overlay pointer-events-none animate-in fade-in duration-150">
      <div className="px-8 py-6 rounded-card border-2 border-dashed border-accent-primary bg-surface shadow-floating text-center">
        <p className="text-sm font-semibold text-text-primary">Thả tệp vào đây để tải lên</p>
        <p className="text-xs text-text-muted mt-1">Ảnh, video hoặc tài liệu (tối đa 100MB)</p>
      </div>
    </div>
  ) : null;

  // Voice Chat Split Layout States
  const { isTextChatOpen, toggleTextChat, leaveVoice } = useVoiceStore();
  const [voiceChatWidth, setVoiceChatWidth] = useState<number>(380);
  const [isResizingVoiceChat, setIsResizingVoiceChat] = useState<boolean>(false);

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

  // Reset states when channel changes
  useEffect(() => {
    setIsStickyDismissed(false);
    setReplyingToMessage(null);
    setShowScrollToBottom(false);
    setUnreadBelowCount(0);
  }, [currentChannel?.id]);

  // Jump to message (e.g. from PinBar or Quote Reply)
  const handleJumpToMessage = async (messageId: string) => {
    const listRef = isTextChatOpen && isVoice ? sidebarMessageListRef : messageListRef;
    const handled = listRef.current?.scrollToMessage(messageId);
    if (!handled && onJumpToMessage) {
      await onJumpToMessage(messageId);
    }
  };

  const handleJumpToPresentClick = async () => {
    if (onJumpToPresent) {
      await onJumpToPresent();
    }
    const listRef = isTextChatOpen && isVoice ? sidebarMessageListRef : messageListRef;
    listRef.current?.scrollToBottom("smooth");
    setShowScrollToBottom(false);
    setUnreadBelowCount(0);
  };

  const handleScrollToBottomClick = () => {
    const listRef = isTextChatOpen && isVoice ? sidebarMessageListRef : messageListRef;
    listRef.current?.scrollToBottom("smooth");
    setShowScrollToBottom(false);
    setUnreadBelowCount(0);
  };

  // Delete handlers
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

  // Toggle reaction with optimistic update
  const handleReactionClick = (msgId: string, emoji: string) => {
    if (currentUser?.id) {
      const targetMsg = messages.find((m) => m.id === msgId);
      const currentGroup = targetMsg?.reactions?.find((r) => r.emoji === emoji);
      const willAdd = !currentGroup?.hasReacted;

      useChatStore.getState().applyReactionDelta(
        {
          messageId: msgId,
          emoji,
          userId: currentUser.id,
          isAdded: willAdd,
        } as any,
        currentUser.id
      );
    }

    if (onToggleReaction) {
      onToggleReaction(msgId, emoji);
    } else {
      messageApi.toggleReaction(msgId, emoji);
    }
  };

  // Voice Chat resizer
  const handleVoiceChatResizeStart = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizingVoiceChat(true);
    const startX = e.clientX;
    const startWidth = voiceChatWidth;

    const onMouseMove = (moveEvent: MouseEvent) => {
      const delta = startX - moveEvent.clientX;
      const newWidth = Math.max(280, Math.min(650, startWidth + delta));
      setVoiceChatWidth(newWidth);
    };

    const onMouseUp = () => {
      setIsResizingVoiceChat(false);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  };

  const isDm = Boolean(
    activeDm ||
      (currentChannel &&
        (currentChannel.type === 2 || currentChannel.type === ChannelType.DirectMessage))
  );
  const dmUser = activeDm?.user;
  const isVoice = Boolean(currentChannel && currentChannel.type === ChannelType.Voice);

  const handleStartCall = (isVideo: boolean) => {
    const target = dmUser || workspaceMembers?.find((m) => m.id !== currentUser?.id);
    if (!target) return;
    webrtcService.startCall(
      {
        id: target.id,
        displayName: target.displayName || target.username,
        avatarUrl: target.avatarUrl,
      },
      isVideo
    );
  };

  const renderHeaderContent = () => (
    <div className="h-[54px] border-b border-border px-5 flex items-center justify-between bg-chat shrink-0 select-none">
      <div className="flex items-center gap-2.5 min-w-0">
        {isDm && dmUser ? (
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="relative shrink-0">
              <Avatar
                src={dmUser.avatarUrl}
                fallback={dmUser.displayName || dmUser.username}
                size="sm"
              />
              <span
                className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full ring-2 ring-chat ${
                  dmUser.status === "online"
                    ? "bg-status-online"
                    : dmUser.status === "dnd"
                    ? "bg-status-dnd"
                    : dmUser.status === "away"
                    ? "bg-status-away"
                    : "bg-text-muted"
                }`}
              />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm font-bold text-text-primary truncate leading-tight">
                {dmUser.displayName}
              </h2>
              <p className="text-[11px] text-text-muted truncate leading-tight">
                {dmUser.status === "online"
                  ? "Đang hoạt động"
                  : dmUser.status === "dnd"
                  ? "Không làm phiền"
                  : dmUser.status === "away"
                  ? "Chờ"
                  : "Ngoại tuyến"}
              </p>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2 min-w-0">
            {currentChannel &&
            (currentChannel.type === 2 || currentChannel.type === ChannelType.DirectMessage) ? (
              <At size={19} className="text-text-muted shrink-0" />
            ) : (
              <Hash size={19} className="text-text-muted shrink-0" />
            )}
            <h2 className="text-sm font-bold text-text-primary truncate">
              {currentChannel ? currentChannel.name : "NomNa"}
            </h2>
          </div>
        )}
      </div>

      <div className="flex items-center gap-1">
        {isDm && (
          <>
            <button
              type="button"
              onClick={() => handleStartCall(false)}
              className="p-1.5 rounded-control text-text-muted hover:text-text-primary hover:bg-surface-active transition-colors cursor-pointer inline-flex items-center justify-center"
              title="Bắt đầu cuộc gọi thoại"
            >
              <Phone size={17} weight="bold" />
            </button>
            <button
              type="button"
              onClick={() => handleStartCall(true)}
              className="p-1.5 rounded-control text-text-muted hover:text-text-primary hover:bg-surface-active transition-colors cursor-pointer inline-flex items-center justify-center"
              title="Bắt đầu cuộc gọi video"
            >
              <VideoCamera size={17} weight="bold" />
            </button>
          </>
        )}

        <button
          type="button"
          onClick={toggleSearch}
          className={`p-1.5 rounded-control transition-colors cursor-pointer inline-flex items-center justify-center ${
            isSearchOpen
              ? "text-accent-primary bg-accent-soft"
              : "text-text-muted hover:text-text-primary hover:bg-surface-active"
          }`}
          title={isSearchOpen ? "Đóng tìm kiếm" : "Tìm kiếm tin nhắn"}
        >
          <MagnifyingGlass size={17} weight={isSearchOpen ? "bold" : "regular"} />
        </button>

        {!isDm && (
          <button
            type="button"
            onClick={onToggleMemberList}
            className={`p-1.5 rounded-control transition-colors cursor-pointer inline-flex items-center justify-center ${
              isMemberListOpen
                ? "text-accent-primary bg-accent-soft"
                : "text-text-muted hover:text-text-primary hover:bg-surface-active"
            }`}
            title={isMemberListOpen ? "Ẩn danh sách thành viên" : "Hiển thị danh sách thành viên"}
          >
            <Users size={17} weight={isMemberListOpen ? "bold" : "regular"} />
          </button>
        )}

        <button
          type="button"
          onClick={onTogglePinnedSidebar}
          className={`p-1.5 rounded-control transition-colors cursor-pointer relative inline-flex items-center justify-center ${
            isPinnedSidebarOpen
              ? "text-warning bg-warning-soft"
              : pinnedMessages && pinnedMessages.length > 0
              ? "text-warning hover:bg-surface-active"
              : "text-text-muted hover:text-text-primary hover:bg-surface-active"
          }`}
          title={isPinnedSidebarOpen ? "Đóng danh sách ghim" : "Xem tin nhắn đã ghim"}
        >
          <PushPin
            size={17}
            weight={
              isPinnedSidebarOpen || (pinnedMessages && pinnedMessages.length > 0)
                ? "fill"
                : "regular"
            }
          />
          {pinnedMessages && pinnedMessages.length > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[15px] h-[15px] px-1 bg-warning text-black text-[9px] font-bold rounded-full flex items-center justify-center shadow">
              {pinnedMessages.length}
            </span>
          )}
        </button>
      </div>
    </div>
  );

  const renderChatStreamAndInput = (isSidebar: boolean = false) => (
    <>
      {/* Sticky Pin Bar (Zalo Style) */}
      {!isStickyDismissed && pinnedMessages && pinnedMessages.length > 0 && (
        <StickyPinBar
          pinnedMessages={pinnedMessages}
          onJumpToMessage={handleJumpToMessage}
          onOpenSidebar={() => onTogglePinnedSidebar?.()}
          onDismiss={() => setIsStickyDismissed(true)}
        />
      )}

      {/* Virtualized Message List */}
      <MessageList
        ref={isSidebar ? sidebarMessageListRef : messageListRef}
        messages={messages}
        currentChannel={currentChannel}
        currentUser={currentUser}
        workspaceMembers={workspaceMembers}
        pinnedMessages={pinnedMessages}
        canManageMessages={canManageMessages}
        isAdmin={isAdmin}
        hasMoreMessages={hasMoreMessages}
        isLoadingMore={isLoadingMore}
        hasNewerMessages={hasNewerMessages}
        isLoadingNewer={isLoadingNewer}
        isLoadingMessages={isLoadingMessages}
        onLoadMoreMessages={onLoadMoreMessages}
        onLoadNewerMessages={onLoadNewerMessages}
        onJumpToMessage={handleJumpToMessage}
        onOpenUserProfile={onOpenUserProfile}
        onReplyMessage={(msg) => setReplyingToMessage(msg)}
        onEditMessage={onEditMessage}
        onDeleteMessage={handleDeleteClick}
        onToggleReaction={handleReactionClick}
        onPinMessage={onPinMessage}
        onUnpinMessage={onUnpinMessage}
        onAtBottomChange={(isAtBottom) => setShowScrollToBottom(!isAtBottom)}
        onUnreadCountChange={setUnreadBelowCount}
      />

      {/* Floating Historical Notice / Jump to Present */}
      <JumpToPresentBar
        hasNewerMessages={hasNewerMessages}
        isLoadingNewer={isLoadingNewer}
        showScrollToBottom={showScrollToBottom}
        unreadBelowCount={unreadBelowCount}
        onJumpToPresent={handleJumpToPresentClick}
        onScrollToBottom={handleScrollToBottomClick}
        isSidebar={isSidebar}
      />

      {/* Typing indicator */}
      {Boolean(typingUser) && (
        <div className="px-5 py-1 text-xs text-text-muted flex items-center justify-between shrink-0 animate-in fade-in duration-150">
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

      {/* Message Composer Input Box */}
      <MessageComposer
        ref={isSidebar ? sidebarComposerRef : composerRef}
        channelId={currentChannel?.id}
        channelName={currentChannel?.name}
        channelType={currentChannel?.type}
        isDm={isDm}
        canSendMessages={canSendMessages}
        canAttachFiles={canAttachFiles}
        replyingToMessage={replyingToMessage}
        onCancelReply={() => setReplyingToMessage(null)}
        onSendMessage={onSendMessage}
        onStartTyping={onStartTyping}
        onStopTyping={onStopTyping}
        workspaceMembers={workspaceMembers}
        isSidebar={isSidebar}
        onSendSuccess={() => {
          const targetRef = isSidebar ? sidebarMessageListRef : messageListRef;
          targetRef.current?.scrollToBottom("smooth");
          setShowScrollToBottom(false);
          setUnreadBelowCount(0);
        }}
      />
    </>
  );

  if (isVoice && currentChannel) {
    return (
      <section
        className="flex-1 h-full min-h-0 bg-chat flex overflow-hidden relative"
        {...buildDragProps(sidebarComposerRef)}
      >
        {dropOverlay}
        {/* Left Voice Stage Canvas */}
        <div className="flex-1 min-w-0 h-full flex flex-col overflow-hidden">
          <VoiceStage
            currentChannel={currentChannel}
            currentUser={currentUser}
            isChatOpen={isTextChatOpen}
            onToggleChat={toggleTextChat}
            onLeaveVoice={leaveVoice}
          />
        </div>

        {/* Resizer Divider + In-Voice Chat Sidebar on Right */}
        {isTextChatOpen && (
          <>
            <div
              className={`w-1 cursor-col-resize relative z-25 shrink-0 transition-colors duration-150 select-none hover:bg-accent-primary after:content-[''] after:absolute after:top-0 after:bottom-0 after:-left-[3px] after:-right-[3px] after:z-26 ${
                isResizingVoiceChat
                  ? "bg-accent-primary shadow-[0_0_8px_var(--accent-glow)]"
                  : "bg-border"
              }`}
              onMouseDown={handleVoiceChatResizeStart}
              title="Kéo sang trái/phải để chỉnh độ rộng chat"
            />

            <div
              style={{ width: `${voiceChatWidth}px` }}
              className="h-full flex flex-col shrink-0 overflow-hidden bg-chat border-l border-border relative"
            >
              <div className="h-[54px] border-b border-border px-4 flex items-center justify-between bg-chat shrink-0 select-none">
                <div className="flex items-center gap-2 min-w-0">
                  <ChatTeardropText size={18} weight="bold" className="text-text-muted shrink-0" />
                  <h2 className="text-sm font-bold text-text-primary truncate">
                    #{currentChannel.name}
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={toggleTextChat}
                  className="p-1.5 rounded-control text-text-muted hover:text-text-primary hover:bg-surface-active transition-colors cursor-pointer"
                  title="Đóng trò chuyện văn bản"
                >
                  <X size={16} weight="bold" />
                </button>
              </div>

              {renderChatStreamAndInput(true)}
            </div>
          </>
        )}

        <DeleteMessageModal
          isOpen={deleteModalState.isOpen}
          onClose={() => setDeleteModalState({ isOpen: false, messageId: null, preview: "" })}
          onConfirm={handleConfirmDelete}
          messagePreview={deleteModalState.preview}
          isDeleting={isDeletingMessage}
        />
      </section>
    );
  }

  return (
    <section
      className="flex-1 h-full min-h-0 bg-chat flex flex-col overflow-hidden relative"
      {...buildDragProps(composerRef)}
    >
      {dropOverlay}
      {renderHeaderContent()}

      {connectionStatus !== "connected" && (
        <div
          role="status"
          className={`w-full py-1.5 px-4 text-xs font-medium flex items-center justify-center gap-2 select-none z-20 shrink-0 transition-colors animate-in fade-in duration-150 ${
            connectionStatus === "reconnecting"
              ? "bg-warning/15 text-warning border-b border-warning/20"
              : "bg-danger/15 text-danger border-b border-danger/20"
          }`}
        >
          <CircleNotch size={13} className="animate-spin shrink-0" />
          <span>
            {connectionStatus === "reconnecting"
              ? "Mất kết nối tạm thời. NomNa đang tự động kết nối lại..."
              : "Đã ngắt kết nối với máy chủ. Vui lòng kiểm tra đường truyền mạng."}
          </span>
        </div>
      )}

      {renderChatStreamAndInput(false)}

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
