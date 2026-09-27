import { useState, useCallback } from 'react';
import { messageApi } from '../services/messageApi';
import type { Message, ReactionUpdate, DeletedMessage } from '../types';

export function useThread() {
  const [activeThreadMessage, setActiveThreadMessage] = useState<Message | null>(null);
  const [replies, setReplies] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const fetchReplies = useCallback(async (messageId: string) => {
    try {
      setIsLoading(true);
      const data = await messageApi.getThreadReplies(messageId);
      setReplies(data.replies || []);
      if (data.parentMessage) {
        setActiveThreadMessage(data.parentMessage);
      }
    } catch (err) {
      console.error('Failed to fetch thread replies:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const openThread = (message: Message) => {
    setActiveThreadMessage(message);
    fetchReplies(message.id);
  };

  const closeThread = () => {
    setActiveThreadMessage(null);
    setReplies([]);
  };

  const sendReply = async (content: string): Promise<Message> => {
    if (!activeThreadMessage) throw new Error('No active thread');
    const newReply = await messageApi.replyToThread(activeThreadMessage.id, content);
    setReplies((prev) => (prev.some((r) => r.id === newReply.id) ? prev : [...prev, newReply]));
    return newReply;
  };

  const addIncomingReply = useCallback((reply: Message) => {
    if (activeThreadMessage && reply.threadId === activeThreadMessage.id) {
      setReplies((prev) => (prev.some((r) => r.id === reply.id) ? prev : [...prev, reply]));
    }
  }, [activeThreadMessage]);

  const handleReplyEdited = useCallback((msg: Message) => {
    setReplies((prev) =>
      prev.map((r) => (r.id === msg.id ? { ...r, content: msg.content, isEdited: true } : r))
    );
  }, []);

  const handleReplyDeleted = useCallback((data: DeletedMessage) => {
    setReplies((prev) => prev.filter((r) => r.id !== data.messageId));
  }, []);

  const handleReplyReactionUpdated = useCallback((data: ReactionUpdate) => {
    setReplies((prev) =>
      prev.map((r) => (r.id === data.messageId ? { ...r, reactions: data.reactions } : r))
    );
    if (activeThreadMessage && activeThreadMessage.id === data.messageId) {
      setActiveThreadMessage((prev) => (prev ? { ...prev, reactions: data.reactions } : prev));
    }
  }, [activeThreadMessage]);

  return {
    activeThreadMessage,
    setActiveThreadMessage,
    replies,
    setReplies,
    isLoading,
    openThread,
    closeThread,
    sendReply,
    addIncomingReply,
    handleReplyEdited,
    handleReplyDeleted,
    handleReplyReactionUpdated,
  };
}
