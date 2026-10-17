import {
  useState,
  useEffect,
  useRef,
  useMemo,
  useCallback,
  forwardRef,
  useImperativeHandle,
} from "react";
import { Virtuoso, type VirtuosoHandle, type StateSnapshot } from "react-virtuoso";
import { CircleNotch, HandWaving, ArrowUp } from "@phosphor-icons/react";
import { getReadMarker, setReadMarker } from "../../utils/readMarkers";
import { ChannelType, type Channel, type Message, type User, type PinnedMessage } from "../../types";
import { MessageItem } from "./MessageItem";
import { ChatAreaSkeleton } from "./ChatAreaSkeleton";
import type { DirectMessageUser } from "../dm";
import type { UserProfileData } from "../profile";

export interface MessageListHandle {
  scrollToBottom: (behavior?: "auto" | "smooth") => void;
  scrollToMessage: (messageId: string) => boolean;
}

export interface MessageListProps {
  messages: Message[];
  currentChannel: Channel | null;
  currentUser: User | null;
  workspaceMembers?: DirectMessageUser[];
  pinnedMessages?: PinnedMessage[];
  canManageMessages?: boolean;
  isAdmin?: boolean;
  hasMoreMessages?: boolean;
  isLoadingMore?: boolean;
  hasNewerMessages?: boolean;
  isLoadingNewer?: boolean;
  isLoadingMessages?: boolean;
  onLoadMoreMessages?: () => Promise<void> | void;
  onLoadNewerMessages?: () => Promise<void> | void;
  onJumpToMessage?: (messageId: string) => Promise<void> | void;
  onOpenUserProfile?: (user: UserProfileData, anchorRect?: DOMRect) => void;
  onReplyMessage: (msg: Message) => void;
  onEditMessage?: (messageId: string, content: string) => Promise<void>;
  onDeleteMessage: (msg: Message) => void;
  onToggleReaction: (messageId: string, emoji: string) => void;
  onPinMessage?: (messageId: string) => void;
  onUnpinMessage?: (messageId: string) => void;
  onAtBottomChange?: (isAtBottom: boolean) => void;
  onUnreadCountChange?: (count: number | ((prev: number) => number)) => void;
}

interface ChannelScrollState {
  snapshot?: StateSnapshot;
  firstItemIndex: number;
  isAtBottom: boolean;
  topMessageId?: string;
}

const START_INDEX = 100000;

