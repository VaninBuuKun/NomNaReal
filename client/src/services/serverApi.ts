import { httpClient } from './httpClient';
import type { Server } from '../types';

export const serverApi = {
  getServers: async (): Promise<Server[]> => {
    const res = await httpClient.get<Server[]>('/servers');
    return res.data;
  },

  createServer: async (name: string, iconUrl: string, description?: string): Promise<Server> => {
    const res = await httpClient.post<Server>('/servers', { name, iconUrl, description });
    return res.data;
  },

  joinServer: async (inviteCode: string): Promise<Server> => {
    const res = await httpClient.post<Server>('/servers/join', { inviteCode });
    return res.data;
  },

  getServerByInviteCode: async (inviteCode: string): Promise<Server> => {
    const res = await httpClient.get<Server>(`/servers/invite/${inviteCode}`);
    return res.data;
  },

  sendEmailInvites: async (
    serverId: string,
    emails: string[]
  ): Promise<{ sentCount: number; successfulEmails: string[]; alreadyMemberEmails: string[]; failedEmails: string[] }> => {
    const res = await httpClient.post<{
      sentCount: number;
      successfulEmails: string[];
      alreadyMemberEmails: string[];
      failedEmails: string[];
    }>(`/servers/${serverId}/invite-emails`, { emails });
    return res.data;
  },

  getMembers: async (
    serverId: string
  ): Promise<
    Array<{
      id: string;
      userId: string;
      displayName: string;
      username: string;
      avatarUrl?: string;
      email?: string;
      role: string;
      status: string;
    }>
  > => {
    const res = await httpClient.get(`/servers/${serverId}/members`);
    return res.data;
  },

  getDirectMessages: async (
    serverId: string
  ): Promise<
    Array<{
      id: string;
      serverId: string;
      workspaceId: string;
      targetUserId: string;
      targetDisplayName: string;
      targetUsername: string;
      targetAvatarUrl?: string;
      targetEmail?: string;
      targetStatus: string;
      lastMessage?: string;
      lastMessageAt?: string;
      unreadCount: number;
    }>
  > => {
    const res = await httpClient.get<any[]>(`/servers/${serverId}/dm`);
    return (res.data || []).map((d) => ({
      ...d,
      serverId: d.serverId || d.workspaceId,
      workspaceId: d.workspaceId || d.serverId,
    }));
  },

  updateServer: async (
    serverId: string,
    data: { name: string; description?: string; iconUrl?: string }
  ): Promise<Server> => {
    const res = await httpClient.put<Server>(`/servers/${serverId}`, data);
    return res.data;
  },

  deleteServer: async (serverId: string): Promise<void> => {
    await httpClient.delete(`/servers/${serverId}`);
  },

  leaveServer: async (serverId: string): Promise<void> => {
    await httpClient.post(`/servers/${serverId}/leave`);
  },

  kickMember: async (serverId: string, memberUserId: string): Promise<void> => {
    await httpClient.delete(`/servers/${serverId}/members/${memberUserId}`);
  },

  banMember: async (serverId: string, memberUserId: string, reason?: string): Promise<void> => {
    await httpClient.post(`/servers/${serverId}/bans`, { memberUserId, reason });
  },

  unbanMember: async (serverId: string, userId: string, reason?: string): Promise<void> => {
    await httpClient.delete(`/servers/${serverId}/bans/${userId}`, { params: { reason } });
  },

  getBans: async (serverId: string): Promise<import('../types/moderation').ServerBan[]> => {
    const res = await httpClient.get<import('../types/moderation').ServerBan[]>(`/servers/${serverId}/bans`);
    return res.data;
  },

  timeoutMember: async (
    serverId: string,
    memberUserId: string,
    durationMinutes: number,
    reason?: string
  ): Promise<void> => {
    await httpClient.post(`/servers/${serverId}/members/${memberUserId}/timeout`, {
      durationMinutes,
      reason,
    });
  },

  getAuditLogs: async (
    serverId: string,
    limit: number = 50,
    beforeId?: string
  ): Promise<import('../types/moderation').ServerAuditLog[]> => {
    const res = await httpClient.get<import('../types/moderation').ServerAuditLog[]>(`/servers/${serverId}/audit-logs`, {
      params: { limit, beforeId },
    });
    return res.data;
  },
};

// Aliases for compatibility during transition
export const workspaceApi = {
  ...serverApi,
  getWorkspaces: serverApi.getServers,
  createWorkspace: serverApi.createServer,
  joinWorkspace: serverApi.joinServer,
  getWorkspaceByInviteCode: serverApi.getServerByInviteCode,
  updateWorkspace: serverApi.updateServer,
  deleteWorkspace: serverApi.deleteServer,
  leaveWorkspace: serverApi.leaveServer,
};
