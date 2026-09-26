import React, { useState, useEffect, useCallback } from 'react';
import { WorkspaceRail } from './components/WorkspaceRail';
import { ChannelSidebar } from './components/ChannelSidebar';
import { ChatArea } from './components/ChatArea';
import { ThreadPanel } from './components/ThreadPanel';
import { AuthModal } from './components/AuthModal';
import { SettingsModal } from './components/SettingsModal';
import { authApi, chatApi } from './services/api';
import { signalRService } from './services/signalr';
import type { User, Workspace, Channel, Message } from './types';
import './styles/globals.css';

export const App: React.FC = () => {
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
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isThreadOpen, setIsThreadOpen] = useState(false);

  // App Data State
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<string | null>(null);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [activeChannelId, setActiveChannelId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [typingUser, setTypingUser] = useState<string | null>(null);

  // Apply Theme to documentElement & body
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

  // Initialize App / Check Authentication
  const initApp = async () => {
    const token = localStorage.getItem('nomna_token');
    if (!token) {
      setIsAuthOpen(true);
      return;
    }

    try {
      const user = await authApi.getMe();
      setCurrentUser(user);
      setIsAuthOpen(false);

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
      localStorage.removeItem('nomna_refresh');
      setIsAuthOpen(true);
    }
  };

  useEffect(() => {
    initApp();
    return () => {
      signalRService.disconnect();
    };
  }, []);

  // Handlers
  const handleAuthSuccess = (user: User) => {
    setCurrentUser(user);
    setIsAuthOpen(false);
    initApp();
  };

  const handleLogout = () => {
    localStorage.removeItem('nomna_token');
    localStorage.removeItem('nomna_refresh');
    signalRService.disconnect();
    setCurrentUser(null);
    setWorkspaces([]);
    setChannels([]);
    setMessages([]);
    setIsAuthOpen(true);
  };

  const handleSendMessage = async (content: string) => {
    if (!activeChannelId) return;

    try {
      // Send via SignalR
      const msg = await signalRService.sendMessage(activeChannelId, content);
      if (msg) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === msg.id)) return prev;
          return [...prev, msg];
        });
      }
    } catch {
      // Fallback REST API
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
      {/* Main Fullscreen Grid Layout */}
      <main className={`app-layout ${isThreadOpen ? '' : 'thread-closed'}`} id="appLayout">
        {/* 1. Workspace Rail (68px) */}
        <WorkspaceRail
          workspaces={workspaces}
          activeWorkspaceId={activeWorkspaceId}
          onSelectWorkspace={handleSelectWorkspace}
          onCreateWorkspace={handleCreateWorkspace}
        />

        {/* 2. Channels Sidebar (240px) */}
        <ChannelSidebar
          currentWorkspace={currentWorkspace}
          channels={channels}
          activeChannelId={activeChannelId}
          onSelectChannel={handleSelectChannel}
          onCreateChannel={handleCreateChannel}
          currentUser={currentUser}
          onOpenSettings={() => setIsSettingsOpen(true)}
        />

        {/* 3. Active Chat Area (1fr) */}
        <ChatArea
          currentChannel={currentChannel}
          messages={messages}
          currentUser={currentUser}
          onSendMessage={handleSendMessage}
          onStartTyping={() => activeChannelId && signalRService.startTyping(activeChannelId)}
          onStopTyping={() => activeChannelId && signalRService.stopTyping(activeChannelId)}
          typingUser={typingUser}
          onToggleThread={() => setIsThreadOpen(true)}
        />

        {/* 4. Collapsible Thread Panel (320px) */}
        <ThreadPanel
          isOpen={isThreadOpen}
          onClose={() => setIsThreadOpen(false)}
          currentUser={currentUser}
        />
      </main>

      {/* Auth Modal */}
      {isAuthOpen && <AuthModal onSuccess={handleAuthSuccess} />}

      {/* Settings Modal */}
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

export default App;
