import React, { useState, useEffect, useMemo } from 'react';
import {
  Check,
  X,
  Minus,
  Warning,
} from '@phosphor-icons/react';
import { Spinner, UnsavedChangesBar } from '../../ui';
import { roleApi } from '../../../services/roleApi';
import type { ChannelOverwrite, Role, Channel, Workspace } from '../../../types';
import { OverwriteType } from '../../../types/role';
import { Permissions } from '../../../types/permissions';

interface ChannelPermissionsTabProps {
  channel: Channel;
  workspace: Workspace | null;
}

interface OverwritePermissionItem {
  key: string;
  flag: bigint;
  name: string;
  description: string;
}

const CHANNEL_PERMS: OverwritePermissionItem[] = [
  {
    key: 'ViewChannel',
    flag: Permissions.ViewChannel,
    name: 'Xem kênh',
    description: 'Cho phép thành viên đọc tin nhắn và xem kênh này.',
  },
  {
    key: 'SendMessages',
    flag: Permissions.SendMessages,
    name: 'Gửi tin nhắn',
    description: 'Cho phép gửi tin nhắn trong kênh này.',
  },
  {
    key: 'AttachFiles',
    flag: Permissions.AttachFiles,
    name: 'Đính kèm tệp & ảnh',
    description: 'Cho phép upload ảnh, video, tài liệu vào kênh này.',
  },
  {
    key: 'EmbedLinks',
    flag: Permissions.EmbedLinks,
    name: 'Chèn liên kết',
    description: 'Cho phép hiển thị thẻ preview khi gửi liên kết web.',
  },
  {
    key: 'AddReactions',
    flag: Permissions.AddReactions,
    name: 'Thả biểu cảm (Reaction)',
    description: 'Cho phép thả reaction vào tin nhắn của kênh.',
  },
  {
    key: 'MentionEveryone',
    flag: Permissions.MentionEveryone,
    name: 'Nhắc đến @everyone',
    description: 'Cho phép tag @everyone thông báo cho cả máy chủ.',
  },
  {
    key: 'ManageMessages',
    flag: Permissions.ManageMessages,
    name: 'Quản lý tin nhắn',
    description: 'Cho phép ghim hoặc xóa tin nhắn của người khác trong kênh này.',
  },
];

