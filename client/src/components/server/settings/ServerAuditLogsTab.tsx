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
  CaretDown,
  CaretUp,
} from '@phosphor-icons/react';
import { serverApi } from '../../../services/serverApi';
import type { ServerAuditLog } from '../../../types/moderation';

interface ServerAuditLogsTabProps {
  serverId: string;
}

interface ActionMeta {
  label: string;
  icon: React.ReactNode;
  colorClass: string;
}

const ACTION_MAP: Record<string | number, ActionMeta> = {
  1: { label: 'đuổi khỏi máy chủ', icon: <UserMinus size={15} />, colorClass: 'text-warning bg-warning-soft border-warning/20' },
  MemberKicked: { label: 'đuổi khỏi máy chủ', icon: <UserMinus size={15} />, colorClass: 'text-warning bg-warning-soft border-warning/20' },

  2: { label: 'cấm vĩnh viễn', icon: <Prohibit size={15} />, colorClass: 'text-danger bg-danger-soft border-danger/20' },
  MemberBanned: { label: 'cấm vĩnh viễn', icon: <Prohibit size={15} />, colorClass: 'text-danger bg-danger-soft border-danger/20' },

  3: { label: 'gỡ cấm', icon: <ShieldCheck size={15} />, colorClass: 'text-success bg-success-soft border-success/20' },
  MemberUnbanned: { label: 'gỡ cấm', icon: <ShieldCheck size={15} />, colorClass: 'text-success bg-success-soft border-success/20' },

  4: { label: 'tạm khóa chat', icon: <Clock size={15} />, colorClass: 'text-warning bg-warning-soft border-warning/20' },
  MemberTimedOut: { label: 'tạm khóa chat', icon: <Clock size={15} />, colorClass: 'text-warning bg-warning-soft border-warning/20' },

  5: { label: 'tạo vai trò mới', icon: <ShieldCheck size={15} />, colorClass: 'text-accent-primary bg-accent-soft border-accent-primary/20' },
  RoleCreated: { label: 'tạo vai trò mới', icon: <ShieldCheck size={15} />, colorClass: 'text-accent-primary bg-accent-soft border-accent-primary/20' },

  6: { label: 'cập nhật vai trò', icon: <ShieldCheck size={15} />, colorClass: 'text-accent-primary bg-accent-soft border-accent-primary/20' },
  RoleUpdated: { label: 'cập nhật vai trò', icon: <ShieldCheck size={15} />, colorClass: 'text-accent-primary bg-accent-soft border-accent-primary/20' },

  7: { label: 'xóa vai trò', icon: <Trash size={15} />, colorClass: 'text-danger bg-danger-soft border-danger/20' },
  RoleDeleted: { label: 'xóa vai trò', icon: <Trash size={15} />, colorClass: 'text-danger bg-danger-soft border-danger/20' },

  8: { label: 'tạo kênh', icon: <Hash size={15} />, colorClass: 'text-accent-primary bg-accent-soft border-accent-primary/20' },
  ChannelCreated: { label: 'tạo kênh', icon: <Hash size={15} />, colorClass: 'text-accent-primary bg-accent-soft border-accent-primary/20' },

  9: { label: 'cập nhật kênh', icon: <Hash size={15} />, colorClass: 'text-accent-primary bg-accent-soft border-accent-primary/20' },
  ChannelUpdated: { label: 'cập nhật kênh', icon: <Hash size={15} />, colorClass: 'text-accent-primary bg-accent-soft border-accent-primary/20' },

  10: { label: 'xóa kênh', icon: <Trash size={15} />, colorClass: 'text-danger bg-danger-soft border-danger/20' },
  ChannelDeleted: { label: 'xóa kênh', icon: <Trash size={15} />, colorClass: 'text-danger bg-danger-soft border-danger/20' },

  11: { label: 'tạo lại mã mời', icon: <ClockCounterClockwise size={15} />, colorClass: 'text-info bg-info-soft border-info/20' },
  InviteRegenerated: { label: 'tạo lại mã mời', icon: <ClockCounterClockwise size={15} />, colorClass: 'text-info bg-info-soft border-info/20' },

  12: { label: 'ghim tin nhắn', icon: <PushPin size={15} />, colorClass: 'text-info bg-info-soft border-info/20' },
  MessagePinned: { label: 'ghim tin nhắn', icon: <PushPin size={15} />, colorClass: 'text-info bg-info-soft border-info/20' },

  13: { label: 'xóa tin nhắn', icon: <Trash size={15} />, colorClass: 'text-danger bg-danger-soft border-danger/20' },
  MessageDeletedByMod: { label: 'xóa tin nhắn', icon: <Trash size={15} />, colorClass: 'text-danger bg-danger-soft border-danger/20' },
};

