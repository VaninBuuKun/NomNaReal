import { httpClient } from './httpClient';
import type { Channel } from '../types';

export const channelApi = {
  getChannels: async (serverIdOrWorkspaceId: string): Promise<Channel[]> => {
    const res = await httpClient.get<Channel[]>(`/servers/${serverIdOrWorkspaceId}/channels`);
    return res.data;
  },

  createChannel: async (
    serverIdOrWorkspaceId: string,
    nameOrData: string | { name: string; type?: number; isPrivate?: boolean }
  ): Promise<Channel> => {
    const payload =
      typeof nameOrData === 'string'
        ? { name: nameOrData }
        : nameOrData;
    const res = await httpClient.post<Channel>(`/servers/${serverIdOrWorkspaceId}/channels`, payload);
    return res.data;
  },

  createOrGetDm: async (serverIdOrWorkspaceId: string, targetUserId: string): Promise<Channel> => {
    const res = await httpClient.post<Channel>(`/servers/${serverIdOrWorkspaceId}/dm`, { targetUserId });
    return res.data;
  },

  markAsRead: async (channelId: string): Promise<void> => {
    try {
      await httpClient.post(`/channels/${channelId}/read`);
    } catch {
      // Ignore background read sync errors
    }
  },

  updateChannel: async (channelId: string, name: string): Promise<Channel> => {
    const res = await httpClient.put<Channel>(`/channels/${channelId}`, { name });
    return res.data;
  },

  deleteChannel: async (channelId: string): Promise<void> => {
    await httpClient.delete(`/channels/${channelId}`);
  },

  getMembers: async (
    channelId: string
  ): Promise<Array<{ userId: string; displayName: string; username: string; avatarUrl?: string }>> => {
    const res = await httpClient.get<Array<{ userId: string; displayName: string; username: string; avatarUrl?: string }>>(
      `/channels/${channelId}/members`
    );
    return res.data;
  },

  addMember: async (channelId: string, userId: string): Promise<void> => {
    await httpClient.post(`/channels/${channelId}/members`, { userId });
  },
};
