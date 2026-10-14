import React, { useState, useMemo, useEffect } from 'react';
import {
  Plus,
  Trash,
  MagnifyingGlass,
  Check,
  Warning,
  Sparkle,
} from '@phosphor-icons/react';
import { Input, UnsavedChangesBar } from '../../ui';
import { roleApi } from '../../../services/roleApi';
import {
  PERMISSION_DEFINITIONS,
  hasPermission,
} from '../../../types/permissions';
import type { Role, UpdateRoleRequest } from '../../../types/role';
import type { Workspace } from '../../../types';
import { PRESET_COLORS } from './types';

interface ServerRolesTabProps {
  workspace: Workspace;
  roles: Role[];
  isLoadingRoles: boolean;
  onRolesUpdated: (roles: Role[]) => void;
}

export const ServerRolesTab: React.FC<ServerRolesTabProps> = ({
  workspace,
  roles,
  isLoadingRoles,
  onRolesUpdated,
}) => {
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);
  const [roleTab, setRoleTab] = useState<'info' | 'permissions'>('info');
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [hasRoleChanges, setHasRoleChanges] = useState(false);
  const [isSavingRole, setIsSavingRole] = useState(false);
  const [roleError, setRoleError] = useState<string | null>(null);
  const [roleSearchQuery, setRoleSearchQuery] = useState('');
  const [permSearchQuery, setPermSearchQuery] = useState('');

  // Auto-select first role on mount or role list change
  useEffect(() => {
    if (roles.length > 0 && !selectedRoleId) {
      setSelectedRoleId(roles[0].id);
      setEditingRole({ ...roles[0] });
    }
  }, [roles, selectedRoleId]);

  const selectRole = (role: Role) => {
    if (hasRoleChanges) {
      if (!confirm('Bạn có thay đổi chưa lưu cho vai trò hiện tại. Bạn có chắc muốn chuyển?')) {
        return;
      }
    }
    setSelectedRoleId(role.id);
    setEditingRole({ ...role });
    setHasRoleChanges(false);
    setRoleError(null);
  };

  const handleCreateRole = async () => {
    try {
      setRoleError(null);
      const newRole = await roleApi.createRole(workspace.id, {
        name: 'Vai trò mới',
        colorHex: '#99aab5',
        permissions: 0,
        isHoisted: false,
      });

      const updated = [newRole, ...roles];
      onRolesUpdated(updated);
      setSelectedRoleId(newRole.id);
      setEditingRole({ ...newRole });
      setHasRoleChanges(false);
      setRoleTab('info');
    } catch (err) {
      console.error('Failed to create role:', err);
      setRoleError('Không thể tạo vai trò mới. Vui lòng thử lại!');
    }
  };

  const handleDeleteRole = async (roleId: string) => {
    const roleToDelete = roles.find((r) => r.id === roleId);
    if (!roleToDelete || roleToDelete.isDefault) {
      alert('Không thể xóa vai trò mặc định của hệ thống.');
      return;
    }
    if (!confirm(`Bạn có chắc chắn muốn xóa vai trò "${roleToDelete.name}"?`)) {
      return;
    }

    try {
      setRoleError(null);
      await roleApi.deleteRole(workspace.id, roleId);
      const updated = roles.filter((r) => r.id !== roleId);
      onRolesUpdated(updated);
      if (updated.length > 0) {
        setSelectedRoleId(updated[0].id);
        setEditingRole({ ...updated[0] });
        setHasRoleChanges(false);
      } else {
        setSelectedRoleId(null);
        setEditingRole(null);
      }
    } catch (err) {
      console.error('Failed to delete role:', err);
      setRoleError('Không thể xóa vai trò. Vui lòng kiểm tra quyền hạn của bạn!');
    }
  };

  const handleTogglePermission = (flag: bigint) => {
    if (!editingRole) return;
    const currentBigInt = BigInt(editingRole.permissions);
    const has = (currentBigInt & flag) === flag;
    const nextBigInt = has
      ? (currentBigInt & ~flag)
      : (currentBigInt | flag);

    setEditingRole({
      ...editingRole,
      permissions: Number(nextBigInt),
    });
    setHasRoleChanges(true);
  };

  const handleSaveRole = async () => {
    if (!editingRole) return;
    try {
      setIsSavingRole(true);
      setRoleError(null);
      const updateReq: UpdateRoleRequest = {
        name: editingRole.name.trim(),
        colorHex: editingRole.colorHex,
        permissions: editingRole.permissions,
        isHoisted: editingRole.isHoisted,
      };

      const res = await roleApi.updateRole(workspace.id, editingRole.id, updateReq);
      const updated = roles.map((r) => (r.id === res.id ? res : r));
      onRolesUpdated(updated);
      setEditingRole({ ...res });
      setHasRoleChanges(false);
    } catch (err) {
      console.error('Failed to save role:', err);
      setRoleError('Không thể lưu thông tin vai trò. Vui lòng thử lại!');
    } finally {
      setIsSavingRole(false);
    }
  };

  const handleResetRole = () => {
    const originalRole = roles.find((r) => r.id === selectedRoleId);
    if (originalRole) {
      setEditingRole({ ...originalRole });
      setHasRoleChanges(false);
      setRoleError(null);
    }
  };

  const filteredRoles = useMemo(() => {
    if (!roleSearchQuery.trim()) return roles;
    return roles.filter((r) =>
      r.name.toLowerCase().includes(roleSearchQuery.toLowerCase())
    );
  }, [roles, roleSearchQuery]);

  const filteredPermissions = useMemo(() => {
    if (!permSearchQuery.trim()) return PERMISSION_DEFINITIONS;
    return PERMISSION_DEFINITIONS.filter(
      (p) =>
        p.name.toLowerCase().includes(permSearchQuery.toLowerCase()) ||
        p.description.toLowerCase().includes(permSearchQuery.toLowerCase())
    );
  }, [permSearchQuery]);

  return (
    <div className="flex flex-1 min-h-0 overflow-hidden">
      {/* Left Role List */}
      <div className="w-60 border-r border-[var(--border-color)] bg-[var(--bg-sidebar)] flex flex-col shrink-0">
        <div className="p-2.5 border-b border-[var(--border-color)] space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
              Danh sách ({roles.length})
            </span>
            <button
              type="button"
              onClick={handleCreateRole}
              disabled={isLoadingRoles}
              className="flex items-center gap-1 text-xs font-semibold text-[var(--accent-primary)] hover:opacity-80 transition-opacity cursor-pointer"
              title="Tạo vai trò mới"
            >
              <Plus size={14} weight="bold" />
              <span>Thêm</span>
            </button>
          </div>
          <div className="relative">
            <MagnifyingGlass
              size={13}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
            />
            <input
              type="text"
              value={roleSearchQuery}
              onChange={(e) => setRoleSearchQuery(e.target.value)}
              placeholder="Tìm vai trò..."
              className="w-full pl-7 pr-2.5 py-1 bg-[var(--bg-chat)] border border-[var(--border-color)] rounded-[4px] text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-hidden focus:border-[var(--accent-primary)]"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {filteredRoles.map((role) => {
            const isSelected = role.id === selectedRoleId;
            return (
              <button
                key={role.id}
                type="button"
                onClick={() => selectRole(role)}
                className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-[4px] text-xs font-medium cursor-pointer transition-colors text-left ${
                  isSelected
                    ? 'bg-[var(--bg-surface-active)] text-[var(--text-primary)] font-semibold'
                    : 'text-[var(--text-secondary)] hover:bg-[var(--bg-surface)] hover:text-[var(--text-primary)]'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: role.colorHex || 'var(--text-muted)' }}
                  />
                  <span className="truncate">{role.name}</span>
                </div>
                {role.isDefault && (
                  <span className="text-[10px] text-[var(--text-muted)] shrink-0">
                    Mặc định
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Right Role Editor */}
      <div className="relative flex-1 flex flex-col min-h-0 bg-[var(--bg-chat)] overflow-hidden">
        {editingRole ? (
          <>
            {/* Role Header Tabs */}
            <div className="px-4 py-2 border-b border-[var(--border-color)] bg-[var(--bg-sidebar)] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setRoleTab('info')}
                  className={`px-3 py-1 text-xs font-semibold rounded-[4px] transition-colors cursor-pointer ${
                    roleTab === 'info'
                      ? 'bg-[var(--bg-surface-active)] text-[var(--text-primary)]'
                      : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  Hiển thị
                </button>
                <button
                  type="button"
                  onClick={() => setRoleTab('permissions')}
                  className={`px-3 py-1 text-xs font-semibold rounded-[4px] transition-colors cursor-pointer ${
                    roleTab === 'permissions'
                      ? 'bg-[var(--bg-surface-active)] text-[var(--text-primary)]'
                      : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  Quyền hạn
                </button>
              </div>

              {!editingRole.isDefault && (
                <button
                  type="button"
                  onClick={() => handleDeleteRole(editingRole.id)}
                  disabled={isSavingRole}
                  className="flex items-center gap-1 text-xs text-[var(--status-dnd)] hover:bg-[var(--status-dnd)]/10 px-2 py-1 rounded-[4px] transition-colors cursor-pointer"
                >
                  <Trash size={14} />
                  <span>Xóa vai trò</span>
                </button>
              )}
            </div>

            {/* Role Tab Body */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {roleError && (
                <div className="p-3 bg-[var(--status-dnd)]/10 border border-[var(--status-dnd)]/30 rounded-[4px] text-xs text-[var(--status-dnd)] flex items-center gap-2">
                  <Warning size={14} weight="bold" />
                  <span>{roleError}</span>
                </div>
              )}

              {roleTab === 'info' ? (
                <div className="space-y-4 max-w-md">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] mb-1.5">
                      Tên vai trò
                    </label>
                    <Input
                      value={editingRole.name}
                      onChange={(e) => {
                        setEditingRole({ ...editingRole, name: e.target.value });
                        setHasRoleChanges(true);
                      }}
                      disabled={editingRole.isDefault}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] mb-1.5">
                      Màu sắc vai trò
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {PRESET_COLORS.map((hex) => (
                        <button
                          key={hex}
                          type="button"
                          onClick={() => {
                            setEditingRole({ ...editingRole, colorHex: hex });
                            setHasRoleChanges(true);
                          }}
                          className="w-6 h-6 rounded-full flex items-center justify-center cursor-pointer transition-transform hover:scale-110"
                          style={{ backgroundColor: hex }}
                        >
                          {editingRole.colorHex?.toLowerCase() === hex.toLowerCase() && (
                            <Check size={12} weight="bold" className="text-white drop-shadow-sm" />
                          )}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="pt-2 flex items-center justify-between p-3 rounded-[4px] bg-[var(--bg-sidebar)] border border-[var(--border-color)]">
                    <div>
                      <p className="text-xs font-semibold text-[var(--text-primary)]">
                        Hiển thị nhóm riêng biệt
                      </p>
                      <p className="text-[11px] text-[var(--text-muted)]">
                        Tách các thành viên có vai trò này vào danh mục riêng ở danh sách bên phải.
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      checked={editingRole.isHoisted}
                      onChange={(e) => {
                        setEditingRole({ ...editingRole, isHoisted: e.target.checked });
                        setHasRoleChanges(true);
                      }}
                      className="w-4 h-4 rounded-[3px] accent-[var(--accent-primary)] cursor-pointer"
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="relative">
                    <MagnifyingGlass
                      size={14}
                      className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
                    />
                    <input
                      type="text"
                      value={permSearchQuery}
                      onChange={(e) => setPermSearchQuery(e.target.value)}
                      placeholder="Tìm kiếm quyền hạn..."
                      className="w-full pl-8 pr-3 py-1.5 bg-[var(--bg-sidebar)] border border-[var(--border-color)] rounded-[4px] text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-hidden focus:border-[var(--accent-primary)]"
                    />
                  </div>

                  <div className="divide-y divide-[var(--border-color)]">
                    {filteredPermissions.map((item) => {
                      const isEnabled = hasPermission(
                        BigInt(editingRole.permissions),
                        item.flag
                      );

                      return (
                        <div key={item.key} className="py-2.5 flex items-start justify-between gap-4">
                          <div className="space-y-0.5">
                            <p className="text-xs font-semibold text-[var(--text-primary)]">
                              {item.name}
                            </p>
                            <p className="text-[11px] text-[var(--text-muted)]">
                              {item.description}
                            </p>
                          </div>
                          <input
                            type="checkbox"
                            checked={isEnabled}
                            onChange={() => handleTogglePermission(item.flag)}
                            className="w-4 h-4 rounded-[3px] accent-[var(--accent-primary)] cursor-pointer shrink-0 mt-0.5"
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Role Save Bar */}
            <UnsavedChangesBar
              show={hasRoleChanges}
              isSaving={isSavingRole}
              onReset={handleResetRole}
              onSave={handleSaveRole}
              saveText="Lưu vai trò"
            />
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-[var(--text-muted)] p-6 text-center">
            <Sparkle size={32} weight="light" className="mb-2 opacity-50" />
            <p className="text-sm font-semibold">Chưa chọn vai trò nào</p>
            <p className="text-xs">Chọn một vai trò ở danh sách bên trái để chỉnh sửa.</p>
          </div>
        )}
      </div>
    </div>
  );
};
