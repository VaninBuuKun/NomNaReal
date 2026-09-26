import React from 'react';
import { Plus } from 'lucide-react';
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
  return (
    <aside style={{
      width: '68px',
      backgroundColor: 'var(--bg-rail)',
      borderRight: '1px solid var(--border-color)',
      padding: '14px 0',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '12px',
      flexShrink: 0,
      overflowY: 'auto'
    }}>
      {/* Brand Icon */}
      <div 
        title="NomNa"
        style={{
          width: '44px',
          height: '44px',
          borderRadius: '14px',
          background: 'var(--accent-primary)',
          color: '#fff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: 800,
          fontSize: '1.2rem',
          cursor: 'pointer',
          boxShadow: '0 4px 12px var(--accent-glow)'
        }}
      >
        ⚡
      </div>

      <div style={{ width: '32px', height: '1px', backgroundColor: 'var(--border-color)' }} />

      {/* Workspaces List */}
      {workspaces.map((ws) => {
        const isActive = activeWorkspaceId === ws.id;
        const initials = ws.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || 'WS';

        return (
          <div
            key={ws.id}
            title={ws.name}
            onClick={() => onSelectWorkspace(ws.id)}
            style={{
              width: '44px',
              height: '44px',
              borderRadius: isActive ? '14px' : '12px',
              backgroundColor: isActive ? 'var(--accent-primary)' : 'var(--bg-surface)',
              color: isActive ? '#fff' : 'var(--text-secondary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700,
              fontSize: '0.9rem',
              cursor: 'pointer',
              transition: 'all 0.18s ease',
              position: 'relative',
              border: isActive ? 'none' : '1px solid var(--border-color)',
              boxShadow: isActive ? '0 4px 14px var(--accent-glow)' : 'none'
            }}
          >
            {initials}
            {isActive && (
              <div style={{
                position: 'absolute',
                left: '-12px',
                width: '4px',
                height: '24px',
                backgroundColor: 'var(--accent-primary)',
                borderRadius: '0 4px 4px 0'
              }} />
            )}
          </div>
        );
      })}

      {/* Add Workspace Button */}
      <div
        title="Tạo Workspace mới"
        onClick={onCreateWorkspace}
        style={{
          width: '44px',
          height: '44px',
          borderRadius: '12px',
          border: '1px dashed var(--text-muted)',
          backgroundColor: 'transparent',
          color: 'var(--text-muted)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          transition: 'all 0.18s ease'
        }}
        onMouseOver={(e) => {
          e.currentTarget.style.borderColor = 'var(--accent-primary)';
          e.currentTarget.style.color = 'var(--accent-primary)';
        }}
        onMouseOut={(e) => {
          e.currentTarget.style.borderColor = 'var(--text-muted)';
          e.currentTarget.style.color = 'var(--text-muted)';
        }}
      >
        <Plus size={18} />
      </div>
    </aside>
  );
};