function formatAuditChanges(changesJson?: string): string | null {
  if (!changesJson) return null;
  try {
    const data = JSON.parse(changesJson);
    const parts: string[] = [];

    if (data.durationMinutes !== undefined) {
      parts.push(data.durationMinutes > 0 ? `Thời gian khóa: ${data.durationMinutes} phút` : 'Gỡ tạm khóa chat');
    }
    if (data.disabledUntil) {
      const untilDate = new Date(data.disabledUntil);
      if (!isNaN(untilDate.getTime())) {
        parts.push(`Đến: ${untilDate.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })} ${untilDate.toLocaleDateString('vi-VN')}`);
      }
    }
    if (data.slowmodeSeconds !== undefined) {
      parts.push(data.slowmodeSeconds > 0 ? `Chế độ gửi chậm: ${data.slowmodeSeconds} giây` : 'Tắt chế độ gửi chậm');
    }
    if (data.name) parts.push(`Tên: "${data.name}"`);
    if (data.topic) parts.push(`Chủ đề: "${data.topic}"`);
    if (data.isPrivate !== undefined) parts.push(data.isPrivate ? 'Chuyển thành kênh riêng tư' : 'Chuyển thành kênh công khai');
    if (data.permissions !== undefined) parts.push('Quyền hạn đã thay đổi');

    if (parts.length > 0) return parts.join(' • ');

    return Object.entries(data)
      .map(([k, v]) => `${k}: ${v}`)
      .join(', ');
  } catch {
    return changesJson;
  }
}

export const ServerAuditLogsTab: React.FC<ServerAuditLogsTabProps> = ({ serverId }) => {
  const [logs, setLogs] = useState<ServerAuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedLogIds, setExpandedLogIds] = useState<Record<string, boolean>>({});

  const toggleExpand = (logId: string) => {
    setExpandedLogIds((prev) => ({ ...prev, [logId]: !prev[logId] }));
  };

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
    <div className="space-y-4">
      <div>
        <h3 className="text-base font-bold text-text-primary">Nhật ký hoạt động</h3>
        <p className="text-xs text-text-muted mt-0.5">
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
            Các thao tác như đuổi, cấm, tạm khóa hoặc chỉnh sửa kênh sẽ được ghi lại tại đây.
          </p>
        </div>
      ) : (
        <div className="rounded-card border border-border divide-y divide-border bg-surface overflow-hidden">
          {logs.map((log) => {
            const config = ACTION_MAP[log.actionType] || {
              label: String(log.actionType),
              icon: <ClockCounterClockwise size={15} />,
              colorClass: 'text-text-muted bg-surface-active border-border',
            };

            const formattedChanges = formatAuditChanges(log.changesJson);
            const hasDetails = Boolean(log.reason || formattedChanges);
            const isExpanded = Boolean(expandedLogIds[log.id]);

            return (
              <div key={log.id} className="p-3 hover:bg-surface-active/50 transition-colors">
                <div className="flex items-center justify-between gap-3 min-w-0">
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <div
                      className={`w-7 h-7 rounded-control border flex items-center justify-center shrink-0 ${config.colorClass}`}
                    >
                      {config.icon}
                    </div>

                    <div className="text-xs text-text-primary min-w-0 flex-1 truncate">
                      <span className="font-bold text-text-primary">{log.actorDisplayName}</span>{' '}
                      <span className="text-text-muted font-normal">đã</span>{' '}
                      <span className="font-semibold">{config.label}</span>
                      {log.targetName && (
                        <>
                          {' '}
                          <span className="text-text-muted font-normal">đối với</span>{' '}
                          <span className="font-bold text-accent-primary">{log.targetName}</span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[11px] text-text-muted font-mono">
                      {new Date(log.createdAt).toLocaleString('vi-VN', {
                        hour: '2-digit',
                        minute: '2-digit',
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                      })}
                    </span>

                    {hasDetails && (
                      <button
                        type="button"
                        onClick={() => toggleExpand(log.id)}
                        className="p-1 rounded-control hover:bg-surface-active text-text-muted hover:text-text-primary transition-colors cursor-pointer"
                        title={isExpanded ? 'Thu gọn' : 'Xem chi tiết'}
                      >
                        {isExpanded ? <CaretUp size={14} /> : <CaretDown size={14} />}
                      </button>
                    )}
                  </div>
                </div>

                {/* Collapsible Details */}
                {isExpanded && hasDetails && (
                  <div className="mt-2.5 pt-2 border-t border-border/60 pl-9 space-y-1 text-xs">
                    {log.reason && (
                      <p className="text-text-secondary">
                        <span className="text-text-muted font-medium">Lý do:</span> {log.reason}
                      </p>
                    )}
                    {formattedChanges && (
                      <p className="text-text-muted text-[11px]">
                        <span className="font-medium text-text-secondary">Chi tiết thay đổi:</span>{' '}
                        {formattedChanges}
                      </p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
