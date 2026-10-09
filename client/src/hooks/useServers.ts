import { useState, useEffect } from 'react';
import { serverApi } from '../services/serverApi';
import type { Server } from '../types';

export function useServers() {
  const [servers, setServers] = useState<Server[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchServers = async () => {
    try {
      setLoading(true);
      const data = await serverApi.getServers();
      setServers(data);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Lỗi khi tải danh sách server');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchServers();
  }, []);

  const createServer = async (name: string, iconUrl: string, description?: string) => {
    const newServer = await serverApi.createServer(name, iconUrl, description);
    setServers((prev) => [...prev, newServer]);
    return newServer;
  };

  return {
    servers,
    loading,
    error,
    fetchServers,
    createServer,
    // Alias tương thích cũ
    workspaces: servers,
    fetchWorkspaces: fetchServers,
    createWorkspace: createServer,
  };
}

export const useWorkspaces = useServers;
