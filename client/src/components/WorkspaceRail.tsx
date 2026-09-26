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
    <aside className="workspace-rail">
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
            className={`ws-item ${isActive ? 'active' : ''}`}
          >
            {initials}
          </div>
        );
      })}

      <div className="rail-divider" />

      {/* Add Workspace Button */}
      <button
        type="button"
        className="ws-item"
        style={{ border: '1px dashed var(--text-muted)', background: 'transparent' }}
        title="Tạo Workspace mới"
        onClick={onCreateWorkspace}
      >
        <Plus size={18} weight="bold" />
      </button>
    </aside>
  );
};
