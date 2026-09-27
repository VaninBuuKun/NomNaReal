import { useState, useEffect, useCallback } from 'react';
import { workspaceApi } from '../services/workspaceApi';
import type { Workspace } from '../types';

export function useWorkspaces() {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [activeWorkspace, setActiveWorkspace] = useState<Workspace | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchWorkspaces = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await workspaceApi.getWorkspaces();
      setWorkspaces(data);
      if (data.length > 0 && !activeWorkspace) {
        setActiveWorkspace(data[0]);
      }
    } catch (err) {
      console.error('Failed to fetch workspaces:', err);
    } finally {
      setIsLoading(false);
    }
  }, [activeWorkspace]);

  useEffect(() => {
    fetchWorkspaces();
  }, [fetchWorkspaces]);

  const createWorkspace = async (name: string, iconUrl: string, description?: string): Promise<Workspace> => {
    const newWs = await workspaceApi.createWorkspace(name, iconUrl, description);
    setWorkspaces((prev) => [...prev, newWs]);
    setActiveWorkspace(newWs);
    return newWs;
  };

  return {
    workspaces,
    activeWorkspace,
    setActiveWorkspace,
    isLoading,
    fetchWorkspaces,
    createWorkspace,
  };
}