export const MessageList = forwardRef<MessageListHandle, MessageListProps>(
  (
    {
      messages,
      currentChannel,
      currentUser,
      workspaceMembers = [],
      pinnedMessages = [],
      canManageMessages = false,
      isAdmin = false,
      hasMoreMessages = false,
      isLoadingMore = false,
      hasNewerMessages = false,
      isLoadingNewer = false,
      isLoadingMessages = false,
      onLoadMoreMessages,
      onLoadNewerMessages,
      onJumpToMessage,
      onOpenUserProfile,
      onReplyMessage,
      onEditMessage,
      onDeleteMessage,
      onToggleReaction,
      onPinMessage,
      onUnpinMessage,
      onAtBottomChange,
      onUnreadCountChange,
    },
    ref
  ) => {
    const virtuosoRef = useRef<VirtuosoHandle>(null);
    const [firstItemIndex, setFirstItemIndex] = useState(START_INDEX);
    const firstItemIndexRef = useRef(START_INDEX);
    const prevMessagesRef = useRef<Message[]>(messages);
    const activeChannelIdRef = useRef<string | null>(null);
    const isAtBottomRef = useRef(true);
    const currentTopMessageIdRef = useRef<string | undefined>(undefined);

    // Per-channel scroll coordinate & layout state cache
    const channelScrollCache = useRef<Map<string, ChannelScrollState>>(new Map());
    const [restoreSnapshot, setRestoreSnapshot] = useState<StateSnapshot | undefined>(undefined);

    // Keep firstItemIndexRef in sync with state
    useEffect(() => {
      firstItemIndexRef.current = firstItemIndex;
    }, [firstItemIndex]);

    // Only show full skeleton if messages are empty AND loading has been ongoing for > 300ms
    const [showSkeleton, setShowSkeleton] = useState(false);
    useEffect(() => {
      let timer: any;
      if (isLoadingMessages && messages.length === 0) {
        timer = setTimeout(() => {
          setShowSkeleton(true);
        }, 300);
      } else {
        setShowSkeleton(false);
      }
      return () => {
        if (timer) clearTimeout(timer);
      };
    }, [isLoadingMessages, messages.length]);

    // Track pinned message IDs for fast O(1) lookup
    const pinnedMessageIds = useMemo(() => {
      return new Set(pinnedMessages.map((p) => p.messageId));
    }, [pinnedMessages]);

    // ---- Unread tracking (Discord/Slack style) ----
    // Captured once per channel entry, BEFORE the marker advances, so the divider
    // stays put while the user reads. Live messages (created after entry) never
    // get a divider.
    const channelId = currentChannel?.id;
    const unreadEntry = useMemo(() => {
      if (!channelId) return null;
      const marker = getReadMarker(channelId);
      return marker ? { channelId, marker: Date.parse(marker), entryTime: Date.now() } : null;
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [channelId]);

    const { firstUnreadId, unreadCount } = useMemo(() => {
      if (!unreadEntry || unreadEntry.channelId !== channelId) {
        return { firstUnreadId: null as string | null, unreadCount: 0 };
      }
      const isUnread = (m: Message) => {
        const t = Date.parse(m.createdAt);
        return (
          t > unreadEntry.marker &&
          t <= unreadEntry.entryTime &&
          m.senderId !== currentUser?.id &&
          !m.id.startsWith("temp-")
        );
      };
      const idx = messages.findIndex(isUnread);
      if (idx === -1) return { firstUnreadId: null as string | null, unreadCount: 0 };
      return {
        firstUnreadId: messages[idx].id,
        unreadCount: messages.slice(idx).filter(isUnread).length,
      };
    }, [unreadEntry, channelId, messages, currentUser?.id]);

    const [isUnreadAbove, setIsUnreadAbove] = useState(false);
    const [unreadPillDismissed, setUnreadPillDismissed] = useState(false);
    useEffect(() => {
      setUnreadPillDismissed(false);
      setIsUnreadAbove(false);
    }, [channelId]);

    // Advance the read marker while the user is looking at the newest messages
    const advanceReadMarker = useCallback(() => {
      const last = messages[messages.length - 1];
      if (!channelId || !last || last.id.startsWith("temp-")) return;
      if (last.channelId && last.channelId !== channelId) return;
      if (isAtBottomRef.current && !hasNewerMessages) {
        setReadMarker(channelId, last.createdAt);
      }
    }, [messages, channelId, hasNewerMessages]);

    useEffect(() => {
      advanceReadMarker();
    }, [advanceReadMarker]);

    // Handle channel switching: restore previous scroll position or default to bottom
    useEffect(() => {
      if (currentChannel?.id && currentChannel.id !== activeChannelIdRef.current) {
        const newId = currentChannel.id;
        activeChannelIdRef.current = newId;

        const cached = channelScrollCache.current.get(newId);
        if (cached && !cached.isAtBottom && cached.snapshot) {
          // User was scrolled up reading history in this channel!
          setFirstItemIndex(cached.firstItemIndex);
          firstItemIndexRef.current = cached.firstItemIndex;
          isAtBottomRef.current = false;
          onAtBottomChange?.(false);
          setRestoreSnapshot(cached.snapshot);
        } else {
          // User was at the bottom or visiting for the first time
          setFirstItemIndex(START_INDEX);
          firstItemIndexRef.current = START_INDEX;
          isAtBottomRef.current = true;
          onAtBottomChange?.(true);
          onUnreadCountChange?.(0);
          setRestoreSnapshot(undefined);
        }
      }
    }, [currentChannel?.id, onAtBottomChange, onUnreadCountChange]);

    // Handle prepending older messages: offset firstItemIndex so viewport doesn't jump
    useEffect(() => {
      const prev = prevMessagesRef.current;
      if (messages.length > prev.length) {
        const oldFirstId = prev[0]?.id;
        const newFirstId = messages[0]?.id;

        if (oldFirstId && newFirstId && oldFirstId !== newFirstId) {
          const prependCount = messages.findIndex((m) => m.id === oldFirstId);
          if (prependCount > 0) {
            setFirstItemIndex((current) => current - prependCount);
          }
        } else if (!isAtBottomRef.current) {
          // If messages arrived at bottom while user was scrolled up, increment unread count
          const added = messages.length - prev.length;
          onUnreadCountChange?.((c) => c + added);
        }
      }
      prevMessagesRef.current = messages;
    }, [messages, onUnreadCountChange]);

    // Function to highlight message in DOM
    const highlightMessage = useCallback((messageId: string) => {
      setTimeout(() => {
        const el = document.getElementById(`msg-${messageId}`);
        if (el) {
          el.classList.remove("animate-message-highlight");
          void el.offsetWidth;
          el.classList.add("animate-message-highlight");
          setTimeout(() => {
            el.classList.remove("animate-message-highlight");
          }, 2200);
        }
      }, 100);
    }, []);

    // Scroll to specific message handler using exact virtual index
    const handleJumpToMessage = useCallback(
      (messageId: string) => {
        const targetIndex = messages.findIndex((m) => m.id === messageId);
        if (targetIndex !== -1) {
          virtuosoRef.current?.scrollToIndex({
            index: firstItemIndex + targetIndex,
            align: "center",
            behavior: "smooth",
          });
          highlightMessage(messageId);
        } else if (onJumpToMessage) {
          onJumpToMessage(messageId);
        }
      },
      [messages, firstItemIndex, onJumpToMessage, highlightMessage]
    );

    // Save scroll snapshot on state changes
    const saveCurrentScrollState = useCallback(() => {
      if (currentChannel?.id) {
        virtuosoRef.current?.getState((snapshot) => {
          channelScrollCache.current.set(currentChannel.id, {
            snapshot,
            firstItemIndex: firstItemIndexRef.current,
            isAtBottom: isAtBottomRef.current,
            topMessageId: currentTopMessageIdRef.current,
          });
        });
      }
    }, [currentChannel?.id]);

    // Expose imperative handle to parent using exact virtual indices
    useImperativeHandle(ref, () => ({
      scrollToBottom: (behavior: "auto" | "smooth" = "smooth") => {
        if (messages.length > 0) {
          virtuosoRef.current?.scrollToIndex({
            index: firstItemIndex + messages.length - 1,
            align: "end",
            behavior,
          });
        }
      },
      scrollToMessage: (messageId: string) => {
        const targetIndex = messages.findIndex((m) => m.id === messageId);
        if (targetIndex !== -1) {
          virtuosoRef.current?.scrollToIndex({
            index: firstItemIndex + targetIndex,
            align: "center",
            behavior: "smooth",
          });
          highlightMessage(messageId);
          return true;
        }
        return false;
      },
    }));

    if (showSkeleton && messages.length === 0) {
      return (
        <div className="flex-1 min-h-0 w-full overflow-hidden flex flex-col relative bg-chat animate-in fade-in duration-300">
          <ChatAreaSkeleton />
        </div>
      );
    }

    return (
      <div className="flex-1 min-h-0 w-full overflow-hidden flex flex-col relative bg-chat">
        {/* Sleek top loading line indicator for non-intrusive feedback */}
        {isLoadingMessages && (
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-accent-soft overflow-hidden z-20 pointer-events-none">
            <div className="h-full bg-accent-primary animate-pulse w-full" />
          </div>
        )}

        {/* Jump to first unread (shown only while the divider is scrolled above the viewport) */}
        {firstUnreadId && isUnreadAbove && !unreadPillDismissed && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 z-30 animate-in fade-in slide-in-from-top-2 duration-150">
            <button
              type="button"
              onClick={() => {
                const idx = messages.findIndex((m) => m.id === firstUnreadId);
                if (idx !== -1) {
                  virtuosoRef.current?.scrollToIndex({
                    index: firstItemIndex + idx,
                    align: "start",
                    behavior: "smooth",
                  });
                }
                setUnreadPillDismissed(true);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-danger text-on-accent text-xs font-semibold shadow-floating hover:bg-danger-hover transition-colors cursor-pointer select-none"
              title="Nhảy tới tin nhắn chưa đọc đầu tiên"
            >
              <ArrowUp size={13} weight="bold" />
              <span>{unreadCount} tin nhắn mới</span>
            </button>
          </div>
        )}

        <Virtuoso
          key={currentChannel?.id || "empty-channel"}
          ref={virtuosoRef}
          firstItemIndex={firstItemIndex}
          initialTopMostItemIndex={
            restoreSnapshot
              ? undefined
              : messages.length > 0
              ? firstItemIndex + messages.length - 1
              : firstItemIndex
          }
          alignToBottom={!restoreSnapshot}
          restoreStateFrom={restoreSnapshot}
          data={messages}
          computeItemKey={(_index, msg) => msg.id}
          className="flex-1 w-full no-scrollbar"
          followOutput={(isAtBottom) => (isAtBottom ? "smooth" : false)}
          atBottomStateChange={(atBottom) => {
            isAtBottomRef.current = atBottom;
            onAtBottomChange?.(atBottom);
            if (atBottom) {
              onUnreadCountChange?.(0);
              advanceReadMarker();
            }
            saveCurrentScrollState();
          }}
          isScrolling={(isScrolling) => {
            if (!isScrolling) {
              saveCurrentScrollState();
            }
          }}
          rangeChanged={(range) => {
            const realIndex = range.startIndex - firstItemIndex;
            if (realIndex >= 0 && realIndex < messages.length) {
              currentTopMessageIdRef.current = messages[realIndex].id;
            }
            if (firstUnreadId) {
              const unreadIdx = messages.findIndex((m) => m.id === firstUnreadId);
              setIsUnreadAbove(unreadIdx !== -1 && realIndex > unreadIdx);
            }
          }}
          startReached={() => {
            if (hasMoreMessages && !isLoadingMore && onLoadMoreMessages) {
              onLoadMoreMessages();
            }
          }}
          endReached={() => {
            if (hasNewerMessages && !isLoadingNewer && onLoadNewerMessages) {
              onLoadNewerMessages();
            }
          }}
          components={{
            Header: () => (
              <div className="flex flex-col w-full">
                {/* Loading older messages spinner */}
                {isLoadingMore && (
                  <div className="py-2.5 flex items-center justify-center gap-2 text-xs text-text-muted select-none">
                    <CircleNotch size={16} className="animate-spin text-accent-primary" />
                    <span>Đang tải tin nhắn cũ hơn...</span>
                  </div>
                )}

                {/* Manual load more button if needed */}
                {!isLoadingMore && hasMoreMessages && (
                  <div className="py-2 text-center select-none">
                    <button
                      type="button"
                      onClick={() => onLoadMoreMessages?.()}
                      className="text-xs text-accent-primary hover:underline font-medium cursor-pointer px-3 py-1 rounded-control hover:bg-accent-soft transition-colors"
                    >
                      ↑ Tải thêm tin nhắn cũ
                    </button>
                  </div>
                )}

                {/* Channel Welcome Header when reached top of history */}
                {!hasMoreMessages && currentChannel ? (
                  <div className="pt-6 pb-4 px-5 mx-4 select-none flex flex-col gap-2 border-b border-border/50 mb-1">
                    <div className="w-12 h-12 rounded-2xl bg-accent-primary flex items-center justify-center text-white shadow-md shadow-accent-glow">
                      <HandWaving size={26} weight="fill" className="text-white" />
                    </div>
                    <h3 className="text-xl font-bold text-text-primary tracking-tight">
                      {currentChannel.type === 2 ||
                      currentChannel.type === ChannelType.DirectMessage
                        ? `Đoạn chat riêng với ${currentChannel.name}`
                        : `Chào mừng bạn đến với kênh #${currentChannel.name}!`}
                    </h3>
                    <p className="text-xs text-text-muted leading-relaxed">
                      {currentChannel.type === 2 ||
                      currentChannel.type === ChannelType.DirectMessage
                        ? `Đây là sự bắt đầu của lịch sử trò chuyện trực tiếp giữa bạn và ${currentChannel.name}. Tin nhắn được bảo mật riêng tư.`
                        : `Điểm bắt đầu cho cuộc trò chuyện. Nơi mọi người làm việc với nhau.`}
                    </p>
                  </div>
                ) : !hasMoreMessages && !currentChannel ? (
                  <div className="p-8 text-center text-xs text-text-muted">
                    Chọn một kênh để bắt đầu trò chuyện.
                  </div>
                ) : null}
              </div>
            ),
            Footer: () => (
              <div className="flex flex-col w-full pb-2">
                {isLoadingNewer && (
                  <div className="py-2.5 flex items-center justify-center gap-2 text-xs text-text-muted select-none">
                    <CircleNotch size={16} className="animate-spin text-accent-primary" />
                    <span>Đang tải tin nhắn mới hơn...</span>
                  </div>
                )}
              </div>
            ),
          }}
          itemContent={(index, msg) => {
            const realIndex = index - firstItemIndex;
            const prevMsg = realIndex > 0 ? messages[realIndex - 1] : undefined;
            return (
              <div key={msg.id}>
                {msg.id === firstUnreadId && (
                  <div className="flex items-center gap-2 mx-4 mt-3 mb-1 select-none" role="separator">
                    <div className="flex-1 h-px bg-danger/60" />
                    <span className="text-[0.68rem] font-semibold uppercase tracking-wide text-danger">
                      Tin nhắn mới
                    </span>
                    <div className="flex-1 h-px bg-danger/60" />
                  </div>
                )}
                <MessageItem
                  msg={msg}
                  prevMsg={prevMsg}
                  currentUser={currentUser}
                  currentChannel={currentChannel}
                  workspaceMembers={workspaceMembers}
                  isPinned={pinnedMessageIds.has(msg.id)}
                  canManageMessages={canManageMessages}
                  isAdmin={isAdmin}
                  onJumpToMessage={handleJumpToMessage}
                  onOpenUserProfile={onOpenUserProfile}
                  onReplyMessage={onReplyMessage}
                  onEditMessage={onEditMessage}
                  onDeleteMessage={onDeleteMessage}
                  onToggleReaction={onToggleReaction}
                  onPinMessage={onPinMessage}
                  onUnpinMessage={onUnpinMessage}
                />
              </div>
            );
          }}
        />
      </div>
    );
  }
);

MessageList.displayName = "MessageList";
