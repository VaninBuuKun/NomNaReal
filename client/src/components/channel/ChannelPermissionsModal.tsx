import React, { useState, useEffect, useMemo } from 'react';
import {
  Lock,
  Trash,
  Check,
  X,
  Minus,
  Warning,
} from '@phosphor-icons/react';
import { Modal, Button, Spinner } from '../ui';
import { roleApi } from '../../services/roleApi';
import type { ChannelOverwrite, Role } from '../../types';
import { OverwriteType } from '../../types/role';
import { Permissions } from '../../types/permissions';

interface ChannelPermissionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  channelId: string;
  channelName: string;
  serverId: string;
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
    description: 'Cho phép hiển thị thẻ rich preview khi gửi link.',
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
    description: 'Cho phép tag @everyone trong kênh này.',
  },
  {
    key: 'ManageMessages',
    flag: Permissions.ManageMessages,
    name: 'Quản lý tin nhắn',
    description: 'Cho phép xóa hoặc ghim tin nhắn của người khác trong kênh này.',
  },
];

export const ChannelPermissionsModal: React.FC<ChannelPermissionsModalProps> = ({
  isOpen,
  onClose,
  channelId,
  channelName,
  serverId,
}) => {
  const [overwrites, setOverwrites] = useState<ChannelOverwrite[]>([]);
  const [serverRoles, setServerRoles] = useState<Role[]>([]);
  const [selectedTargetId, setSelectedTargetId] = useState<string | null>(null);
  const [allowBigInt, setAllowBigInt] = useState<bigint>(0n);
  const [denyBigInt, setDenyBigInt] = useState<bigint>(0n);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const [owList, rolesList] = await Promise.all([
        roleApi.getChannelOverwrites(channelId),
        roleApi.getRoles(serverId),
      ]);
      setOverwrites(owList);
      setServerRoles(rolesList);

      // Default select @everyone or first overwrite
      const everyoneRole = rolesList.find((r) => r.isDefault);
      const defaultTargetId = everyoneRole ? everyoneRole.id : owList[0]?.targetId || null;

      if (defaultTargetId) {
        selectTarget(defaultTargetId, owList);
      }
    } catch (err: unknown) {
      const e = err as { response?: { data?: { detail?: string } } };
      setError(e?.response?.data?.detail || 'Không thể tải quyền ghi đè kênh.');
    } finally {
      setIsLoading(false);
    }
  };

  const selectTarget = (targetId: string, currentOverwrites = overwrites) => {
    setSelectedTargetId(targetId);
    const existing = currentOverwrites.find((o) => o.targetId === targetId);
    if (existing) {
      setAllowBigInt(BigInt(existing.allow));
      setDenyBigInt(BigInt(existing.deny));
    } else {
      setAllowBigInt(0n);
      setDenyBigInt(0n);
    }
    setHasChanges(false);
  };

  useEffect(() => {
    if (isOpen && channelId) {
      loadData();
    }
  }, [isOpen, channelId]);

  const currentRole = useMemo(() => {
    return serverRoles.find((r) => r.id === selectedTargetId);
  }, [serverRoles, selectedTargetId]);

  const handleSetTriState = (flag: bigint, state: 'allow' | 'inherit' | 'deny') => {
    let nextAllow = allowBigInt;
    let nextDeny = denyBigInt;

    if (state === 'allow') {
      nextAllow = nextAllow | flag;
      nextDeny = nextDeny & ~flag;
    } else if (state === 'deny') {
      nextDeny = nextDeny | flag;
      nextAllow = nextAllow & ~flag;
    } else {
      // inherit (clear both)
      nextAllow = nextAllow & ~flag;
      nextDeny = nextDeny & ~flag;
    }

    setAllowBigInt(nextAllow);
    setDenyBigInt(nextDeny);
    setHasChanges(true);
  };

  const handleSave = async () => {
    if (!selectedTargetId) return;
    try {
      setIsSaving(true);
      setError(null);
      const saved = await roleApi.setChannelOverwrite(channelId, {
        targetId: selectedTargetId,
        targetType: OverwriteType.Role,
        allow: allowBigInt.toString(),
        deny: denyBigInt.toString(),
      });

      setOverwrites((prev) => {
        const idx = prev.findIndex((o) => o.targetId === selectedTargetId);
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = saved;
          return next;
        }
        return [...prev, saved];
      });

      setHasChanges(false);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { detail?: string } } };
      setError(e?.response?.data?.detail || 'Không thể lưu quyền ghi đè kênh.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteOverwrite = async () => {
    const existing = overwrites.find((o) => o.targetId === selectedTargetId);
    if (!existing) return;

    try {
      setIsSaving(true);
      setError(null);
      await roleApi.deleteChannelOverwrite(channelId, existing.id);
      setOverwrites((prev) => prev.filter((o) => o.id !== existing.id));
      setAllowBigInt(0n);
      setDenyBigInt(0n);
      setHasChanges(false);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { detail?: string } } };
      setError(e?.response?.data?.detail || 'Không thể xóa quyền ghi đè.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-[4px] bg-[var(--accent-soft)] flex items-center justify-center text-[var(--accent-primary)] shrink-0">
            <Lock size={16} weight="bold" />
          </div>
          <span className="font-bold text-base text-[var(--text-primary)]">
            Phân quyền Kênh: #{channelName}
          </span>
        </div>
      }
      subtitle="Cấu hình quyền ghi đè (Channel Overwrite) cho từng vai trò"
      size="2xl"
      bodyClassName="h-[580px] flex flex-col overflow-hidden"
    >
      {/* Content: Left Roles + Right Tri-State Controls */}
      {isLoading ? (
        <div className="flex-1 flex items-center justify-center">
          <Spinner size="lg" />
        </div>
      ) : (
        <div className="flex flex-1 min-h-0 overflow-hidden select-none">
          {/* Left: Role Selection */}
          <div className="w-60 border-r border-[var(--border-color)] bg-[var(--bg-sidebar)] flex flex-col p-2 space-y-1 overflow-y-auto shrink-0">
            <span className="px-2 py-1 text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
              Vai trò & Thành viên
            </span>
            {serverRoles.map((role) => {
              const isSelected = role.id === selectedTargetId;
              const hasCustomOw = overwrites.some((o) => o.targetId === role.id);

              return (
                <button
                  key={role.id}
                  type="button"
                  onClick={() => selectTarget(role.id)}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-[4px] text-xs font-medium transition-colors cursor-pointer text-left ${
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
                  {hasCustomOw && (
                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent-primary)] shrink-0" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Right: Tri-state Checklist */}
          <div className="flex-1 flex flex-col min-h-0 bg-[var(--bg-chat)] overflow-hidden">
            <div className="p-4 border-b border-[var(--border-color)] bg-[var(--bg-sidebar)] flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-[var(--text-primary)]">
                  Quyền hạn cho: {currentRole?.name || 'Vai trò đã chọn'}
                </span>
                <p className="text-[11px] text-[var(--text-muted)]">
                  (Đỏ = Từ chối | Xám = Kế thừa | Xanh = Cho phép)
                </p>
              </div>

              {overwrites.some((o) => o.targetId === selectedTargetId) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleDeleteOverwrite}
                  disabled={isSaving}
                  className="text-[var(--status-dnd)] hover:bg-[var(--status-dnd)]/10"
                >
                  <Trash size={14} className="mr-1" />
                  Xóa ghi đè
                </Button>
              )}
            </div>

            <div className="flex-1 overflow-y-auto p-4 divide-y divide-[var(--border-color)] space-y-3">
              {error && (
                <div className="p-2.5 bg-[var(--status-dnd)]/10 border border-[var(--status-dnd)]/30 rounded-[4px] text-xs text-[var(--status-dnd)] flex items-center gap-2">
                  <Warning size={14} weight="bold" />
                  <span>{error}</span>
                </div>
              )}

              {CHANNEL_PERMS.map((item) => {
                const isAllow = (allowBigInt & item.flag) === item.flag;
                const isDeny = (denyBigInt & item.flag) === item.flag;
                const isInherit = !isAllow && !isDeny;

                return (
                  <div key={item.key} className="pt-3 flex items-start justify-between gap-4">
                    <div className="space-y-0.5">
                      <p className="text-xs font-semibold text-[var(--text-primary)]">
                        {item.name}
                      </p>
                      <p className="text-[11px] text-[var(--text-muted)]">
                        {item.description}
                      </p>
                    </div>

                    {/* Tri-state Button Group */}
                    <div className="flex items-center bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-[4px] p-0.5 shrink-0">
                      {/* Deny Button */}
                      <button
                        type="button"
                        onClick={() => handleSetTriState(item.flag, 'deny')}
                        className={`w-7 h-6 rounded-[3px] flex items-center justify-center transition-colors cursor-pointer ${
                          isDeny
                            ? 'bg-[var(--status-dnd)] text-white shadow-xs'
                            : 'text-[var(--text-muted)] hover:text-[var(--status-dnd)]'
                        }`}
                        title="Từ chối (Deny)"
                      >
                        <X size={12} weight="bold" />
                      </button>

                      {/* Inherit Button */}
                      <button
                        type="button"
                        onClick={() => handleSetTriState(item.flag, 'inherit')}
                        className={`w-7 h-6 rounded-[3px] flex items-center justify-center transition-colors cursor-pointer ${
                          isInherit
                            ? 'bg-[var(--bg-surface-active)] text-[var(--text-primary)] shadow-xs'
                            : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                        }`}
                        title="Kế thừa (Inherit)"
                      >
                        <Minus size={12} weight="bold" />
                      </button>

                      {/* Allow Button */}
                      <button
                        type="button"
                        onClick={() => handleSetTriState(item.flag, 'allow')}
                        className={`w-7 h-6 rounded-[3px] flex items-center justify-center transition-colors cursor-pointer ${
                          isAllow
                            ? 'bg-[var(--status-online)] text-white shadow-xs'
                            : 'text-[var(--text-muted)] hover:text-[var(--status-online)]'
                        }`}
                        title="Cho phép (Allow)"
                      >
                        <Check size={12} weight="bold" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Save Bar */}
            {hasChanges && (
              <div className="p-3 bg-[var(--bg-sidebar)] border-t border-[var(--border-color)] flex items-center justify-between">
                <span className="text-xs font-semibold text-[var(--text-primary)]">
                  Bạn có thay đổi quyền chưa lưu!
                </span>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleSave}
                  disabled={isSaving}
                >
                  {isSaving ? 'Đang lưu...' : 'Lưu quyền ghi đè'}
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
};
