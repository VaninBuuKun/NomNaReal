import { httpClient } from './httpClient';
import type { Channel } from '../types';

export const channelApi = {
  getChannels: async (workspaceId: string): Promise<Channel[]> => {
    const res = await httpClient.get<Channel[]>(`/workspaces/${workspaceId}/channels`);
    return res.data;
  },

  createChannel: async (workspaceId: string, name: string, topic?: string): Promise<Channel> => {
    const res = await httpClient.post<Channel>(`/workspaces/${workspaceId}/channels`, { name, topic });
    return res.data;
  },

  createOrGetDm: async (workspaceId: string, targetUserId: string): Promise<Channel> => {
    const res = await httpClient.post<Channel>(`/workspaces/${workspaceId}/dm`, { targetUserId });
    return res.data;
  },
};
