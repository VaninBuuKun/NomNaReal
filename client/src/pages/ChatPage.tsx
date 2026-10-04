import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  WorkspaceRail,
  CreateWorkspaceModal,
  EditWorkspaceModal,
  KickMemberModal,
} from "../components/workspace";
import {
  ChannelSidebar,
  UserFooterBar,
  CreateChannelModal,
  MemberListPanel,
  EditChannelModal,
  AddChannelMemberModal,
} from "../components/channel";
import {
  DirectMessagesSidebar,
  NewDirectMessageModal,
  type DirectMessageItem,
  type DirectMessageUser,
} from "../components/dm";
import {
  ChatArea,
  SearchSidebar,
  PinnedMessagesSidebar,
} from "../components/chat";
import {
  ChannelTasksSidebar,
  CreateTaskModal,
  EditTaskModal,
} from "../components/tasks";
import {
  NotificationsSidebar,
  NotificationDetailPane,
} from "../components/notifications";
import {
  ActivitiesSidebar,
  ActivitiesWorkspace,
  type ActivityFilterType,
} from "../components/activities";
import { ThreadPanel } from "../components/thread";
import { SettingsModal } from "../components/settings";
import { UserProfileModal, type UserProfileData } from "../components/profile";
import { Toast } from "../components/ui";
import { Chats } from "@phosphor-icons/react";
import { formatMessageTime } from "../utils/formatDate";
import {
  authApi,
  workspaceApi,
  channelApi,
  messageApi,
  notificationApi,
  signalRService,
} from "../services";
import { useTheme } from "../hooks/useTheme";
import {
  ChannelType,
  type User,
  type Workspace,
  type Channel,
  type Message,
  type ReactionGroup,
  type PinnedMessage,
  type AppNotification,
} from "../types";
import {
  useWorkspaceStore,
  useChatStore,
  useDmStore,
  useUiStore,
  MIN_CHANNEL_WIDTH,
  MAX_CHANNEL_WIDTH,
  MIN_THREAD_WIDTH,
  MAX_THREAD_WIDTH,
  MIN_MEMBER_WIDTH,
  MAX_MEMBER_WIDTH,
  MIN_SEARCH_WIDTH,
  MAX_SEARCH_WIDTH,
  MIN_PINNED_WIDTH,
  MAX_PINNED_WIDTH,
  MIN_TASK_WIDTH,
  MAX_TASK_WIDTH,
} from "../stores";

