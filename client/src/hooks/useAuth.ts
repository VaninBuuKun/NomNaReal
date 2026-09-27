import { useState, useEffect, useCallback } from 'react';
import { authApi } from '../services/authApi';
import type { User } from '../types';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Initialize current user from /auth/me
  const initAuth = useCallback(async () => {
    const token = localStorage.getItem('nomna_token');
    if (!token) {
      setIsLoading(false);
      return;
    }

    try {
      const currentUser = await authApi.getMe();
      setUser(currentUser);
    } catch {
      // Token might be expired, attempt refresh via HttpOnly cookie
      try {
        const refreshRes = await authApi.refresh();
        if (refreshRes.accessToken) {
          localStorage.setItem('nomna_token', refreshRes.accessToken);
          setUser(refreshRes.user);
        } else {
          localStorage.removeItem('nomna_token');
          setUser(null);
        }
      } catch {
        localStorage.removeItem('nomna_token');
        setUser(null);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    initAuth();
  }, [initAuth]);

  const login = async (emailOrUsername: string, password: string): Promise<User> => {
    const res = await authApi.login(emailOrUsername, password);
    localStorage.setItem('nomna_token', res.accessToken);
    setUser(res.user);
    return res.user;
  };

  const register = async (email: string, username: string, displayName: string, password: string): Promise<User> => {
    const res = await authApi.register(email, username, displayName, password);
    localStorage.setItem('nomna_token', res.accessToken);
    setUser(res.user);
    return res.user;
  };

  const googleLogin = async (idToken: string): Promise<User> => {
    const res = await authApi.googleLogin(idToken);
    localStorage.setItem('nomna_token', res.accessToken);
    setUser(res.user);
    return res.user;
  };

  const logout = async (): Promise<void> => {
    try {
      await authApi.logout();
    } finally {
      localStorage.removeItem('nomna_token');
      localStorage.removeItem('nomna_refresh_token'); // Ensure legacy keys removed
      localStorage.removeItem('nomna_refresh');
      setUser(null);
    }
  };

  return {
    user,
    setUser,
    isAuthenticated: !!user,
    isLoading,
    login,
    register,
    googleLogin,
    logout,
    refreshUser: initAuth,
  };
}
