import { httpClient } from './httpClient';
import type { Message, MessageEdited, MessagesResponse, PinnedMessage, LinkPreviewData } from '../types';

export const messageApi = {
  getMessages: async (
    channelId: string,
    before?: string,
    after?: string,
    limit: number = 25
  ): Promise<MessagesResponse> => {
    const params: Record<string, any> = { limit };
    if (before) params.before = before;
    if (after) params.after = after;
    const res = await httpClient.get<MessagesResponse>(`/channels/${channelId}/messages`, { params });
    return res.data;
  },

  getMessagesAround: async (channelId: string, messageId: string, limit: number = 30): Promise<MessagesResponse> => {
    const res = await httpClient.get<MessagesResponse>(`/channels/${channelId}/messages/around`, {
      params: { messageId, limit },
    });
    return res.data;
  },

  sendMessage: async (
    channelId: string,
    content?: string,
    replyToMessageId?: string | null,
    attachments?: Array<{ url: string; fileName: string; fileSize: number; contentType: string; type: string }>
  ): Promise<Message> => {
    const res = await httpClient.post<Message>(`/channels/${channelId}/messages`, {
      content: content || '',
      replyToMessageId,
      attachments,
    });
    return res.data;
  },

  searchMessages: async (params: {
    workspaceId?: string;
    keyword?: string;
    channelId?: string;
    senderId?: string;
    fromDate?: string;
    toDate?: string;
    limit?: number;
  }): Promise<Message[]> => {
    const res = await httpClient.get<Message[]>('/messages/search', { params });
    return res.data;
  },

  editMessage: async (messageId: string, content: string): Promise<MessageEdited> => {
    const res = await httpClient.put<MessageEdited>(`/messages/${messageId}`, { content });
    return res.data;
  },

  deleteMessage: async (messageId: string): Promise<void> => {
    await httpClient.delete(`/messages/${messageId}`);
  },

  toggleReaction: async (messageId: string, emoji: string): Promise<void> => {
    await httpClient.post(`/messages/${messageId}/reactions`, { emoji });
  },

  pinMessage: async (messageId: string): Promise<PinnedMessage> => {
    const res = await httpClient.post<PinnedMessage>(`/messages/${messageId}/pin`);
    return res.data;
  },

  unpinMessage: async (messageId: string): Promise<void> => {
    await httpClient.delete(`/messages/${messageId}/pin`);
  },

  getPinnedMessages: async (channelId: string): Promise<PinnedMessage[]> => {
    const res = await httpClient.get<PinnedMessage[]>(`/channels/${channelId}/pinned`);
    return res.data;
  },

  getLinkPreview: async (url: string): Promise<LinkPreviewData> => {
    const res = await httpClient.get<LinkPreviewData>('/messages/link-preview', {
      params: { url },
    });
    return res.data;
  },
};
