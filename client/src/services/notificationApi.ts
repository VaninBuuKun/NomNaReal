import { httpClient } from './httpClient';
import type { AppNotification, UnreadNotificationCount } from '../types';

export const notificationApi = {
  getNotifications: async (
    filter: 'all' | 'unread' | 'mention' = 'all',
    page: number = 1,
    pageSize: number = 20
  ): Promise<AppNotification[]> => {
    const res = await httpClient.get<AppNotification[]>('/notifications', {
      params: { filter, page, pageSize },
    });
    return res.data;
  },

  getUnreadCount: async (): Promise<UnreadNotificationCount> => {
    const res = await httpClient.get<UnreadNotificationCount>('/notifications/unread-count');
    return res.data;
  },

  markAsRead: async (id: string): Promise<boolean> => {
    const res = await httpClient.put<boolean>(`/notifications/${id}/read`);
    return res.data;
  },

  markAllAsRead: async (filter?: string): Promise<number> => {
    const res = await httpClient.put<number>('/notifications/read-all', null, {
      params: filter ? { filter } : undefined,
    });
    return res.data;
  },
};
