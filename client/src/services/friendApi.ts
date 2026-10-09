import { httpClient } from './httpClient';

export interface FriendDto {
  friendshipId: string;
  userId: string;
  displayName: string;
  username: string;
  avatarUrl?: string;
  status: 'online' | 'away' | 'dnd' | 'offline' | number;
  friendshipStatus: number;
  createdAt: string;
}

export interface FriendsSummary {
  friends: FriendDto[];
  pendingIncoming: FriendDto[];
  pendingOutgoing: FriendDto[];
  blocked: FriendDto[];
}

export const friendApi = {
  getFriendsSummary: async (): Promise<FriendsSummary> => {
    const res = await httpClient.get<FriendsSummary>('/friends');
    return res.data;
  },

  sendFriendRequest: async (usernameOrEmail: string): Promise<FriendDto> => {
    const res = await httpClient.post<FriendDto>('/friends/request', {
      usernameOrEmail,
    });
    return res.data;
  },

  acceptFriendRequest: async (friendshipId: string): Promise<FriendDto> => {
    const res = await httpClient.post<FriendDto>(`/friends/${friendshipId}/accept`);
    return res.data;
  },

  declineFriendRequest: async (friendshipId: string): Promise<void> => {
    await httpClient.post(`/friends/${friendshipId}/decline`);
  },

  removeFriend: async (friendshipId: string): Promise<void> => {
    await httpClient.delete(`/friends/${friendshipId}`);
  },

  blockUser: async (targetUserId: string): Promise<void> => {
    await httpClient.post(`/friends/${targetUserId}/block`);
  },

  unblockUser: async (targetUserId: string): Promise<void> => {
    await httpClient.post(`/friends/${targetUserId}/unblock`);
  },
};
