import { create } from 'zustand';
import type { DirectMessageItem, DirectMessageUser } from '../components/dm';

interface DmState {
  dmConversations: DirectMessageItem[];
  activeDmId: string | null;
  workspaceMembers: DirectMessageUser[];

  // Actions
  setDmConversations: (
    conversations: DirectMessageItem[] | ((prev: DirectMessageItem[]) => DirectMessageItem[])
  ) => void;
  setActiveDmId: (id: string | null) => void;
  setWorkspaceMembers: (
    members: DirectMessageUser[] | ((prev: DirectMessageUser[]) => DirectMessageUser[])
  ) => void;
  updateUserStatus: (userId: string, status: 'online' | 'offline' | 'away' | 'dnd') => void;
  updateDmSnippet: (channelId: string, lastMessage: string, lastMessageTime: string) => void;
  upsertDmMessage: (
    channelId: string,
    msg: {
      content: string;
      createdAt: string;
      senderId: string;
      senderDisplayName: string;
      senderUsername: string;
      senderAvatarUrl?: string;
    },
    isCurrentActive: boolean
  ) => void;
  upgradePendingDm: (oldId: string, newId: string) => void;
  updateMemberProfile: (userId: string, updates: { displayName?: string; avatarUrl?: string }) => void;
}

export const useDmStore = create<DmState>((set) => ({
  dmConversations: [],
  activeDmId: null,
  workspaceMembers: [],

  setDmConversations: (conversations) =>
    set((state) => ({
      dmConversations:
        typeof conversations === 'function'
          ? conversations(state.dmConversations)
          : conversations,
    })),

  setActiveDmId: (id) => set({ activeDmId: id }),

  setWorkspaceMembers: (members) =>
    set((state) => ({
      workspaceMembers:
        typeof members === 'function' ? members(state.workspaceMembers) : members,
    })),

  updateUserStatus: (userId, status) =>
    set((state) => {
      const lowerUserId = userId.toLowerCase();
      return {
        workspaceMembers: state.workspaceMembers.map((m) =>
          m.id.toLowerCase() === lowerUserId ? { ...m, status } : m
        ),
        dmConversations: state.dmConversations.map((c) =>
          c.user.id.toLowerCase() === lowerUserId
            ? { ...c, user: { ...c.user, status } }
            : c
        ),
      };
    }),

  updateDmSnippet: (channelId, lastMessage, lastMessageTime) =>
    set((state) => ({
      dmConversations: state.dmConversations.map((c) =>
        c.id === channelId
          ? {
              ...c,
              lastMessage,
              lastMessageTime,
            }
          : c
      ),
    })),

  upsertDmMessage: (channelId, msg, isCurrentActive) =>
    set((state) => {
      const lowerSenderId = (msg.senderId || '').toLowerCase();
      const existingIndex = state.dmConversations.findIndex(
        (c) => c.id === channelId || (c.user?.id && c.user.id.toLowerCase() === lowerSenderId)
      );
      if (existingIndex !== -1) {
        const existing = state.dmConversations[existingIndex];
        const updated: DirectMessageItem = {
          ...existing,
          id: channelId, // Update channel id in case it was a pending DM
          lastMessage: msg.content,
          lastMessageTime: new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          unreadCount: isCurrentActive ? 0 : (existing.unreadCount || 0) + 1,
          isPending: false,
        };
        const rest = state.dmConversations.filter((_, idx) => idx !== existingIndex);
        return {
          dmConversations: [updated, ...rest],
        };
      }

      // If new DM conversation received from another user
      const newConv: DirectMessageItem = {
        id: channelId,
        user: {
          id: msg.senderId,
          displayName: msg.senderDisplayName || msg.senderUsername || 'Người dùng',
          username: msg.senderUsername || 'user',
          avatarUrl: msg.senderAvatarUrl,
          email: '',
          status: 'online',
        },
        lastMessage: msg.content,
        lastMessageTime: new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        unreadCount: isCurrentActive ? 0 : 1,
        isPending: false,
      };

      return {
        dmConversations: [newConv, ...state.dmConversations],
      };
    }),

  upgradePendingDm: (oldId, newId) =>
    set((state) => ({
      dmConversations: state.dmConversations.map((c) =>
        c.id === oldId ? { ...c, id: newId, isPending: false } : c
      ),
      activeDmId: newId,
    })),

  updateMemberProfile: (userId, updates) =>
    set((state) => {
      const lowerUserId = userId.toLowerCase();
      return {
        workspaceMembers: state.workspaceMembers.map((m) =>
          m.id.toLowerCase() === lowerUserId ? { ...m, ...updates } : m
        ),
        dmConversations: state.dmConversations.map((c) =>
          c.user.id.toLowerCase() === lowerUserId
            ? { ...c, user: { ...c.user, ...updates } }
            : c
        ),
      };
    }),
}));
