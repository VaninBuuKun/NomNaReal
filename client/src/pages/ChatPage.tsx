import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { WorkspaceRail } from '../components/WorkspaceRail';
import { ChannelSidebar } from '../components/ChannelSidebar';
import { ChatArea } from '../components/ChatArea';
import { ThreadPanel } from '../components/ThreadPanel';
import { SettingsModal } from '../components/SettingsModal';
import { authApi, chatApi } from '../services/api';
import { signalRService } from '../services/signalr';
import type { User, Workspace, Channel, Message } from '../types';

export const ChatPage: React.FC = () => {
  const navigate = useNavigate();

  // Theme state: Warm Orange default (user customizable in Settings)
  const [theme, setTheme] = useState<string>(() => {
    const saved = localStorage.getItem('nomna_theme') || 'warm-orange';
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-theme', saved);
      document.body.setAttribute('data-theme', saved);
    }
    return saved;
  });

  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isThreadOpen, setIsThreadOpen] = useState(false);

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

  const handleThemeChange = (newTheme: string) => {
    setTheme(newTheme);
    localStorage.setItem('nomna_theme', newTheme);
  };

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    document.body.setAttribute('data-theme', theme);
  }, [theme]);

  // Fetch Channel Messages
  const loadMessages = async (channelId: string) => {
    try {
      const msgs = await chatApi.getMessages(channelId);
      setMessages(msgs);
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
      const chs = await chatApi.getChannels(workspaceId);
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

  // Initialize Chat App & Verify User Token
  const initApp = async () => {
    const token = localStorage.getItem('nomna_token');
    if (!token) {
      navigate('/login');
      return;
    }

    try {
      const user = await authApi.getMe();
      setCurrentUser(user);

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

      // Load Workspaces from backend
      const wsList = await chatApi.getWorkspaces();
      setWorkspaces(wsList);

      if (wsList.length > 0) {
        const firstWsId = wsList[0].id;
        setActiveWorkspaceId(firstWsId);

        // Load Channels of first workspace
        const chList = await chatApi.getChannels(firstWsId);
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
      localStorage.removeItem('nomna_token');
      localStorage.removeItem('nomna_refresh_token');
      navigate('/login');
    }
  };

  useEffect(() => {
    initApp();
    return () => {
      signalRService.disconnect();
    };
  }, []);

  // Logout Handler: Closes settings, clears tokens, stops SignalR, and routes to /login
  const handleLogout = () => {
    localStorage.removeItem('nomna_token');
    localStorage.removeItem('nomna_refresh_token');
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
      const msg = await chatApi.sendMessage(activeChannelId, content);
      setMessages((prev) => {
        if (prev.some((m) => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
    }
  };

  const handleCreateWorkspace = async () => {
    const name = prompt('Nhập tên Workspace mới:');
    if (!name?.trim()) return;

    try {
      const ws = await chatApi.createWorkspace(name.trim());
      setWorkspaces((prev) => [...prev, ws]);
      handleSelectWorkspace(ws.id);
    } catch {
      alert('Không thể tạo workspace.');
    }
  };

  const handleCreateChannel = async () => {
    if (!activeWorkspaceId) return;
    const name = prompt('Nhập tên Channel (chữ thường, số, dấu gạch nối):');
    if (!name?.trim()) return;

    try {
      const ch = await chatApi.createChannel(activeWorkspaceId, name.trim().toLowerCase());
      setChannels((prev) => [...prev, ch]);
      handleSelectChannel(ch.id);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Không thể tạo channel.');
    }
  };

  const currentWorkspace = workspaces.find((w) => w.id === activeWorkspaceId) || null;
  const currentChannel = channels.find((c) => c.id === activeChannelId) || null;

  return (
    <>
      {/* Main Fullscreen Layout with Resizable Sidebars */}
      <main
        id="appLayout"
        className="flex-1 min-h-0 flex overflow-hidden h-screen h-[100dvh] w-screen relative"
        style={{
          userSelect: isResizingChannel || isResizingThread ? 'none' : 'auto',
          cursor: isResizingChannel || isResizingThread ? 'col-resize' : 'auto',
        }}
      >
        {/* 1. Workspace Rail (68px) */}
        <WorkspaceRail
          workspaces={workspaces}
          activeWorkspaceId={activeWorkspaceId}
          onSelectWorkspace={handleSelectWorkspace}
          onCreateWorkspace={handleCreateWorkspace}
        />

        {/* 2. Channels Sidebar (Resizable: default 240px, min 200px, max 450px) */}
        <ChannelSidebar
          currentWorkspace={currentWorkspace}
          channels={channels}
          activeChannelId={activeChannelId}
          onSelectChannel={handleSelectChannel}
          onCreateChannel={handleCreateChannel}
          currentUser={currentUser}
          onOpenSettings={() => setIsSettingsOpen(true)}
          onLogout={handleLogout}
          width={channelWidth}
        />

        {/* 2.5 Resizer Divider between Channel Sidebar & Chat Area */}
        <div
          className={`w-[5px] cursor-col-resize relative shrink-0 z-25 transition-all duration-150 select-none hover:bg-[var(--accent-primary)] hover:shadow-[0_0_10px_var(--accent-glow)] after:content-[''] after:absolute after:top-0 after:bottom-0 after:-left-[5px] after:-right-[5px] after:z-26 ${
            isResizingChannel
              ? 'bg-[var(--accent-primary)] shadow-[0_0_10px_var(--accent-glow)]'
              : 'bg-[var(--border-color)]'
          }`}
          onMouseDown={handleChannelResizeStart}
          title="Kéo sang trái/phải để chỉnh kích thước Sidebar Kênh (Tối thiểu 200px)"
        />

        {/* 3. Active Chat Area (flex: 1) */}
        <ChatArea
          currentChannel={currentChannel}
          messages={messages}
          currentUser={currentUser}
          onSendMessage={handleSendMessage}
          onStartTyping={() => activeChannelId && signalRService.startTyping(activeChannelId)}
          onStopTyping={() => activeChannelId && signalRService.stopTyping(activeChannelId)}
          typingUser={typingUser}
          onToggleThread={() => {
            setIsThreadOpen(true);
            handleExpandThread();
          }}
        />

        {/* 3.5 Resizer Divider between Chat Area & Thread Panel (when open) */}
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

        {/* 4. Collapsible Thread Panel (Resizable: default 480px, min 360px, max 720px) */}
        <ThreadPanel
          isOpen={isThreadOpen}
          onClose={() => setIsThreadOpen(false)}
          currentUser={currentUser}
          width={threadWidth}
          onExpandWidth={handleExpandThread}
        />
      </main>

      {/* Settings Modal (User Account Settings Only) */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        currentUser={currentUser}
        onLogout={handleLogout}
        currentTheme={theme}
        onThemeChange={handleThemeChange}
      />
    </>
  );
};
