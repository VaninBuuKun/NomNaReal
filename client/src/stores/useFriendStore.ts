import { create } from 'zustand';
import { friendApi, type FriendDto } from '../services';

interface FriendState {
  friends: FriendDto[];
  pendingIncoming: FriendDto[];
  pendingOutgoing: FriendDto[];
  blocked: FriendDto[];
  isLoading: boolean;
  error: string | null;

  // Actions
  fetchFriends: () => Promise<void>;
  sendFriendRequest: (usernameOrEmail: string) => Promise<FriendDto>;
  acceptFriendRequest: (friendshipId: string) => Promise<void>;
  declineFriendRequest: (friendshipId: string) => Promise<void>;
  removeFriend: (friendshipId: string) => Promise<void>;
  blockUser: (targetUserId: string) => Promise<void>;
  unblockUser: (targetUserId: string) => Promise<void>;
}

export const useFriendStore = create<FriendState>((set, get) => ({
  friends: [],
  pendingIncoming: [],
  pendingOutgoing: [],
  blocked: [],
  isLoading: false,
  error: null,

  fetchFriends: async () => {
    try {
      set({ isLoading: true, error: null });
      const summary = await friendApi.getFriendsSummary();
      set({
        friends: summary.friends || [],
        pendingIncoming: summary.pendingIncoming || [],
        pendingOutgoing: summary.pendingOutgoing || [],
        blocked: summary.blocked || [],
        isLoading: false,
      });
    } catch (err: any) {
      console.error('Failed to fetch friends summary:', err);
      set({
        isLoading: false,
        error: err.response?.data?.message || 'Không thể tải danh sách bạn bè',
      });
    }
  },

  sendFriendRequest: async (usernameOrEmail: string) => {
    const created = await friendApi.sendFriendRequest(usernameOrEmail);
    if (created.friendshipStatus === 1) {
      // Auto-accepted (they had sent request to us earlier)
      set((state) => ({
        friends: [created, ...state.friends],
        pendingIncoming: state.pendingIncoming.filter((p) => p.friendshipId !== created.friendshipId),
      }));
    } else {
      set((state) => ({
        pendingOutgoing: [created, ...state.pendingOutgoing],
      }));
    }
    return created;
  },

  acceptFriendRequest: async (friendshipId: string) => {
    const accepted = await friendApi.acceptFriendRequest(friendshipId);
    set((state) => ({
      pendingIncoming: state.pendingIncoming.filter((p) => p.friendshipId !== friendshipId),
      friends: [accepted, ...state.friends],
    }));
  },

  declineFriendRequest: async (friendshipId: string) => {
    await friendApi.declineFriendRequest(friendshipId);
    set((state) => ({
      pendingIncoming: state.pendingIncoming.filter((p) => p.friendshipId !== friendshipId),
      pendingOutgoing: state.pendingOutgoing.filter((p) => p.friendshipId !== friendshipId),
    }));
  },

  removeFriend: async (friendshipId: string) => {
    await friendApi.removeFriend(friendshipId);
    set((state) => ({
      friends: state.friends.filter((f) => f.friendshipId !== friendshipId),
    }));
  },

  blockUser: async (targetUserId: string) => {
    await friendApi.blockUser(targetUserId);
    await get().fetchFriends();
  },

  unblockUser: async (targetUserId: string) => {
    await friendApi.unblockUser(targetUserId);
    set((state) => ({
      blocked: state.blocked.filter((b) => b.userId !== targetUserId),
    }));
  },
}));
