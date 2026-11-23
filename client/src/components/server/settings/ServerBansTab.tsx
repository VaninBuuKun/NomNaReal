import React, { useState, useEffect } from 'react';
import { Prohibit, Trash, MagnifyingGlass, CircleNotch } from '@phosphor-icons/react';
import { serverApi } from '../../../services/serverApi';
import { Button, Input, UserAvatar } from '../../ui';
import type { ServerBan } from '../../../types/moderation';

interface ServerBansTabProps {
  serverId: string;
}

export const ServerBansTab: React.FC<ServerBansTabProps> = ({ serverId }) => {
  const [bans, setBans] = useState<ServerBan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [unbanningId, setUnbanningId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadBans = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await serverApi.getBans(serverId);
      setBans(data);
    } catch (err: unknown) {
      const errorObj = err as { response?: { data?: { message?: string } } };
      setError(errorObj?.response?.data?.message || 'Không thể tải danh sách cấm.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadBans();
  }, [serverId]);

  const handleUnban = async (userId: string) => {
    try {
      setUnbanningId(userId);
      await serverApi.unbanMember(serverId, userId);
      setBans((prev) => prev.filter((b) => b.userId !== userId));
    } catch (err: unknown) {
      const errorObj = err as { response?: { data?: { message?: string } } };
      alert(errorObj?.response?.data?.message || 'Không thể gỡ cấm thành viên này.');
    } finally {
      setUnbanningId(null);
    }
  };

  const filteredBans = bans.filter(
    (b) =>
      b.displayName.toLowerCase().includes(search.toLowerCase()) ||
      b.username.toLowerCase().includes(search.toLowerCase()) ||
      (b.reason && b.reason.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-bold text-text-primary">Danh sách cấm (Bans)</h3>
          <p className="text-xs text-text-muted mt-1">
            Quản lý những tài khoản bị cấm tham gia máy chủ vĩnh viễn.
          </p>
        </div>
        <div className="w-full sm:w-64">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm theo tên hoặc lý do..."
            leftIcon={<MagnifyingGlass size={16} />}
          />
        </div>
      </div>

      {error && (
        <div className="p-3 text-xs rounded-control bg-danger-soft border border-danger/20 text-danger font-medium">
          {error}
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center p-12 text-text-muted gap-2 text-sm">
          <CircleNotch size={18} className="animate-spin" />
          <span>Đang tải danh sách cấm...</span>
        </div>
      ) : filteredBans.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 text-center rounded-card bg-surface border border-border">
          <div className="w-12 h-12 rounded-full bg-surface-active flex items-center justify-center text-text-muted mb-3">
            <Prohibit size={24} />
          </div>
          <p className="text-sm font-semibold text-text-primary">Chưa có ai bị cấm</p>
          <p className="text-xs text-text-muted mt-1">
            {search ? 'Không tìm thấy người dùng phù hợp với từ khóa.' : 'Máy chủ chưa có thành viên nào nằm trong danh sách đen.'}
          </p>
        </div>
      ) : (
        <div className="rounded-card border border-border divide-y divide-border bg-surface overflow-hidden">
          {filteredBans.map((ban) => (
            <div key={ban.id} className="p-4 flex items-center justify-between gap-4 hover:bg-surface-active transition-colors">
              <div className="flex items-center gap-3 min-w-0">
                <UserAvatar
                  name={ban.displayName}
                  avatarUrl={ban.avatarUrl}
                  size="md"
                  roundedClassName="rounded-full"
                  className="w-10 h-10 border border-border shrink-0"
                />
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-text-primary truncate">
                      {ban.displayName}
                    </span>
                    <span className="text-xs text-text-muted truncate">@{ban.username}</span>
                  </div>
                  {ban.reason ? (
                    <p className="text-xs text-danger font-medium mt-0.5 truncate">
                      Lý do: {ban.reason}
                    </p>
                  ) : (
                    <p className="text-xs text-text-muted mt-0.5">Không có lý do cụ thể</p>
                  )}
                  <p className="text-[11px] text-text-muted mt-0.5">
                    Cấm bởi <b>{ban.bannedByDisplayName}</b> vào {new Date(ban.createdAt).toLocaleDateString('vi-VN')}
                  </p>
                </div>
              </div>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleUnban(ban.userId)}
                isLoading={unbanningId === ban.userId}
                className="text-danger hover:text-danger hover:bg-danger-soft shrink-0"
                leftIcon={<Trash size={15} />}
              >
                Gỡ cấm
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
