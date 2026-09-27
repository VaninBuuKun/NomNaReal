import { httpClient } from './httpClient';
import type { AuthResponse, User } from '../types';

export const authApi = {
  login: async (emailOrUsername: string, password: string): Promise<AuthResponse> => {
    const res = await httpClient.post<AuthResponse>('/auth/login', { emailOrUsername, password });
    return res.data;
  },

  register: async (email: string, username: string, displayName: string, password: string): Promise<AuthResponse> => {
    const res = await httpClient.post<AuthResponse>('/auth/register', { email, username, displayName, password });
    return res.data;
  },

  getMe: async (): Promise<User> => {
    const res = await httpClient.get<User>('/auth/me');
    return res.data;
  },

  googleLogin: async (idToken: string): Promise<AuthResponse> => {
    const res = await httpClient.post<AuthResponse>('/auth/google', { idToken });
    return res.data;
  },

  updateProfile: async (data: { displayName?: string; avatarUrl?: string | null; bio?: string }): Promise<User> => {
    const res = await httpClient.put<User>('/auth/profile', data);
    return res.data;
  },

  refresh: async (userId?: string): Promise<AuthResponse> => {
    const res = await httpClient.post<AuthResponse>('/auth/refresh', { userId });
    return res.data;
  },

  logout: async (): Promise<void> => {
    try {
      await httpClient.post('/auth/logout');
    } catch {
      // Ignore network errors on logout
    }
  },
};
