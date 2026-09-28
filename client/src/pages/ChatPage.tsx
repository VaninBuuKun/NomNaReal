import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { WorkspaceRail, CreateWorkspaceModal } from '../components/workspace';
import { ChannelSidebar, UserFooterBar, CreateChannelModal } from '../components/channel';
import { DirectMessagesSidebar, NewDirectMessageModal, type DirectMessageItem, type DirectMessageUser } from '../components/dm';
import { ChatArea } from '../components/chat';
import { ThreadPanel } from '../components/thread';
import { SettingsModal } from '../components/settings';
import { authApi, workspaceApi, channelApi, messageApi, signalRService } from '../services';
import { useTheme } from '../hooks/useTheme';
import { ChannelType, type User, type Workspace, type Channel, type Message } from '../types';

export const ChatPage: React.FC = () => {
  const navigate = useNavigate();
  const { workspaceId: paramWorkspaceId } = useParams<{ workspaceId?: string }>();
  const { theme, changeTheme } = useTheme();

  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [isSwitchingWorkspace, setIsSwitchingWorkspace] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isCreateWorkspaceOpen, setIsCreateWorkspaceOpen] = useState(false);
  const [isCreateChannelOpen, setIsCreateChannelOpen] = useState(false);
  const [createChannelType, setCreateChannelType] = useState<ChannelType>(ChannelType.Text);
  const [isThreadOpen, setIsThreadOpen] = useState(false);
  const [activeThreadMessage, setActiveThreadMessage] = useState<Message | null>(null);

  // Direct Messages & Sidebar View States
  const [activeSidebarView, setActiveSidebarView] = useState<'channels' | 'dms'>('channels');
  const [isNewDmOpen, setIsNewDmOpen] = useState(false);
  const [activeDmId, setActiveDmId] = useState<string | null>(null);
  const [dmConversations, setDmConversations] = useState<DirectMessageItem[]>([]);
  const [workspaceMembers, setWorkspaceMembers] = useState<DirectMessageUser[]>([]);

  // Resizable Sidebars Bounds & State
  const MIN_CHANNEL_WIDTH = 200;
  const MAX_CHANNEL_WIDTH = 450;
  const MIN_THREAD_WIDTH = 360;
  const MAX_THREAD_WIDTH = 720;
  const DEFAULT_THREAD_WIDTH = 480;

  const [channelWidth, setChannelWidth] = useState<number>(() => {
    const saved = localStorage.getItem('nomna_channel_width');
    return saved ? Math.max(MIN_CHANNEL_WIDTH, Math.min(MAX_CHANNEL_WIDTH, parseInt(saved, 10))) : 240;
  });

  const [threadWidth, setThreadWidth] = useState<number>(() => {
    const saved = localStorage.getItem('nomna_thread_width');
    return saved ? Math.max(MIN_THREAD_WIDTH, Math.min(MAX_THREAD_WIDTH, parseInt(saved, 10))) : DEFAULT_THREAD_WIDTH;
  });

  const [isResizingChannel, setIsResizingChannel] = useState(false);
  const [isResizingThread, setIsResizingThread] = useState(false);

  // Resize Drag Handlers
  const handleChannelResizeStart = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizingChannel(true);
    const startX = e.clientX;
    const startWidth = channelWidth;

    const onMouseMove = (moveEvent: MouseEvent) => {
      const newWidth = Math.max(MIN_CHANNEL_WIDTH, Math.min(MAX_CHANNEL_WIDTH, startWidth + (moveEvent.clientX - startX)));
      setChannelWidth(newWidth);
      localStorage.setItem('nomna_channel_width', newWidth.toString());
    };

    const onMouseUp = () => {
      setIsResizingChannel(false);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  const handleThreadResizeStart = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizingThread(true);
    const startX = e.clientX;
    const startWidth = threadWidth;

    const onMouseMove = (moveEvent: MouseEvent) => {
      const newWidth = Math.max(MIN_THREAD_WIDTH, Math.min(MAX_THREAD_WIDTH, startWidth + (startX - moveEvent.clientX)));
      setThreadWidth(newWidth);
      localStorage.setItem('nomna_thread_width', newWidth.toString());
    };

    const onMouseUp = () => {
      setIsResizingThread(false);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  const handleExpandThread = () => {
    if (threadWidth < DEFAULT_THREAD_WIDTH) {
      setThreadWidth(DEFAULT_THREAD_WIDTH);
      localStorage.setItem('nomna_thread_width', DEFAULT_THREAD_WIDTH.toString());
    }
  };

  // App Data State
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<string | null>(null);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [activeChannelId, setActiveChannelId] = useState<string | null>(null);
  const activeChannelIdRef = useRef<string | null>(null);
  activeChannelIdRef.current = activeChannelId;
  const [messages, setMessages] = useState<Message[]>([]);
  const [hasMoreMessages, setHasMoreMessages] = useState<boolean>(false);
  const [isLoadingMoreMessages, setIsLoadingMoreMessages] = useState<boolean>(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState<boolean>(false);
  const [typingUser, setTypingUser] = useState<string | null>(null);

  // Fetch Channel Messages
  const loadMessages = async (channelId: string) => {
    try {
      setIsLoadingMessages(true);
      const res = await messageApi.getMessages(channelId);
      setMessages(res.messages);
      setHasMoreMessages(res.hasMore);
    } catch (err) {
      console.error('Failed to load messages:', err);
      setMessages([]);
      setHasMoreMessages(false);
    } finally {
      setIsLoadingMessages(false);
    }
  };

  // Load older messages (infinite scroll up)
  const handleLoadMoreMessages = async () => {
    if (!activeChannelId || isLoadingMoreMessages || !hasMoreMessages || messages.length === 0) {
      return;
    }

    try {
      setIsLoadingMoreMessages(true);
      const oldestMessage = messages[0];
      const res = await messageApi.getMessages(activeChannelId, oldestMessage.createdAt);
      setMessages((prev) => [...res.messages, ...prev]);
      setHasMoreMessages(res.hasMore);
    } catch (err) {
      console.error('Failed to load older messages:', err);
    } finally {
      setIsLoadingMoreMessages(false);
    }
  };

  // Switch Active Channel
  const handleSelectChannel = async (channelId: string) => {
    setActiveChannelId(channelId);
    activeChannelIdRef.current = channelId;
    setActiveDmId(null);

    // Immediately mark unread state as false on client
    setChannels((prev) =>
      prev.map((c) => (c.id === channelId ? { ...c, hasUnread: false } : c))
    );

    // Asynchronously update backend read status
    channelApi.markAsRead(channelId);

    await loadMessages(channelId);
    await signalRService.joinChannel(channelId);
  };

  // Fetch Workspace Channels, DMs, and Members in parallel
  const loadWorkspaceData = async (wsId: string, currentUid?: string) => {
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
          email: d.targetEmail || '',
          status: (d.targetStatus as any) || 'offline',
        },
        lastMessage: d.lastMessage || 'Cuộc trò chuyện mới',
        lastMessageTime: d.lastMessageAt
          ? new Date(d.lastMessageAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          : undefined,
        unreadCount: d.unreadCount || 0,
        isPending: false,
      }));
      setDmConversations(formattedDms);

      // Format members (exclude current user so we don't start DM with ourselves)
      const uid = currentUid || currentUser?.id;
      const formattedMembers: DirectMessageUser[] = (members || [])
        .filter((m) => m.userId !== uid)
        .map((m) => ({
          id: m.userId,
          displayName: m.displayName,
          username: m.username,
          email: m.email || '',
          avatarUrl: m.avatarUrl,
          status: (m.status as any) || 'offline',
          role: m.role,
        }));
      setWorkspaceMembers(formattedMembers);

      return { channels: chs, dms: formattedDms };
    } catch (err) {
      console.error('Failed to load workspace data:', err);
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
      const { channels: chs } = await loadWorkspaceData(workspaceId, currentUser?.id);
      if (chs.length > 0) {
        const defaultCh = chs.find((c) => c.name?.toLowerCase() === 'general') || chs[0];
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
    setWorkspaces((prev) => [...prev, ws]);
    handleSelectWorkspace(ws.id);
  };

  // SignalR message handler callback
  const handleIncomingMessage = useCallback((msg: Message) => {
    // Only append to active messages stream if it matches the current active channel
    setMessages((prev) => {
      if (msg.channelId !== activeChannelIdRef.current) return prev;
      if (prev.some((m) => m.id === msg.id)) return prev;
      return [...prev, msg];
    });

    // Live update channel unread status and lastMessageAt
    setChannels((prev) =>
      prev.map((c) =>
        c.id === msg.channelId
          ? {
              ...c,
              lastMessageAt: msg.createdAt,
              hasUnread: c.id !== activeChannelIdRef.current,
            }
          : c
      )
    );

    // Live update DM snippet if incoming message belongs to a DM conversation
    setDmConversations((prev) =>
      prev.map((c) =>
        c.id === msg.channelId
          ? {
              ...c,
              lastMessage: msg.content,
              lastMessageTime: new Date(msg.createdAt).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              }),
            }
          : c
      )
    );
  }, []);

  // Initialize Chat App & Verify User Session via Cookie
  const initApp = async () => {
    try {
      setIsInitializing(true);
      let user: User;
      try {
        user = await authApi.getMe();
      } catch {
        // Attempt refresh via HttpOnly refresh_token cookie
        user = await authApi.refresh();
      }

      setCurrentUser(user);
      localStorage.setItem('nomna_logged_in', 'true');

      // Connect SignalR
      await signalRService.startConnection(
        handleIncomingMessage,
        (data) => {
          setTypingUser(data.username);
        },
        () => {
          setTypingUser(null);
        }
      );

      // Listen for thread reply count updates live
      signalRService.onThreadReplyCountUpdated((data) => {
        setMessages((prev) =>
          prev.map((m) => {
            if (m.id === data.parentMessageId) {
              return {
                ...m,
                replyCount: typeof data.replyCount === 'number' ? data.replyCount : (m.replyCount || 0) + 1,
              };
            }
            return m;
          })
        );
      });

      // Listen for realtime reaction updates
      signalRService.onReactionUpdated((update) => {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === update.messageId ? { ...m, reactions: update.reactions } : m
          )
        );
      });

      // Listen for realtime message edits
      signalRService.onMessageEdited((edited) => {
        setMessages((prev) =>
          prev.map((m) => (m.id === edited.id ? { ...m, ...edited } : m))
        );
      });

      // Listen for realtime message deletions
      signalRService.onMessageDeleted((deleted) => {
        setMessages((prev) => prev.filter((m) => m.id !== deleted.messageId));
      });

      // Listen for realtime user presence changes
      signalRService.onUserStatusChanged((data) => {
        const normalizedStatus = data.status.toLowerCase() as 'online' | 'offline' | 'away' | 'dnd';
        setWorkspaceMembers((prev) =>
          prev.map((m) =>
            m.id.toLowerCase() === data.userId.toLowerCase()
              ? { ...m, status: normalizedStatus }
              : m
          )
        );
        setDmConversations((prev) =>
          prev.map((c) =>
            c.user.id.toLowerCase() === data.userId.toLowerCase()
              ? { ...c, user: { ...c.user, status: normalizedStatus } }
              : c
          )
        );
      });

      // Load Workspaces from backend
      const wsList = await workspaceApi.getWorkspaces();
      setWorkspaces(wsList);

      if (wsList.length > 0) {
        const targetWs = wsList.find((w) => w.id === paramWorkspaceId) || wsList[0];
        setActiveWorkspaceId(targetWs.id);

        // Load Channels, DMs, and Members of target workspace
        const { channels: chList } = await loadWorkspaceData(targetWs.id, user.id);

        // Sync active online presence
        try {
          const onlineUserIds = await signalRService.getOnlineUsers();
          if (onlineUserIds.length > 0) {
            const onlineSet = new Set(onlineUserIds.map((id) => id.toLowerCase()));
            setWorkspaceMembers((prev) =>
              prev.map((m) =>
                onlineSet.has(m.id.toLowerCase()) ? { ...m, status: 'online' } : m
              )
            );
            setDmConversations((prev) =>
              prev.map((c) =>
                onlineSet.has(c.user.id.toLowerCase())
                  ? { ...c, user: { ...c.user, status: 'online' } }
                  : c
              )
            );
          }
        } catch (presenceErr) {
          console.warn('Could not sync online users:', presenceErr);
        }

        if (chList.length > 0) {
          const defaultCh = chList.find((c) => c.name?.toLowerCase() === 'general') || chList[0];
          setActiveChannelId(defaultCh.id);
          await loadMessages(defaultCh.id);
          await signalRService.joinChannel(defaultCh.id);
        }
      } else {
        navigate('/', { replace: true });
      }
    } catch (err) {
      console.error('Authentication error:', err);
      localStorage.removeItem('nomna_logged_in');
      navigate('/login', { replace: true });
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
    localStorage.removeItem('nomna_logged_in');
    signalRService.disconnect();
    setCurrentUser(null);
    setWorkspaces([]);
    setChannels([]);
    setMessages([]);
    setIsSettingsOpen(false);
    navigate('/login');
  };

  const handleSendMessage = async (content: string) => {
    if (!activeChannelId) return;

    let targetChannelId = activeChannelId;

    // Deferred DM creation: If this is a pending DM conversation, create it in DB on first message!
    const currentDm = dmConversations.find((c) => c.id === activeChannelId);
    if (currentDm?.isPending) {
      if (!activeWorkspaceId) return;
      try {
        const realDm = await channelApi.createOrGetDm(activeWorkspaceId, currentDm.user.id);
        targetChannelId = realDm.id;

        // Upgrade pending conversation in state to real channel ID
        setDmConversations((prev) =>
          prev.map((c) =>
            c.id === currentDm.id
              ? { ...c, id: realDm.id, isPending: false }
              : c
          )
        );
        setActiveDmId(realDm.id);
        setActiveChannelId(realDm.id);

        // Join the newly created SignalR channel
        await signalRService.joinChannel(realDm.id);
      } catch (err) {
        console.error('Failed to create DM channel:', err);
        alert('Không thể bắt đầu cuộc trò chuyện. Vui lòng thử lại.');
        return;
      }
    }

    try {
      const msg = await signalRService.sendMessage(targetChannelId, content);
      if (msg) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === msg.id)) return prev;
          return [...prev, msg];
        });
      }
    } catch {
      const msg = await messageApi.sendMessage(targetChannelId, content);
      setMessages((prev) => {
        if (prev.some((m) => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
    }

    // If this is a DM, update lastMessage
    setDmConversations((prev) =>
      prev.map((c) =>
        c.id === targetChannelId
          ? {
              ...c,
              lastMessage: content,
              lastMessageTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            }
          : c
      )
    );
  };

  const handleCreateChannel = (type: ChannelType) => {
    setCreateChannelType(type);
    setIsCreateChannelOpen(true);
  };

  const handleChannelCreated = (newChannel: Channel) => {
    setChannels((prev) => [...prev, newChannel]);
    handleSelectChannel(newChannel.id);
  };

  const handleSelectDmConversation = async (dm: DirectMessageItem) => {
    setActiveDmId(dm.id);
    setActiveChannelId(dm.id);

    if (dm.isPending) {
      // Pending DM conversation not yet in DB; clear messages
      setMessages([]);
    } else {
      // Real channel in DB
      await loadMessages(dm.id);
      await signalRService.joinChannel(dm.id);
    }

    setDmConversations((prev) =>
      prev.map((c) => (c.id === dm.id ? { ...c, unreadCount: 0 } : c))
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
      (c) => c.user.id === targetUser.id && (!c.workspaceId || c.workspaceId === activeWorkspaceId)
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
          email: targetUser.email || '',
          avatarUrl: targetUser.avatarUrl,
          status: (targetUser.status as any) || 'online',
          role: targetUser.role,
        },
        lastMessage: 'Cuộc trò chuyện mới',
        unreadCount: 0,
        isPending: true,
      };
      setDmConversations((prev) => [newDm, ...prev]);
      existing = newDm;
    }

    setActiveSidebarView('dms');
    handleSelectDmConversation(existing);
  };

  const handleStartDm = (targetUser: DirectMessageUser) => {
    handleStartDmWithUser(targetUser);
    setIsNewDmOpen(false);
  };

  const activeDm = dmConversations.find((d) => d.id === activeChannelId);
  const currentWorkspace = workspaces.find((w) => w.id === activeWorkspaceId) || null;
  const currentChannel: Channel | null =
    channels.find((c) => c.id === activeChannelId) ||
    (activeDm
      ? {
          id: activeDm.id,
          workspaceId: activeWorkspaceId || '',
          name: activeDm.user.displayName,
          type: ChannelType.DirectMessage,
          isPrivate: true,
        }
      : null);

  const handleOpenThread = (msg: Message) => {
    setActiveThreadMessage(msg);
    setIsThreadOpen(true);
    handleExpandThread();
  };

  const handleToggleReaction = async (messageId: string, emoji: string) => {
    try {
      await signalRService.toggleReaction(messageId, emoji);
    } catch {
      await messageApi.toggleReaction(messageId, emoji);
    }
  };

  const handleEditMessage = async (messageId: string, content: string) => {
    try {
      const updated = await signalRService.editMessage(messageId, content);
      if (updated) {
        setMessages((prev) => prev.map((m) => (m.id === updated.id ? { ...m, ...updated } : m)));
      }
    } catch {
      const updated = await messageApi.editMessage(messageId, content);
      setMessages((prev) => prev.map((m) => (m.id === updated.id ? { ...m, ...updated } : m)));
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    try {
      await signalRService.deleteMessage(messageId);
      setMessages((prev) => prev.filter((m) => m.id !== messageId));
    } catch {
      await messageApi.deleteMessage(messageId);
      setMessages((prev) => prev.filter((m) => m.id !== messageId));
    }
  };

  if (isInitializing && !currentUser) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-[var(--bg-rail)] text-[var(--text-primary)] select-none animate-in fade-in duration-200">
        <div className="relative flex flex-col items-center p-8 rounded-2xl bg-[var(--bg-surface)]/80 border border-[var(--border-color)] shadow-2xl backdrop-blur-md animate-in zoom-in-95 duration-200 max-w-sm text-center">
          <div className="relative flex items-center justify-center mb-4">
            <img
              src="/default-avatar.png"
              alt="NomNa Logo"
              className="w-16 h-16 rounded-2xl object-cover border border-[var(--border-color)] shadow-[0_0_30px_var(--accent-glow)] animate-pulse"
            />
          </div>
          <div className="text-base font-bold text-[var(--text-primary)]">Đang kết nối NomNa...</div>
          <div className="text-xs text-[var(--text-muted)] mt-1.5 leading-relaxed">
            Đang tải không gian làm việc và đồng bộ tin nhắn
          </div>
          <div className="mt-4 flex items-center gap-2 text-xs text-[var(--accent-primary)] font-medium">
            <span className="w-2 h-2 rounded-full bg-[var(--accent-primary)] animate-ping" />
            <span>Sẵn sàng sau giây lát</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <main
        id="appLayout"
        className={`flex-1 min-h-0 flex overflow-hidden h-screen h-[100dvh] w-screen relative animate-in fade-in duration-200 ${
          isSwitchingWorkspace ? 'opacity-70 transition-opacity duration-150 pointer-events-none' : 'opacity-100 transition-opacity duration-150'
        }`}
        style={{
          userSelect: isResizingChannel || isResizingThread ? 'none' : 'auto',
          cursor: isResizingChannel || isResizingThread ? 'col-resize' : 'auto',
        }}
      >
        {/* 1 & 2. Unified Left Dock (Workspace Rail + Channel Sidebar + Spanning User Footer) */}
        <div
          className="h-full flex flex-col shrink-0 overflow-hidden"
          style={{ width: `${68 + channelWidth}px` }}
        >
          {/* Top Columns */}
          <div className="flex-1 min-h-0 flex flex-row overflow-hidden">
            <WorkspaceRail
              workspaces={workspaces}
              activeWorkspaceId={activeWorkspaceId}
              activeSidebarView={activeSidebarView}
              onSelectView={(view) => setActiveSidebarView(view)}
              onSelectWorkspace={handleSelectWorkspace}
              onCreateWorkspace={() => setIsCreateWorkspaceOpen(true)}
              onGoHome={() => navigate('/')}
            />
            {activeSidebarView === 'channels' ? (
              <ChannelSidebar
                currentWorkspace={currentWorkspace}
                channels={channels}
                activeChannelId={activeChannelId}
                onSelectChannel={handleSelectChannel}
                onCreateChannel={handleCreateChannel}
                onOpenSettings={() => setIsSettingsOpen(true)}
              />
            ) : (
              <DirectMessagesSidebar
                conversations={dmConversations.filter(
                  (c) => !c.workspaceId || c.workspaceId === activeWorkspaceId
                )}
                activeConversationId={activeDmId}
                onSelectConversation={handleSelectDmConversation}
                onOpenNewDm={() => setIsNewDmOpen(true)}
                onRemoveConversation={(id, e) => {
                  e.stopPropagation();
                  setDmConversations((prev) => prev.filter((c) => c.id !== id));
                  if (activeDmId === id) {
                    const remaining = dmConversations.filter((c) => c.id !== id);
                    if (remaining.length > 0) {
                      handleSelectDmConversation(remaining[0]);
                    }
                  }
                }}
              />
            )}
          </div>

          {/* User Account Footer Bar (spans across both Workspace Rail & Channel Sidebar) */}
          <UserFooterBar
            currentUser={currentUser}
            onOpenSettings={() => setIsSettingsOpen(true)}
          />
        </div>

        {/* 2.5 Resizer Divider */}
        <div
          className={`w-[5px] cursor-col-resize relative shrink-0 z-25 transition-all duration-150 select-none hover:bg-[var(--accent-primary)] hover:shadow-[0_0_10px_var(--accent-glow)] after:content-[''] after:absolute after:top-0 after:bottom-0 after:-left-[5px] after:-right-[5px] after:z-26 ${
            isResizingChannel
              ? 'bg-[var(--accent-primary)] shadow-[0_0_10px_var(--accent-glow)]'
              : 'bg-[var(--border-color)]'
          }`}
          onMouseDown={handleChannelResizeStart}
          title="Kéo sang trái/phải để chỉnh kích thước Sidebar Kênh (Tối thiểu 200px)"
        />

        {/* 3. Active Chat Area */}
        <ChatArea
          currentChannel={currentChannel}
          messages={messages}
          currentUser={currentUser}
          onSendMessage={handleSendMessage}
          onEditMessage={handleEditMessage}
          onDeleteMessage={handleDeleteMessage}
          onToggleReaction={handleToggleReaction}
          onStartTyping={() => activeChannelId && signalRService.startTyping(activeChannelId)}
          onStopTyping={() => activeChannelId && signalRService.stopTyping(activeChannelId)}
          typingUser={typingUser}
          onToggleThread={() => {
            if (!activeThreadMessage && messages.length > 0) {
              setActiveThreadMessage(messages[0]);
            }
            setIsThreadOpen(true);
            handleExpandThread();
          }}
          onOpenThread={handleOpenThread}
          onStartDmWithUser={handleStartDmWithUser}
          hasMoreMessages={hasMoreMessages}
          isLoadingMore={isLoadingMoreMessages}
          isLoadingMessages={isLoadingMessages}
          onLoadMoreMessages={handleLoadMoreMessages}
          workspaceMembers={workspaceMembers}
        />

        {/* 3.5 Resizer Divider */}
        {isThreadOpen && (
          <div
            className={`w-[5px] cursor-col-resize relative shrink-0 z-25 transition-all duration-150 select-none hover:bg-[var(--accent-primary)] hover:shadow-[0_0_10px_var(--accent-glow)] after:content-[''] after:absolute after:top-0 after:bottom-0 after:-left-[5px] after:-right-[5px] after:z-26 ${
              isResizingThread
                ? 'bg-[var(--accent-primary)] shadow-[0_0_10px_var(--accent-glow)]'
                : 'bg-[var(--border-color)]'
            }`}
            onMouseDown={handleThreadResizeStart}
            title="Kéo sang trái/phải để chỉnh kích thước Sidebar Thread (Tối thiểu 360px)"
          />
        )}

        {/* 4. Collapsible Thread Panel */}
        <ThreadPanel
          isOpen={isThreadOpen}
          onClose={() => {
            setIsThreadOpen(false);
            setActiveThreadMessage(null);
          }}
          currentUser={currentUser}
          parentMessage={activeThreadMessage}
          width={threadWidth}
          onExpandWidth={handleExpandThread}
          onToggleReaction={handleToggleReaction}
          onEditMessage={handleEditMessage}
          onDeleteMessage={handleDeleteMessage}
        />
      </main>

      {/* Create Workspace Modal */}
      <CreateWorkspaceModal
        isOpen={isCreateWorkspaceOpen}
        onClose={() => setIsCreateWorkspaceOpen(false)}
        onWorkspaceCreated={handleWorkspaceCreated}
      />

      {/* Create Channel Modal */}
      <CreateChannelModal
        isOpen={isCreateChannelOpen}
        onClose={() => setIsCreateChannelOpen(false)}
        workspaceId={activeWorkspaceId}
        channelType={createChannelType}
        onChannelCreated={handleChannelCreated}
      />

      {/* New Direct Message Modal */}
      <NewDirectMessageModal
        isOpen={isNewDmOpen}
        onClose={() => setIsNewDmOpen(false)}
        onStartDm={handleStartDm}
        existingDmUserIds={dmConversations.map((c) => c.user.id)}
        members={workspaceMembers}
      />

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        currentUser={currentUser}
        onLogout={handleLogout}
        currentTheme={theme}
        onThemeChange={changeTheme}
        onUserUpdated={(u) => setCurrentUser(u)}
      />
    </>
  );
};
