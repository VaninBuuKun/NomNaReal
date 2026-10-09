import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
import { useNavigate, useParams } from "react-router-dom";
import { WorkspaceRail } from "../components/workspace";
import { ChannelSidebar, UserFooterBar } from "../components/channel";
import {
  DirectMessagesSidebar,
  type DirectMessageItem,
  type DirectMessageUser,
} from "../components/dm";
import { ChatArea } from "../components/chat";
import {
  NotificationsSidebar,
  NotificationDetailPane,
} from "../components/notifications";
import { type UserProfileData } from "../components/profile";
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
import { usePanelResizers } from "../hooks/usePanelResizers";
import { useChatSignalR } from "../hooks/useChatSignalR";
import { ChatModals, ChatRightPanels } from "./components";
import {
  ChannelType,
  type User,
  type Workspace,
  type Channel,
  type Message,
  type PinnedMessage,
  type AppNotification,
} from "../types";
import {
  useWorkspaceStore,
  useChatStore,
  useDmStore,
  useUiStore,
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
    markChannelRead,
    setChannelUnread,
    setHasMoreMessages,
    setIsLoadingMessages,
    setIsLoadingMoreMessages,
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
    updateDmSnippet,
  } = useDmStore();

  // 4. UI Store
  const {
    activeSidebarView,
    isThreadOpen,
    activeThreadMessage,
    isMemberListOpen,
    isPinnedSidebarOpen,
    channelWidth,
    setActiveSidebarView,
    openThread,
    closeThread,
    toggleMemberList,
    togglePinnedSidebar,
    setCreateWorkspaceOpen,
    setCreateChannelOpen,
    setChannelToEdit,
    setChannelToAddMember,
    setNewDmOpen,
    setSettingsOpen,
    expandThread,
  } = useUiStore();

  const activeSidebarViewRef = useRef(activeSidebarView);
  activeSidebarViewRef.current = activeSidebarView;

  // Panel Resizers Hook
  const {
    isResizingChannel,
    isResizingThread,
    isResizingMember,
    isResizingSearch,
    isResizingPinned,
    handleChannelResizeStart,
    handleThreadResizeStart,
    handleMemberResizeStart,
    handleSearchResizeStart,
    handlePinnedResizeStart,
  } = usePanelResizers();

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

    markChannelRead(channelId);
    channelApi.markAsRead(channelId);

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
      setMessages((prev) => {
        if (msg.channelId !== activeChannelIdRef.current) return prev;
        if (prev.some((m) => m.id === msg.id)) return prev;

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

      setChannelUnread(
        msg.channelId,
        msg.createdAt,
        msg.channelId !== activeChannelIdRef.current,
      );

      updateDmSnippet(
        msg.channelId,
        msg.content,
        formatMessageTime(msg.createdAt),
      );
    },
    [setMessages, setChannelUnread, updateDmSnippet],
  );

  // Hook for all SignalR realtime listeners
  const { setupSignalR } = useChatSignalR({
    currentUser,
    activeWorkspaceIdRef,
    activeChannelIdRef,
    activeSidebarViewRef,
    handleIncomingMessage,
    handleNotificationSelect,
    handleSelectChannel,
    setActiveWorkspaceId,
    setToast,
    setPinnedMessages,
    setNotifications,
    setChannelMemberIdsMap,
  });

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

      try {
        const fetchedNotifs = await notificationApi.getNotifications();
        if (fetchedNotifs && fetchedNotifs.length > 0) {
          setNotifications(fetchedNotifs);
        }
      } catch (err) {
        // Keep initial mock notifications if backend not yet ready
      }

      // Connect SignalR & subscribe to real-time events
      await setupSignalR();

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

        try {
          const onlineUserIds = await signalRService.getOnlineUsers();
          if (onlineUserIds.length > 0) {
            onlineUserIds.forEach((uid) => useDmStore.getState().updateUserStatus(uid, "online"));
          }
        } catch (presenceErr) {
          console.warn("Could not sync online users:", presenceErr);
        }

        if (chList.length > 0) {
          const defaultCh =
            chList.find((c) => c.name?.toLowerCase() === "general") ||
            chList[0];
          await handleSelectChannel(defaultCh.id);
        }
      }
    } catch (err) {
      console.error("Session verification failed, redirecting to login:", err);
      localStorage.removeItem("nomna_logged_in");
      navigate("/login", { replace: true });
    } finally {
      setIsInitializing(false);
    }
  };

  useEffect(() => {
    initApp();

    return () => {
      signalRService.disconnect().catch(console.error);
    };
  }, []);

  const handleSendMessage = async (
    msgContent: string,
    attachments?: Array<{
      url: string;
      fileName: string;
      fileSize: number;
      contentType: string;
      type: "image" | "video" | "file";
    }>,
  ) => {
    if (!activeChannelId && !activeDmId) return;
    const targetChannelId = activeChannelId || activeDmId!;

    if (activeDmId && activeDmId.startsWith("pending-dm-")) {
      const targetUserId = activeDmId.replace("pending-dm-", "");
      try {
        const realDm = await channelApi.createOrGetDm(
          activeWorkspaceId!,
          targetUserId,
        );
        useDmStore.getState().upgradePendingDm(activeDmId, realDm.id);
        setActiveDmId(realDm.id);
        setActiveChannelId(realDm.id);
        await signalRService.joinChannel(realDm.id);

        const realSent = await signalRService.sendMessage(
          realDm.id,
          msgContent,
          undefined,
          attachments,
        );
        if (realSent) {
          addMessage(realSent);
        }
        return;
      } catch (err) {
        console.error("Failed to materialize DM conversation:", err);
        return;
      }
    }

    const tempId = `temp-${Date.now()}`;
    const optimisticMessage: Message = {
      id: tempId,
      channelId: targetChannelId,
      senderId: currentUser?.id || "temp-me",
      senderDisplayName: currentUser?.displayName || "Me",
      senderUsername: currentUser?.username || "me",
      senderAvatarUrl: currentUser?.avatarUrl,
      content: msgContent,
      createdAt: new Date().toISOString(),
      isEdited: false,
      attachments: attachments?.map((a) => ({
        id: `att-${Date.now()}`,
        url: a.url,
        fileName: a.fileName,
        fileSize: a.fileSize,
        contentType: a.contentType,
        type: a.type,
      })),
    };

    addMessage(optimisticMessage);

    try {
      const realMessage = await signalRService.sendMessage(
        targetChannelId,
        msgContent,
        undefined,
        attachments,
      );
      if (realMessage) {
        setMessages((prev) =>
          prev.map((m) => (m.id === tempId ? realMessage : m)),
        );
      }
    } catch (err) {
      console.error("Failed to send message via SignalR:", err);
    }
  };

  const handleEditMessage = async (messageId: string, newContent: string) => {
    updateMessage({ id: messageId, content: newContent, isEdited: true });
    try {
      await signalRService.editMessage(messageId, newContent);
    } catch (err) {
      console.error("Failed to edit message:", err);
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    deleteMessage(messageId);
    try {
      await signalRService.deleteMessage(messageId);
    } catch (err) {
      console.error("Failed to delete message:", err);
    }
  };

  const handleToggleReaction = async (messageId: string, emoji: string) => {
    try {
      const update = await signalRService.toggleReaction(messageId, emoji);
      if (update) {
        if ("isAdded" in update && update.emoji) {
          useChatStore.getState().applyReactionDelta(update as any, currentUser?.id);
        } else if (update.reactions) {
          setReactions(update.messageId, update.reactions);
        }
      }
    } catch (err) {
      console.error("Failed to toggle reaction:", err);
    }
  };

  const handleLogout = async () => {
    try {
      await authApi.logout();
    } catch (err) {
      console.error("Logout API failed, continuing local clear:", err);
    }
    localStorage.removeItem("nomna_logged_in");
    await signalRService.disconnect();
    navigate("/login", { replace: true });
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
    setWorkspaceMembers((prev) => prev.filter((m) => m.id !== member.id));
    try {
      await workspaceApi.kickMember(activeWorkspaceId, member.id);
    } catch (err: unknown) {
      console.error("Failed to kick member:", err);
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

  useEffect(() => {
    setChannelMemberIdsMap({});
  }, [activeWorkspaceId]);

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
                onOpenEditWorkspace={() => useUiStore.getState().setEditWorkspaceOpen(true)}
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
            ) : null}
          </div>

          {/* User Account Footer Bar */}
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

        {/* 3. Active Chat Area or Notification Detail Pane */}
        {activeSidebarView === "notifications" ? (
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

        {/* 4. Right Sidebars Container (Thread, Members, Search, Pinned, Tasks) */}
        <ChatRightPanels
          currentUser={currentUser}
          currentUserRole={currentUserRole}
          currentChannel={currentChannel}
          workspaceMembers={workspaceMembers}
          displayedMembers={displayedMembers}
          loadingChannelMemberIds={loadingChannelMemberIds}
          pinnedMessages={pinnedMessages}
          handleOpenUserProfile={handleOpenUserProfile}
          handleStartDmWithUser={handleStartDmWithUser}
          handleToggleReaction={handleToggleReaction}
          handleEditMessage={handleEditMessage}
          handleDeleteMessage={handleDeleteMessage}
          handleUnpinMessage={handleUnpinMessage}
          isResizingThread={isResizingThread}
          isResizingMember={isResizingMember}
          isResizingSearch={isResizingSearch}
          isResizingPinned={isResizingPinned}
          handleThreadResizeStart={handleThreadResizeStart}
          handleMemberResizeStart={handleMemberResizeStart}
          handleSearchResizeStart={handleSearchResizeStart}
          handlePinnedResizeStart={handlePinnedResizeStart}
        />
      </main>

      {/* 5. Modals Container (All 12 Modals) */}
      <ChatModals
        currentUser={currentUser}
        setCurrentUser={setCurrentUser}
        currentWorkspace={currentWorkspace}
        workspaceMembers={workspaceMembers}
        currentUserRole={currentUserRole}
        isOwner={isOwner}
        theme={theme}
        changeTheme={changeTheme}
        handleLogout={handleLogout}
        handleWorkspaceCreated={handleWorkspaceCreated}
        handleWorkspaceUpdated={handleWorkspaceUpdated}
        handleWorkspaceDeleted={handleWorkspaceDeleted}
        handleChannelCreated={handleChannelCreated}
        handleChannelUpdated={handleChannelUpdated}
        handleChannelDeleted={handleChannelDeleted}
        handleKickMember={handleKickMember}
        handleStartDm={handleStartDm}
        handleStartDmWithUser={handleStartDmWithUser}
        inspectingUser={inspectingUser}
        setInspectingUser={setInspectingUser}
        userProfileAnchor={userProfileAnchor}
        setUserProfileAnchor={setUserProfileAnchor}
        setChannelMemberIdsMap={setChannelMemberIdsMap}
        dmConversations={dmConversations}
      />

      {/* 6. Floating Toast Notification */}
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
export default ChatPage;
