import { create } from 'zustand';
import type { Server } from '../types';

interface ServerState {
  // Primary Server states
  servers: Server[];
  activeServerId: string | null;
  isSwitchingServer: boolean;

  // Compatibility aliases
  workspaces: Server[];
  activeWorkspaceId: string | null;
  isSwitchingWorkspace: boolean;

  setServers: (servers: Server[]) => void;
  setActiveServerId: (id: string | null) => void;
  addServer: (server: Server) => void;
  updateServer: (server: Server) => void;
  removeServer: (id: string) => void;
  setIsSwitchingServer: (val: boolean) => void;

  // Compatibility action aliases
  setWorkspaces: (workspaces: Server[]) => void;
  setActiveWorkspaceId: (id: string | null) => void;
  addWorkspace: (workspace: Server) => void;
  updateWorkspace: (workspace: Server) => void;
  removeWorkspace: (id: string) => void;
  setIsSwitchingWorkspace: (val: boolean) => void;
}

export const useServerStore = create<ServerState>((set) => ({
  servers: [],
  activeServerId: null,
  isSwitchingServer: false,

  workspaces: [],
  activeWorkspaceId: null,
  isSwitchingWorkspace: false,

  setServers: (servers) => set({ servers, workspaces: servers }),

  setActiveServerId: (id) => set({ activeServerId: id, activeWorkspaceId: id }),

  addServer: (server) =>
    set((state) => {
      const next = [...state.servers, server];
      return {
        servers: next,
        workspaces: next,
        activeServerId: server.id,
        activeWorkspaceId: server.id,
      };
    }),

  updateServer: (server) =>
    set((state) => {
      const next = state.servers.map((s) => (s.id === server.id ? server : s));
      return {
        servers: next,
        workspaces: next,
      };
    }),

  removeServer: (id) =>
    set((state) => {
      const next = state.servers.filter((s) => s.id !== id);
      const nextActiveId =
        state.activeServerId === id
          ? next[0]?.id || null
          : state.activeServerId;
      return {
        servers: next,
        workspaces: next,
        activeServerId: nextActiveId,
        activeWorkspaceId: nextActiveId,
      };
    }),

  setIsSwitchingServer: (val) =>
    set({ isSwitchingServer: val, isSwitchingWorkspace: val }),

  // Actions aliases
  setWorkspaces: (w) => set({ servers: w, workspaces: w }),
  setActiveWorkspaceId: (id) => set({ activeServerId: id, activeWorkspaceId: id }),
  addWorkspace: (w) => {
    const fn = (state: ServerState) => {
      const next = [...state.servers, w];
      return {
        servers: next,
        workspaces: next,
        activeServerId: w.id,
        activeWorkspaceId: w.id,
      };
    };
    set(fn);
  },
  updateWorkspace: (w) =>
    set((state) => {
      const next = state.servers.map((s) => (s.id === w.id ? w : s));
      return { servers: next, workspaces: next };
    }),
  removeWorkspace: (id) =>
    set((state) => {
      const next = state.servers.filter((s) => s.id !== id);
      const nextActiveId =
        state.activeServerId === id ? next[0]?.id || null : state.activeServerId;
      return {
        servers: next,
        workspaces: next,
        activeServerId: nextActiveId,
        activeWorkspaceId: nextActiveId,
      };
    }),
  setIsSwitchingWorkspace: (val) =>
    set({ isSwitchingServer: val, isSwitchingWorkspace: val }),
}));

// Export alias directly pointing to the real Zustand store instance!
export const useWorkspaceStore = useServerStore;
