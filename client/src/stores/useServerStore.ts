import { create } from 'zustand';
import type { Server } from '../types';

interface ServerState {
  servers: Server[];
  activeServerId: string | null;
  isSwitchingServer: boolean;

  setServers: (servers: Server[]) => void;
  setActiveServerId: (id: string | null) => void;
  addServer: (server: Server) => void;
  updateServer: (server: Server) => void;
  removeServer: (id: string) => void;
  setIsSwitchingServer: (val: boolean) => void;
}

export const useServerStore = create<ServerState>((set) => ({
  servers: [],
  activeServerId: null,
  isSwitchingServer: false,

  setServers: (servers) => set({ servers }),

  setActiveServerId: (id) => set({ activeServerId: id }),

  addServer: (server) =>
    set((state) => ({
      servers: [...state.servers, server],
      activeServerId: server.id,
    })),

  updateServer: (server) =>
    set((state) => ({
      servers: state.servers.map((s) => (s.id === server.id ? server : s)),
    })),

  removeServer: (id) =>
    set((state) => ({
      servers: state.servers.filter((s) => s.id !== id),
      activeServerId:
        state.activeServerId === id
          ? state.servers.find((s) => s.id !== id)?.id || null
          : state.activeServerId,
    })),

  setIsSwitchingServer: (val) => set({ isSwitchingServer: val }),
}));

// Compatibility proxy/alias for useWorkspaceStore
export const useWorkspaceStore = Object.assign(
  (selector?: any) => {
    return useServerStore((state) => {
      const adapted = {
        ...state,
        workspaces: state.servers,
        activeWorkspaceId: state.activeServerId,
        isSwitchingWorkspace: state.isSwitchingServer,
        setWorkspaces: state.setServers,
        setActiveWorkspaceId: state.setActiveServerId,
        addWorkspace: state.addServer,
        updateWorkspace: state.updateServer,
        removeWorkspace: state.removeServer,
        setIsSwitchingWorkspace: state.setIsSwitchingServer,
      };
      return selector ? selector(adapted) : adapted;
    });
  },
  {
    getState: () => {
      const state = useServerStore.getState();
      return {
        ...state,
        workspaces: state.servers,
        activeWorkspaceId: state.activeServerId,
        isSwitchingWorkspace: state.isSwitchingServer,
        setWorkspaces: state.setServers,
        setActiveWorkspaceId: state.setActiveServerId,
        addWorkspace: state.addServer,
        updateWorkspace: state.updateServer,
        removeWorkspace: state.removeServer,
        setIsSwitchingWorkspace: state.setIsSwitchingServer,
      };
    },
    setState: useServerStore.setState,
    subscribe: useServerStore.subscribe,
  }
);
