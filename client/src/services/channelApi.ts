import { httpClient } from './httpClient';
import type { Channel } from '../types';

export const channelApi = {
  getChannels: async (workspaceId: string): Promise<Channel[]> => {
    const res = await httpClient.get<Channel[]>(`/workspaces/${workspaceId}/channels`);
    return res.data;
  },

  createChannel: async (
    workspaceId: string,
    nameOrData: string | { name: string; type?: number; isPrivate?: boolean }
  ): Promise<Channel> => {
    const payload =
      typeof nameOrData === 'string'
        ? { name: nameOrData }
        : nameOrData;
    const res = await httpClient.post<Channel>(`/workspaces/${workspaceId}/channels`, payload);
    return res.data;
  },

  createOrGetDm: async (workspaceId: string, targetUserId: string): Promise<Channel> => {
    const res = await httpClient.post<Channel>(`/workspaces/${workspaceId}/dm`, { targetUserId });
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
};
