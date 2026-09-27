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
};
