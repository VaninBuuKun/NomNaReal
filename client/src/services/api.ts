import axios from 'axios';
import type { AuthResponse, User, Workspace, Channel, Message, ThreadDetails } from '../types';

export const API_BASE_URL = (import.meta.env.VITE_API_URL as string) || 'http://localhost:5000/api';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Attach Authorization header if access token exists
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('nomna_token');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const authApi = {
  login: async (emailOrUsername: string, password: string): Promise<AuthResponse> => {
    const res = await apiClient.post<AuthResponse>('/auth/login', { emailOrUsername, password });
    return res.data;
  },
  register: async (email: string, username: string, displayName: string, password: string): Promise<AuthResponse> => {
    const res = await apiClient.post<AuthResponse>('/auth/register', { email, username, displayName, password });
    return res.data;
  },
  getMe: async (): Promise<User> => {
    const res = await apiClient.get<User>('/auth/me');
    return res.data;
  },
  googleLogin: async (idToken: string): Promise<AuthResponse> => {
    const res = await apiClient.post<AuthResponse>('/auth/google', { idToken });
    return res.data;
  },
};

export const chatApi = {
  getWorkspaces: async (): Promise<Workspace[]> => {
    const res = await apiClient.get<Workspace[]>('/workspaces');
    return res.data;
  },
  createWorkspace: async (name: string, iconUrl: string, description?: string): Promise<Workspace> => {
    const res = await apiClient.post<Workspace>('/workspaces', { name, iconUrl, description });
    return res.data;
  },
  getChannels: async (workspaceId: string): Promise<Channel[]> => {
    const res = await apiClient.get<Channel[]>(`/workspaces/${workspaceId}/channels`);
    return res.data;
  },
  createChannel: async (workspaceId: string, name: string, topic?: string): Promise<Channel> => {
    const res = await apiClient.post<Channel>(`/workspaces/${workspaceId}/channels`, { name, topic });
    return res.data;
  },
  getMessages: async (channelId: string, before?: string): Promise<Message[]> => {
    const params = before ? { before } : {};
    const res = await apiClient.get<Message[]>(`/channels/${channelId}/messages`, { params });
    return res.data;
  },
  sendMessage: async (channelId: string, content: string, threadId?: string): Promise<Message> => {
    const res = await apiClient.post<Message>(`/channels/${channelId}/messages`, { content, threadId });
    return res.data;
  },
  editMessage: async (messageId: string, content: string): Promise<Message> => {
    const res = await apiClient.put<Message>(`/messages/${messageId}`, { content });
    return res.data;
  },
  deleteMessage: async (messageId: string): Promise<void> => {
    await apiClient.delete(`/messages/${messageId}`);
  },
  toggleReaction: async (messageId: string, emoji: string): Promise<void> => {
    await apiClient.post(`/messages/${messageId}/reactions`, { emoji });
  },
  getThreadReplies: async (messageId: string): Promise<ThreadDetails> => {
    const res = await apiClient.get<ThreadDetails>(`/messages/${messageId}/thread`);
    return res.data;
  },
  replyToThread: async (messageId: string, content: string): Promise<Message> => {
    const res = await apiClient.post<Message>(`/messages/${messageId}/thread`, { content });
    return res.data;
  },
  createOrGetDm: async (workspaceId: string, targetUserId: string): Promise<Channel> => {
    const res = await apiClient.post<Channel>(`/workspaces/${workspaceId}/dm`, { targetUserId });
    return res.data;
  },
  uploadFile: async (file: File, folder = 'uploads'): Promise<{ url: string; fileName: string; fileSize: number; contentType: string }> => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await apiClient.post<{ url: string; fileName: string; fileSize: number; contentType: string }>(
      `/files/upload?folder=${encodeURIComponent(folder)}`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    return res.data;
  },
};
