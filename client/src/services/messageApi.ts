import { httpClient } from './httpClient';
import type { Message, ThreadDetails } from '../types';

export const messageApi = {
  getMessages: async (channelId: string, before?: string): Promise<Message[]> => {
    const params = before ? { before } : {};
    const res = await httpClient.get<Message[]>(`/channels/${channelId}/messages`, { params });
    return res.data;
  },

  sendMessage: async (channelId: string, content: string, threadId?: string): Promise<Message> => {
    const res = await httpClient.post<Message>(`/channels/${channelId}/messages`, { content, threadId });
    return res.data;
  },

  editMessage: async (messageId: string, content: string): Promise<Message> => {
    const res = await httpClient.put<Message>(`/messages/${messageId}`, { content });
    return res.data;
  },

  deleteMessage: async (messageId: string): Promise<void> => {
    await httpClient.delete(`/messages/${messageId}`);
  },

  toggleReaction: async (messageId: string, emoji: string): Promise<void> => {
    await httpClient.post(`/messages/${messageId}/reactions`, { emoji });
  },

  getThreadReplies: async (messageId: string): Promise<ThreadDetails> => {
    const res = await httpClient.get<ThreadDetails>(`/messages/${messageId}/thread`);
    return res.data;
  },

  replyToThread: async (messageId: string, content: string): Promise<Message> => {
    const res = await httpClient.post<Message>(`/messages/${messageId}/thread`, { content });
    return res.data;
  },
};
