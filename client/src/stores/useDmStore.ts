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
