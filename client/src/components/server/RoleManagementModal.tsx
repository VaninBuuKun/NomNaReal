import React, { useState, useEffect, useMemo } from 'react';
import {
  ShieldCheck,
  Plus,
  Check,
  MagnifyingGlass,
  Warning,
} from '@phosphor-icons/react';
import { Modal, Button, Input, Badge } from '../ui';
import { roleApi } from '../../services/roleApi';
import type { Role } from '../../types';
import {
  Permissions,
  PERMISSION_DEFINITIONS,
} from '../../types/permissions';

interface RoleManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  serverId: string;
  serverName: string;
}

const PRESET_COLORS = [
  '#5865F2',
  '#57F287',
  '#FEE75C',
  '#EB459E',
  '#ED4245',
  '#1ABC9C',
  '#2ECC71',
  '#3498DB',
  '#9B59B6',
  '#E67E22',
  '#E74C3C',
  '#95A5A6',
];

export const RoleManagementModal: React.FC<RoleManagementModalProps> = ({
  isOpen,
  onClose,
  serverId,
  serverName,
}) => {
  const [roles, setRoles] = useState<Role[]>([]);
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [permSearchQuery, setPermSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'display' | 'permissions'>('display');
  const [hasChanges, setHasChanges] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load roles
  const loadRoles = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await roleApi.getRoles(serverId);
      setRoles(data);
      if (data.length > 0) {
        const initial = data[0];
        setSelectedRoleId(initial.id);
        setEditingRole(initial);
      }
    } catch (err: unknown) {
      const e = err as { response?: { data?: { detail?: string } } };
      setError(e?.response?.data?.detail || 'Không thể tải danh sách vai trò.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && serverId) {
      loadRoles();
      setHasChanges(false);
    }
  }, [isOpen, serverId]);

  const selectedRole = useMemo(() => {
    return roles.find((r) => r.id === selectedRoleId) || null;
  }, [roles, selectedRoleId]);

  const handleSelectRole = (role: Role) => {
    if (hasChanges) {
      const confirmLeave = window.confirm(
        'Bạn có thay đổi chưa lưu. Bạn có chắc muốn chuyển vai trò?'
      );
      if (!confirmLeave) return;
    }
    setSelectedRoleId(role.id);
    setEditingRole({ ...role });
    setHasChanges(false);
    setError(null);
  };

  const handleCreateRole = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const newRole = await roleApi.createRole(serverId, {
        name: 'Vai trò mới',
        permissions: Permissions.Default.toString(),
      });
      setRoles((prev) => [...prev, newRole]);
      setSelectedRoleId(newRole.id);
      setEditingRole({ ...newRole });
      setHasChanges(false);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { detail?: string } } };
      setError(e?.response?.data?.detail || 'Không thể tạo vai trò mới.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteRole = async () => {
    if (!selectedRole || selectedRole.isDefault) return;
    const confirmDelete = window.confirm(
      `Bạn có chắc chắn muốn xóa vai trò "${selectedRole.name}"? Hành động này không thể hoàn tác.`
    );
    if (!confirmDelete) return;

    try {
      setIsSaving(true);
      setError(null);
      await roleApi.deleteRole(serverId, selectedRole.id);
      setRoles((prev) => prev.filter((r) => r.id !== selectedRole.id));
      const remaining = roles.filter((r) => r.id !== selectedRole.id);
      if (remaining.length > 0) {
        setSelectedRoleId(remaining[0].id);
        setEditingRole({ ...remaining[0] });
      } else {
        setSelectedRoleId(null);
        setEditingRole(null);
      }
      setHasChanges(false);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { detail?: string } } };
      setError(e?.response?.data?.detail || 'Không thể xóa vai trò này.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleTogglePermission = (flag: bigint) => {
    if (!editingRole) return;
    const currentBig = BigInt(editingRole.permissions);
    const isGranted = (currentBig & flag) === flag;
    const nextBig = isGranted ? currentBig & ~flag : currentBig | flag;

    setEditingRole({
      ...editingRole,
      permissions: nextBig.toString(),
    });
    setHasChanges(true);
  };

  const handleSave = async () => {
    if (!editingRole) return;
    try {
      setIsSaving(true);
      setError(null);
      const updated = await roleApi.updateRole(serverId, editingRole.id, {
        name: editingRole.name,
        permissions: editingRole.permissions,
        colorHex: editingRole.colorHex,
        isHoisted: editingRole.isHoisted,
        isMentionable: editingRole.isMentionable,
      });

      setRoles((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
      setEditingRole({ ...updated });
      setHasChanges(false);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { detail?: string } } };
      setError(e?.response?.data?.detail || 'Không thể lưu thay đổi vai trò.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    if (selectedRole) {
      setEditingRole({ ...selectedRole });
      setHasChanges(false);
      setError(null);
    }
  };

  const filteredRoles = useMemo(() => {
    if (!searchQuery.trim()) return roles;
    return roles.filter((r) =>
      r.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [roles, searchQuery]);

  const filteredPermissions = useMemo(() => {
    if (!permSearchQuery.trim()) return PERMISSION_DEFINITIONS;
    return PERMISSION_DEFINITIONS.filter(
      (p) =>
        p.name.toLowerCase().includes(permSearchQuery.toLowerCase()) ||
        p.description.toLowerCase().includes(permSearchQuery.toLowerCase())
    );
  }, [permSearchQuery]);

  const editingPermBigInt = useMemo(() => {
    if (!editingRole) return 0n;
    return BigInt(editingRole.permissions);
  }, [editingRole?.permissions]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-[4px] bg-[var(--accent-soft)] flex items-center justify-center text-[var(--accent-primary)] shrink-0">
            <ShieldCheck size={18} weight="bold" />
          </div>
          <span className="font-bold text-base text-[var(--text-primary)]">
            Cài đặt Vai trò (Roles)
          </span>
        </div>
      }
      subtitle={
        <span>
          Server: <span className="font-semibold text-[var(--text-secondary)]">{serverName}</span>
        </span>
      }
      size="2xl"
      bodyClassName="h-[650px] flex flex-col overflow-hidden"
    >
      {/* Content Body: Left sidebar (Roles list) + Right Editor */}
      <div className="flex flex-1 min-h-0 select-none overflow-hidden">
        {/* 1. Left Sidebar: Roles List */}
        <div className="w-64 border-r border-[var(--border-color)] bg-[var(--bg-sidebar)] flex flex-col shrink-0">
          <div className="p-3 border-b border-[var(--border-color)] space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
                Danh sách ({roles.length})
              </span>
              <button
                type="button"
                onClick={handleCreateRole}
                disabled={isLoading}
                className="flex items-center gap-1 text-xs font-semibold text-[var(--accent-primary)] hover:opacity-80 transition-opacity cursor-pointer"
                title="Tạo role mới"
              >
                <Plus size={14} weight="bold" />
                <span>Tạo Role</span>
              </button>
            </div>
            <div className="relative">
              <MagnifyingGlass
                size={14}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm vai trò..."
                className="w-full pl-8 pr-2.5 py-1.5 text-xs bg-[var(--bg-chat)] text-[var(--text-primary)] border border-[var(--border-color)] rounded-[4px] focus:outline-hidden focus:border-[var(--accent-primary)] placeholder-[var(--text-muted)]"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
            {filteredRoles.map((role) => {
              const isSelected = role.id === selectedRoleId;
              return (
                <button
                  key={role.id}
                  type="button"
                  onClick={() => handleSelectRole(role)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-[4px] text-xs font-medium transition-colors cursor-pointer text-left ${isSelected
                    ? 'bg-[var(--bg-surface-active)] text-[var(--text-primary)] font-semibold shadow-2xs'
                    : 'text-[var(--text-secondary)] hover:bg-[var(--bg-surface)] hover:text-[var(--text-primary)]'
                    }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className="w-3 h-3 rounded-full shrink-0 border border-black/20"
                      style={{ backgroundColor: role.colorHex || 'var(--text-muted)' }}
                    />
                    <span className="truncate">{role.name}</span>
                  </div>
                  {role.isDefault && (
                    <Badge variant="neutral" size="sm">
                      Mặc định
                    </Badge>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* 2. Right Pane: Role Editor */}
        <div className="flex-1 flex flex-col min-h-0 bg-[var(--bg-chat)] overflow-hidden">
          {editingRole ? (
            <>
              {/* Editor Tabs */}
              <div className="px-6 pt-4 border-b border-[var(--border-color)] flex items-center gap-4 bg-[var(--bg-sidebar)]">
                <button
                  type="button"
                  onClick={() => setActiveTab('display')}
                  className={`pb-3 text-xs font-bold tracking-wide transition-colors cursor-pointer border-b-2 ${activeTab === 'display'
                    ? 'border-[var(--accent-primary)] text-[var(--text-primary)]'
                    : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
                    }`}
                >
                  Hiển thị & Tùy chọn
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('permissions')}
                  className={`pb-3 text-xs font-bold tracking-wide transition-colors cursor-pointer border-b-2 flex items-center gap-1.5 ${activeTab === 'permissions'
                    ? 'border-[var(--accent-primary)] text-[var(--text-primary)]'
                    : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
                    }`}
                >
                  <span>Phân quyền</span>
                </button>
              </div>

              {/* Tab Content */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {error && (
                  <div className="p-3 bg-[var(--status-dnd)]/10 border border-[var(--status-dnd)]/30 rounded-[4px] text-xs text-[var(--status-dnd)] flex items-center gap-2">
                    <Warning size={16} weight="bold" />
                    <span>{error}</span>
                  </div>
                )}

                {activeTab === 'display' ? (
                  <div className="space-y-6">
                    {/* Tên vai trò */}
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] mb-2">
                        Tên vai trò
                      </label>
                      <Input
                        value={editingRole.name}
                        onChange={(e) => {
                          setEditingRole({ ...editingRole, name: e.target.value });
                          setHasChanges(true);
                        }}
                        disabled={editingRole.isDefault}
                        placeholder="Ví dụ: Moderator, VIP, Designer..."
                      />
                      {editingRole.isDefault && (
                        <p className="text-[11px] text-[var(--text-muted)] mt-1">
                          * Không thể đổi tên role @everyone mặc định.
                        </p>
                      )}
                    </div>

                    {/* Màu sắc vai trò */}
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] mb-2">
                        Màu sắc đại diện
                      </label>
                      <div className="flex flex-wrap items-center gap-2 mb-3">
                        {PRESET_COLORS.map((hex) => (
                          <button
                            key={hex}
                            type="button"
                            onClick={() => {
                              setEditingRole({ ...editingRole, colorHex: hex });
                              setHasChanges(true);
                            }}
                            className="w-7 h-7 rounded-full transition-transform hover:scale-110 flex items-center justify-center cursor-pointer shadow-xs border border-white/10"
                            style={{ backgroundColor: hex }}
                          >
                            {editingRole.colorHex?.toUpperCase() === hex.toUpperCase() && (
                              <Check size={14} weight="bold" className="text-white drop-shadow-md" />
                            )}
                          </button>
                        ))}
                        <button
                          type="button"
                          onClick={() => {
                            setEditingRole({ ...editingRole, colorHex: null });
                            setHasChanges(true);
                          }}
                          className="px-2.5 py-1 text-xs bg-[var(--bg-surface)] text-[var(--text-muted)] hover:text-[var(--text-primary)] rounded-[4px] border border-[var(--border-color)] transition-colors cursor-pointer"
                        >
                          Xóa màu
                        </button>
                      </div>
                    </div>

                    {/* Tùy chọn hiển thị */}
                    <div className="space-y-4 pt-4 border-t border-[var(--border-color)]">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs font-semibold text-[var(--text-primary)]">
                            Hiển thị riêng trong danh sách thành viên
                          </p>
                          <p className="text-[11px] text-[var(--text-muted)]">
                            Tách các thành viên có role này vào danh mục riêng ở thanh bên phải.
                          </p>
                        </div>
                        <input
                          type="checkbox"
                          checked={editingRole.isHoisted}
                          onChange={(e) => {
                            setEditingRole({ ...editingRole, isHoisted: e.target.checked });
                            setHasChanges(true);
                          }}
                          className="w-4 h-4 accent-[var(--accent-primary)] cursor-pointer"
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs font-semibold text-[var(--text-primary)]">
                            Cho phép bất kỳ ai @nhắc đến role này
                          </p>
                          <p className="text-[11px] text-[var(--text-muted)]">
                            Thành viên có thể gõ @{editingRole.name} để gửi thông báo.
                          </p>
                        </div>
                        <input
                          type="checkbox"
                          checked={editingRole.isMentionable}
                          onChange={(e) => {
                            setEditingRole({ ...editingRole, isMentionable: e.target.checked });
                            setHasChanges(true);
                          }}
                          className="w-4 h-4 accent-[var(--accent-primary)] cursor-pointer"
                        />
                      </div>
                    </div>

                    {/* Danger zone: Xóa role */}
                    {!editingRole.isDefault && (
                      <div className="pt-6 border-t border-[var(--border-color)] flex justify-between items-center">
                        <div>
                          <p className="text-xs font-bold text-[var(--status-dnd)]">Xóa vai trò</p>
                          <p className="text-[11px] text-[var(--text-muted)]">
                            Xóa bỏ role này khỏi server và tất cả thành viên.
                          </p>
                        </div>
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={handleDeleteRole}
                          disabled={isSaving}
                        >
                          Xóa vai trò
                        </Button>
                      </div>
                    )}
                  </div>
                ) : (
                  /* Tab Phân quyền (Permissions) */
                  <div className="space-y-6">
                    <div className="relative">
                      <MagnifyingGlass
                        size={14}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
                      />
                      <input
                        type="text"
                        value={permSearchQuery}
                        onChange={(e) => setPermSearchQuery(e.target.value)}
                        placeholder="Tìm kiếm quyền hạn..."
                        className="w-full pl-9 pr-3 py-2 text-xs bg-[var(--bg-surface)] text-[var(--text-primary)] border border-[var(--border-color)] rounded-[4px] focus:outline-hidden focus:border-[var(--accent-primary)]"
                      />
                    </div>

                    <div className="divide-y divide-[var(--border-color)] space-y-4">
                      {filteredPermissions.map((def) => {
                        const isEnabled = (editingPermBigInt & def.flag) === def.flag;
                        return (
                          <div
                            key={def.key}
                            className="pt-4 flex items-start justify-between gap-4"
                          >
                            <div className="space-y-0.5">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-[var(--text-primary)]">
                                  {def.name}
                                </span>
                                {def.dangerous && (
                                  <Badge variant="warning" size="sm">
                                    Nguy hiểm
                                  </Badge>
                                )}
                              </div>
                              <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">
                                {def.description}
                              </p>
                            </div>

                            <button
                              type="button"
                              onClick={() => handleTogglePermission(def.flag)}
                              className={`w-11 h-6 rounded-full transition-colors relative shrink-0 cursor-pointer p-0.5 ${isEnabled
                                ? 'bg-[var(--accent-primary)]'
                                : 'bg-[var(--bg-surface-active)]'
                                }`}
                            >
                              <span
                                className={`w-5 h-5 rounded-full bg-white block transition-transform shadow-xs ${isEnabled ? 'translate-x-5' : 'translate-x-0'
                                  }`}
                              />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Floating Save / Reset Bar */}
              {hasChanges && (
                <div className="p-3 bg-[var(--bg-sidebar)] border-t border-[var(--border-color)] flex items-center justify-between animate-in fade-in slide-in-from-bottom-2 duration-150">
                  <span className="text-xs font-semibold text-[var(--text-primary)]">
                    Bạn có thay đổi chưa lưu!
                  </span>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleReset}
                      disabled={isSaving}
                    >
                      Đặt lại
                    </Button>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={handleSave}
                      disabled={isSaving}
                    >
                      {isSaving ? 'Đang lưu...' : 'Lưu thay đổi'}
                    </Button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-[var(--text-muted)] p-6 text-center">
              <ShieldCheck size={32} weight="light" className="mb-2 opacity-50" />
              <p className="text-sm font-semibold">Chưa chọn vai trò nào</p>
              <p className="text-xs">Chọn một vai trò ở danh sách bên trái để chỉnh sửa.</p>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};
