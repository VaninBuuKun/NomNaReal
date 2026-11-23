import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { WorkspaceRail } from "../components/server";
import { ChannelSidebar, UserFooterBar, VoiceConnectionBar } from "../components/channel";
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
import { FriendsDashboard } from "../components/friends/FriendsDashboard";
import { formatMessageTime } from "../utils/formatDate";
import { resolveApiError } from "../utils/errorMapper";
import {
  authApi,
  workspaceApi,
  serverApi,
  channelApi,
  messageApi,
  notificationApi,
  signalRService,
} from "../services";
import { TitleBar, type TitleBarContext } from "../components/layout";
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
  useFriendStore,
  toast,
} from "../stores";
import { useVoiceStore } from "../stores/useVoiceStore";

export const ChatPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { workspaceId, serverId, channelId, chatId } = useParams<{
    workspaceId?: string;
    serverId?: string;
    channelId?: string;
    chatId?: string;
  }>();
  useTheme();
  const friendsList = useFriendStore((state) => state.friends);
  const onlineFriendsCount = useMemo(() => {
    return friendsList.filter((f) => {
      const s = typeof f.status === "number"
        ? f.status === 0 ? "online" : f.status === 1 ? "away" : f.status === 2 ? "dnd" : "offline"
        : f.status;
      return s === "online" || s === "away" || s === "dnd";
    }).length;
  }, [friendsList]);

  // Local Session State
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);

  // 1. Workspace Store
  const {
    workspaces,
    activeWorkspaceId,
    setWorkspaces,
    setActiveWorkspaceId,
    addWorkspace,
    updateWorkspace,
    removeWorkspace,
  } = useWorkspaceStore();

  // 2. Chat Store
  const {
    channels,
    activeChannelId,
    messages,
    hasMoreMessages,
    hasNewerMessages,
    isLoadingMessages,
    isLoadingMoreMessages,
    isLoadingNewerMessages,
    typingUser,
    setChannels,
    setActiveChannelId,
    setMessages,
    appendOlderMessages,
    appendNewerMessages,
    addMessage,
    updateMessage,
    deleteMessage,
    setReactions,
    markChannelRead,
    setChannelUnread,
    setHasMoreMessages,
    setHasNewerMessages,
    setIsLoadingMessages,
    setIsLoadingMoreMessages,
    setIsLoadingNewerMessages,
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
  } = useDmStore();

  // 4. UI Store
  const {
    activeSidebarView,
    isMemberListOpen,
    isPinnedSidebarOpen,
    channelWidth,
    setActiveSidebarView,
    toggleMemberList,
    setMemberListOpen,
    togglePinnedSidebar,
    closePinnedSidebar,
    closeSearch,
    setCreateWorkspaceOpen,
    setCreateChannelOpen,
    setChannelToEdit,
    setChannelToAddMember,
    setNewDmOpen,
    setSettingsOpen,
    isMobileSidebarOpen,
    setMobileSidebarOpen,
  } = useUiStore();

  // Auto-close all right sidebars when switching to DMs view
  useEffect(() => {
    if (activeSidebarView === "dms") {
      setMemberListOpen(false);
      closePinnedSidebar();
      closeSearch();
    }
  }, [activeSidebarView, setMemberListOpen, closePinnedSidebar, closeSearch]);

  const activeSidebarViewRef = useRef(activeSidebarView);
  activeSidebarViewRef.current = activeSidebarView;

  // Panel Resizers Hook
  const {
    isResizingChannel,
    isResizingMember,
    isResizingSearch,
    isResizingPinned,
    handleChannelResizeStart,
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
  const totalUnreadDmCount = useMemo(
    () => dmConversations.reduce((sum, d) => sum + (d.unreadCount || 0), 0),
    [dmConversations],
  );
  const [selectedNotification, setSelectedNotification] =
    useState<AppNotification | null>(null);
  const setToast = useCallback((t: any) => {
    if (!t) return;
    toast.show({
      id: t.id,
      title: t.title,
      description: t.description,
      actionLabel: t.actionLabel,
      onAction: t.onAction,
      variant: t.variant ?? 'info',
    });
  }, []);
  const [channelMemberIdsMap, setChannelMemberIdsMap] = useState<
    Record<string, string[]>
  >({});
  const [loadingChannelMemberIds, setLoadingChannelMemberIds] = useState<
    Record<string, boolean>
  >({});
  const [targetCategoryId, setTargetCategoryId] = useState<string | null>(null);

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

  const channelMessagesCacheRef = useRef<
    Map<string, { messages: Message[]; hasMore: boolean }>
  >(new Map());

  // Keep channel messages cache up-to-date with active messages
  useEffect(() => {
    if (activeChannelId && messages.length > 0) {
      const sample = messages[0];
      // Only cache if messages actually belong to this activeChannelId to prevent cross-contamination
      if (sample && (sample.channelId === activeChannelId || !sample.channelId)) {
        channelMessagesCacheRef.current.set(activeChannelId, {
          messages,
          hasMore: hasMoreMessages,
        });
      }
    }
  }, [activeChannelId, messages, hasMoreMessages]);

  // Fetch Channel Messages with instant SWR cache and history preservation
  const loadMessages = async (channelId: string) => {
    const isCached = channelMessagesCacheRef.current.has(channelId);
    try {
      if (!isCached) {
        setIsLoadingMessages(true);
      }
      const res = await messageApi.getMessages(channelId, undefined, undefined, 50);
      channelMessagesCacheRef.current.set(channelId, {
        messages: res.messages,
        hasMore: res.hasOlder ?? res.hasMore ?? false,
      });
      if (activeChannelIdRef.current === channelId) {
        setMessages((prev) => {
          const pending = prev.filter(
            (m) => m.id.startsWith("temp-") && m.channelId === channelId
          );
          if (prev.length === 0) {
            return [...res.messages, ...pending];
          }
          // Merge unique to preserve any older history already loaded in memory
          const prevMap = new Map(prev.map((m) => [m.id, m]));
          for (const sm of res.messages) {
            prevMap.set(sm.id, sm);
          }
          for (const pm of pending) {
            if (!prevMap.has(pm.id)) {
              prevMap.set(pm.id, pm);
            }
          }
          const merged = Array.from(prevMap.values()).sort(
            (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          );
          channelMessagesCacheRef.current.set(channelId, {
            messages: merged,
            hasMore: res.hasOlder ?? res.hasMore ?? false,
          });
          return merged;
        });
        setHasMoreMessages(res.hasOlder ?? res.hasMore ?? false);
        setHasNewerMessages(false);
      }
    } catch (err) {
      console.error("Failed to load messages:", err);
      if (!isCached && activeChannelIdRef.current === channelId) {
        setMessages([]);
        setHasMoreMessages(false);
        setHasNewerMessages(false);
      }
    } finally {
      if (activeChannelIdRef.current === channelId) {
        setIsLoadingMessages(false);
      }
    }
  };

  // Load older messages (infinite scroll up - Discord batch size 50)
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
        undefined,
        50
      );
      appendOlderMessages(res.messages);
      setHasMoreMessages(res.hasOlder ?? res.hasMore ?? false);
    } catch (err) {
      console.error("Failed to load older messages:", err);
    } finally {
      setIsLoadingMoreMessages(false);
    }
  };

  // Load newer messages (infinite scroll down when viewing history - batch 50)
  const handleLoadNewerMessages = async () => {
    if (
      !activeChannelId ||
      isLoadingNewerMessages ||
      !hasNewerMessages ||
      messages.length === 0
    ) {
      return;
    }

    try {
      setIsLoadingNewerMessages(true);
      const newestMessage = messages[messages.length - 1];
      const res = await messageApi.getMessages(
        activeChannelId,
        undefined,
        newestMessage.createdAt,
        50
      );
      appendNewerMessages(res.messages);
      setHasNewerMessages(res.hasNewer ?? false);
    } catch (err) {
      console.error("Failed to load newer messages:", err);
    } finally {
      setIsLoadingNewerMessages(false);
    }
  };

  const handleJumpToPresent = async () => {
    if (!activeChannelId) return;
    await loadMessages(activeChannelId);
  };

  // Switch Active Channel
  const handleSelectChannel = async (targetChannelId: string, wsId?: string) => {
    useChatStore.getState().setTypingUser(null);

    // Save previous channel messages before switching
    const prevChannelId = activeChannelIdRef.current;
    if (prevChannelId && messages.length > 0) {
      channelMessagesCacheRef.current.set(prevChannelId, {
        messages,
        hasMore: hasMoreMessages,
      });
    }

    setActiveChannelId(targetChannelId);
    activeChannelIdRef.current = targetChannelId;
    setActiveDmId(null);

    const targetWsId = wsId || activeWorkspaceIdRef.current || activeWorkspaceId || currentWorkspace?.id;
    if (targetWsId) {
      setActiveWorkspaceId(targetWsId);
      navigate(`/channels/${targetWsId}/${targetChannelId}`);
    }

    markChannelRead(targetChannelId);
    channelApi.markAsRead(targetChannelId);

    const latestChannels =
      channels.length > 0 ? channels : useChatStore.getState().channels;
    const targetCh = latestChannels.find((c) => c.id === targetChannelId);
    if (targetCh?.isPrivate) {
      fetchChannelMembers(targetChannelId);
    }

    if (
      targetCh &&
      (targetCh.type === ChannelType.Voice || Number(targetCh.type) === 1) &&
      currentUser
    ) {
      void useVoiceStore.getState().joinVoice(
        targetChannelId,
        targetCh.name || "Kênh thoại",
        targetWsId || "",
        {
          id: currentUser.id,
          displayName: currentUser.displayName,
          avatarUrl: currentUser.avatarUrl,
        }
      );
    }

    // Instant cache restore to prevent flicker and old channel messages
    const cached = channelMessagesCacheRef.current.get(targetChannelId);
    if (cached) {
      setMessages(cached.messages);
      setHasMoreMessages(cached.hasMore);
      setHasNewerMessages(false);
      setIsLoadingMessages(false);
    } else {
      setMessages([]);
      setHasMoreMessages(false);
      setHasNewerMessages(false);
      setIsLoadingMessages(true);
    }

    await loadMessages(targetChannelId);
    await signalRService.joinChannel(targetChannelId);
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

  const handleJumpToMessage = useCallback(
    async (messageId: string, targetChannelId?: string) => {
      const channelToUse = targetChannelId || activeChannelId || activeDmId;
      if (targetChannelId && targetChannelId !== (activeChannelId || activeDmId)) {
        handleSelectChannel(targetChannelId);
        await new Promise((r) => setTimeout(r, 200));
      }

      let el = document.getElementById(`msg-${messageId}`);
      if (!el && channelToUse) {
        try {
          setIsLoadingMessages(true);
          const res = await messageApi.getMessagesAround(channelToUse, messageId, 30);
          if (res && res.messages && res.messages.length > 0) {
            setMessages(res.messages);
            setHasMoreMessages(res.hasOlder ?? res.hasMore ?? false);
            setHasNewerMessages(res.hasNewer ?? false);
            await new Promise((r) => setTimeout(r, 100));
            el = document.getElementById(`msg-${messageId}`);
          }
        } catch (err) {
          console.error("Failed to load messages around target:", err);
        } finally {
          setIsLoadingMessages(false);
        }
      }

      if (el) {
        // Confine scrolling strictly within the message scroller to prevent shifting parent layouts
        const scroller = el.closest('[data-virtuoso-scroller="true"]');
        if (scroller) {
          const scrollerRect = scroller.getBoundingClientRect();
          const elRect = el.getBoundingClientRect();
          const offset = elRect.top - scrollerRect.top - scrollerRect.height / 2 + elRect.height / 2;
          scroller.scrollTop += offset;
        } else {
          el.scrollIntoView({ block: "center", behavior: "auto" });
        }
        el.classList.remove("animate-message-highlight");
        void el.offsetWidth;
        el.classList.add("animate-message-highlight");
        setTimeout(() => {
          el.classList.remove("animate-message-highlight");
        }, 2200);
      }
    },
    [activeChannelId, activeDmId, handleSelectChannel, setMessages, setHasMoreMessages, setIsLoadingMessages]
  );

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
          handleJumpToMessage(notif.messageId!, notif.channelId);
        }, 300);
      }
    },
    [handleSelectChannel, setActiveWorkspaceId, setActiveSidebarView, handleJumpToMessage],
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
      toast.success("Đã ghim tin nhắn", "Tin nhắn đã được ghim lên đầu kênh thành công.");
    } catch (err: any) {
      console.error("Failed to pin message:", err);
      if (!err?._toastHandled) {
        const { title, description } = resolveApiError(err);
        toast.error(title, description);
      }
    }
  };

  const handleUnpinMessage = async (messageId: string) => {
    try {
      await messageApi.unpinMessage(messageId);
      setPinnedMessages((prev) =>
        prev.filter((p) => p.messageId !== messageId),
      );
      toast.success("Đã bỏ ghim", "Tin nhắn đã được gỡ khỏi danh sách ghim.");
    } catch (err: any) {
      console.error("Failed to unpin message:", err);
      if (!err?._toastHandled) {
        const { title, description } = resolveApiError(err);
        toast.error(title, description);
      }
    }
  };

  // Fetch Global User Direct Messages (Independent of any workspace)
  const refreshUserDms = useCallback(async (): Promise<DirectMessageItem[]> => {
    try {
      const rawDms = await channelApi.getUserDms();
      const formattedDms: DirectMessageItem[] = (rawDms || []).map((d: any) => ({
        id: d.id,
        workspaceId: d.serverId || d.workspaceId,
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
      // Deduplicate by target user id (keeping the most recent conversation)
      const seenUserIds = new Set<string>();
      const deduplicatedDms: DirectMessageItem[] = [];
      for (const dm of formattedDms) {
        const uid = (dm.user?.id || '').toLowerCase();
        if (uid && !seenUserIds.has(uid)) {
          seenUserIds.add(uid);
          deduplicatedDms.push(dm);
        }
      }

      setDmConversations(deduplicatedDms);
      return deduplicatedDms;
    } catch (dmErr) {
      console.error("Failed to fetch user DMs:", dmErr);
      return [];
    }
  }, []);

  // Fetch Workspace Channels and Members in parallel (Never overwrite global DMs)
  const loadWorkspaceData = async (wsId: string, _currentUid?: string) => {
    try {
      const [chs, members] = await Promise.all([
        channelApi.getChannels(wsId),
        workspaceApi.getMembers(wsId).catch(() => []),
      ]);

      setChannels(chs);

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

      return { channels: chs };
    } catch (err) {
      console.error("Failed to load workspace data:", err);
      return { channels: [] };
    }
  };

  // Switch Active Workspace
  const handleSelectWorkspace = async (workspaceIdToSelect: string) => {
    if (workspaceIdToSelect === activeWorkspaceId && activeSidebarView === "channels") return;
    setActiveSidebarView("channels");
    setActiveWorkspaceId(workspaceIdToSelect);
    try {
      const { channels: chs } = await loadWorkspaceData(
        workspaceIdToSelect,
        currentUser?.id,
      );
      if (chs.length > 0) {
        const defaultCh =
          chs.find((c) => c.name?.toLowerCase() === "general") || chs[0];
        await handleSelectChannel(defaultCh.id, workspaceIdToSelect);
      } else {
        setActiveChannelId(null);
        setMessages([]);
        setHasMoreMessages(false);
        navigate(`/channels/${workspaceIdToSelect}`);
      }
    } catch (err) {
      console.error("Failed to switch workspace:", err);
    }
  };

  const handleWorkspaceCreated = (ws: Workspace) => {
    addWorkspace(ws);
    handleSelectWorkspace(ws.id);
  };

  // SignalR message handler callback with Optimistic reconciliation & real-time notification
  const handleIncomingMessage = useCallback(
    (msg: Message) => {
      setMessages((prev) => {
        const targetChan = activeChannelIdRef.current;
        if (!targetChan || msg.channelId.toLowerCase() !== targetChan.toLowerCase()) return prev;
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

      const isCurrent =
        Boolean(activeChannelIdRef.current) &&
        msg.channelId.toLowerCase() === activeChannelIdRef.current?.toLowerCase();
      setChannelUnread(
        msg.channelId,
        msg.createdAt,
        !isCurrent,
      );

      const smartPreview = (() => {
        const text = (msg.content || "").trim();
        if (text) {
          if (
            /^https?:\/\/\S+$/i.test(text) &&
            (text.includes("tenor.com") ||
              text.includes("giphy.com") ||
              /\.gif(\?.*)?$/i.test(text))
          ) {
            return "🎬 Đã gửi một ảnh GIF";
          }
          if (/^https?:\/\/\S+\.(png|jpe?g|webp|avif)(\?.*)?$/i.test(text)) {
            return "📷 Đã gửi một hình ảnh";
          }
          return text;
        }
        const atts = msg.attachments || [];
        if (atts.length > 0) {
          const first = atts[0];
          const ct = (first.contentType || "").toLowerCase();
          const t = (first.type || "").toLowerCase();
          if (t === "audio" || ct.startsWith("audio/")) {
            return "🎤 Tin nhắn thoại";
          }
          if (ct === "image/gif" || /\.gif$/i.test(first.fileName || "")) {
            return "🎬 Đã gửi một ảnh GIF";
          }
          if (t === "image" || ct.startsWith("image/")) {
            return atts.length > 1
              ? `📷 Đã gửi ${atts.length} hình ảnh`
              : "📷 Đã gửi một hình ảnh";
          }
          if (t === "video" || ct.startsWith("video/")) {
            return "🎥 Đã gửi một video";
          }
          return `📎 ${first.fileName || "Đã gửi một tệp đính kèm"}`;
        }
        return "";
      })();

      // Dynamically update or create DM snippet in conversation list
      useDmStore.getState().upsertDmMessage(
        msg.channelId,
        {
          content: smartPreview,
          createdAt: msg.createdAt,
          senderId: msg.senderId,
          senderDisplayName: msg.senderDisplayName,
          senderUsername: msg.senderUsername,
          senderAvatarUrl: msg.senderAvatarUrl || undefined,
        },
        isCurrent
      );

      // If incoming message is from another user and not currently active channel
      if (!isCurrent && msg.senderId !== currentUser?.id) {
        setToast({
          id: `msg-${msg.id}`,
          title: msg.senderDisplayName || "Tin nhắn mới",
          description: smartPreview.length > 55 ? `${smartPreview.slice(0, 55)}...` : smartPreview,
          actionLabel: "Xem tin nhắn",
          onAction: () => {
            setActiveSidebarView("dms");
            navigate(`/channels/@me/${msg.channelId}`);
            setToast(null);
          },
        });
      }
    },
    [currentUser?.id, navigate, setActiveSidebarView, setChannelUnread, setMessages],
  );

  // Hook for all SignalR realtime listeners
  const { setupSignalR } = useChatSignalR({
    currentUser,
    setCurrentUser,
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
      useFriendStore.getState().fetchFriends().catch(console.error);

      // Load Workspaces
      const wsList = await workspaceApi.getWorkspaces();
      setWorkspaces(wsList);

      // Always pre-load User DMs in background so switching between Servers and DMs is seamless
      const loadedDms: DirectMessageItem[] = await refreshUserDms();

      const targetWsId = serverId || workspaceId;
      const isDmRoute =
        location.pathname.startsWith("/channels/@me") ||
        location.pathname === "/" ||
        !targetWsId;

      if (isDmRoute) {
        setActiveSidebarView("dms");
        setActiveWorkspaceId(null);
        if (chatId) {
          const foundDm = loadedDms.find((d) => d.id === chatId);
          if (foundDm) {
            await handleSelectDmConversation(foundDm);
          } else if (chatId.startsWith("pending-dm-")) {
            setActiveDmId(chatId);
            setActiveChannelId(chatId);
            activeChannelIdRef.current = chatId;
            setMessages([]);
            setHasMoreMessages(false);
            setHasNewerMessages(false);
            setIsLoadingMessages(false);
          } else {
            setActiveDmId(chatId);
            setActiveChannelId(chatId);
            activeChannelIdRef.current = chatId;
            try {
              const chanInfo = await channelApi.getChannel(chatId);
              const synthesizedDm: DirectMessageItem = {
                id: chanInfo.id,
                workspaceId: chanInfo.serverId || chanInfo.workspaceId,
                user: {
                  id: chanInfo.id,
                  displayName: chanInfo.name || "Direct Message",
                  username: chanInfo.name?.toLowerCase().replace(/\s+/g, "") || "user",
                  email: "",
                  status: "online",
                },
                lastMessage: "Cuộc trò chuyện",
                unreadCount: 0,
                isPending: false,
              };
              setDmConversations((prev) => [synthesizedDm, ...prev.filter((c) => c.id !== chatId)]);
            } catch (e) {
              console.warn("Could not fetch channel metadata for DM:", e);
            }
            await loadMessages(chatId);
            await signalRService.joinChannel(chatId);
          }
        } else {
          setActiveDmId(null);
          setActiveChannelId(null);
          activeChannelIdRef.current = null;
        }
      } else if (wsList.length > 0 && wsList.some((w) => w.id === targetWsId)) {
        const targetWs = wsList.find((w) => w.id === targetWsId)!;
        setActiveWorkspaceId(targetWs.id);
        setActiveSidebarView("channels");

        const { channels: chList } = await loadWorkspaceData(
          targetWs.id,
          user.id,
        );

        if (chList.length > 0) {
          const selectableChannels = chList.filter((c) => c.type !== ChannelType.Category);
          const defaultCh =
            (channelId && selectableChannels.find((c) => c.id === channelId)) ||
            selectableChannels.find((c) => c.name?.toLowerCase() === "general") ||
            selectableChannels[0] ||
            chList[0];
          await handleSelectChannel(defaultCh.id, targetWs.id);
        }
      } else {
        // Fallback to Friends / DMs if target server not found or user has no servers
        setActiveSidebarView("dms");
        setActiveWorkspaceId(null);
        setActiveDmId(null);
        setActiveChannelId(null);
        activeChannelIdRef.current = null;
        if (location.pathname !== "/channels/@me") {
          navigate("/channels/@me", { replace: true });
        }
      }

      try {
        const onlineUserIds = await signalRService.getOnlineUsers();
        if (onlineUserIds.length > 0) {
          onlineUserIds.forEach((uid) => {
            useDmStore.getState().updateUserStatus(uid, "online");
            useFriendStore.getState().updateFriendStatus(uid, "online");
          });
        }
      } catch (presenceErr) {
        console.warn("Could not sync online users:", presenceErr);
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

  // Sync route changes (back/forward, external navigation) with state
  useEffect(() => {
    if (isInitializing) return;

    if (location.pathname.startsWith("/channels/@me")) {
      if (activeSidebarView !== "dms") {
        setActiveSidebarView("dms");
      }
      if (activeWorkspaceId !== null) {
        setActiveWorkspaceId(null);
      }
      if (chatId) {
        if (activeChannelIdRef.current !== chatId && !chatId.startsWith("pending-dm-")) {
          setActiveDmId(chatId);
          setActiveChannelId(chatId);
          activeChannelIdRef.current = chatId;
          loadMessages(chatId);
          signalRService.joinChannel(chatId);
        }
      } else {
        if (activeDmId !== null) {
          setActiveDmId(null);
          setActiveChannelId(null);
          activeChannelIdRef.current = null;
        }
      }
    } else if (serverId) {
      // If server does not exist in user's workspace list, redirect to /channels/@me
      if (!workspaces.some((w) => w.id === serverId)) {
        setActiveSidebarView("dms");
        setActiveWorkspaceId(null);
        setActiveDmId(null);
        setActiveChannelId(null);
        activeChannelIdRef.current = null;
        navigate("/channels/@me", { replace: true });
        return;
      }

      if (activeSidebarView !== "channels") {
        setActiveSidebarView("channels");
      }
      if (activeWorkspaceId !== serverId) {
        setActiveWorkspaceId(serverId);
        loadWorkspaceData(serverId, currentUser?.id).then(({ channels: chs }) => {
          const selectable = chs.filter((c) => c.type !== ChannelType.Category);
          const target = (channelId && selectable.find((c) => c.id === channelId)) ||
            selectable.find((c) => c.name?.toLowerCase() === "general") ||
            selectable[0];
          if (target && target.id !== activeChannelIdRef.current) {
            handleSelectChannel(target.id, serverId);
          }
        });
      } else if (channelId && activeChannelId !== channelId) {
        handleSelectChannel(channelId, serverId);
      } else if (!channelId && channels.length > 0) {
        const selectable = channels.filter((c) => c.type !== ChannelType.Category);
        const target = selectable.find((c) => c.name?.toLowerCase() === "general") || selectable[0];
        if (target && target.id !== activeChannelIdRef.current) {
          handleSelectChannel(target.id, serverId);
        }
      }
    }
  }, [location.pathname, serverId, channelId, chatId, isInitializing]);

  const handleSendMessage = async (
    msgContent: string,
    attachments?: Array<{
      url: string;
      fileName: string;
      fileSize: number;
      contentType: string;
      type: "image" | "video" | "file" | "audio";
    }>,
    replyToMessageId?: string,
  ) => {
    if (!activeChannelId && !activeDmId) return;
    const targetChannelId = activeChannelId || activeDmId!;

    const tempId = `temp-${Date.now()}`;
    const repliedMsg = replyToMessageId
      ? messages.find((m) => m.id === replyToMessageId)
      : undefined;

    const buildOptimistic = (channelId: string): Message => ({
      id: tempId,
      channelId,
      senderId: currentUser?.id || "temp-me",
      senderDisplayName: currentUser?.displayName || "Me",
      senderUsername: currentUser?.username || "me",
      senderAvatarUrl: currentUser?.avatarUrl,
      content: msgContent,
      createdAt: new Date().toISOString(),
      isEdited: false,
      replyTo: repliedMsg
        ? {
            id: repliedMsg.id,
            senderId: repliedMsg.senderId,
            senderDisplayName: repliedMsg.senderDisplayName,
            senderAvatarUrl: repliedMsg.senderAvatarUrl,
            content: repliedMsg.content,
            isDeleted: false,
          }
        : undefined,
      attachments: attachments?.map((a) => ({
        id: `att-${Date.now()}`,
        url: a.url,
        fileName: a.fileName,
        fileSize: a.fileSize,
        contentType: a.contentType,
        type: a.type,
      })),
    });

    if (activeDmId && activeDmId.startsWith("pending-dm-")) {
      const targetUserId = activeDmId.replace("pending-dm-", "");
      try {
        const realDm = await channelApi.createOrGetDm(
          targetUserId,
          null, // Direct messages with members are always global user-to-user DMs
        );
        const optMsg = buildOptimistic(realDm.id);
        useDmStore.getState().upgradePendingDm(activeDmId, realDm.id);
        activeChannelIdRef.current = realDm.id;
        setActiveWorkspaceId(null);
        setMessages([optMsg]);
        channelMessagesCacheRef.current.set(realDm.id, {
          messages: [optMsg],
          hasMore: false,
        });
        setHasMoreMessages(false);
        setHasNewerMessages(false);
        setIsLoadingMessages(false);
        setActiveDmId(realDm.id);
        setActiveChannelId(realDm.id);
        navigate(`/channels/@me/${realDm.id}`, { replace: true });
        await signalRService.joinChannel(realDm.id);

        let realSent: Message | null = null;
        try {
          realSent = await signalRService.sendMessage(
            realDm.id,
            msgContent,
            replyToMessageId || null,
            attachments,
          );
        } catch (signalRErr) {
          console.warn("SignalR sendMessage failed, attempting HTTP fallback:", signalRErr);
        }

        if (!realSent) {
          try {
            realSent = await messageApi.sendMessage(
              realDm.id,
              msgContent,
              replyToMessageId || null,
              attachments,
            );
          } catch (httpErr) {
            console.error("HTTP fallback sendMessage failed:", httpErr);
          }
        }

        if (realSent) {
          setMessages((prev) => {
            if (prev.some((m) => m.id === realSent!.id)) {
              return prev.filter((m) => m.id !== tempId);
            }
            const foundTemp = prev.some((m) => m.id === tempId);
            if (foundTemp) {
              return prev.map((m) => (m.id === tempId ? realSent! : m));
            }
            return [...prev, realSent!];
          });
        }
        return;
      } catch (err) {
        console.error("Failed to materialize DM conversation:", err);
        return;
      }
    }

    addMessage(buildOptimistic(targetChannelId));

    let realMessage: Message | null = null;
    try {
      realMessage = await signalRService.sendMessage(
        targetChannelId,
        msgContent,
        replyToMessageId || null,
        attachments,
      );
    } catch (err) {
      console.warn("SignalR sendMessage failed, attempting HTTP fallback:", err);
    }

    if (!realMessage) {
      try {
        realMessage = await messageApi.sendMessage(
          targetChannelId,
          msgContent,
          replyToMessageId || null,
          attachments,
        );
      } catch (httpErr) {
        console.error("HTTP fallback sendMessage failed:", httpErr);
      }
    }

    if (realMessage) {
      setMessages((prev) => {
        if (prev.some((m) => m.id === realMessage!.id)) {
          return prev.filter((m) => m.id !== tempId);
        }
        const foundTemp = prev.some((m) => m.id === tempId);
        if (foundTemp) {
          return prev.map((m) => (m.id === tempId ? realMessage! : m));
        }
        return [...prev, realMessage!];
      });
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
    useUiStore.getState().resetUiState();
    localStorage.removeItem("nomna_logged_in");
    await signalRService.disconnect();
    navigate("/login", { replace: true });
  };

  const handleCreateChannel = (type: ChannelType, categoryId?: string) => {
    setTargetCategoryId(categoryId || null);
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
    // Only auto-select text channels upon creation. Never auto-switch into newly created voice channels or categories.
    const isTextChannel = newChannel.type === ChannelType.Text || Number(newChannel.type) === 0;
    if (isTextChannel) {
      handleSelectChannel(newChannel.id);
    }
  };

  const handleSelectDmConversation = async (dm: DirectMessageItem) => {
    // Save previous channel messages before switching
    const prevChannelId = activeChannelIdRef.current;
    if (prevChannelId && messages.length > 0) {
      channelMessagesCacheRef.current.set(prevChannelId, {
        messages,
        hasMore: hasMoreMessages,
      });
    }

    setActiveWorkspaceId(null);
    setActiveDmId(dm.id);
    setActiveChannelId(dm.id);
    activeChannelIdRef.current = dm.id;
    navigate(`/channels/@me/${dm.id}`);

    useChatStore.getState().setTypingUser(null);

    if (dm.isPending) {
      setMessages([]);
      setHasMoreMessages(false);
      setHasNewerMessages(false);
      setIsLoadingMessages(false);
      setPinnedMessages([]);
    } else {
      const cached = channelMessagesCacheRef.current.get(dm.id);
      if (cached) {
        setMessages(cached.messages);
        setHasMoreMessages(cached.hasMore);
        setHasNewerMessages(false);
        setIsLoadingMessages(false);
      } else {
        setMessages([]);
        setHasMoreMessages(false);
        setHasNewerMessages(false);
        setIsLoadingMessages(true);
      }
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
    setActiveWorkspaceId(null);
    let existing = dmConversations.find(
      (c) => (c.user?.id || '').toLowerCase() === (targetUser?.id || '').toLowerCase()
    );

    if (!existing) {
      const pendingDmId = `pending-dm-${targetUser.id}`;
      const newDm: DirectMessageItem = {
        id: pendingDmId,
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
    navigate(`/channels/@me/${existing.id}`);
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

  const activeDm =
    dmConversations.find((d) => d.id === activeDmId) ||
    (activeDmId
      ? {
          id: activeDmId,
          workspaceId: activeWorkspaceId || undefined,
          user: {
            id: activeDmId,
            displayName: "Direct Message",
            username: "user",
            email: "",
            status: "online" as const,
          },
          lastMessage: "Cuộc trò chuyện",
          unreadCount: 0,
          isPending: false,
        }
      : undefined);
  const currentWorkspace =
    workspaces.find((w: any) => w.id === activeWorkspaceId) || null;
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
    const remaining = workspaces.filter((w: any) => w.id !== deletedId);
    if (remaining.length > 0) {
      handleSelectWorkspace(remaining[0].id);
    } else {
      setActiveWorkspaceId(null);
      setActiveSidebarView("dms");
      setChannels([]);
      setMessages([]);
      navigate("/channels/@me", { replace: true });
    }
  };

  const handleLeaveWorkspace = async () => {
    if (!activeWorkspaceId) return;
    if (isOwner) {
      alert(
        "Bạn là chủ sở hữu của máy chủ này. Bạn không thể rời nhóm trừ khi chuyển quyền hoặc xóa máy chủ.",
      );
      return;
    }
    try {
      await workspaceApi.leaveWorkspace(activeWorkspaceId);
      handleWorkspaceDeleted(activeWorkspaceId);
      setToast({
        id: `leave-ws-${Date.now()}`,
        title: "Đã rời máy chủ",
        description: `Bạn đã rời khỏi "${currentWorkspace?.name || "máy chủ"}".`,
      });
    } catch (err: any) {
      console.error("Failed to leave workspace:", err);
      if (!err?._toastHandled) {
        const { title, description } = resolveApiError(err);
        toast.error(title, description);
      }
      throw err;
    }
  };

  const handleKickMember = async (member: DirectMessageUser) => {
    if (!activeWorkspaceId) return;
    setWorkspaceMembers((prev) => prev.filter((m) => m.id !== member.id));
    try {
      await workspaceApi.kickMember(activeWorkspaceId, member.id);
      toast.success("Đã trục xuất thành viên", `Đã xóa ${member.displayName} khỏi máy chủ.`);
    } catch (err: any) {
      console.error("Failed to kick member:", err);
      const members = await workspaceApi
        .getMembers(activeWorkspaceId)
        .catch(() => []);
      setWorkspaceMembers(members as any);
      if (!err?._toastHandled) {
        const { title, description } = resolveApiError(err);
        toast.error(title, description);
      }
      throw err;
    }
  };

  const handleBanMember = async (member: DirectMessageUser, reason?: string) => {
    if (!activeWorkspaceId) return;
    setWorkspaceMembers((prev) => prev.filter((m) => m.id !== member.id));
    try {
      await serverApi.banMember(activeWorkspaceId, member.id, reason);
      toast.success("Đã cấm thành viên", `Đã cấm vĩnh viễn ${member.displayName} khỏi máy chủ.`);
    } catch (err: any) {
      console.error("Failed to ban member:", err);
      const members = await workspaceApi
        .getMembers(activeWorkspaceId)
        .catch(() => []);
      setWorkspaceMembers(members as any);
      if (!err?._toastHandled) {
        const { title, description } = resolveApiError(err);
        toast.error(title, description);
      }
      throw err;
    }
  };

  const handleTimeoutMember = async (
    member: DirectMessageUser,
    durationMinutes: number,
    reason?: string
  ) => {
    if (!activeWorkspaceId) return;
    try {
      await serverApi.timeoutMember(activeWorkspaceId, member.id, durationMinutes, reason);
      const timeoutUntil =
        durationMinutes > 0
          ? new Date(Date.now() + durationMinutes * 60000).toISOString()
          : null;

      setWorkspaceMembers((prev) =>
        prev.map((m) =>
          m.id === member.id
            ? { ...m, communicationDisabledUntil: timeoutUntil }
            : m
        )
      );

      if (durationMinutes > 0) {
        toast.success(
          "Đã tạm khóa chat",
          `Đã đặt timeout cho ${member.displayName} (${durationMinutes} phút).`
        );
      } else {
        toast.success(
          "Đã gỡ timeout",
          `Đã gỡ tạm khóa chat cho ${member.displayName}.`
        );
      }
    } catch (err: any) {
      console.error("Failed to timeout member:", err);
      if (!err?._toastHandled) {
        const { title, description } = resolveApiError(err);
        toast.error(title, description);
      }
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
    if (activeWorkspaceId) {
      void signalRService.joinServer(activeWorkspaceId);
      void useVoiceStore.getState().syncServerVoiceParticipants(activeWorkspaceId);
    }
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

  const {
    connectedChannelId: voiceConnectedChannelId,
    participants: voiceParticipants,
    channelParticipantsMap,
  } = useVoiceStore();

  const displayedMembers = useMemo(() => {
    if (!currentChannel) return workspaceMembers;

    if (currentChannel.type === ChannelType.Voice || Number(currentChannel.type) === 1) {
      const chKey = currentChannel.id.toLowerCase();
      const activeVoiceUsers =
        voiceConnectedChannelId?.toLowerCase() === chKey
          ? voiceParticipants
          : channelParticipantsMap[chKey] ||
            channelParticipantsMap[currentChannel.id] ||
            [];

      return activeVoiceUsers.map((vp) => {
        const matched = workspaceMembers.find(
          (m) => m.id.toLowerCase() === vp.userId.toLowerCase()
        );
        if (matched) {
          return { ...matched, status: "online" as const };
        }
        return {
          id: vp.userId,
          displayName: vp.displayName,
          username: vp.displayName.toLowerCase().replace(/\s+/g, ""),
          email: "",
          avatarUrl: vp.avatarUrl || undefined,
          status: "online" as const,
          role: "Đang tham gia thoại",
        };
      });
    }

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
    voiceConnectedChannelId,
    voiceParticipants,
    channelParticipantsMap,
  ]);

  if (isInitializing && !currentUser) {
    return <></>;
  }

  const titleContext: TitleBarContext =
    activeSidebarView === "channels" && currentWorkspace
      ? { kind: "server", name: currentWorkspace.name, iconUrl: currentWorkspace.iconUrl }
      : activeSidebarView === "dms" && activeDm
        ? { kind: "dm", name: activeDm.user.displayName }
        : { kind: "friends" };

  return (
    <>
      <main
        id="appLayout"
        className="flex flex-col overflow-hidden h-[100dvh] w-screen relative"
        style={{
          userSelect:
            isResizingChannel || isResizingMember
              ? "none"
              : "auto",
          cursor:
            isResizingChannel || isResizingMember
              ? "col-resize"
              : "auto",
        }}
      >
        <TitleBar
          context={titleContext}
          unreadNotificationCount={unreadNotificationCount}
          onSelectNotification={handleNavigateFromNotification}
        />
        <div className="flex-1 min-h-0 flex overflow-hidden">
        {/* 1 & 2. Left Sidebar Section (WorkspaceRail + Sub-Sidebar, with User Footer Bar spanning across the bottom) */}
        {/* Mobile Backdrop Overlay */}
        {isMobileSidebarOpen && (
          <div
            className="fixed inset-0 bg-overlay z-40 md:hidden backdrop-blur-xs transition-opacity"
            onClick={() => setMobileSidebarOpen(false)}
          />
        )}

        <div
          className={`h-full flex flex-col shrink-0 overflow-hidden bg-[var(--bg-sidebar)] transition-transform duration-200 z-45 ${
            isMobileSidebarOpen
              ? "fixed inset-y-0 left-0 max-w-[85vw] shadow-modal translate-x-0 md:static md:max-w-none md:shadow-none"
              : "fixed inset-y-0 left-0 max-w-[85vw] -translate-x-full md:static md:translate-x-0 md:max-w-none"
          }`}
          style={{
            width: `${72 + (activeSidebarView === "notifications" ? Math.max(channelWidth, 310) : channelWidth)}px`,
          }}
        >
          {/* Top Row: Workspace Rail (72px) + Sub-Sidebar Column */}
          <div className="flex-1 min-h-0 flex overflow-hidden">
            <WorkspaceRail
              workspaces={workspaces}
              activeWorkspaceId={activeWorkspaceId}
              activeSidebarView={activeSidebarView}
              unreadDmCount={totalUnreadDmCount}
              onSelectView={(view: any) => {
                setActiveSidebarView(view);
                setMobileSidebarOpen(false);
                if (view === "dms") {
                  setActiveWorkspaceId(null);
                  refreshUserDms();
                  if (activeDmId) {
                    navigate(`/channels/@me/${activeDmId}`);
                  } else {
                    navigate("/channels/@me");
                  }
                }
              }}
              onSelectWorkspace={(id) => {
                handleSelectWorkspace(id);
                setMobileSidebarOpen(false);
              }}
              onCreateWorkspace={() => setCreateWorkspaceOpen(true)}
              onGoHome={() => {
                setActiveSidebarView("dms");
                setActiveWorkspaceId(null);
                refreshUserDms();
                navigate("/channels/@me");
                setMobileSidebarOpen(false);
              }}
            />

            {/* Sub-Sidebar Column (Channel / DM / Notification Sidebar) */}
            <div className="flex-1 min-h-0 overflow-hidden flex flex-col border-l border-[var(--border-color)]/30">
              <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
                {activeSidebarView === "channels" ? (
                  <ChannelSidebar
                    currentWorkspace={currentWorkspace}
                    channels={channels}
                    activeChannelId={activeChannelId}
                    onSelectChannel={(chId) => {
                      handleSelectChannel(chId);
                      setMobileSidebarOpen(false);
                    }}
                    onCreateChannel={handleCreateChannel}
                    onOpenSettings={() => setSettingsOpen(true)}
                    isOwner={isOwner}
                    onOpenEditWorkspace={() => useUiStore.getState().setEditWorkspaceOpen(true)}
                    onLeaveWorkspace={handleLeaveWorkspace}
                    onOpenEditChannel={(ch) => setChannelToEdit(ch)}
                    onOpenAddChannelMember={(ch) => setChannelToAddMember(ch)}
                    onChannelsReorder={(newChannels) => setChannels(newChannels)}
                    currentUser={currentUser}
                    onOpenUserProfile={handleOpenUserProfile}
                  />
                ) : activeSidebarView === "dms" ? (
                  <DirectMessagesSidebar
                    conversations={dmConversations}
                    activeConversationId={activeDmId}
                    isFriendsActive={!activeDmId}
                    onSelectFriends={() => {
                      setActiveDmId(null);
                      setActiveChannelId(null);
                      navigate("/channels/@me");
                      setMobileSidebarOpen(false);
                    }}
                    onSelectConversation={(item) => {
                      handleSelectDmConversation(item);
                      setMobileSidebarOpen(false);
                    }}
                    onOpenNewDm={() => setNewDmOpen(true)}
                    onRemoveConversation={(id, e) => {
                      e.stopPropagation();
                      setDmConversations((prev) => prev.filter((c) => c.id !== id));
                      if (activeDmId === id) {
                        setActiveDmId(null);
                        setActiveChannelId(null);
                      }
                    }}
                    onlineFriendsCount={onlineFriendsCount}
                    onStartDmWithFriend={(friend) => {
                      handleStartDmWithUser(friend);
                      setMobileSidebarOpen(false);
                    }}
                  />
                ) : activeSidebarView === "notifications" ? (
                  <NotificationsSidebar
                    notifications={notifications}
                    activeNotificationId={selectedNotification?.id}
                    onSelectNotification={(n) => {
                      handleNotificationSelect(n);
                      setMobileSidebarOpen(false);
                    }}
                    onMarkAllRead={handleMarkAllNotificationsRead}
                  />
                ) : null}
              </div>
            </div>
          </div>

          {/* Voice Connection Status Card: directly above UserFooterBar (Image 4 aligned width) */}
          <VoiceConnectionBar
            currentWorkspaceName={currentWorkspace?.name}
            onNavigateToVoiceChannel={(chId, srvId) => {
              setActiveSidebarView("channels");
              handleSelectChannel(chId, srvId || undefined);
            }}
          />

          {/* User Account Footer Bar (pinned directly at bottom, matching width with VoiceConnectionBar) */}
          <UserFooterBar
            currentUser={currentUser}
            onOpenSettings={() => setSettingsOpen(true)}
            onUpdateStatus={(newPref) => {
              setCurrentUser((prev) => (prev ? { ...prev, statusPreference: newPref } : null));
            }}
          />
        </div>

        {/* 2.5 Resizer Divider (Hidden on mobile) */}
        <div
          className={`hidden md:block w-px cursor-col-resize relative shrink-0 z-25 transition-colors duration-150 select-none hover:bg-[var(--accent-primary)] after:content-[''] after:absolute after:top-0 after:bottom-0 after:-left-[3px] after:-right-[3px] after:z-26 ${
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
          <FriendsDashboard
            currentUser={currentUser}
            onStartDm={(friend) => handleStartDmWithUser(friend)}
            onOpenUserProfile={(friend) => handleOpenUserProfile(friend as any)}
            onToast={(t) => setToast(t)}
          />
        ) : (
          <ChatArea
            currentChannel={currentChannel}
            activeDm={activeDm}
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
            onStartDmWithUser={handleStartDmWithUser}
            hasMoreMessages={hasMoreMessages}
            isLoadingMore={isLoadingMoreMessages}
            hasNewerMessages={hasNewerMessages}
            isLoadingNewer={isLoadingNewerMessages}
            isLoadingMessages={isLoadingMessages}
            onLoadMoreMessages={handleLoadMoreMessages}
            onLoadNewerMessages={handleLoadNewerMessages}
            onJumpToPresent={handleJumpToPresent}
            workspaceMembers={workspaceMembers}
            isMemberListOpen={isMemberListOpen}
            onToggleMemberList={toggleMemberList}
            onOpenUserProfile={handleOpenUserProfile}
            pinnedMessages={pinnedMessages}
            onPinMessage={handlePinMessage}
            onUnpinMessage={handleUnpinMessage}
            isPinnedSidebarOpen={isPinnedSidebarOpen}
            onTogglePinnedSidebar={togglePinnedSidebar}
            onJumpToMessage={handleJumpToMessage}
          />
        )}

        {/* 4. Right Sidebars Container (Members, Search, Pinned, Tasks) */}
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
          isResizingMember={isResizingMember}
          isResizingSearch={isResizingSearch}
          isResizingPinned={isResizingPinned}
          handleMemberResizeStart={handleMemberResizeStart}
          handleSearchResizeStart={handleSearchResizeStart}
          handlePinnedResizeStart={handlePinnedResizeStart}
          onJumpToMessage={handleJumpToMessage}
        />
        </div>
      </main>

      {/* 5. Modals Container (All 12 Modals) */}
      <ChatModals
        currentUser={currentUser}
        setCurrentUser={setCurrentUser}
        currentWorkspace={currentWorkspace}
        workspaceMembers={workspaceMembers}
        currentUserRole={currentUserRole}
        isOwner={isOwner}
        handleLogout={handleLogout}
        handleWorkspaceCreated={handleWorkspaceCreated}
        handleWorkspaceUpdated={handleWorkspaceUpdated}
        handleWorkspaceDeleted={handleWorkspaceDeleted}
        handleChannelCreated={handleChannelCreated}
        handleChannelUpdated={handleChannelUpdated}
        handleChannelDeleted={handleChannelDeleted}
        handleKickMember={handleKickMember}
        handleBanMember={handleBanMember}
        handleTimeoutMember={handleTimeoutMember}
        handleStartDm={handleStartDm}
        handleStartDmWithUser={handleStartDmWithUser}
        inspectingUser={inspectingUser}
        setInspectingUser={setInspectingUser}
        userProfileAnchor={userProfileAnchor}
        setUserProfileAnchor={setUserProfileAnchor}
        setChannelMemberIdsMap={setChannelMemberIdsMap}
        dmConversations={dmConversations}
        channels={channels}
        initialCategoryId={targetCategoryId}
      />
    </>
  );
};
export default ChatPage;
