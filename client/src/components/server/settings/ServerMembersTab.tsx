import React, { useState, useMemo } from 'react';
import {
  MagnifyingGlass,
  Plus,
  X,
} from '@phosphor-icons/react';
import { Avatar, Badge, Spinner } from '../../ui';
import { roleApi } from '../../../services/roleApi';
import type { Role } from '../../../types/role';
import type { Workspace } from '../../../types';
import type { ServerMemberItem } from './types';

interface ServerMembersTabProps {
  workspace: Workspace;
  roles: Role[];
  members: ServerMemberItem[];
  isLoadingMembers: boolean;
  onRefreshMembers: () => void;
}

export const ServerMembersTab: React.FC<ServerMembersTabProps> = ({
  workspace,
  roles,
  members,
  isLoadingMembers,
  onRefreshMembers,
}) => {
  const [memberSearchQuery, setMemberSearchQuery] = useState('');
  const [memberRoleDropdownUserId, setMemberRoleDropdownUserId] = useState<string | null>(null);
  const [memberActionLoadingId, setMemberActionLoadingId] = useState<string | null>(null);

  const handleAssignRoleToMember = async (memberId: string, roleId: string) => {
    try {
      setMemberActionLoadingId(memberId);
      await roleApi.assignRole(workspace.id, memberId, roleId);
      onRefreshMembers();
    } catch (err) {
      console.error('Failed to assign role to member:', err);
      alert('Không thể gán vai trò. Vui lòng kiểm tra quyền hạn!');
    } finally {
      setMemberActionLoadingId(null);
      setMemberRoleDropdownUserId(null);
    }
  };

  const handleUnassignRoleFromMember = async (memberId: string, roleId: string) => {
    try {
      setMemberActionLoadingId(memberId);
      await roleApi.unassignRole(workspace.id, memberId, roleId);
      onRefreshMembers();
    } catch (err) {
      console.error('Failed to unassign role from member:', err);
      alert('Không thể gỡ vai trò. Vui lòng thử lại!');
    } finally {
      setMemberActionLoadingId(null);
    }
  };

  const filteredMembers = useMemo(() => {
    if (!memberSearchQuery.trim()) return members;
    const q = memberSearchQuery.toLowerCase();
    return members.filter(
      (m) =>
        m.displayName?.toLowerCase().includes(q) ||
        m.username?.toLowerCase().includes(q) ||
        m.email?.toLowerCase().includes(q)
    );
  }, [members, memberSearchQuery]);

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-[var(--bg-chat)] overflow-hidden">
      {/* Member Search & Filters */}
      <div className="p-4 border-b border-[var(--border-color)] bg-[var(--bg-sidebar)] flex items-center justify-between gap-4 shrink-0">
        <div>
          <h3 className="text-sm font-bold text-[var(--text-primary)]">
            Danh sách thành viên máy chủ
          </h3>
          <p className="text-xs text-[var(--text-muted)]">
            Tổng số {members.length} thành viên đang tham gia máy chủ
          </p>
        </div>
        <div className="relative w-64">
          <MagnifyingGlass
            size={14}
            className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
          />
          <input
            type="text"
            value={memberSearchQuery}
            onChange={(e) => setMemberSearchQuery(e.target.value)}
            placeholder="Tìm theo tên hoặc username..."
            className="w-full pl-8 pr-3 py-1.5 bg-[var(--bg-chat)] border border-[var(--border-color)] rounded-[4px] text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-hidden focus:border-[var(--accent-primary)]"
          />
        </div>
      </div>

      {/* Members Table / List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {isLoadingMembers ? (
          <div className="flex items-center justify-center p-8">
            <Spinner size="lg" />
          </div>
        ) : filteredMembers.length === 0 ? (
          <div className="text-center p-8 text-xs text-[var(--text-muted)]">
            Không tìm thấy thành viên nào phù hợp.
          </div>
        ) : (
          filteredMembers.map((member) => {
            const memberRoles = member.roles || [];
            const isOwnerMember = member.role?.toLowerCase() === 'owner';
            const availableRolesToAssign = roles.filter(
              (r) => !r.isDefault && !memberRoles.some((mr) => mr.id === r.id)
            );

            return (
              <div
                key={member.id}
                className="p-3 bg-[var(--bg-sidebar)] border border-[var(--border-color)] rounded-[4px] flex items-center justify-between gap-4 transition-colors hover:border-[var(--border-color)]/80"
              >
                {/* Member Identity */}
                <div className="flex items-center gap-3 min-w-0">
                  <div className="relative shrink-0">
                    <Avatar
                      src={member.avatarUrl}
                      fallback={member.displayName || member.username}
                      size="md"
                    />
                    <span
                      className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full ring-2 ring-[var(--bg-sidebar)] ${
                        member.status === 'online'
                          ? 'bg-[var(--status-online)]'
                          : 'bg-neutral-500'
                      }`}
                    />
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-[var(--text-primary)] truncate">
                        {member.displayName}
                      </span>
                      {isOwnerMember && (
                        <Badge variant="primary">Chủ phòng</Badge>
                      )}
                    </div>
                    <span className="text-[11px] text-[var(--text-muted)] truncate block">
                      @{member.username}
                    </span>
                  </div>
                </div>

                {/* Member Roles Badges & Assign Button */}
                <div className="flex items-center gap-1.5 flex-wrap justify-end relative">
                  {memberRoles.map((r) => (
                    <span
                      key={r.id}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[3px] text-[11px] font-semibold text-[var(--text-primary)] border border-[var(--border-color)] bg-[var(--bg-chat)]"
                    >
                      <span
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: r.colorHex || 'var(--text-muted)' }}
                      />
                      <span className="max-w-[100px] truncate">{r.name}</span>
                      <button
                        type="button"
                        onClick={() => handleUnassignRoleFromMember(member.id, r.id)}
                        disabled={memberActionLoadingId === member.id}
                        className="text-[var(--text-muted)] hover:text-[var(--status-dnd)] cursor-pointer"
                        title="Gỡ vai trò"
                      >
                        <X size={10} weight="bold" />
                      </button>
                    </span>
                  ))}

                  {/* Add Role Dropdown Button */}
                  {availableRolesToAssign.length > 0 && (
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() =>
                          setMemberRoleDropdownUserId(
                            memberRoleDropdownUserId === member.id ? null : member.id
                          )
                        }
                        className="w-6 h-6 rounded-[3px] bg-[var(--bg-surface)] hover:bg-[var(--bg-surface-active)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] flex items-center justify-center transition-colors cursor-pointer border border-[var(--border-color)]"
                        title="Thêm vai trò cho thành viên"
                      >
                        <Plus size={12} weight="bold" />
                      </button>

                      {/* Dropdown Menu */}
                      {memberRoleDropdownUserId === member.id && (
                        <div className="absolute right-0 top-7 w-48 bg-[var(--bg-chat)] border border-[var(--border-color)] rounded-[4px] shadow-xl py-1 z-50 animate-in fade-in zoom-in-95 duration-100">
                          <span className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] block border-b border-[var(--border-color)]/50">
                            Gán vai trò
                          </span>
                          <div className="max-h-40 overflow-y-auto p-1 space-y-0.5">
                            {availableRolesToAssign.map((role) => (
                              <button
                                key={role.id}
                                type="button"
                                onClick={() => handleAssignRoleToMember(member.id, role.id)}
                                className="w-full flex items-center gap-2 px-2 py-1 rounded-[3px] text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-active)] transition-colors cursor-pointer text-left"
                              >
                                <span
                                  className="w-2 h-2 rounded-full shrink-0"
                                  style={{ backgroundColor: role.colorHex || 'var(--text-muted)' }}
                                />
                                <span className="truncate">{role.name}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
