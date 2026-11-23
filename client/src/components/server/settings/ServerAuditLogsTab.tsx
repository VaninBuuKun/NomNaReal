import React, { useState, useEffect } from 'react';
import {
  ClockCounterClockwise,
  UserMinus,
  Prohibit,
  Clock,
  ShieldCheck,
  Hash,
  PushPin,
  Trash,
  CircleNotch,
} from '@phosphor-icons/react';
import { serverApi } from '../../../services/serverApi';
import type { ServerAuditLog, AuditLogActionType } from '../../../types/moderation';

interface ServerAuditLogsTabProps {
  serverId: string;
}

const ACTION_CONFIG: Record<
  AuditLogActionType,
  { label: string; icon: React.ReactNode; colorClass: string }
> = {
  MemberKicked: {
    label: 'Đuổi thành viên',
    icon: <UserMinus size={16} />,
    colorClass: 'text-warning bg-warning-soft border-warning/20',
  },
  MemberBanned: {
    label: 'Cấm thành viên',
    icon: <Prohibit size={16} />,
    colorClass: 'text-danger bg-danger-soft border-danger/20',
  },
  MemberUnbanned: {
    label: 'Gỡ cấm thành viên',
    icon: <ShieldCheck size={16} />,
    colorClass: 'text-success bg-success-soft border-success/20',
  },
  MemberTimedOut: {
    label: 'Cấm chat thành viên (Timeout)',
    icon: <Clock size={16} />,
    colorClass: 'text-warning bg-warning-soft border-warning/20',
  },
  RoleCreated: {
    label: 'Tạo vai trò mới',
    icon: <ShieldCheck size={16} />,
    colorClass: 'text-accent-primary bg-accent-soft border-accent-primary/20',
  },
  RoleUpdated: {
    label: 'Cập nhật vai trò',
    icon: <ShieldCheck size={16} />,
    colorClass: 'text-accent-primary bg-accent-soft border-accent-primary/20',
  },
  RoleDeleted: {
    label: 'Xóa vai trò',
    icon: <Trash size={16} />,
    colorClass: 'text-danger bg-danger-soft border-danger/20',
  },
  ChannelCreated: {
    label: 'Tạo kênh mới',
    icon: <Hash size={16} />,
    colorClass: 'text-accent-primary bg-accent-soft border-accent-primary/20',
  },
  ChannelUpdated: {
    label: 'Cập nhật kênh',
    icon: <Hash size={16} />,
    colorClass: 'text-accent-primary bg-accent-soft border-accent-primary/20',
  },
  ChannelDeleted: {
    label: 'Xóa kênh',
    icon: <Trash size={16} />,
    colorClass: 'text-danger bg-danger-soft border-danger/20',
  },
  InviteRegenerated: {
    label: 'Tạo lại mã mời',
    icon: <ClockCounterClockwise size={16} />,
    colorClass: 'text-info bg-info-soft border-info/20',
  },
  MessagePinned: {
    label: 'Ghim tin nhắn',
    icon: <PushPin size={16} />,
    colorClass: 'text-info bg-info-soft border-info/20',
  },
  MessageDeletedByMod: {
    label: 'Xóa tin nhắn của người khác',
    icon: <Trash size={16} />,
    colorClass: 'text-danger bg-danger-soft border-danger/20',
  },
};

export const ServerAuditLogsTab: React.FC<ServerAuditLogsTabProps> = ({ serverId }) => {
  const [logs, setLogs] = useState<ServerAuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadLogs = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await serverApi.getAuditLogs(serverId, 50);
      setLogs(data);
    } catch (err: unknown) {
      const errorObj = err as { response?: { data?: { message?: string } } };
      setError(errorObj?.response?.data?.message || 'Không thể tải nhật ký hoạt động.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, [serverId]);

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-base font-bold text-text-primary">Nhật ký hoạt động (Audit Log)</h3>
        <p className="text-xs text-text-muted mt-1">
          Theo dõi mọi thay đổi quản trị và hành động điều hành quan trọng trên máy chủ.
        </p>
      </div>

      {error && (
        <div className="p-3 text-xs rounded-control bg-danger-soft border border-danger/20 text-danger font-medium">
          {error}
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center p-12 text-text-muted gap-2 text-sm">
          <CircleNotch size={18} className="animate-spin" />
          <span>Đang tải nhật ký kiểm toán...</span>
        </div>
      ) : logs.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 text-center rounded-card bg-surface border border-border">
          <div className="w-12 h-12 rounded-full bg-surface-active flex items-center justify-center text-text-muted mb-3">
            <ClockCounterClockwise size={24} />
          </div>
          <p className="text-sm font-semibold text-text-primary">Chưa có nhật ký hoạt động</p>
          <p className="text-xs text-text-muted mt-1">
            Các thao tác như kick, ban, timeout hoặc chỉnh sửa kênh/vai trò sẽ được ghi lại tại đây.
          </p>
        </div>
      ) : (
        <div className="rounded-card border border-border divide-y divide-border bg-surface overflow-hidden">
          {logs.map((log) => {
            const config = ACTION_CONFIG[log.actionType] || {
              label: log.actionType,
              icon: <ClockCounterClockwise size={16} />,
              colorClass: 'text-text-muted bg-surface-active border-border',
            };

            return (
              <div key={log.id} className="p-4 flex items-start gap-3.5 hover:bg-surface-active transition-colors">
                <div
                  className={`w-9 h-9 rounded-control border flex items-center justify-center shrink-0 mt-0.5 ${config.colorClass}`}
                >
                  {config.icon}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-semibold text-text-primary truncate">
                      <span className="font-bold text-text-primary">{log.actorDisplayName}</span>{' '}
                      <span className="text-text-muted font-normal">đã</span>{' '}
                      <span className="font-bold">{config.label}</span>
                      {log.targetName && (
                        <>
                          {' '}
                          <span className="text-text-muted font-normal">với</span>{' '}
                          <span className="font-bold text-accent-primary">{log.targetName}</span>
                        </>
                      )}
                    </p>
                    <span className="text-[11px] text-text-muted shrink-0 font-mono">
                      {new Date(log.createdAt).toLocaleString('vi-VN', {
                        hour: '2-digit',
                        minute: '2-digit',
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                      })}
                    </span>
                  </div>

                  {log.reason && (
                    <p className="text-xs text-text-secondary mt-1 bg-chat/50 border border-border p-2 rounded-control">
                      <b className="text-text-muted">Lý do:</b> {log.reason}
                    </p>
                  )}

                  {log.changesJson && (
                    <p className="text-[11px] font-mono text-text-muted mt-1 truncate">
                      Chi tiết: {log.changesJson}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
