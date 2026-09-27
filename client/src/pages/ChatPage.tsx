import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { WorkspaceRail, CreateWorkspaceModal } from '../components/workspace';
import { ChannelSidebar, UserFooterBar } from '../components/channel';
import { ChatArea } from '../components/chat';
import { ThreadPanel } from '../components/thread';
import { SettingsModal } from '../components/settings';
import { authApi, workspaceApi, channelApi, messageApi, signalRService } from '../services';
import { useTheme } from '../hooks/useTheme';
import type { User, Workspace, Channel, Message } from '../types';

export const ChatPage: React.FC = () => {
  const navigate = useNavigate();
  const { theme, changeTheme } = useTheme();

  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isCreateWorkspaceOpen, setIsCreateWorkspaceOpen] = useState(false);
  const [isThreadOpen, setIsThreadOpen] = useState(false);
  const [activeThreadMessage, setActiveThreadMessage] = useState<Message | null>(null);

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
      setMessages(msgs.reverse());
    } catch (err) {
      console.error('Failed to load messages:', err);
    }
  };

  // Switch Active Channel
  const handleSelectChannel = async (channelId: string) => {
    setActiveChannelId(channelId);
    await loadMessages(channelId);
    await signalRService.joinChannel(channelId);
  };

  // Switch Active Workspace
  const handleSelectWorkspace = async (workspaceId: string) => {
    setActiveWorkspaceId(workspaceId);
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
                replyCount: (m.replyCount || 0) + 1,
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
        const firstWsId = wsList[0].id;
        setActiveWorkspaceId(firstWsId);

        // Load Channels of first workspace
        const chList = await channelApi.getChannels(firstWsId);
        setChannels(chList);

        if (chList.length > 0) {
          const firstChId = chList[0].id;
          setActiveChannelId(firstChId);
          await loadMessages(firstChId);
          await signalRService.joinChannel(firstChId);
        }
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

  const handleCreateWorkspace = () => {
    setIsCreateWorkspaceOpen(true);
  };

  const handleWorkspaceCreated = (ws: Workspace) => {
    setWorkspaces((prev) => [...prev, ws]);
    handleSelectWorkspace(ws.id);
  };

  const handleCreateChannel = async () => {
    if (!activeWorkspaceId) return;
    const name = prompt('Nhập tên Channel (chữ thường, số, dấu gạch nối):');
    if (!name?.trim()) return;

    try {
      const ch = await channelApi.createChannel(activeWorkspaceId, name.trim().toLowerCase());
      setChannels((prev) => [...prev, ch]);
      handleSelectChannel(ch.id);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Không thể tạo channel.');
    }
  };

  const currentWorkspace = workspaces.find((w) => w.id === activeWorkspaceId) || null;
  const currentChannel = channels.find((c) => c.id === activeChannelId) || null;

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
              onSelectWorkspace={handleSelectWorkspace}
              onCreateWorkspace={handleCreateWorkspace}
            />
            <ChannelSidebar
              currentWorkspace={currentWorkspace}
              channels={channels}
              activeChannelId={activeChannelId}
              onSelectChannel={handleSelectChannel}
              onCreateChannel={handleCreateChannel}
              onOpenSettings={() => setIsSettingsOpen(true)}
            />
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

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        currentUser={currentUser}
        onLogout={handleLogout}
        currentTheme={theme}
        onThemeChange={changeTheme}
      />

      {/* Create Workspace Modal */}
      <CreateWorkspaceModal
        isOpen={isCreateWorkspaceOpen}
        onClose={() => setIsCreateWorkspaceOpen(false)}
        onWorkspaceCreated={handleWorkspaceCreated}
      />
    </>
  );
};
