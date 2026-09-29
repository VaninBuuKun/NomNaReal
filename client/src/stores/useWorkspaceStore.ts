import { create } from 'zustand';
import type { Workspace } from '../types';

interface WorkspaceState {
  workspaces: Workspace[];
  activeWorkspaceId: string | null;
  isSwitchingWorkspace: boolean;

  // Actions
  setWorkspaces: (workspaces: Workspace[]) => void;
  setActiveWorkspaceId: (id: string | null) => void;
  addWorkspace: (workspace: Workspace) => void;
  updateWorkspace: (workspace: Workspace) => void;
  removeWorkspace: (id: string) => void;
  setIsSwitchingWorkspace: (val: boolean) => void;
}

export const useWorkspaceStore = create<WorkspaceState>((set) => ({
  workspaces: [],
  activeWorkspaceId: null,
  isSwitchingWorkspace: false,

  setWorkspaces: (workspaces) => set({ workspaces }),
  
  setActiveWorkspaceId: (id) => set({ activeWorkspaceId: id }),

  addWorkspace: (workspace) =>
    set((state) => ({
      workspaces: [...state.workspaces, workspace],
      activeWorkspaceId: workspace.id,
    })),

  updateWorkspace: (workspace) =>
    set((state) => ({
      workspaces: state.workspaces.map((w) =>
        w.id === workspace.id ? { ...w, ...workspace } : w
      ),
    })),

  removeWorkspace: (id) =>
    set((state) => ({
      workspaces: state.workspaces.filter((w) => w.id !== id),
      activeWorkspaceId:
        state.activeWorkspaceId === id
          ? state.workspaces.find((w) => w.id !== id)?.id || null
          : state.activeWorkspaceId,
    })),

  setIsSwitchingWorkspace: (val) => set({ isSwitchingWorkspace: val }),
}));
