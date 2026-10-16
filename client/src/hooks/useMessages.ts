import { useState, useEffect, useCallback } from 'react';
import { messageApi } from '../services/messageApi';
import type { Message, MessageEdited, ReactionUpdate, DeletedMessage } from '../types';

export function useMessages(channelId?: string) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [hasOlder, setHasOlder] = useState<boolean>(false);
  const [hasNewer, setHasNewer] = useState<boolean>(false);
  const [isLoadingOlder, setIsLoadingOlder] = useState<boolean>(false);
  const [isLoadingNewer, setIsLoadingNewer] = useState<boolean>(false);

  const fetchMessages = useCallback(async () => {
    if (!channelId) {
      setMessages([]);
      setHasOlder(false);
      setHasNewer(false);
      return;
    }

    try {
      setIsLoading(true);
      const data = await messageApi.getMessages(channelId, undefined, undefined, 25);
      setMessages(data.messages);
      setHasOlder(data.hasOlder ?? data.hasMore ?? false);
      setHasNewer(false);
    } catch (err) {
      console.error('Failed to fetch messages:', err);
    } finally {
      setIsLoading(false);
    }
  }, [channelId]);

  const loadOlderMessages = useCallback(async () => {
    if (!channelId || isLoadingOlder || !hasOlder || messages.length === 0) {
      return;
    }

    try {
      setIsLoadingOlder(true);
      const oldestMessage = messages[0];
      const data = await messageApi.getMessages(channelId, oldestMessage.createdAt, undefined, 25);
      setMessages((prev) => {
        const existingIds = new Set(prev.map((m) => m.id));
        const uniqueOlder = data.messages.filter((m) => !existingIds.has(m.id));
        return [...uniqueOlder, ...prev];
      });
      setHasOlder(data.hasOlder ?? data.hasMore ?? false);
    } catch (err) {
      console.error('Failed to load older messages:', err);
    } finally {
      setIsLoadingOlder(false);
    }
  }, [channelId, isLoadingOlder, hasOlder, messages]);

  const loadNewerMessages = useCallback(async () => {
    if (!channelId || isLoadingNewer || !hasNewer || messages.length === 0) {
      return;
    }

    try {
      setIsLoadingNewer(true);
      const newestMessage = messages[messages.length - 1];
      const data = await messageApi.getMessages(channelId, undefined, newestMessage.createdAt, 25);
      setMessages((prev) => {
        const existingIds = new Set(prev.map((m) => m.id));
        const uniqueNewer = data.messages.filter((m) => !existingIds.has(m.id));
        return [...prev, ...uniqueNewer];
      });
      setHasNewer(data.hasNewer ?? false);
    } catch (err) {
      console.error('Failed to load newer messages:', err);
    } finally {
      setIsLoadingNewer(false);
    }
  }, [channelId, isLoadingNewer, hasNewer, messages]);

  const jumpToPresent = useCallback(async () => {
    await fetchMessages();
  }, [fetchMessages]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  const sendMessage = async (content: string, replyToMessageId?: string): Promise<Message> => {
    if (!channelId) throw new Error('No active channel');
    const msg = await messageApi.sendMessage(channelId, content, replyToMessageId);
    setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));
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
    setMessages((prev) => {
      if (hasNewer) return prev;
      return prev.some((m) => m.id === msg.id) ? prev : [...prev, msg];
    });
  }, [hasNewer]);

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

  const jumpToMessageAround = useCallback(async (targetMessageId: string): Promise<boolean> => {
    if (!channelId) return false;
    try {
      setIsLoading(true);
      const data = await messageApi.getMessagesAround(channelId, targetMessageId, 30);
      setMessages(data.messages);
      setHasOlder(data.hasOlder ?? data.hasMore ?? false);
      setHasNewer(data.hasNewer ?? false);
      return true;
    } catch (err) {
      console.error('Failed to load messages around target message:', err);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [channelId]);

  return {
    messages,
    setMessages,
    isLoading,
    hasMore: hasOlder,
    hasOlder,
    hasNewer,
    isLoadingMore: isLoadingOlder,
    isLoadingOlder,
    isLoadingNewer,
    fetchMessages,
    loadMoreMessages: loadOlderMessages,
    loadOlderMessages,
    loadNewerMessages,
    jumpToPresent,
    jumpToMessageAround,
    sendMessage,
    editMessage,
    deleteMessage,
    toggleReaction,
    addIncomingMessage,
    handleMessageEdited,
    handleMessageDeleted,
    handleReactionUpdated,
  };
}
