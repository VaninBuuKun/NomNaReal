import React from 'react';
import { Plus } from '@phosphor-icons/react';
import type { Workspace } from '../types';

interface WorkspaceRailProps {
  workspaces: Workspace[];
  activeWorkspaceId: string | null;
  onSelectWorkspace: (id: string) => void;
  onCreateWorkspace: () => void;
}

export const WorkspaceRail: React.FC<WorkspaceRailProps> = ({
  workspaces,
  activeWorkspaceId,
  onSelectWorkspace,
  onCreateWorkspace,
}) => {
  const displayWorkspaces: Workspace[] =
    workspaces.length > 0
      ? workspaces
      : [
          {
            id: 'ws-nexus',
            name: 'Nexus Hub',
            description: 'Trung tâm làm việc & phát triển sản phẩm của team NomNa',
            inviteCode: 'NEXUS123',
            ownerId: 'u1',
          },
        ];

  return (
    <aside className="w-[68px] h-full min-h-0 shrink-0 bg-[var(--bg-rail)] border-r border-[var(--border-color)] py-3 flex flex-col items-center gap-2 overflow-y-auto overflow-x-hidden select-none">
      {displayWorkspaces.map((ws) => {
        const isActive = activeWorkspaceId === ws.id || (!activeWorkspaceId && ws.id === displayWorkspaces[0].id);
        const initials =
          ws.name
            .split(' ')
            .map((w) => w[0])
            .join('')
            .slice(0, 2)
            .toUpperCase() || 'NX';

        return (
          <div
            key={ws.id}
            title={ws.name}
            onClick={() => onSelectWorkspace(ws.id)}
            className={`relative w-11 h-11 flex items-center justify-center font-bold text-sm cursor-pointer transition-all duration-200 border ${
              isActive
                ? "bg-[var(--accent-primary)] text-white border-transparent shadow-[0_4px_14px_var(--accent-glow)] rounded-[14px] before:content-[''] before:absolute before:-left-[12px] before:top-1/2 before:-translate-y-1/2 before:w-[3.5px] before:h-[50px] before:bg-[var(--accent-primary)] before:rounded-r-full"
                : "rounded-xl bg-[var(--bg-surface)] text-[var(--text-secondary)] border-[var(--border-color)] hover:bg-[var(--accent-primary)] hover:text-white hover:border-transparent hover:rounded-[14px] hover:shadow-[0_4px_12px_var(--accent-glow)]"
            }`}
          >
            {initials}
          </div>
        );
      })}

      {/* Add Workspace Button */}
      <button
        type="button"
        className="w-11 h-11 rounded-xl flex items-center justify-center text-[var(--text-muted)] border border-dashed border-[var(--text-muted)] bg-transparent hover:border-[var(--accent-primary)] hover:text-[var(--accent-primary)] hover:bg-[var(--accent-soft)] transition-all duration-200 cursor-pointer"
        title="Tạo Workspace mới"
        onClick={onCreateWorkspace}
      >
        <Plus size={18} weight="bold" />
      </button>
    </aside>
  );
};
