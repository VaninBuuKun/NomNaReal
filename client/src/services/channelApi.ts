import { httpClient } from './httpClient';
import type { Channel } from '../types';

export const channelApi = {
  getChannels: async (serverIdOrWorkspaceId: string): Promise<Channel[]> => {
    const res = await httpClient.get<Channel[]>(`/servers/${serverIdOrWorkspaceId}/channels`);
    return res.data;
  },

  createChannel: async (
    serverIdOrWorkspaceId: string,
    nameOrData: string | { name: string; type?: number; isPrivate?: boolean; categoryId?: string | null }
  ): Promise<Channel> => {
    const payload =
      typeof nameOrData === 'string'
        ? { name: nameOrData }
        : nameOrData;
    const res = await httpClient.post<Channel>(`/servers/${serverIdOrWorkspaceId}/channels`, payload);
    return res.data;
  },

  createOrGetDm: async (targetUserId: string, serverId?: string | null): Promise<Channel> => {
    const res = await httpClient.post<Channel>('/channels/dm', {
      targetUserId,
      serverId: serverId && serverId !== 'null' && serverId !== 'undefined' ? serverId : null,
    });
    return res.data;
  },

  getUserDms: async (): Promise<any[]> => {
    const res = await httpClient.get<any[]>('/channels/dm');
    return res.data;
  },

  markAsRead: async (channelId: string): Promise<void> => {
    try {
      await httpClient.post(`/channels/${channelId}/read`);
    } catch {
      // Ignore background read sync errors
    }
  },

  updateChannel: async (
    channelId: string,
    data: string | { name?: string; topic?: string | null; categoryId?: string | null; position?: number; isPrivate?: boolean }
  ): Promise<Channel> => {
    const payload = typeof data === 'string' ? { name: data } : data;
    const res = await httpClient.put<Channel>(`/channels/${channelId}`, payload);
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
