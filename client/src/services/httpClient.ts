import axios from 'axios';
import { API_BASE_URL } from '../utils/constants';

export const httpClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true, // Automatically sends and receives HttpOnly cookies
  headers: {
    'Content-Type': 'application/json',
  },
});

// Auto-refresh token on 401 errors using HttpOnly refresh_token cookie
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value?: unknown) => void;
  reject: (reason?: unknown) => void;
}> = [];

const processQueue = (error: unknown) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve();
    }
  });
  failedQueue = [];
};

httpClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Prevent infinite loop if refresh or login endpoints failed
    if (
      originalRequest?.url?.includes('/auth/refresh') ||
      originalRequest?.url?.includes('/auth/login') ||
      originalRequest?.url?.includes('/auth/register')
    ) {
      return Promise.reject(error);
    }

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then(() => httpClient(originalRequest))
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        // Browser automatically sends HttpOnly refresh_token cookie to /auth/refresh
        await axios.post(
          `${API_BASE_URL}/auth/refresh`,
          {},
          { withCredentials: true }
        );

        // Cookies are refreshed and set in browser via Set-Cookie
        processQueue(null);
        return httpClient(originalRequest);
      } catch (refreshErr) {
        processQueue(refreshErr);
        localStorage.removeItem('nomna_logged_in');
        return Promise.reject(refreshErr);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);
