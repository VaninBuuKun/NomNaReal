import React, { useState, useEffect, useCallback } from 'react';
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

  const [dmConversations, setDmConversations] = useState<DirectMessageItem[]>([
    {
      id: 'dm-alex',
      user: {
        id: 'user-alex',
        displayName: 'Alex Rivers',
        username: 'alexrivers',
        email: 'alex.rivers@nomna.io',
        avatarUrl: '/default-avatar.png',
        status: 'online',
        role: 'Quản trị viên',
        customStatus: 'Đang review code .NET 9 & SignalR',
      },
      lastMessage: 'Chào bạn! Hệ thống SignalR và Clean Architecture của NomNa đã sẵn sàng để kiểm thử.',
      lastMessageTime: '10:45',
      unreadCount: 1,
    },
    {
      id: 'dm-minh',
      user: {
        id: 'user-minh',
        displayName: 'Minh Dev',
        username: 'minhdev',
        email: 'minh.dev@nomna.io',
        status: 'online',
        role: 'Thành viên',
        customStatus: 'Làm việc với React & Tailwind',
      },
      lastMessage: 'Đã hoàn thiện modal và sidebar theo đúng chuẩn thiết kế nhé!',
      lastMessageTime: 'Hôm qua',
      unreadCount: 0,
    },
    {
      id: 'dm-sarah',
      user: {
        id: 'user-sarah',
        displayName: 'Sarah Miller',
        username: 'sarahm',
        email: 'sarah.miller@nomna.io',
        status: 'away',
        role: 'Thiết kế UI/UX',
        customStatus: 'Đang thiết kế Design System',
      },
      lastMessage: 'Bạn check giúp mình bản figma design system mới nhé.',
      lastMessageTime: '26/09',
      unreadCount: 0,
    },
  ]);

  const [dmHistory, setDmHistory] = useState<Record<string, Message[]>>({
    'dm-alex': [
      {
        id: 'msg-dm-alex-1',
        channelId: 'dm-alex',
        senderId: 'user-alex',
        senderUsername: 'alexrivers',
        senderDisplayName: 'Alex Rivers',
        senderAvatarUrl: '/default-avatar.png',
        content: 'Chào bạn! Hệ thống SignalR và Clean Architecture của NomNa đã sẵn sàng để kiểm thử.',
        createdAt: new Date(Date.now() - 3600000).toISOString(),
        isEdited: false,
      },
    ],
    'dm-minh': [
      {
        id: 'msg-dm-minh-1',
        channelId: 'dm-minh',
        senderId: 'user-minh',
        senderUsername: 'minhdev',
        senderDisplayName: 'Minh Dev',
        content: 'Đã hoàn thiện modal và sidebar theo đúng chuẩn thiết kế nhé!',
        createdAt: new Date(Date.now() - 86400000).toISOString(),
        isEdited: false,
      },
    ],
  });

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
  const [messages, setMessages] = useState<Message[]>([]);
  const [typingUser, setTypingUser] = useState<string | null>(null);

  // Fetch Channel Messages
  const loadMessages = async (channelId: string) => {
    try {
      const msgs = await messageApi.getMessages(channelId);
      setMessages(msgs);
    } catch (err) {
      console.error('Failed to load messages:', err);
    }
  };

  // Switch Active Channel
  const handleSelectChannel = async (channelId: string) => {
    setActiveChannelId(channelId);
    setActiveDmId(null);
    await loadMessages(channelId);
    await signalRService.joinChannel(channelId);
  };

  // Switch Active Workspace
  const handleSelectWorkspace = async (workspaceId: string) => {
    setActiveWorkspaceId(workspaceId);
    navigate(`/workspace/${workspaceId}`, { replace: true });
    try {
      const chs = await channelApi.getChannels(workspaceId);
      setChannels(chs);
      if (chs.length > 0) {
        handleSelectChannel(chs[0].id);
      } else {
        setActiveChannelId(null);
        setMessages([]);
      }
    } catch (err) {
      console.error('Failed to load channels:', err);
    }
  };

  const handleWorkspaceCreated = (ws: Workspace) => {
    setWorkspaces((prev) => [...prev, ws]);
    handleSelectWorkspace(ws.id);
  };

  // SignalR message handler callback
  const handleIncomingMessage = useCallback((msg: Message) => {
    setMessages((prev) => {
      if (prev.some((m) => m.id === msg.id)) return prev;
      return [...prev, msg];
    });
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
                lastReplyAt: data.createdAt,
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
          prev.map((m) => (m.id === edited.id ? edited : m))
        );
      });

      // Listen for realtime message deletions
      signalRService.onMessageDeleted((deleted) => {
        setMessages((prev) => prev.filter((m) => m.id !== deleted.messageId));
      });

      // Load Workspaces from backend
      const wsList = await workspaceApi.getWorkspaces();
      setWorkspaces(wsList);

      if (wsList.length > 0) {
        const targetWs = wsList.find((w) => w.id === paramWorkspaceId) || wsList[0];
        setActiveWorkspaceId(targetWs.id);

        // Load Channels of target workspace
        const chList = await channelApi.getChannels(targetWs.id);
        setChannels(chList);

        if (chList.length > 0) {
          const firstChId = chList[0].id;
          setActiveChannelId(firstChId);
          await loadMessages(firstChId);
          await signalRService.joinChannel(firstChId);
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

    // Direct Message sending (in-memory mock with instantaneous chat support)
    if (activeChannelId.startsWith('dm-') || currentChannel?.type === ChannelType.DirectMessage) {
      const newMsg: Message = {
        id: `msg-${Date.now()}`,
        channelId: activeChannelId,
        senderId: currentUser?.id || 'me',
        senderUsername: currentUser?.username || 'me',
        senderDisplayName: currentUser?.displayName || 'Tôi',
        senderAvatarUrl: currentUser?.avatarUrl,
        content,
        createdAt: new Date().toISOString(),
        isEdited: false,
      };
      setMessages((prev) => [...prev, newMsg]);
      setDmHistory((prev) => ({
        ...prev,
        [activeChannelId]: [...(prev[activeChannelId] || []), newMsg],
      }));
      setDmConversations((prev) =>
        prev.map((c) =>
          c.id === activeChannelId
            ? { ...c, lastMessage: content, lastMessageTime: 'Vừa xong' }
            : c
        )
      );
      return;
    }

    try {
      const msg = await signalRService.sendMessage(activeChannelId, content);
      if (msg) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === msg.id)) return prev;
          return [...prev, msg];
        });
      }
    } catch {
      const msg = await messageApi.sendMessage(activeChannelId, content);
      setMessages((prev) => {
        if (prev.some((m) => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
    }
  };

  const handleCreateChannel = (type: ChannelType) => {
    setCreateChannelType(type);
    setIsCreateChannelOpen(true);
  };

  const handleChannelCreated = (newChannel: Channel) => {
    setChannels((prev) => [...prev, newChannel]);
    handleSelectChannel(newChannel.id);
  };

  const handleSelectDmConversation = (dm: DirectMessageItem) => {
    setActiveDmId(dm.id);
    setActiveChannelId(dm.id);
    const history = dmHistory[dm.id] || [];
    setMessages(history);
    setDmConversations((prev) =>
      prev.map((c) => (c.id === dm.id ? { ...c, unreadCount: 0 } : c))
    );
  };

  const handleStartDm = (targetUser: DirectMessageUser) => {
    let existing = dmConversations.find((c) => c.user.id === targetUser.id);
    if (!existing) {
      const newDm: DirectMessageItem = {
        id: `dm-${targetUser.id}`,
        user: targetUser,
        lastMessage: 'Cuộc trò chuyện mới',
        lastMessageTime: 'Vừa xong',
        unreadCount: 0,
      };
      setDmConversations((prev) => [newDm, ...prev]);
      existing = newDm;
    }
    handleSelectDmConversation(existing);
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
          topic: `@${activeDm.user.username}`,
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
        setMessages((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
      }
    } catch {
      const updated = await messageApi.editMessage(messageId, content);
      setMessages((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
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
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-[var(--bg-chat)] text-[var(--text-primary)] select-none">
        <div className="relative flex items-center justify-center mb-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-white shadow-[0_0_30px_var(--accent-glow)] animate-pulse">
            <span className="text-2xl font-black">N</span>
          </div>
        </div>
        <div className="text-base font-bold text-[var(--text-primary)]">Đang kết nối NomNa...</div>
        <div className="text-xs text-[var(--text-muted)] mt-1">Đang tải không gian làm việc và tin nhắn</div>
      </div>
    );
  }

  return (
    <>
      <main
        id="appLayout"
        className="flex-1 min-h-0 flex overflow-hidden h-screen h-[100dvh] w-screen relative"
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
                conversations={dmConversations}
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
