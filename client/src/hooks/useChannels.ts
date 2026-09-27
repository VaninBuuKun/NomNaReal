import { useState, useEffect, useCallback } from 'react';
import { channelApi } from '../services/channelApi';
import type { Channel } from '../types';

export function useChannels(workspaceId?: string) {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [activeChannel, setActiveChannel] = useState<Channel | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const fetchChannels = useCallback(async () => {
    if (!workspaceId) {
      setChannels([]);
      setActiveChannel(null);
      return;
    }

    try {
      setIsLoading(true);
      const data = await channelApi.getChannels(workspaceId);
      setChannels(data);
      if (data.length > 0) {
        // If current activeChannel does not belong to this workspace, select first
        setActiveChannel((current) => {
          if (!current || current.workspaceId !== workspaceId) {
            return data[0];
          }
          return current;
        });
      } else {
        setActiveChannel(null);
      }
    } catch (err) {
      console.error('Failed to fetch channels:', err);
    } finally {
      setIsLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    fetchChannels();
  }, [fetchChannels]);

  const createChannel = async (name: string, topic?: string): Promise<Channel> => {
    if (!workspaceId) throw new Error('No active workspace selected');
    const newChan = await channelApi.createChannel(workspaceId, name, topic);
    setChannels((prev) => [...prev, newChan]);
    setActiveChannel(newChan);
    return newChan;
  };

  const createOrGetDm = async (targetUserId: string): Promise<Channel> => {
    if (!workspaceId) throw new Error('No active workspace selected');
    const dmChan = await channelApi.createOrGetDm(workspaceId, targetUserId);
    setChannels((prev) => {
      const exists = prev.some((c) => c.id === dmChan.id);
      return exists ? prev : [...prev, dmChan];
    });
    setActiveChannel(dmChan);
    return dmChan;
  };

  return {
    channels,
    setChannels,
    activeChannel,
    setActiveChannel,
    isLoading,
    fetchChannels,
    createChannel,
    createOrGetDm,
  };
}
