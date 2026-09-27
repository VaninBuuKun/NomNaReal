import { httpClient } from './httpClient';
import type { Workspace } from '../types';

export const workspaceApi = {
  getWorkspaces: async (): Promise<Workspace[]> => {
    const res = await httpClient.get<Workspace[]>('/workspaces');
    return res.data;
  },

  createWorkspace: async (name: string, iconUrl: string, description?: string): Promise<Workspace> => {
    const res = await httpClient.post<Workspace>('/workspaces', { name, iconUrl, description });
    return res.data;
  },

  joinWorkspace: async (inviteCode: string): Promise<Workspace> => {
    const res = await httpClient.post<Workspace>('/workspaces/join', { inviteCode });
    return res.data;
  },

  getWorkspaceByInviteCode: async (inviteCode: string): Promise<Workspace> => {
    const res = await httpClient.get<Workspace>(`/workspaces/invite/${inviteCode}`);
    return res.data;
  },

  sendEmailInvites: async (
    workspaceId: string,
    emails: string[]
  ): Promise<{ sentCount: number; successfulEmails: string[]; alreadyMemberEmails: string[]; failedEmails: string[] }> => {
    const res = await httpClient.post<{
      sentCount: number;
      successfulEmails: string[];
      alreadyMemberEmails: string[];
      failedEmails: string[];
    }>(`/workspaces/${workspaceId}/invite-emails`, { emails });
    return res.data;
  },

  getMembers: async (
    workspaceId: string
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
    const res = await httpClient.get(`/workspaces/${workspaceId}/members`);
    return res.data;
  },

  getDirectMessages: async (
    workspaceId: string
  ): Promise<
    Array<{
      id: string;
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
    const res = await httpClient.get(`/workspaces/${workspaceId}/dm`);
    return res.data;
  },
};