export const ChannelPermissionsTab: React.FC<ChannelPermissionsTabProps> = ({
  channel,
  workspace,
}) => {
  const serverId = channel.serverId || workspace?.id || '';

  // Overwrites & Roles
  const [overwrites, setOverwrites] = useState<ChannelOverwrite[]>([]);
  const [serverRoles, setServerRoles] = useState<Role[]>([]);
  const [selectedTargetId, setSelectedTargetId] = useState<string | null>(null);
  const [allowBigInt, setAllowBigInt] = useState<bigint>(0n);
  const [denyBigInt, setDenyBigInt] = useState<bigint>(0n);
  const [initialAllow, setInitialAllow] = useState<bigint>(0n);
  const [initialDeny, setInitialDeny] = useState<bigint>(0n);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    if (!serverId || !channel.id) return;
    try {
      setIsLoading(true);
      setError(null);
      const [owList, rolesList] = await Promise.all([
        roleApi.getChannelOverwrites(channel.id),
        roleApi.getRoles(serverId),
      ]);
      setOverwrites(owList);
      setServerRoles(rolesList);

      // Default select @everyone or first overwrite
      if (owList.length > 0) {
        selectTarget(owList[0].targetId, owList[0].allow, owList[0].deny);
      } else {
        const everyoneRole = rolesList.find((r) => r.isDefault || r.name === '@everyone');
        if (everyoneRole) {
          selectTarget(everyoneRole.id, 0, 0);
        }
      }
    } catch (err) {
      console.error('Failed to load channel permissions:', err);
      setError('Không thể tải quyền hạn của kênh.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [channel.id, serverId]);


  const selectTarget = (targetId: string, allow: number | string, deny: number | string) => {
    setSelectedTargetId(targetId);
    const a = BigInt(allow);
    const d = BigInt(deny);
    setAllowBigInt(a);
    setDenyBigInt(d);
    setInitialAllow(a);
    setInitialDeny(d);
  };

  const handleSelectRole = (role: Role) => {
    const existing = overwrites.find((o) => o.targetId === role.id);
    if (existing) {
      selectTarget(existing.targetId, existing.allow, existing.deny);
    } else {
      selectTarget(role.id, 0, 0);
    }
  };

  const getPermState = (flag: bigint): 'allow' | 'deny' | 'neutral' => {
    if ((allowBigInt & flag) === flag) return 'allow';
    if ((denyBigInt & flag) === flag) return 'deny';
    return 'neutral';
  };

  const setPermState = (flag: bigint, state: 'allow' | 'deny' | 'neutral') => {
    let newAllow = allowBigInt & ~flag;
    let newDeny = denyBigInt & ~flag;

    if (state === 'allow') {
      newAllow = newAllow | flag;
    } else if (state === 'deny') {
      newDeny = newDeny | flag;
    }

    setAllowBigInt(newAllow);
    setDenyBigInt(newDeny);
  };

  const isDirty = useMemo(() => {
    return allowBigInt !== initialAllow || denyBigInt !== initialDeny;
  }, [allowBigInt, denyBigInt, initialAllow, initialDeny]);

  const handleReset = () => {
    setAllowBigInt(initialAllow);
    setDenyBigInt(initialDeny);
  };

  const handleSave = async () => {
    if (!selectedTargetId) return;
    try {
      setIsSaving(true);
      setError(null);

      // Determine target type
      const isRole = serverRoles.some((r) => r.id === selectedTargetId);
      const targetType = isRole ? OverwriteType.Role : OverwriteType.Member;

      const updated = await roleApi.setChannelOverwrite(channel.id, {
        targetId: selectedTargetId,
        targetType,
        allow: allowBigInt.toString(),
        deny: denyBigInt.toString(),
      });

      setOverwrites((prev) => {
        const idx = prev.findIndex((o) => o.targetId === selectedTargetId);
        if (idx >= 0) {
          const clone = [...prev];
          clone[idx] = updated;
          return clone;
        }
        return [...prev, updated];
      });

      setInitialAllow(allowBigInt);
      setInitialDeny(denyBigInt);
    } catch (err) {
      console.error('Failed to save channel overwrite:', err);
      setError('Lỗi khi lưu quyền hạn.');
    } finally {
      setIsSaving(false);
    }
  };

  const activeRole = serverRoles.find((r) => r.id === selectedTargetId);

  return (
    <div className="relative flex-1 flex flex-col min-h-0 h-full overflow-hidden">
      {isLoading ? (
        <div className="flex-1 flex items-center justify-center">
          <Spinner size="md" />
        </div>
      ) : (
        <div className="flex-1 flex min-h-0 overflow-hidden">
          {/* Roles Selector Sidebar */}
          <div className="w-52 border-r border-[var(--border-color)] bg-[var(--bg-sidebar)] flex flex-col shrink-0">
            <div className="p-3 border-b border-[var(--border-color)]">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                Vai trò / Thành viên
              </span>
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {serverRoles.map((role) => {
                const isSelected = selectedTargetId === role.id;
                const hasCustom = overwrites.some((o) => o.targetId === role.id);

                return (
                  <button
                    key={role.id}
                    type="button"
                    onClick={() => handleSelectRole(role)}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-[4px] text-xs font-medium cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-[var(--bg-surface-active)] text-[var(--text-primary)] font-semibold'
                        : 'text-[var(--text-secondary)] hover:bg-[var(--bg-surface)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <div
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: role.colorHex || '#99aab5' }}
                      />
                      <span className="truncate">{role.name}</span>
                    </div>
                    {hasCustom && (
                      <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent-primary)] shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Permissions Overwrite Editor */}
          <div className="flex-1 flex flex-col min-h-0 bg-[var(--bg-chat)] overflow-hidden">
            <div className="p-4 border-b border-[var(--border-color)] bg-[var(--bg-sidebar)] flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-[var(--text-primary)]">
                  Quyền của {activeRole?.name || 'Đối tượng được chọn'}
                </h4>
                <p className="text-[11px] text-[var(--text-muted)]">
                  Thiết lập cho phép, từ chối hoặc kế thừa quyền của máy chủ
                </p>
              </div>
            </div>

            {error && (
              <div className="m-4 p-3 bg-[var(--status-dnd)]/10 border border-[var(--status-dnd)]/30 rounded-[4px] text-xs text-[var(--status-dnd)] flex items-center gap-2">
                <Warning size={16} weight="bold" />
                <span>{error}</span>
              </div>
            )}

            <div className="flex-1 overflow-y-auto p-4 pb-24 space-y-3">
              {CHANNEL_PERMS.map((perm) => {
                const state = getPermState(perm.flag);

                return (
                  <div
                    key={perm.key}
                    className="p-3 rounded-[4px] bg-[var(--bg-surface)] border border-[var(--border-color)] flex items-center justify-between gap-4"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-bold text-[var(--text-primary)]">
                        {perm.name}
                      </div>
                      <div className="text-[11px] text-[var(--text-muted)] mt-0.5 leading-relaxed">
                        {perm.description}
                      </div>
                    </div>

                    {/* Three-State Toggle Button Group */}
                    <div className="flex items-center bg-[var(--bg-sidebar)] p-0.5 rounded-[4px] border border-[var(--border-color)] shrink-0">
                      {/* Deny Button */}
                      <button
                        type="button"
                        onClick={() => setPermState(perm.flag, 'deny')}
                        title="Từ chối"
                        className={`w-7 h-7 flex items-center justify-center rounded-[3px] transition-colors cursor-pointer ${
                          state === 'deny'
                            ? 'bg-rose-500/20 text-rose-500 font-bold'
                            : 'text-[var(--text-muted)] hover:text-rose-400'
                        }`}
                      >
                        <X size={14} weight="bold" />
                      </button>

                      {/* Neutral / Inherit Button */}
                      <button
                        type="button"
                        onClick={() => setPermState(perm.flag, 'neutral')}
                        title="Kế thừa"
                        className={`w-7 h-7 flex items-center justify-center rounded-[3px] transition-colors cursor-pointer ${
                          state === 'neutral'
                            ? 'bg-[var(--bg-surface-active)] text-[var(--text-primary)] font-bold'
                            : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                        }`}
                      >
                        <Minus size={14} weight="bold" />
                      </button>

                      {/* Allow Button */}
                      <button
                        type="button"
                        onClick={() => setPermState(perm.flag, 'allow')}
                        title="Cho phép"
                        className={`w-7 h-7 flex items-center justify-center rounded-[3px] transition-colors cursor-pointer ${
                          state === 'allow'
                            ? 'bg-emerald-500/20 text-emerald-500 font-bold'
                            : 'text-[var(--text-muted)] hover:text-emerald-400'
                        }`}
                      >
                        <Check size={14} weight="bold" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <UnsavedChangesBar
        show={isDirty}
        isSaving={isSaving}
        onReset={handleReset}
        onSave={handleSave}
      />
    </div>
  );
};
