import { useState, useEffect, useCallback } from 'react';
import { authApi } from '../services/authApi';
import type { User } from '../types';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Initialize current user from /auth/me (browser transmits HttpOnly access_token cookie)
  const initAuth = useCallback(async () => {
    try {
      const currentUser = await authApi.getMe();
      setUser(currentUser);
      localStorage.setItem('nomna_logged_in', 'true');
    } catch {
      // Access token may be expired or absent, attempt refresh via HttpOnly refresh_token cookie
      try {
        const refreshedUser = await authApi.refresh();
        setUser(refreshedUser);
        localStorage.setItem('nomna_logged_in', 'true');
      } catch {
        localStorage.removeItem('nomna_logged_in');
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
    const loggedUser = await authApi.login(emailOrUsername, password);
    localStorage.setItem('nomna_logged_in', 'true');
    setUser(loggedUser);
    return loggedUser;
  };

  const register = async (email: string, username: string, displayName: string, password: string): Promise<User> => {
    const registeredUser = await authApi.register(email, username, displayName, password);
    localStorage.setItem('nomna_logged_in', 'true');
    setUser(registeredUser);
    return registeredUser;
  };

  const googleLogin = async (idToken: string): Promise<User> => {
    const googleUser = await authApi.googleLogin(idToken);
    localStorage.setItem('nomna_logged_in', 'true');
    setUser(googleUser);
    return googleUser;
  };

  const logout = async (): Promise<void> => {
    try {
      await authApi.logout();
    } finally {
      localStorage.removeItem('nomna_logged_in');
      localStorage.removeItem('nomna_token');
      localStorage.removeItem('nomna_refresh_token');
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