export const ChatPage: React.FC = () => {
  const navigate = useNavigate();
  const { workspaceId: paramWorkspaceId } = useParams<{
    workspaceId?: string;
  }>();
  const { theme, changeTheme } = useTheme();

  // Local Session State
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);

  // Resize Drag State
  const [isResizingChannel, setIsResizingChannel] = useState(false);
  const [isResizingThread, setIsResizingThread] = useState(false);
  const [isResizingMember, setIsResizingMember] = useState(false);

  // 1. Workspace Store
  const {
    workspaces,
    activeWorkspaceId,
    isSwitchingWorkspace,
    setWorkspaces,
    setActiveWorkspaceId,
    addWorkspace,
    updateWorkspace,
    removeWorkspace,
    setIsSwitchingWorkspace,
  } = useWorkspaceStore();

  // 2. Chat Store
  const {
    channels,
    activeChannelId,
    messages,
    hasMoreMessages,
    isLoadingMessages,
    isLoadingMoreMessages,
    typingUser,
    setChannels,
    setActiveChannelId,
    setMessages,
    appendOlderMessages,
    addMessage,
    updateMessage,
    deleteMessage,
    setReactions,
    applyReactionDelta,
    updateReplyCount,
    markChannelRead,
    setChannelUnread,
    setHasMoreMessages,
    setIsLoadingMessages,
    setIsLoadingMoreMessages,
    setTypingUser,
  } = useChatStore();

  const activeChannelIdRef = useRef<string | null>(null);
  activeChannelIdRef.current = activeChannelId;

  const activeWorkspaceIdRef = useRef<string | null>(null);
  activeWorkspaceIdRef.current = activeWorkspaceId;

  // 3. DM Store
  const {
    dmConversations,
    activeDmId,
    workspaceMembers,
    setDmConversations,
    setActiveDmId,
    setWorkspaceMembers,
    updateUserStatus,
    updateDmSnippet,
    upgradePendingDm,
    updateMemberProfile,
  } = useDmStore();

  // 4. UI Store
  const {
    activeSidebarView,
    isThreadOpen,
    activeThreadMessage,
    isMemberListOpen,
    isSearchOpen,
    isPinnedSidebarOpen,
    isTaskSidebarOpen,
    channelWidth,
    threadWidth,
    memberWidth,
    searchWidth,
    pinnedSidebarWidth,
    taskSidebarWidth,
    isSettingsOpen,
    isCreateWorkspaceOpen,
    isEditWorkspaceOpen,
    isCreateChannelOpen,
    createChannelType,
    channelToEdit,
    channelToAddMember,
    isNewDmOpen,
    memberToKick,
    setActiveSidebarView,
    openThread,
    closeThread,
    toggleMemberList,
    setMemberListOpen,
    closeSearch,
    togglePinnedSidebar,
    closePinnedSidebar,
    setPinnedSidebarWidth,
    closeTaskSidebar,
    setTaskSidebarWidth,
    setSettingsOpen,
    setCreateWorkspaceOpen,
    setEditWorkspaceOpen,
    setCreateChannelOpen,
    setChannelToEdit,
    setChannelToAddMember,
    setNewDmOpen,
    setMemberToKick,
    setChannelWidth,
    setThreadWidth,
    setMemberWidth,
    setSearchWidth,
    expandThread,
  } = useUiStore();

  const activeSidebarViewRef = useRef(activeSidebarView);
  activeSidebarViewRef.current = activeSidebarView;

  const [isResizingSearch, setIsResizingSearch] = useState(false);
  const [isResizingPinned, setIsResizingPinned] = useState(false);
  const [isResizingTask, setIsResizingTask] = useState(false);
  const [pinnedMessages, setPinnedMessages] = useState<PinnedMessage[]>([]);
  const [inspectingUser, setInspectingUser] = useState<UserProfileData | null>(
    null,
  );
  const [userProfileAnchor, setUserProfileAnchor] = useState<{
    top: number;
    left: number;
    right: number;
    bottom: number;
  } | null>(null);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const unreadNotificationCount = useMemo(
    () => notifications.filter((n) => !n.isRead).length,
    [notifications],
  );
  const [selectedNotification, setSelectedNotification] =
    useState<AppNotification | null>(null);
  const [activityFilter, setActivityFilter] =
    useState<ActivityFilterType>("all");
  const [toast, setToast] = useState<{
    id: string;
    title: string;
    description?: string;
    actionLabel?: string;
    onAction?: () => void;
  } | null>(null);
  const [channelMemberIdsMap, setChannelMemberIdsMap] = useState<
    Record<string, string[]>
  >({});
  const [loadingChannelMemberIds, setLoadingChannelMemberIds] = useState<
    Record<string, boolean>
  >({});

  // Fetch members of a private channel (with cache check & merging)
  const fetchChannelMembers = useCallback(
    async (channelId: string, force = false) => {
      if (!channelId) return;
      if (!force && channelMemberIdsMap[channelId]) return;

      setLoadingChannelMemberIds((prev) => ({ ...prev, [channelId]: true }));
      try {
        const data = await channelApi.getMembers(channelId);
        const memberIds = data.map((m) => m.userId);
        setChannelMemberIdsMap((prev) => ({
          ...prev,
          [channelId]: memberIds,
        }));

        // Augment workspaceMembers if any channel member profile is missing
        if (data.length > 0) {
          setWorkspaceMembers((prev) => {
            const existingIds = new Set(prev.map((m) => m.id));
            const newMembers: DirectMessageUser[] = [];
            for (const m of data) {
              if (!existingIds.has(m.userId)) {
                newMembers.push({
                  id: m.userId,
                  displayName: m.displayName,
                  username: m.username,
                  email: "",
                  avatarUrl: m.avatarUrl,
                  status: "offline",
                  role: "Thành viên",
                });
              }
            }
            if (newMembers.length === 0) return prev;
            return [...prev, ...newMembers];
          });
        }
      } catch (err) {
        console.error(`Failed to load members for channel ${channelId}:`, err);
      } finally {
        setLoadingChannelMemberIds((prev) => ({ ...prev, [channelId]: false }));
      }
    },
    [channelMemberIdsMap, setWorkspaceMembers],
  );

  // Resize Drag Handlers
  const handleSearchResizeStart = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizingSearch(true);
    const startX = e.clientX;
    const startWidth = searchWidth;

    const onMouseMove = (moveEvent: MouseEvent) => {
      const newWidth = Math.max(
        MIN_SEARCH_WIDTH,
        Math.min(MAX_SEARCH_WIDTH, startWidth + (startX - moveEvent.clientX)),
      );
      setSearchWidth(newWidth);
    };

    const onMouseUp = () => {
      setIsResizingSearch(false);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  };

  const handlePinnedResizeStart = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizingPinned(true);
    const startX = e.clientX;
    const startWidth = pinnedSidebarWidth;

    const onMouseMove = (moveEvent: MouseEvent) => {
      const newWidth = Math.max(
        MIN_PINNED_WIDTH,
        Math.min(MAX_PINNED_WIDTH, startWidth + (startX - moveEvent.clientX)),
      );
      setPinnedSidebarWidth(newWidth);
    };

    const onMouseUp = () => {
      setIsResizingPinned(false);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  };

  const handleTaskResizeStart = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizingTask(true);
    const startX = e.clientX;
    const startWidth = taskSidebarWidth;

    const onMouseMove = (moveEvent: MouseEvent) => {
      const newWidth = Math.max(
        MIN_TASK_WIDTH,
        Math.min(MAX_TASK_WIDTH, startWidth + (startX - moveEvent.clientX)),
      );
      setTaskSidebarWidth(newWidth);
    };

    const onMouseUp = () => {
      setIsResizingTask(false);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  };

  const handleChannelResizeStart = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizingChannel(true);
    const startX = e.clientX;
    const startWidth = channelWidth;

    const onMouseMove = (moveEvent: MouseEvent) => {
      const newWidth = Math.max(
        MIN_CHANNEL_WIDTH,
        Math.min(MAX_CHANNEL_WIDTH, startWidth + (moveEvent.clientX - startX)),
      );
      setChannelWidth(newWidth);
    };

    const onMouseUp = () => {
      setIsResizingChannel(false);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  };

  const handleThreadResizeStart = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizingThread(true);
    const startX = e.clientX;
    const startWidth = threadWidth;

    const onMouseMove = (moveEvent: MouseEvent) => {
      const newWidth = Math.max(
        MIN_THREAD_WIDTH,
        Math.min(MAX_THREAD_WIDTH, startWidth + (startX - moveEvent.clientX)),
      );
      setThreadWidth(newWidth);
    };

    const onMouseUp = () => {
      setIsResizingThread(false);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  };

  const handleMemberResizeStart = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizingMember(true);
    const startX = e.clientX;
    const startWidth = memberWidth;

    const onMouseMove = (moveEvent: MouseEvent) => {
      const newWidth = Math.max(
        MIN_MEMBER_WIDTH,
        Math.min(MAX_MEMBER_WIDTH, startWidth + (startX - moveEvent.clientX)),
      );
      setMemberWidth(newWidth);
    };

    const onMouseUp = () => {
      setIsResizingMember(false);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  };

  // Fetch Channel Messages
  const loadMessages = async (channelId: string) => {
    try {
      setIsLoadingMessages(true);
      const res = await messageApi.getMessages(channelId);
      setMessages(res.messages);
      setHasMoreMessages(res.hasMore);
    } catch (err) {
      console.error("Failed to load messages:", err);
      setMessages([]);
      setHasMoreMessages(false);
    } finally {
      setIsLoadingMessages(false);
    }
  };

  // Load older messages (infinite scroll up)
  const handleLoadMoreMessages = async () => {
    if (
      !activeChannelId ||
      isLoadingMoreMessages ||
      !hasMoreMessages ||
      messages.length === 0
    ) {
      return;
    }

    try {
      setIsLoadingMoreMessages(true);
      const oldestMessage = messages[0];
      const res = await messageApi.getMessages(
        activeChannelId,
        oldestMessage.createdAt,
      );
      appendOlderMessages(res.messages);
      setHasMoreMessages(res.hasMore);
    } catch (err) {
      console.error("Failed to load older messages:", err);
    } finally {
      setIsLoadingMoreMessages(false);
    }
  };

  // Switch Active Channel
  const handleSelectChannel = async (channelId: string) => {
    setActiveChannelId(channelId);
    activeChannelIdRef.current = channelId;
    setActiveDmId(null);

    // Optimistically clear unread on client immediately
    markChannelRead(channelId);

    // Asynchronously notify server
    channelApi.markAsRead(channelId);

    // If channel is private, eagerly trigger members fetch
    const targetCh = channels.find((c) => c.id === channelId);
    if (targetCh?.isPrivate) {
      fetchChannelMembers(channelId);
    }

    await loadMessages(channelId);
    await signalRService.joinChannel(channelId);
  };

  const loadPinnedMessages = async (channelId: string) => {
    try {
      const pins = await messageApi.getPinnedMessages(channelId);
      setPinnedMessages(pins);
    } catch (err) {
      console.error("Failed to load pinned messages:", err);
      setPinnedMessages([]);
    }
  };

  useEffect(() => {
    if (activeChannelId) {
      loadPinnedMessages(activeChannelId);
    } else {
      setPinnedMessages([]);
    }
  }, [activeChannelId]);

  const handleNavigateFromNotification = useCallback(
    (notif: AppNotification) => {
      const isAssignment = notif.type === "Assignment" || notif.type === 3;
      const isTask = notif.type === "TaskSchedule" || notif.type === 4;

      if (isAssignment) {
        setActivityFilter("assignments");
        setActiveSidebarView("activities");
        return;
      }

      if (isTask) {
        setActivityFilter("schedules");
        setActiveSidebarView("activities");
        return;
      }

      // Default: Chat / Mention / Thread
      setActiveSidebarView("channels");
      if (
        notif.workspaceId &&
        notif.workspaceId !== activeWorkspaceIdRef.current
      ) {
        setActiveWorkspaceId(notif.workspaceId);
      }
      if (notif.channelId) {
        handleSelectChannel(notif.channelId);
      }

      if (notif.messageId) {
        setTimeout(() => {
          const el = document.getElementById(`msg-${notif.messageId}`);
          if (el) {
            el.scrollIntoView({ behavior: "smooth", block: "center" });
            el.classList.remove("animate-message-highlight");
            void el.offsetWidth;
            el.classList.add("animate-message-highlight");
            setTimeout(() => {
              el.classList.remove("animate-message-highlight");
            }, 2200);
          }
        }, 350);
      }
    },
    [handleSelectChannel, setActiveWorkspaceId, setActiveSidebarView],
  );

  const handleNotificationSelect = useCallback((notif: AppNotification) => {
    setSelectedNotification({ ...notif, isRead: true });
    if (!notif.isRead) {
      setNotifications((prev) =>
        prev.map((n) => (n.id === notif.id ? { ...n, isRead: true } : n)),
      );
      if (!notif.id.startsWith("notif-mock-")) {
        notificationApi.markAsRead(notif.id).catch(console.error);
      }
    }
  }, []);

  const handleMarkAllNotificationsRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setSelectedNotification((prev) =>
      prev ? { ...prev, isRead: true } : null,
    );
  }, []);

  const handlePinMessage = async (messageId: string) => {
    try {
      const pinned = await messageApi.pinMessage(messageId);
      setPinnedMessages((prev) => {
        if (prev.some((p) => p.messageId === messageId)) return prev;
        return [...prev, pinned];
      });
      setToast({
        id: Date.now().toString(),
        title: "Đã ghim tin nhắn",
        description: "Tin nhắn đã được ghim lên đầu kênh thành công.",
      });
    } catch (err) {
      console.error("Failed to pin message:", err);
      setToast({
        id: Date.now().toString(),
        title: "Lỗi ghim tin nhắn",
        description: "Không thể ghim tin nhắn này. Vui lòng thử lại!",
      });
    }
  };

  const handleUnpinMessage = async (messageId: string) => {
    try {
      await messageApi.unpinMessage(messageId);
      setPinnedMessages((prev) =>
        prev.filter((p) => p.messageId !== messageId),
      );
      setToast({
        id: Date.now().toString(),
        title: "Đã bỏ ghim",
        description: "Tin nhắn đã được gỡ khỏi danh sách ghim.",
      });
    } catch (err) {
      console.error("Failed to unpin message:", err);
      setToast({
        id: Date.now().toString(),
        title: "Lỗi bỏ ghim",
        description: "Không thể bỏ ghim tin nhắn. Vui lòng thử lại!",
      });
    }
  };

  // Fetch Workspace Channels, DMs, and Members in parallel
  const loadWorkspaceData = async (wsId: string, _currentUid?: string) => {
    try {
      const [chs, dms, members] = await Promise.all([
        channelApi.getChannels(wsId),
        workspaceApi.getDirectMessages(wsId).catch(() => []),
        workspaceApi.getMembers(wsId).catch(() => []),
      ]);

      setChannels(chs);

      // Format real DM conversations
      const formattedDms: DirectMessageItem[] = (dms || []).map((d) => ({
        id: d.id,
        workspaceId: d.workspaceId,
        user: {
          id: d.targetUserId,
          displayName: d.targetDisplayName,
          username: d.targetUsername,
          avatarUrl: d.targetAvatarUrl,
          email: d.targetEmail || "",
          status: (d.targetStatus as any) || "offline",
        },
        lastMessage: d.lastMessage || "Cuộc trò chuyện mới",
        lastMessageTime: d.lastMessageAt
          ? formatMessageTime(d.lastMessageAt)
          : undefined,
        unreadCount: d.unreadCount || 0,
        isPending: false,
      }));
      setDmConversations(formattedDms);

      // Format members
      const formattedMembers: DirectMessageUser[] = (members || []).map(
        (m) => ({
          id: m.userId,
          displayName: m.displayName,
          username: m.username,
          email: m.email || "",
          avatarUrl: m.avatarUrl,
          status: (m.status as any) || "offline",
          role: m.role,
        }),
      );
      setWorkspaceMembers(formattedMembers);

      return { channels: chs, dms: formattedDms };
    } catch (err) {
      console.error("Failed to load workspace data:", err);
      return { channels: [], dms: [] };
    }
  };

  // Switch Active Workspace
  const handleSelectWorkspace = async (workspaceId: string) => {
    if (workspaceId === activeWorkspaceId) return;
    setIsSwitchingWorkspace(true);
    setActiveWorkspaceId(workspaceId);
    navigate(`/workspace/${workspaceId}`, { replace: true });
    try {
      const { channels: chs } = await loadWorkspaceData(
        workspaceId,
        currentUser?.id,
      );
      if (chs.length > 0) {
        const defaultCh =
          chs.find((c) => c.name?.toLowerCase() === "general") || chs[0];
        await handleSelectChannel(defaultCh.id);
      } else {
        setActiveChannelId(null);
        setMessages([]);
        setHasMoreMessages(false);
      }
    } finally {
      setTimeout(() => {
        setIsSwitchingWorkspace(false);
      }, 120);
    }
  };

  const handleWorkspaceCreated = (ws: Workspace) => {
    addWorkspace(ws);
    handleSelectWorkspace(ws.id);
  };

  // SignalR message handler callback with Optimistic reconciliation
  const handleIncomingMessage = useCallback(
    (msg: Message) => {
      // Append or replace optimistic temp message
      setMessages((prev) => {
        if (msg.channelId !== activeChannelIdRef.current) return prev;
        if (prev.some((m) => m.id === msg.id)) return prev;

        // Reconcile optimistic temp message
        const tempIndex = prev.findIndex(
          (m) =>
            m.id.startsWith("temp-") &&
            m.senderId === msg.senderId &&
            m.content === msg.content,
        );
        if (tempIndex !== -1) {
          const next = [...prev];
          next[tempIndex] = msg;
          return next;
        }

        return [...prev, msg];
      });

      // Update channel unread status and lastMessageAt
      setChannelUnread(
        msg.channelId,
        msg.createdAt,
        msg.channelId !== activeChannelIdRef.current,
      );

      // Update DM snippet
      updateDmSnippet(
        msg.channelId,
        msg.content,
        formatMessageTime(msg.createdAt),
      );
    },
    [setMessages, setChannelUnread, updateDmSnippet],
  );

  // Initialize Chat App & Verify User Session
  const initApp = async () => {
    try {
      setIsInitializing(true);
      let user: User;
      try {
        user = await authApi.getMe();
      } catch {
        user = await authApi.refresh();
      }

      setCurrentUser(user);
      localStorage.setItem("nomna_logged_in", "true");

      // Fetch notifications
      try {
        const fetchedNotifs = await notificationApi.getNotifications();
        if (fetchedNotifs && fetchedNotifs.length > 0) {
          setNotifications(fetchedNotifs);
        }
      } catch (err) {
        // Keep initial mock notifications if backend notifications not yet populated
      }

      // Connect SignalR
      await signalRService.startConnection(
        handleIncomingMessage,
        (data) => setTypingUser(data.username),
        () => setTypingUser(null),
      );

      // Listen for thread replies count
      signalRService.onThreadReplyCountUpdated((data) => {
        updateReplyCount(
          data.parentMessageId,
          typeof data.replyCount === "number" ? data.replyCount : undefined,
        );
      });

      // Listen for reactions
      signalRService.onReactionUpdated((update) => {
        if ("isAdded" in update && update.emoji) {
          applyReactionDelta(update as any, currentUser?.id);
        } else if (update.reactions) {
          setReactions(update.messageId, update.reactions);
        }
      });

      // Listen for edits
      signalRService.onMessageEdited((edited) => {
        updateMessage(edited);
      });

      // Listen for deletions
      signalRService.onMessageDeleted((deleted) => {
        deleteMessage(deleted.messageId);
      });

      // Listen for user presence
      signalRService.onUserStatusChanged((data) => {
        const normalized = data.status.toLowerCase() as
          | "online"
          | "offline"
          | "away"
          | "dnd";
        updateUserStatus(data.userId, normalized);
      });

      // Listen for being added to a private channel
      signalRService.onAddedToChannel((newChannel) => {
        if (newChannel.workspaceId === activeWorkspaceIdRef.current) {
          setChannels((prev) => {
            if (prev.some((c) => c.id === newChannel.id)) return prev;
            return [...prev, newChannel];
          });
        }

        // Show Toast popup for the added user
        setToast({
          id: newChannel.id,
          title: "Kênh riêng tư mới",
          description: `Bạn vừa được thêm vào #${newChannel.name}`,
          actionLabel: "Xem ngay",
          onAction: () => {
            if (newChannel.workspaceId !== activeWorkspaceIdRef.current) {
              setActiveWorkspaceId(newChannel.workspaceId);
            }
            handleSelectChannel(newChannel.id);
            setToast(null);
          },
        });
      });

      // Listen for new workspace members joining
      signalRService.onWorkspaceMemberJoined((data) => {
        const currentWs = useWorkspaceStore
          .getState()
          .workspaces.find((w) => w.id === data.workspaceId);
        if (currentWs) {
          updateWorkspace({ ...currentWs, memberCount: data.memberCount });
        }

        // Realtime update member list in MemberListPanel without F5
        if (data.workspaceId === activeWorkspaceIdRef.current && data.member) {
          const newMem: DirectMessageUser = {
            id: data.member.userId,
            displayName: data.member.displayName,
            username: data.member.username,
            email: data.member.email || "",
            avatarUrl: data.member.avatarUrl,
            status: "online",
            role:
              data.member.role === "Admin"
                ? "Quản trị viên"
                : data.member.role === "Owner"
                  ? "Chủ phòng"
                  : "Thành viên",
          };
          setWorkspaceMembers((prev) => {
            if (prev.some((m) => m.id === newMem.id)) return prev;
            return [...prev, newMem];
          });
        }
      });

      // Listen for members being added to private channels
      signalRService.onChannelMemberAdded((data) => {
        setChannelMemberIdsMap((prev) => {
          const existing = prev[data.channelId] || [];
          if (existing.includes(data.userId)) return prev;
          return {
            ...prev,
            [data.channelId]: [...existing, data.userId],
          };
        });
      });

      // Listen for message pinned event
      signalRService.onMessagePinned((pinned: any) => {
        if (pinned.channelId === activeChannelIdRef.current) {
          setPinnedMessages((prev) => {
            if (prev.some((p) => p.messageId === pinned.messageId)) return prev;
            return [...prev, pinned];
          });
        }
      });

      // Listen for message unpinned event
      signalRService.onMessageUnpinned(
        (data: { channelId: string; messageId: string }) => {
          if (data.channelId === activeChannelIdRef.current) {
            setPinnedMessages((prev) =>
              prev.filter((p) => p.messageId !== data.messageId),
            );
          }
        },
      );

      // Listen for incoming notifications (Mentions, Thread Replies, etc.)
      signalRService.onReceiveNotification((notif) => {
        setNotifications((prev) => [
          notif,
          ...prev.filter((n) => n.id !== notif.id),
        ]);

        // Don't show toast if user is ALREADY active in this channel viewing messages
        const isViewingChannel =
          notif.channelId &&
          notif.channelId === activeChannelIdRef.current &&
          activeSidebarViewRef.current === "channels" &&
          document.visibilityState === "visible";

        if (!isViewingChannel) {
          setToast({
            id: notif.id,
            title: notif.title || "Thông báo mới",
            description: notif.content || undefined,
            actionLabel: "Xem ngay",
            onAction: () => {
              handleNotificationSelect(notif);
              setToast(null);
            },
          });
        }
      });

      // Load Workspaces
      const wsList = await workspaceApi.getWorkspaces();
      setWorkspaces(wsList);

      if (wsList.length > 0) {
        const targetWs =
          wsList.find((w) => w.id === paramWorkspaceId) || wsList[0];
        setActiveWorkspaceId(targetWs.id);

        const { channels: chList } = await loadWorkspaceData(
          targetWs.id,
          user.id,
        );

        // Sync initial online presence
        try {
          const onlineUserIds = await signalRService.getOnlineUsers();
          if (onlineUserIds.length > 0) {
            onlineUserIds.forEach((uid) => updateUserStatus(uid, "online"));
          }
        } catch (presenceErr) {
          console.warn("Could not sync online users:", presenceErr);
        }

        if (chList.length > 0) {
          const defaultCh =
            chList.find((c) => c.name?.toLowerCase() === "general") ||
            chList[0];
          setActiveChannelId(defaultCh.id);
          await loadMessages(defaultCh.id);
          await signalRService.joinChannel(defaultCh.id);
        }
      } else {
        navigate("/", { replace: true });
      }
    } catch (err) {
      console.error("Authentication error:", err);
      localStorage.removeItem("nomna_logged_in");
      navigate("/login", { replace: true });
    } finally {
      setIsInitializing(false);
    }
  };

  useEffect(() => {
    initApp();
    return () => {
      signalRService.disconnect();
    };
  }, []);

  // Logout Handler
  const handleLogout = async () => {
    try {
      await authApi.logout();
    } catch {
      // ignore
    }
    localStorage.removeItem("nomna_logged_in");
    signalRService.disconnect();
    setCurrentUser(null);
    setWorkspaces([]);
    setChannels([]);
    setMessages([]);
    setSettingsOpen(false);
    navigate("/login");
  };

  // Optimistic Message Sending
  const handleSendMessage = async (
    content: string,
    attachments?: Array<{
      url: string;
      fileName: string;
      fileSize: number;
      contentType: string;
      type: "image" | "video" | "file";
    }>,
  ) => {
    if (!activeChannelId || !currentUser) return;
    let targetChannelId = activeChannelId;

    // Deferred DM creation
    const currentDm = dmConversations.find((c) => c.id === activeChannelId);
    if (currentDm?.isPending) {
      if (!activeWorkspaceId) return;
      try {
        const realDm = await channelApi.createOrGetDm(
          activeWorkspaceId,
          currentDm.user.id,
        );
        targetChannelId = realDm.id;
        upgradePendingDm(currentDm.id, realDm.id);
        setActiveChannelId(realDm.id);
        await signalRService.joinChannel(realDm.id);
      } catch (err) {
        console.error("Failed to create DM channel:", err);
        alert("Không thể bắt đầu cuộc trò chuyện. Vui lòng thử lại.");
        return;
      }
    }

    // 1. Optimistic Message creation
    const tempId = `temp-${Date.now()}`;
    const optimisticMsg: Message = {
      id: tempId,
      channelId: targetChannelId,
      senderId: currentUser.id,
      senderDisplayName: currentUser.displayName,
      senderUsername: currentUser.username,
      senderAvatarUrl: currentUser.avatarUrl,
      content,
      isEdited: false,
      createdAt: new Date().toISOString(),
      replyCount: 0,
      reactions: [],
      attachments: attachments || [],
    };

    addMessage(optimisticMsg);
    const snippetText =
      content || (attachments && attachments.length > 0 ? "[Hình ảnh]" : "");
    updateDmSnippet(
      targetChannelId,
      snippetText,
      formatMessageTime(new Date()),
    );

    // 2. Dispatch to server
    try {
      const msg = await signalRService.sendMessage(
        targetChannelId,
        content,
        undefined,
        attachments,
      );
      if (msg) {
        setMessages((prev) => prev.map((m) => (m.id === tempId ? msg : m)));
      }
    } catch {
      try {
        const msg = await messageApi.sendMessage(
          targetChannelId,
          content,
          undefined,
          attachments,
        );
        setMessages((prev) => prev.map((m) => (m.id === tempId ? msg : m)));
      } catch (sendErr) {
        console.error("Failed to send message:", sendErr);
        deleteMessage(tempId);
        alert("Không thể gửi tin nhắn. Vui lòng thử lại.");
      }
    }
  };

  // Optimistic Reaction Toggle
  const handleToggleReaction = async (messageId: string, emoji: string) => {
    if (!currentUser) return;
    const targetMsg = messages.find((m) => m.id === messageId);
    if (!targetMsg) return;

    const previousReactions = targetMsg.reactions || [];
    const existingGroup = previousReactions.find((r) => r.emoji === emoji);
    const userId = currentUser.id.toLowerCase();

    let newReactions: ReactionGroup[];
    if (existingGroup) {
      const hasUser = existingGroup.userIds.some(
        (id) => id.toLowerCase() === userId,
      );
      if (hasUser) {
        const nextUserIds = existingGroup.userIds.filter(
          (id) => id.toLowerCase() !== userId,
        );
        if (nextUserIds.length === 0) {
          newReactions = previousReactions.filter((r) => r.emoji !== emoji);
        } else {
          newReactions = previousReactions.map((r) =>
            r.emoji === emoji
              ? {
                  ...r,
                  count: r.count - 1,
                  userIds: nextUserIds,
                  hasReacted: false,
                }
              : r,
          );
        }
      } else {
        newReactions = previousReactions.map((r) =>
          r.emoji === emoji
            ? {
                ...r,
                count: r.count + 1,
                userIds: [...r.userIds, currentUser.id],
                hasReacted: true,
              }
            : r,
        );
      }
    } else {
      newReactions = [
        ...previousReactions,
        { emoji, count: 1, userIds: [currentUser.id], hasReacted: true },
      ];
    }

    // Immediate optimistic update
    setReactions(messageId, newReactions);

    try {
      await signalRService.toggleReaction(messageId, emoji);
    } catch {
      try {
        await messageApi.toggleReaction(messageId, emoji);
      } catch {
        // Rollback
        setReactions(messageId, previousReactions);
      }
    }
  };

  const handleEditMessage = async (messageId: string, content: string) => {
    try {
      const updated = await signalRService.editMessage(messageId, content);
      if (updated) {
        updateMessage(updated);
      }
    } catch {
      const updated = await messageApi.editMessage(messageId, content);
      updateMessage(updated);
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    deleteMessage(messageId);
    try {
      await signalRService.deleteMessage(messageId);
    } catch {
      await messageApi.deleteMessage(messageId);
    }
  };

  const handleCreateChannel = (type: ChannelType) => {
    setCreateChannelOpen(true, type);
  };

  const handleChannelCreated = (newChannel: Channel) => {
    setChannels((prev) => [...prev, newChannel]);
    if (newChannel.isPrivate && currentUser?.id) {
      setChannelMemberIdsMap((prev) => ({
        ...prev,
        [newChannel.id]: [currentUser.id],
      }));
    }
    handleSelectChannel(newChannel.id);
  };

  const handleSelectDmConversation = async (dm: DirectMessageItem) => {
    setActiveDmId(dm.id);
    setActiveChannelId(dm.id);

    if (dm.isPending) {
      setMessages([]);
    } else {
      await loadMessages(dm.id);
      await signalRService.joinChannel(dm.id);
    }

    setDmConversations((prev) =>
      prev.map((c) => (c.id === dm.id ? { ...c, unreadCount: 0 } : c)),
    );
  };

  const handleStartDmWithUser = (targetUser: {
    id: string;
    displayName: string;
    username: string;
    avatarUrl?: string;
    email?: string;
    status?: string;
    role?: string;
  }) => {
    let existing = dmConversations.find(
      (c) =>
        c.user.id === targetUser.id &&
        (!c.workspaceId || c.workspaceId === activeWorkspaceId),
    );

    if (!existing) {
      const pendingDmId = `pending-dm-${targetUser.id}`;
      const newDm: DirectMessageItem = {
        id: pendingDmId,
        workspaceId: activeWorkspaceId || undefined,
        user: {
          id: targetUser.id,
          displayName: targetUser.displayName,
          username: targetUser.username,
          email: targetUser.email || "",
          avatarUrl: targetUser.avatarUrl,
          status: (targetUser.status as any) || "online",
          role: targetUser.role,
        },
        lastMessage: "Cuộc trò chuyện mới",
        unreadCount: 0,
        isPending: true,
      };
      setDmConversations((prev) => [newDm, ...prev]);
      existing = newDm;
    }

    setActiveSidebarView("dms");
    handleSelectDmConversation(existing);
  };

  const handleStartDm = (targetUser: DirectMessageUser) => {
    handleStartDmWithUser(targetUser);
    setNewDmOpen(false);
  };

  const handleOpenUserProfile = useCallback(
    (
      user: UserProfileData,
      anchorRect?: { top: number; left: number; right: number; bottom: number },
    ) => {
      setInspectingUser(user);
      setUserProfileAnchor(anchorRect || null);
    },
    [],
  );

  const activeDm = dmConversations.find((d) => d.id === activeDmId);
  const currentWorkspace =
    workspaces.find((w) => w.id === activeWorkspaceId) || null;
  const currentUserMember = workspaceMembers.find(
    (m) => m.id === currentUser?.id,
  );
  const currentUserRole =
    currentUserMember?.role ||
    (currentWorkspace?.ownerId === currentUser?.id ? "Owner" : "Member");
  const isOwner =
    currentWorkspace?.ownerId === currentUser?.id ||
    currentUserRole?.toLowerCase() === "owner";

  const handleWorkspaceUpdated = (updated: Workspace) => {
    updateWorkspace(updated);
  };

  const handleWorkspaceDeleted = (deletedId: string) => {
    removeWorkspace(deletedId);
    const remaining = workspaces.filter((w) => w.id !== deletedId);
    if (remaining.length > 0) {
      handleSelectWorkspace(remaining[0].id);
    } else {
      setActiveWorkspaceId(null);
      setChannels([]);
      setMessages([]);
      navigate("/", { replace: true });
    }
  };

  const handleLeaveWorkspace = async () => {
    if (!activeWorkspaceId) return;
    if (isOwner) {
      alert(
        "Bạn là chủ sở hữu của không gian này. Bạn không thể rời nhóm trừ khi chuyển quyền hoặc xóa không gian.",
      );
      return;
    }
    if (
      !confirm(
        `Bạn có chắc chắn muốn rời khỏi "${currentWorkspace?.name || "Workspace"}"?`,
      )
    ) {
      return;
    }
    try {
      await workspaceApi.leaveWorkspace(activeWorkspaceId);
      handleWorkspaceDeleted(activeWorkspaceId);
    } catch (err) {
      console.error("Failed to leave workspace:", err);
      alert("Không thể rời không gian làm việc. Vui lòng thử lại sau.");
    }
  };

  const handleKickMember = async (member: DirectMessageUser) => {
    if (!activeWorkspaceId) return;
    // Optimistic member removal
    setWorkspaceMembers((prev) => prev.filter((m) => m.id !== member.id));
    try {
      await workspaceApi.kickMember(activeWorkspaceId, member.id);
    } catch (err: unknown) {
      console.error("Failed to kick member:", err);
      // Re-fetch on error
      const members = await workspaceApi
        .getMembers(activeWorkspaceId)
        .catch(() => []);
      setWorkspaceMembers(members as any);
      const errorObj = err as { response?: { data?: { message?: string } } };
      alert(errorObj?.response?.data?.message || "Không thể đuổi thành viên.");
      throw err;
    }
  };

  const handleChannelUpdated = (updated: Channel) => {
    setChannels((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
  };

  const handleChannelDeleted = (deletedId: string) => {
    const remaining = channels.filter((c) => c.id !== deletedId);
    setChannels(remaining);
    if (activeChannelId === deletedId) {
      const generalCh =
        remaining.find((c) => c.name?.toLowerCase() === "general") ||
        remaining[0];
      if (generalCh) {
        handleSelectChannel(generalCh.id);
      } else {
        setActiveChannelId(null);
        setMessages([]);
      }
    }
  };

  const currentChannel: Channel | null =
    activeSidebarView === "dms"
      ? activeDm
        ? {
            id: activeDm.id,
            workspaceId: activeWorkspaceId || "",
            name: activeDm.user.displayName,
            type: ChannelType.DirectMessage,
            isPrivate: true,
          }
        : null
      : channels.find((c) => c.id === activeChannelId) || null;

  // Reset channel members map when workspace switches
  useEffect(() => {
    setChannelMemberIdsMap({});
  }, [activeWorkspaceId]);

  // Fetch private channel members when current channel is private
  useEffect(() => {
    if (
      !currentChannel ||
      !currentChannel.isPrivate ||
      currentChannel.type === ChannelType.DirectMessage
    ) {
      return;
    }

    fetchChannelMembers(currentChannel.id);
  }, [
    currentChannel?.id,
    currentChannel?.isPrivate,
    currentChannel?.type,
    fetchChannelMembers,
  ]);

  // Filter members displayed in MemberListPanel
  const displayedMembers = useMemo(() => {
    if (!currentChannel) return workspaceMembers;

    if (currentChannel.type === ChannelType.DirectMessage && activeDm) {
      const dmOtherUser =
        workspaceMembers.find((m) => m.id === activeDm.user.id) ||
        activeDm.user;
      return [
        ...(currentUserMember ? [currentUserMember] : []),
        ...(dmOtherUser && dmOtherUser.id !== currentUser?.id
          ? [dmOtherUser]
          : []),
      ];
    }

    if (!currentChannel.isPrivate) {
      return workspaceMembers;
    }

    const memberIds = channelMemberIdsMap[currentChannel.id];
    if (!memberIds) {
      return workspaceMembers.filter((m) => m.id === currentUser?.id);
    }

    const idSet = new Set(memberIds);
    return workspaceMembers.filter((m) => idSet.has(m.id));
  }, [
    currentChannel,
    activeDm,
    workspaceMembers,
    channelMemberIdsMap,
    currentUser?.id,
    currentUserMember,
  ]);

  const handleOpenThread = (msg: Message) => {
    openThread(msg);
    expandThread();
  };

  if (isInitializing && !currentUser) {
    return <></>;
  }

  return (
    <>
      <main
        id="appLayout"
        className={`flex-1 min-h-0 flex overflow-hidden h-screen h-[100dvh] w-screen relative animate-in fade-in duration-200 ${
          isSwitchingWorkspace
            ? "opacity-70 transition-opacity duration-150 pointer-events-none"
            : "opacity-100 transition-opacity duration-150"
        }`}
        style={{
          userSelect:
            isResizingChannel || isResizingThread || isResizingMember
              ? "none"
              : "auto",
          cursor:
            isResizingChannel || isResizingThread || isResizingMember
              ? "col-resize"
              : "auto",
        }}
      >
        {/* 1 & 2. Unified Left Dock (Workspace Rail + Channel Sidebar + Spanning User Footer) */}
        <div
          className="h-full flex flex-col shrink-0 overflow-hidden"
          style={{
            width: `${68 + (activeSidebarView === "notifications" ? Math.max(channelWidth, 310) : channelWidth)}px`,
          }}
        >
          {/* Top Columns */}
          <div className="flex-1 min-h-0 flex flex-row overflow-hidden">
            <WorkspaceRail
              workspaces={workspaces}
              activeWorkspaceId={activeWorkspaceId}
              activeSidebarView={activeSidebarView}
              onSelectView={(view) => setActiveSidebarView(view)}
              onSelectWorkspace={handleSelectWorkspace}
              onCreateWorkspace={() => setCreateWorkspaceOpen(true)}
              onGoHome={() => navigate("/")}
              unreadNotificationCount={unreadNotificationCount}
            />
            {activeSidebarView === "channels" ? (
              <ChannelSidebar
                currentWorkspace={currentWorkspace}
                channels={channels}
                activeChannelId={activeChannelId}
                onSelectChannel={handleSelectChannel}
                onCreateChannel={handleCreateChannel}
                onOpenSettings={() => setSettingsOpen(true)}
                isOwner={isOwner}
                onOpenEditWorkspace={() => setEditWorkspaceOpen(true)}
                onLeaveWorkspace={handleLeaveWorkspace}
                onOpenEditChannel={(ch) => setChannelToEdit(ch)}
                onOpenAddChannelMember={(ch) => setChannelToAddMember(ch)}
              />
            ) : activeSidebarView === "dms" ? (
              <DirectMessagesSidebar
                conversations={dmConversations.filter(
                  (c) => !c.workspaceId || c.workspaceId === activeWorkspaceId,
                )}
                activeConversationId={activeDmId}
                onSelectConversation={handleSelectDmConversation}
                onOpenNewDm={() => setNewDmOpen(true)}
                onRemoveConversation={(id, e) => {
                  e.stopPropagation();
                  setDmConversations((prev) => prev.filter((c) => c.id !== id));
                  if (activeDmId === id) {
                    const remaining = dmConversations.filter(
                      (c) => c.id !== id,
                    );
                    if (remaining.length > 0) {
                      handleSelectDmConversation(remaining[0]);
                    }
                  }
                }}
              />
            ) : activeSidebarView === "notifications" ? (
              <NotificationsSidebar
                notifications={notifications}
                activeNotificationId={selectedNotification?.id}
                onSelectNotification={handleNotificationSelect}
                onMarkAllRead={handleMarkAllNotificationsRead}
              />
            ) : (
              <ActivitiesSidebar
                activeFilter={activityFilter}
                onFilterChange={setActivityFilter}
                onClose={() => setActiveSidebarView("channels")}
                onCreateActivity={() =>
                  setToast({
                    id: Date.now().toString(),
                    title: "Tạo hoạt động mới",
                    description:
                      "Tính năng tạo bài tập & job sẽ khả dụng trong Phase 3.",
                  })
                }
              />
            )}
          </div>

          {/* User Account Footer Bar (Cleaned up, no cramped popover) */}
          <UserFooterBar
            currentUser={currentUser}
            onOpenSettings={() => setSettingsOpen(true)}
          />
        </div>

        {/* 2.5 Resizer Divider */}
        <div
          className={`w-px cursor-col-resize relative shrink-0 z-25 transition-colors duration-150 select-none hover:bg-[var(--accent-primary)] after:content-[''] after:absolute after:top-0 after:bottom-0 after:-left-[3px] after:-right-[3px] after:z-26 ${
            isResizingChannel
              ? "bg-[var(--accent-primary)] shadow-[0_0_8px_var(--accent-glow)]"
              : "bg-[var(--border-color)]"
          }`}
          onMouseDown={handleChannelResizeStart}
          title="Kéo sang trái/phải để chỉnh kích thước Sidebar Kênh"
        />

        {/* 3. Active Chat Area or Activities Workspace or Notification Detail Pane */}
        {activeSidebarView === "activities" ? (
          <ActivitiesWorkspace
            activeFilter={activityFilter}
            onFilterChange={setActivityFilter}
            onBackToChat={() => setActiveSidebarView("channels")}
          />
        ) : activeSidebarView === "notifications" ? (
          <NotificationDetailPane
            notification={selectedNotification}
            onNavigateToTarget={handleNavigateFromNotification}
          />
        ) : activeSidebarView === "dms" && (!activeDmId || !activeDm) ? (
          <div className="flex-1 min-h-0 flex flex-col items-center justify-center bg-[var(--bg-chat)] p-8 text-center select-none">
            <div className="w-16 h-16 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-color)] flex items-center justify-center text-[var(--accent-primary)] mb-3 shadow-xs">
              <Chats size={36} weight="duotone" className="opacity-60" />
            </div>
            <p className="text-base font-bold text-[var(--text-primary)] mb-1">
              Chưa chọn cuộc trò chuyện
            </p>
            <p className="text-xs text-[var(--text-muted)] max-w-sm leading-relaxed">
              Chọn một tin nhắn trực tiếp ở danh sách bên trái hoặc nhấn nút +
              để tìm kiếm thành viên và bắt đầu cuộc trò chuyện riêng tư.
            </p>
          </div>
        ) : (
          <ChatArea
            currentChannel={currentChannel}
            messages={messages}
            currentUser={currentUser}
            onSendMessage={handleSendMessage}
            onEditMessage={handleEditMessage}
            onDeleteMessage={handleDeleteMessage}
            onToggleReaction={handleToggleReaction}
            onStartTyping={() =>
              activeChannelId && signalRService.startTyping(activeChannelId)
            }
            onStopTyping={() =>
              activeChannelId && signalRService.stopTyping(activeChannelId)
            }
            typingUser={typingUser}
            onToggleThread={() => {
              if (!isThreadOpen) {
                if (!activeThreadMessage && messages.length > 0) {
                  openThread(messages[0]);
                }
                expandThread();
              } else {
                closeThread();
              }
            }}
            onOpenThread={handleOpenThread}
            onStartDmWithUser={handleStartDmWithUser}
            hasMoreMessages={hasMoreMessages}
            isLoadingMore={isLoadingMoreMessages}
            isLoadingMessages={isLoadingMessages}
            onLoadMoreMessages={handleLoadMoreMessages}
            workspaceMembers={workspaceMembers}
            isMemberListOpen={isMemberListOpen}
            onToggleMemberList={toggleMemberList}
            onOpenUserProfile={handleOpenUserProfile}
            pinnedMessages={pinnedMessages}
            onPinMessage={handlePinMessage}
            onUnpinMessage={handleUnpinMessage}
            isPinnedSidebarOpen={isPinnedSidebarOpen}
            onTogglePinnedSidebar={togglePinnedSidebar}
          />
        )}

        {/* 3.5 Resizer Divider & Thread Panel */}
        {isThreadOpen && (
          <>
            <div
              className={`w-px cursor-col-resize relative shrink-0 z-25 transition-colors duration-150 select-none hover:bg-[var(--accent-primary)] after:content-[''] after:absolute after:top-0 after:bottom-0 after:-left-[3px] after:-right-[3px] after:z-26 ${
                isResizingThread
                  ? "bg-[var(--accent-primary)] shadow-[0_0_8px_var(--accent-glow)]"
                  : "bg-[var(--border-color)]"
              }`}
              onMouseDown={handleThreadResizeStart}
              title="Kéo sang trái/phải để chỉnh kích thước Sidebar Thread"
            />
            <ThreadPanel
              isOpen={isThreadOpen}
              onClose={closeThread}
              currentUser={currentUser}
              parentMessage={activeThreadMessage}
              width={threadWidth}
              onExpandWidth={expandThread}
              onToggleReaction={handleToggleReaction}
              onEditMessage={handleEditMessage}
              onDeleteMessage={handleDeleteMessage}
            />
          </>
        )}

        {/* 4. Resizer Divider & Member List Panel (Mutually Exclusive) */}
        {!isThreadOpen && isMemberListOpen && (
          <>
            <div
              className={`w-px cursor-col-resize relative shrink-0 z-25 transition-colors duration-150 select-none hover:bg-[var(--accent-primary)] after:content-[''] after:absolute after:top-0 after:bottom-0 after:-left-[3px] after:-right-[3px] after:z-26 ${
                isResizingMember
                  ? "bg-[var(--accent-primary)] shadow-[0_0_8px_var(--accent-glow)]"
                  : "bg-[var(--border-color)]"
              }`}
              onMouseDown={handleMemberResizeStart}
              title="Kéo sang trái/phải để chỉnh kích thước Sidebar Thành viên"
            />
            <MemberListPanel
              isOpen={isMemberListOpen}
              onClose={() => setMemberListOpen(false)}
              members={displayedMembers}
              currentUser={currentUser}
              currentUserRole={currentUserRole}
              width={memberWidth}
              channelName={currentChannel?.name || undefined}
              isPrivateChannel={
                !!(
                  currentChannel?.isPrivate &&
                  currentChannel.type !== ChannelType.DirectMessage
                )
              }
              isLoading={
                !!(
                  currentChannel?.isPrivate &&
                  currentChannel.type !== ChannelType.DirectMessage &&
                  loadingChannelMemberIds[currentChannel.id]
                )
              }
              onOpenAddMember={() =>
                currentChannel && setChannelToAddMember(currentChannel)
              }
              onOpenUserProfile={handleOpenUserProfile}
              onStartDmWithUser={handleStartDmWithUser}
              onOpenSettings={() => setSettingsOpen(true)}
              onRequestKickMember={(m) => setMemberToKick(m)}
            />
          </>
        )}

        {/* 5. Resizer Divider & Search Sidebar (Mutually Exclusive) */}
        {!isThreadOpen && !isMemberListOpen && isSearchOpen && (
          <>
            <div
              className={`w-px cursor-col-resize relative shrink-0 z-25 transition-colors duration-150 select-none hover:bg-[var(--accent-primary)] after:content-[''] after:absolute after:top-0 after:bottom-0 after:-left-[3px] after:-right-[3px] after:z-26 ${
                isResizingSearch
                  ? "bg-[var(--accent-primary)] shadow-[0_0_8px_var(--accent-glow)]"
                  : "bg-[var(--border-color)]"
              }`}
              onMouseDown={handleSearchResizeStart}
              title="Kéo sang trái/phải để chỉnh kích thước Sidebar Tìm kiếm"
            />
            <SearchSidebar
              isOpen={isSearchOpen}
              onClose={closeSearch}
              width={searchWidth}
              currentChannel={currentChannel}
              workspaceId={activeWorkspaceId}
              workspaceMembers={workspaceMembers}
              onJumpToMessage={(channelId, messageId) => {
                if (channelId !== activeChannelId) {
                  setActiveChannelId(channelId);
                }
                setTimeout(() => {
                  const el = document.getElementById(`msg-${messageId}`);
                  if (el) {
                    el.scrollIntoView({ behavior: "smooth", block: "center" });
                    el.classList.remove("animate-message-highlight");
                    void el.offsetWidth;
                    el.classList.add("animate-message-highlight");
                    setTimeout(() => {
                      el.classList.remove("animate-message-highlight");
                    }, 2200);
                  }
                }, 300);
              }}
            />
          </>
        )}

        {/* 6. Resizer Divider & Pinned Messages Sidebar (Mutually Exclusive) */}
        {!isThreadOpen &&
          !isMemberListOpen &&
          !isSearchOpen &&
          isPinnedSidebarOpen && (
            <>
              <div
                className={`w-px cursor-col-resize relative shrink-0 z-25 transition-colors duration-150 select-none hover:bg-[var(--accent-primary)] after:content-[''] after:absolute after:top-0 after:bottom-0 after:-left-[3px] after:-right-[3px] after:z-26 ${
                  isResizingPinned
                    ? "bg-[var(--accent-primary)] shadow-[0_0_8px_var(--accent-glow)]"
                    : "bg-[var(--border-color)]"
                }`}
                onMouseDown={handlePinnedResizeStart}
                title="Kéo sang trái/phải để chỉnh kích thước Sidebar Tin nhắn đã ghim"
              />
              <PinnedMessagesSidebar
                isOpen={isPinnedSidebarOpen}
                onClose={closePinnedSidebar}
                width={pinnedSidebarWidth}
                pinnedMessages={pinnedMessages}
                onJumpToMessage={(messageId) => {
                  const el = document.getElementById(`msg-${messageId}`);
                  if (el) {
                    el.scrollIntoView({ behavior: "smooth", block: "center" });
                    el.classList.remove("animate-message-highlight");
                    void el.offsetWidth;
                    el.classList.add("animate-message-highlight");
                    setTimeout(() => {
                      el.classList.remove("animate-message-highlight");
                    }, 2200);
                  }
                }}
                onUnpinMessage={handleUnpinMessage}
              />
            </>
          )}

        {/* 7. Resizer Divider & Tasks Sidebar (Mutually Exclusive) */}
        {!isThreadOpen &&
          !isMemberListOpen &&
          !isSearchOpen &&
          !isPinnedSidebarOpen &&
          isTaskSidebarOpen && (
            <>
              <div
                className={`w-px cursor-col-resize relative shrink-0 z-25 transition-colors duration-150 select-none hover:bg-[var(--accent-primary)] after:content-[''] after:absolute after:top-0 after:bottom-0 after:-left-[3px] after:-right-[3px] after:z-26 ${
                  isResizingTask
                    ? "bg-[var(--accent-primary)] shadow-[0_0_8px_var(--accent-glow)]"
                    : "bg-[var(--border-color)]"
                }`}
                onMouseDown={handleTaskResizeStart}
                title="Kéo sang trái/phải để chỉnh kích thước Sidebar Công việc"
              />
              <ChannelTasksSidebar
                isOpen={isTaskSidebarOpen}
                onClose={closeTaskSidebar}
                width={taskSidebarWidth}
                currentChannel={currentChannel}
                workspaceMembers={workspaceMembers}
                currentUserId={currentUser?.id}
                onJumpToMessage={(messageId) => {
                  const el = document.getElementById(`msg-${messageId}`);
                  if (el) {
                    el.scrollIntoView({ behavior: "smooth", block: "center" });
                    el.classList.remove("animate-message-highlight");
                    void el.offsetWidth;
                    el.classList.add("animate-message-highlight");
                    setTimeout(() => {
                      el.classList.remove("animate-message-highlight");
                    }, 2200);
                  }
                }}
              />
            </>
          )}
      </main>

      {/* Modals */}
      <KickMemberModal
        isOpen={!!memberToKick}
        onClose={() => setMemberToKick(null)}
        member={memberToKick}
        workspaceName={currentWorkspace?.name}
        onConfirmKick={handleKickMember}
      />

      <CreateWorkspaceModal
        isOpen={isCreateWorkspaceOpen}
        onClose={() => setCreateWorkspaceOpen(false)}
        onWorkspaceCreated={handleWorkspaceCreated}
      />

      <EditWorkspaceModal
        isOpen={isEditWorkspaceOpen}
        onClose={() => setEditWorkspaceOpen(false)}
        workspace={currentWorkspace}
        isOwner={isOwner}
        onWorkspaceUpdated={handleWorkspaceUpdated}
        onWorkspaceDeleted={handleWorkspaceDeleted}
      />

      <CreateChannelModal
        isOpen={isCreateChannelOpen}
        onClose={() => setCreateChannelOpen(false)}
        workspaceId={activeWorkspaceId}
        channelType={createChannelType}
        onChannelCreated={handleChannelCreated}
      />

      <EditChannelModal
        isOpen={!!channelToEdit}
        onClose={() => setChannelToEdit(null)}
        channel={channelToEdit}
        onChannelUpdated={handleChannelUpdated}
        onChannelDeleted={handleChannelDeleted}
      />

      <AddChannelMemberModal
        isOpen={!!channelToAddMember}
        onClose={() => setChannelToAddMember(null)}
        channel={channelToAddMember}
        members={workspaceMembers.filter((m) => m.id !== currentUser?.id)}
        onMemberAdded={(userId) => {
          if (channelToAddMember) {
            const chId = channelToAddMember.id;
            setChannelMemberIdsMap((prev) => {
              const existing = prev[chId] || [];
              if (existing.includes(userId)) return prev;
              return { ...prev, [chId]: [...existing, userId] };
            });
          }
        }}
      />

      <NewDirectMessageModal
        isOpen={isNewDmOpen}
        onClose={() => setNewDmOpen(false)}
        onStartDm={handleStartDm}
        existingDmUserIds={dmConversations.map((c) => c.user.id)}
        members={workspaceMembers.filter((m) => m.id !== currentUser?.id)}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setSettingsOpen(false)}
        currentUser={currentUser}
        onLogout={handleLogout}
        currentTheme={theme}
        onThemeChange={changeTheme}
        onUserUpdated={(u) => {
          setCurrentUser(u);
          // Optimistically update member list & messages without re-querying DB!
          updateMemberProfile(u.id, {
            displayName: u.displayName,
            avatarUrl: u.avatarUrl || undefined,
          });
          setMessages((prev) =>
            prev.map((m) =>
              m.senderId === u.id
                ? {
                    ...m,
                    senderDisplayName: u.displayName,
                    senderAvatarUrl: u.avatarUrl,
                  }
                : m,
            ),
          );
        }}
      />

      {/* Unified Modern User Profile Popout (Discord-style) */}
      <UserProfileModal
        isOpen={!!inspectingUser}
        onClose={() => {
          setInspectingUser(null);
          setUserProfileAnchor(null);
        }}
        user={inspectingUser}
        anchorRect={userProfileAnchor}
        currentUserId={currentUser?.id}
        onStartDm={(u) => {
          handleStartDmWithUser({
            id: u.id,
            displayName: u.displayName,
            username: u.username,
            avatarUrl: u.avatarUrl || undefined,
          });
        }}
        onOpenSettings={() => setSettingsOpen(true)}
        canKick={
          !!currentUserRole &&
          (currentUserRole.toLowerCase() === "owner" ||
            (currentUserRole.toLowerCase() === "admin" &&
              (inspectingUser?.role || "").toLowerCase() !== "owner" &&
              (inspectingUser?.role || "").toLowerCase() !== "admin"))
        }
        onKickMember={(u) => {
          const found = workspaceMembers.find((m) => m.id === u.id);
          if (found) setMemberToKick(found);
        }}
      />

      {/* Task Modals */}
      <CreateTaskModal
        isOpen={false}
        onClose={() => {}}
        workspaceMembers={workspaceMembers}
        currentChannel={currentChannel}
        currentUserId={currentUser?.id}
      />

      <EditTaskModal workspaceMembers={workspaceMembers} />

      {/* Floating Toast Notification */}
      {toast && (
        <Toast
          id={toast.id}
          title={toast.title}
          description={toast.description}
          actionLabel={toast.actionLabel}
          onAction={toast.onAction}
          onClose={() => setToast(null)}
        />
      )}
    </>
  );
};
