import { httpClient } from './httpClient';
import type { Channel } from '../types';

export const channelApi = {
  getChannels: async (workspaceId: string): Promise<Channel[]> => {
    const res = await httpClient.get<Channel[]>(`/workspaces/${workspaceId}/channels`);
    return res.data;
  },

  createChannel: async (
    workspaceId: string,
    nameOrData: string | { name: string; topic?: string; type?: number; isPrivate?: boolean },
    topic?: string
  ): Promise<Channel> => {
    const payload =
      typeof nameOrData === 'string'
        ? { name: nameOrData, topic }
        : nameOrData;
    const res = await httpClient.post<Channel>(`/workspaces/${workspaceId}/channels`, payload);
    return res.data;
  },

  createOrGetDm: async (workspaceId: string, targetUserId: string): Promise<Channel> => {
    const res = await httpClient.post<Channel>(`/workspaces/${workspaceId}/dm`, { targetUserId });
    return res.data;
  },
};
