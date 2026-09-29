import { create } from 'zustand';
import type { Channel, Message } from '../types';

interface ChatState {
  channels: Channel[];
  activeChannelId: string | null;
  messages: Message[];
  hasMoreMessages: boolean;
  isLoadingMessages: boolean;
  isLoadingMoreMessages: boolean;
  typingUser: string | null;

  // Actions
  setChannels: (channels: Channel[] | ((prev: Channel[]) => Channel[])) => void;
  setActiveChannelId: (id: string | null) => void;
  setMessages: (messages: Message[] | ((prev: Message[]) => Message[])) => void;
  appendOlderMessages: (olderMessages: Message[]) => void;
  addMessage: (msg: Message) => void;
  updateMessage: (edited: Partial<Message> & { id: string }) => void;
  deleteMessage: (messageId: string) => void;
  setReactions: (messageId: string, reactions: Message['reactions']) => void;
  updateReplyCount: (parentMessageId: string, count?: number) => void;
  markChannelRead: (channelId: string) => void;
  setChannelUnread: (channelId: string, lastMessageAt: string, hasUnread: boolean) => void;
  setHasMoreMessages: (hasMore: boolean) => void;
  setIsLoadingMessages: (loading: boolean) => void;
  setIsLoadingMoreMessages: (loading: boolean) => void;
  setTypingUser: (user: string | null) => void;
  addChannel: (channel: Channel) => void;
  updateChannel: (channel: Channel) => void;
  removeChannel: (channelId: string) => void;
}

export const useChatStore = create<ChatState>((set) => ({
  channels: [],
  activeChannelId: null,
  messages: [],
  hasMoreMessages: false,
  isLoadingMessages: false,
  isLoadingMoreMessages: false,
  typingUser: null,

  setChannels: (channels) =>
    set((state) => ({
      channels: typeof channels === 'function' ? channels(state.channels) : channels,
    })),

  setActiveChannelId: (id) => set({ activeChannelId: id }),

  setMessages: (messages) =>
    set((state) => ({
      messages: typeof messages === 'function' ? messages(state.messages) : messages,
    })),

  appendOlderMessages: (olderMessages) =>
    set((state) => ({
      messages: [...olderMessages, ...state.messages],
    })),

  addMessage: (msg) =>
    set((state) => {
      // Deduplicate by ID
      if (state.messages.some((m) => m.id === msg.id)) {
        return state;
      }
      return { messages: [...state.messages, msg] };
    }),

  updateMessage: (edited) =>
    set((state) => ({
      messages: state.messages.map((m) =>
        m.id === edited.id ? ({ ...m, ...edited } as Message) : m
      ),
    })),

  deleteMessage: (messageId) =>
    set((state) => ({
      messages: state.messages.filter((m) => m.id !== messageId),
    })),

  setReactions: (messageId, reactions) =>
    set((state) => ({
      messages: state.messages.map((m) =>
        m.id === messageId ? { ...m, reactions } : m
      ),
    })),

  updateReplyCount: (parentMessageId, count) =>
    set((state) => ({
      messages: state.messages.map((m) =>
        m.id === parentMessageId
          ? {
              ...m,
              replyCount: typeof count === 'number' ? count : (m.replyCount || 0) + 1,
            }
          : m
      ),
    })),

  markChannelRead: (channelId) =>
    set((state) => ({
      channels: state.channels.map((c) =>
        c.id === channelId ? { ...c, hasUnread: false } : c
      ),
    })),

  setChannelUnread: (channelId, lastMessageAt, hasUnread) =>
    set((state) => ({
      channels: state.channels.map((c) =>
        c.id === channelId ? { ...c, lastMessageAt, hasUnread } : c
      ),
    })),

  setHasMoreMessages: (hasMore) => set({ hasMoreMessages: hasMore }),
  setIsLoadingMessages: (loading) => set({ isLoadingMessages: loading }),
  setIsLoadingMoreMessages: (loading) => set({ isLoadingMoreMessages: loading }),
  setTypingUser: (user) => set({ typingUser: user }),

  addChannel: (channel) =>
    set((state) => ({
      channels: [...state.channels, channel],
    })),

  updateChannel: (channel) =>
    set((state) => ({
      channels: state.channels.map((c) => (c.id === channel.id ? channel : c)),
    })),

  removeChannel: (channelId) =>
    set((state) => ({
      channels: state.channels.filter((c) => c.id !== channelId),
      activeChannelId:
        state.activeChannelId === channelId
          ? state.channels.find((c) => c.id !== channelId)?.id || null
          : state.activeChannelId,
    })),
}));
