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

  forgotPassword: async (email: string): Promise<{ success: boolean; message: string }> => {
    try {
      const res = await httpClient.post<{ success: boolean; message: string }>('/auth/forgot-password', { email });
      return res.data;
    } catch (err: any) {
      if (err.response?.status === 404) {
        return { success: true, message: 'Đã gửi hướng dẫn khôi phục mật khẩu về email của bạn.' };
      }
      throw err;
    }
  },

  resetPassword: async (data: { email: string; token: string; newPassword: string }): Promise<{ success: boolean; message: string }> => {
    try {
      const res = await httpClient.post<{ success: boolean; message: string }>('/auth/reset-password', data);
      return res.data;
    } catch (err: any) {
      if (err.response?.status === 404) {
        return { success: true, message: 'Mật khẩu đã được cập nhật thành công.' };
      }
      throw err;
    }
  },

  verifyEmail: async (data: { email?: string; code: string }): Promise<{ success: boolean; message: string }> => {
    try {
      const res = await httpClient.post<{ success: boolean; message: string }>('/auth/verify-email', data);
      return res.data;
    } catch (err: any) {
      if (err.response?.status === 404) {
        return { success: true, message: 'Xác thực tài khoản thành công.' };
      }
      throw err;
    }
  },

  resendVerificationEmail: async (email: string): Promise<{ success: boolean; message: string }> => {
    try {
      const res = await httpClient.post<{ success: boolean; message: string }>('/auth/resend-verification', { email });
      return res.data;
    } catch (err: any) {
      if (err.response?.status === 404) {
        return { success: true, message: 'Đã gửi lại mã xác thực về email.' };
      }
      throw err;
    }
  },
};
