import { useState, useEffect, useCallback } from 'react';
import { messageApi } from '../services/messageApi';
import type { Message, MessageEdited, ReactionUpdate, DeletedMessage } from '../types';

export function useMessages(channelId?: string) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [hasMore, setHasMore] = useState<boolean>(false);
  const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false);

  const fetchMessages = useCallback(async () => {
    if (!channelId) {
      setMessages([]);
      setHasMore(false);
      return;
    }

    try {
      setIsLoading(true);
      const data = await messageApi.getMessages(channelId);
      setMessages(data.messages);
      setHasMore(data.hasMore);
    } catch (err) {
      console.error('Failed to fetch messages:', err);
    } finally {
      setIsLoading(false);
    }
  }, [channelId]);

  const loadMoreMessages = useCallback(async () => {
    if (!channelId || isLoadingMore || !hasMore || messages.length === 0) {
      return;
    }

    try {
      setIsLoadingMore(true);
      const oldestMessage = messages[0];
      const data = await messageApi.getMessages(channelId, oldestMessage.createdAt);
      setMessages((prev) => [...data.messages, ...prev]);
      setHasMore(data.hasMore);
    } catch (err) {
      console.error('Failed to load more messages:', err);
    } finally {
      setIsLoadingMore(false);
    }
  }, [channelId, isLoadingMore, hasMore, messages]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  const sendMessage = async (content: string, threadId?: string): Promise<Message> => {
    if (!channelId) throw new Error('No active channel');
    const msg = await messageApi.sendMessage(channelId, content, threadId);
    if (!threadId) {
      setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));
    }
    return msg;
  };

  const editMessage = async (messageId: string, content: string): Promise<MessageEdited> => {
    const updated = await messageApi.editMessage(messageId, content);
    setMessages((prev) =>
      prev.map((m) => (m.id === messageId ? { ...m, content: updated.content, isEdited: true } : m))
    );
    return updated;
  };

  const deleteMessage = async (messageId: string): Promise<void> => {
    await messageApi.deleteMessage(messageId);
    setMessages((prev) => prev.filter((m) => m.id !== messageId));
  };

  const toggleReaction = async (messageId: string, emoji: string): Promise<void> => {
    await messageApi.toggleReaction(messageId, emoji);
  };

  // Realtime helpers for SignalR events
  const addIncomingMessage = useCallback((msg: Message) => {
    if (!msg.threadId) {
      setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));
    }
  }, []);

  const handleMessageEdited = useCallback((msg: Message) => {
    setMessages((prev) =>
      prev.map((m) => (m.id === msg.id ? { ...m, content: msg.content, isEdited: true } : m))
    );
  }, []);

  const handleMessageDeleted = useCallback((data: DeletedMessage) => {
    setMessages((prev) => prev.filter((m) => m.id !== data.messageId));
  }, []);

  const handleReactionUpdated = useCallback((data: ReactionUpdate) => {
    setMessages((prev) =>
      prev.map((m) => (m.id === data.messageId ? { ...m, reactions: data.reactions } : m))
    );
  }, []);

  const handleThreadReplyCountUpdated = useCallback(
    (data: { parentMessageId: string; channelId: string; replyId?: string; replyCount?: number }) => {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === data.parentMessageId
            ? {
                ...m,
                replyCount: data.replyCount !== undefined ? data.replyCount : (m.replyCount || 0) + 1,
              }
            : m
        )
      );
    },
    []
  );

  return {
    messages,
    setMessages,
    isLoading,
    hasMore,
    isLoadingMore,
    fetchMessages,
    loadMoreMessages,
    sendMessage,
    editMessage,
    deleteMessage,
    toggleReaction,
    addIncomingMessage,
    handleMessageEdited,
    handleMessageDeleted,
    handleReactionUpdated,
    handleThreadReplyCountUpdated,
  };
}
