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
    <div className="space-y-4 pr-8">
      {/* Header and Search - positioned cleanly below close button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-bold text-text-primary">Danh sách cấm</h3>
          <p className="text-xs text-text-muted mt-0.5">
            Quản lý những tài khoản bị cấm tham gia máy chủ vĩnh viễn.
          </p>
        </div>
        <div className="w-full sm:w-60">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm theo tên hoặc lý do..."
            leftIcon={<MagnifyingGlass size={15} />}
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
            {search ? 'Không tìm thấy người dùng phù hợp với từ khóa.' : 'Máy chủ chưa có thành viên nào nằm trong danh sách cấm.'}
          </p>
        </div>
      ) : (
        <div className="rounded-card border border-border divide-y divide-border bg-surface overflow-hidden">
          {filteredBans.map((ban) => (
            <div key={ban.id} className="p-3 flex items-center justify-between gap-3 hover:bg-surface-active/50 transition-colors">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <UserAvatar
                  name={ban.displayName}
                  avatarUrl={ban.avatarUrl}
                  size="sm"
                  className="w-9 h-9 shrink-0"
                />
                {/* Compact 2-line layout */}
                <div className="min-w-0 flex-1 leading-tight">
                  {/* Line 1: DisplayName and username */}
                  <div className="flex items-center gap-1.5 truncate">
                    <span className="text-xs font-bold text-text-primary truncate">
                      {ban.displayName}
                    </span>
                    <span className="text-[11px] text-text-muted truncate">@{ban.username}</span>
                  </div>

                  {/* Line 2: Reason & Banned by with date */}
                  <div className="flex items-center gap-2 mt-1 text-[11px] text-text-muted truncate">
                    {ban.reason ? (
                      <span className="text-danger font-medium truncate">
                        Lý do: {ban.reason}
                      </span>
                    ) : (
                      <span className="italic">Không có lý do</span>
                    )}
                    <span>•</span>
                    <span className="shrink-0">
                      Bởi <b>{ban.bannedByDisplayName}</b> ({new Date(ban.createdAt).toLocaleDateString('vi-VN')})
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Button */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleUnban(ban.userId)}
                isLoading={unbanningId === ban.userId}
                className="text-danger hover:text-danger hover:bg-danger-soft shrink-0 text-xs py-1 px-2.5 h-7"
                leftIcon={<Trash size={13} />}
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
