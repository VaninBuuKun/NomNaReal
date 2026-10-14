import React, { useState, useEffect } from 'react';
import {
  Gear,
  ShieldCheck,
  Users,
  Trash,
  X,
} from '@phosphor-icons/react';
import { Modal } from '../ui';
import { roleApi } from '../../services/roleApi';
import { serverApi } from '../../services/serverApi';
import type { Role } from '../../types/role';
import type { Workspace } from '../../types';
import {
  ServerOverviewTab,
  ServerRolesTab,
  ServerMembersTab,
  ServerDangerZoneTab,
  type SettingsTab,
  type ServerMemberItem,
} from './settings';

interface ServerSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  workspace: Workspace | null;
  isOwner: boolean;
  onWorkspaceUpdated?: (ws: Workspace) => void;
  onWorkspaceDeleted?: (id: string) => void;
}

export const ServerSettingsModal: React.FC<ServerSettingsModalProps> = ({
  isOpen,
  onClose,
  workspace,
  isOwner,
  onWorkspaceUpdated,
  onWorkspaceDeleted,
}) => {
  const [activeTab, setActiveTab] = useState<SettingsTab>('overview');
  const [roles, setRoles] = useState<Role[]>([]);
  const [isLoadingRoles, setIsLoadingRoles] = useState(false);
  const [members, setMembers] = useState<ServerMemberItem[]>([]);
  const [isLoadingMembers, setIsLoadingMembers] = useState(false);

  // Load Roles
  const loadRoles = async () => {
    if (!workspace) return;
    try {
      setIsLoadingRoles(true);
      const data = await roleApi.getRoles(workspace.id);
      const sorted = [...data].sort((a, b) => b.position - a.position);
      setRoles(sorted);
    } catch (err) {
      console.error('Failed to load server roles:', err);
    } finally {
      setIsLoadingRoles(false);
    }
  };

  // Load Members
  const loadMembers = async () => {
    if (!workspace) return;
    try {
      setIsLoadingMembers(true);
      const data = await serverApi.getMembers(workspace.id);
      setMembers(
        data.map((m: any) => ({
          id: m.id || m.userId,
          userId: m.userId,
          displayName: m.displayName || m.username,
          username: m.username,
          avatarUrl: m.avatarUrl,
          email: m.email,
          role: m.role || 'Member',
          status: m.status || 'offline',
          roles: m.roles || [],
        }))
      );
    } catch (err) {
      console.error('Failed to load server members:', err);
    } finally {
      setIsLoadingMembers(false);
    }
  };

  useEffect(() => {
    if (workspace && isOpen) {
      setActiveTab('overview');
      loadRoles();
      loadMembers();
    }
  }, [workspace?.id, isOpen]);

  if (!workspace) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title=""
      size="xl"
      className="max-w-4xl h-[620px] p-0 overflow-hidden flex flex-col"
    >
      <div className="flex flex-1 min-h-0 h-full overflow-hidden">
        {/* 1. Left Navigation Sidebar */}
        <div className="w-56 bg-[var(--bg-sidebar)] border-r border-[var(--border-color)] flex flex-col shrink-0 p-3 select-none">
          <div className="flex items-center justify-between pb-3 mb-2 border-b border-[var(--border-color)]/60">
            <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] truncate">
              {workspace.name}
            </span>
            <Gear size={16} className="text-[var(--text-muted)] shrink-0" />
          </div>

          <nav className="flex-1 space-y-1">
            <button
              type="button"
              onClick={() => setActiveTab('overview')}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-[4px] text-xs font-medium cursor-pointer transition-colors ${
                activeTab === 'overview'
                  ? 'bg-[var(--bg-surface-active)] text-[var(--text-primary)] font-semibold'
                  : 'text-[var(--text-secondary)] hover:bg-[var(--bg-surface)] hover:text-[var(--text-primary)]'
              }`}
            >
              <Gear size={16} weight={activeTab === 'overview' ? 'bold' : 'regular'} />
              <span>Tổng quan</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('roles')}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-[4px] text-xs font-medium cursor-pointer transition-colors ${
                activeTab === 'roles'
                  ? 'bg-[var(--bg-surface-active)] text-[var(--text-primary)] font-semibold'
                  : 'text-[var(--text-secondary)] hover:bg-[var(--bg-surface)] hover:text-[var(--text-primary)]'
              }`}
            >
              <div className="flex items-center gap-2">
                <ShieldCheck size={16} weight={activeTab === 'roles' ? 'bold' : 'regular'} />
                <span>Vai trò</span>
              </div>
              <span className="text-[11px] text-[var(--text-muted)] font-mono">
                {roles.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('members')}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-[4px] text-xs font-medium cursor-pointer transition-colors ${
                activeTab === 'members'
                  ? 'bg-[var(--bg-surface-active)] text-[var(--text-primary)] font-semibold'
                  : 'text-[var(--text-secondary)] hover:bg-[var(--bg-surface)] hover:text-[var(--text-primary)]'
              }`}
            >
              <div className="flex items-center gap-2">
                <Users size={16} weight={activeTab === 'members' ? 'bold' : 'regular'} />
                <span>Thành viên</span>
              </div>
              <span className="text-[11px] text-[var(--text-muted)] font-mono">
                {members.length}
              </span>
            </button>

            {isOwner && (
              <>
                <div className="h-px bg-[var(--border-color)]/60 my-2" />
                <span className="px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-[var(--status-dnd)] block">
                  Khu vực nguy hiểm
                </span>
                <button
                  type="button"
                  onClick={() => setActiveTab('delete')}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-[4px] text-xs font-medium cursor-pointer transition-colors text-[var(--status-dnd)] hover:bg-[var(--status-dnd)]/10 ${
                    activeTab === 'delete' ? 'bg-[var(--status-dnd)]/20 font-semibold' : ''
                  }`}
                >
                  <Trash size={16} weight="bold" />
                  <span>Xóa máy chủ</span>
                </button>
              </>
            )}
          </nav>

          <div className="pt-2 border-t border-[var(--border-color)]/60">
            <button
              type="button"
              onClick={onClose}
              className="w-full flex items-center justify-center gap-1.5 py-1.5 text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] rounded-[4px] hover:bg-[var(--bg-surface)] transition-colors cursor-pointer"
            >
              <X size={14} />
              <span>Đóng cài đặt (ESC)</span>
            </button>
          </div>
        </div>

        {/* 2. Right Main Tab Content */}
        <div className="flex-1 flex flex-col min-h-0 bg-[var(--bg-chat)] overflow-hidden">
          {activeTab === 'overview' && (
            <ServerOverviewTab
              workspace={workspace}
              onWorkspaceUpdated={onWorkspaceUpdated}
            />
          )}

          {activeTab === 'roles' && (
            <ServerRolesTab
              workspace={workspace}
              roles={roles}
              isLoadingRoles={isLoadingRoles}
              onRolesUpdated={(newRoles) => setRoles(newRoles)}
            />
          )}

          {activeTab === 'members' && (
            <ServerMembersTab
              workspace={workspace}
              roles={roles}
              members={members}
              isLoadingMembers={isLoadingMembers}
              onRefreshMembers={loadMembers}
            />
          )}

          {activeTab === 'delete' && isOwner && (
            <ServerDangerZoneTab
              workspace={workspace}
              onWorkspaceDeleted={onWorkspaceDeleted}
              onClose={onClose}
            />
          )}
        </div>
      </div>
    </Modal>
  );
};
